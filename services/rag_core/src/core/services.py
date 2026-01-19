import os
import glob
import re
import requests
from typing import List, Dict
from src.config import settings
from src.utils.logger import logger

class ExternalServices:
    @staticmethod
    def parse_document(file_path: str, output_dir: str) -> Dict:
        try:
            resp = requests.post(
                f"{settings.PARSER_API_URL}/parse",
                json={"file_path": str(file_path), "output_dir": str(output_dir)},
                timeout=300
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Parser Service failed: {e}")
            raise

    @staticmethod
    def analyze_image(image_path: str, model_name: str) -> str:
        prompt = """Analyze the image and produce a precise, factual description.
        If it contains charts/graphs: Identify type, transcribe titles/labels, list data points/values.
        Do not omit numeric values."""
        
        try:
            resp = requests.post(
                f"{settings.VISION_API_URL}/describe",
                json={
                    "image_path": str(image_path),
                    "prompt": prompt,
                    "model_name": model_name,
                },
                timeout=120
            )
            resp.raise_for_status()
            return resp.json().get("description", "")
        except Exception as e:
            logger.warning(f"Vision Service failed for {image_path}: {e}")
            return "Image analysis failed."
        
    @staticmethod
    def transcribe_audio(audio_path: str) -> str:
        try:
            logger.info(f"Sending audio to Vision Service: {audio_path}")
            resp = requests.post(
                f"{settings.VISION_API_URL}/transcribe",
                json={"audio_path": str(audio_path)},
                timeout=600 
            )
            resp.raise_for_status()
            return resp.json().get("text", "")
        except Exception as e:
            logger.error(f"Transcription Service failed: {e}")
            return "Audio transcription failed."

class ChartService:
    @staticmethod
    def get_charts_for_session(db_docs: List[Dict]) -> List[Dict]:
        charts = []
        # Nginx routes /api/static -> rag_core:/static -> /data
        base_url = "/api/static" 

        logger.info(f"Scanning {len(db_docs)} documents for charts...")

        for doc in db_docs:
            chart_dir = doc.get("chart_dir")
            
            # --- DEBUG LOGGING ---
            if not chart_dir:
                logger.debug(f"Doc {doc['id']} has no chart_dir recorded.")
                continue
                
            if not os.path.exists(chart_dir):
                logger.warning(f"Doc {doc['id']} chart_dir does not exist on disk: {chart_dir}")
                # Check if permissions are blocking visibility
                try:
                    logger.debug(f"Parent dir listing: {os.listdir(os.path.dirname(chart_dir))}")
                except Exception as e:
                    logger.error(f"Cannot list parent dir: {e}")
                continue
            # ---------------------

            descriptions = doc.get("chart_descriptions", {})
            vision_model = doc.get("vision_model_used", "Unknown") 

            # Recursive glob to find images
            search_path = os.path.join(chart_dir, "**", "*.png")
            files = glob.glob(search_path, recursive=True)
            
            logger.debug(f"Doc {doc['id']} found {len(files)} images in {chart_dir}")

            for f in files:
                filename = os.path.basename(f)
                
                try:
                    # Calculate relative path for URL
                    # If f is /data/charts/abc/img.png and DATA_DIR is /data
                    # rel_path is charts/abc/img.png
                    rel_path = os.path.relpath(f, settings.DATA_DIR)
                    url = f"{base_url}/{rel_path}"
                except ValueError:
                    logger.warning(f"File {f} is not inside DATA_DIR {settings.DATA_DIR}")
                    continue

                page_match = re.search(r"page(\d+)", filename)
                page_num = int(page_match.group(1)) if page_match else 0

                desc = descriptions.get(filename)
                if not desc:
                    # Try matching without extension
                    desc = descriptions.get(os.path.splitext(filename)[0], "No description available.")

                charts.append({
                    "url": url,
                    "filename": filename,
                    "doc_name": doc.get("original_filename", "Unknown"),
                    "page": page_num,
                    "description": desc,
                    "vision_model_used": vision_model
                })

        charts.sort(key=lambda x: (x["doc_name"], x["page"]))
        return charts