import os
import glob
import re
import requests
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import List, Dict, Optional
from pathlib import Path

from src.config import settings
from src.utils.logger import logger

# --- HTTP Client Configuration ---
# specialized for high-concurrency internal microservice communication
def create_retry_session(
    retries: int = 3,
    backoff_factor: float = 0.3,
    status_forcelist: tuple = (500, 502, 503, 504),
    pool_maxsize: int = 100
) -> requests.Session:
    """
    Creates a requests Session with:
    1. Connection Pooling (critical for 100+ concurrent users)
    2. Automatic Retries (resilience against blips)
    3. Timeouts (enforced at request time, but pool handles keepalives)
    """
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    # Mount adapter for both HTTP and HTTPS
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=pool_maxsize)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# Global singleton session to be reused across threads
_http_session = create_retry_session()


class ExternalServices:
    """
    Handles communication with internal microservices (Parser, Vision).
    Methods are synchronous/blocking to be compatible with asyncio.to_thread 
    executors used in the pipeline.
    """

    @staticmethod
    def parse_document(file_path: str, output_dir: str, progress_callback=None) -> Dict:
        """
        Calls the Parser Service to extract text and layout.
        Consumes streaming NDJSON response to provide progress updates.
        """
        url = f"{settings.PARSER_API_URL}/parse"
        payload = {"file_path": str(file_path), "output_dir": str(output_dir)}
        
        last_result = {}

        try:
            # High timeout because parsing PDFs/PPTX is CPU intensive
            with _http_session.post(url, json=payload, timeout=300, stream=True) as resp:
                resp.raise_for_status()
                
                for line in resp.iter_lines():
                    if not line: continue
                    
                    try:
                        data = json.loads(line) if isinstance(line, bytes) else json.loads(str(line))
                        
                        if data.get("status") == "processing":
                            if progress_callback:
                                # Format a detailed step string: "Page 5/10 (Img: 3, 4.2s)"
                                step_msg = data.get("step", "Processing...")
                                if "current_images" in data:
                                    step_msg += f" [Img: {data['current_images']}]"
                                if "elapsed" in data:
                                    step_msg += f" [{data['elapsed']:.1f}s]"
                                    
                                progress = int(data.get("progress", 0) * 100)
                                progress_callback("parsing", step_msg, progress)
                        
                        elif data.get("status") == "completed":
                            last_result = data.get("result", {})
                            # Also return checking metrics if needed
                            
                        elif data.get("status") == "error":
                            raise RuntimeError(f"Parser Error: {data.get('error')}")
                            
                    except json.JSONDecodeError:
                        pass
                        
            if not last_result:
                raise RuntimeError("Parser stream ended without result")
                
            return last_result

        except requests.exceptions.RequestException as e:
            logger.error(f"Parser Service failed for {file_path}: {str(e)}")
            raise RuntimeError(f"Parser Service Unreachable or Error: {e}")

    @staticmethod
    def analyze_image(image_path: str, model_name: str) -> str:
        """
        Calls the Vision Service to describe an image.
        """
        url = f"{settings.VISION_API_URL}/describe"
        prompt = (
            "Analyze the image and produce a precise, factual description. "
            "If it contains charts/graphs: Identify type, transcribe titles/labels, list data points/values. "
            "Do not omit numeric values."
        )
        
        payload = {
            "image_path": str(image_path),
            "prompt": prompt,
            "model_name": model_name,
        }

        try:
            resp = _http_session.post(url, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()
            return data.get("description", "")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Vision Service failed for {image_path}: {e}")
            return f"Image analysis unavailable: {str(e)}"

    @staticmethod
    def transcribe_audio(audio_path: str) -> str:
        """
        Calls the Vision Service (or Audio Service) to transcribe media.
        """
        url = f"{settings.VISION_API_URL}/transcribe"
        
        try:
            logger.info(f"Sending audio to Vision Service: {audio_path}")
            resp = _http_session.post(url, json={"audio_path": str(audio_path)}, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            return data.get("text", "")
        except requests.exceptions.RequestException as e:
            logger.error(f"Transcription Service failed: {e}")
            return f"Audio transcription unavailable: {str(e)}"


class ChartService:
    """
    Handles retrieval and listing of generated chart images from the file system.
    """

    @staticmethod
    def get_charts_for_session(db_docs: List[Dict]) -> List[Dict]:
        charts = []
        base_url = "/api/static"
        
        # Security: Normalize base path to prevent directory traversal
        allowed_base = Path(settings.DATA_DIR).resolve()

        logger.info(f"Scanning {len(db_docs)} documents for charts...")

        for doc in db_docs:
            chart_dir_str = doc.get("chart_dir")
            if not chart_dir_str:
                continue

            chart_dir = Path(chart_dir_str).resolve()
            
            # 1. Security Check: Ensure chart_dir is inside allowed data directory
            if not str(chart_dir).startswith(str(allowed_base)):
                logger.warning(f"Security Alert: Document {doc['id']} points to path outside DATA_DIR: {chart_dir}")
                continue

            if not chart_dir.exists():
                logger.debug(f"Doc {doc['id']} chart_dir missing: {chart_dir}")
                continue

            descriptions = doc.get("chart_descriptions", {})
            vision_model = doc.get("vision_model_used", "Unknown")

            # 2. Secure Globbing using Pathlib
            # Recursive search for images
            try:
                # We specifically look for png/jpg to avoid exposing other file types
                files = list(chart_dir.rglob("*.png")) + list(chart_dir.rglob("*.jpg"))
                
                logger.debug(f"Doc {doc['id']} found {len(files)} images in {chart_dir}")

                for f in files:
                    # Calculate relative path for URL
                    try:
                        rel_path = f.relative_to(allowed_base)
                    except ValueError:
                        # Should be caught by the earlier startswith check, but double safety
                        logger.warning(f"File {f} is not relative to DATA_DIR")
                        continue

                    # Construct URL
                    url = f"{base_url}/{rel_path.as_posix()}"
                    filename = f.name

                    # Parse page number (convention: ...page123.png)
                    page_match = re.search(r"page(\d+)", filename, re.IGNORECASE)
                    page_num = int(page_match.group(1)) if page_match else 0

                    # Match description
                    desc = descriptions.get(filename)
                    if not desc:
                        # Try without extension
                        desc = descriptions.get(f.stem, "No description available.")

                    charts.append({
                        "url": url,
                        "filename": filename,
                        "doc_name": doc.get("original_filename", "Unknown"),
                        "page": page_num,
                        "description": desc,
                        "vision_model_used": vision_model
                    })

            except Exception as e:
                logger.error(f"Error scanning charts for doc {doc['id']}: {e}")
                continue

        # Sort by Document Name, then Page Number
        charts.sort(key=lambda x: (x["doc_name"], x["page"]))
        return charts