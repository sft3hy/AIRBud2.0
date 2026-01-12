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
                timeout=300,
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
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json().get("description", "")
        except Exception as e:
            logger.warning(f"Vision Service failed for {image_path}: {e}")
            return "Image analysis failed."


class ChartService:
    @staticmethod
    def get_charts_for_session(db_docs: List[Dict]) -> List[Dict]:
        charts = []
        # Base URL for static files served by FastAPI
        # Assumes the client can access this host
        base_url = "http://localhost:8000/static"

        for doc in db_docs:
            chart_dir = doc.get("chart_dir")
            if not chart_dir or not os.path.exists(chart_dir):
                continue

            descriptions = doc.get("chart_descriptions", {})

            # Scan for images
            search_path = os.path.join(chart_dir, "**", "*.png")
            files = glob.glob(search_path, recursive=True)

            for f in files:
                filename = os.path.basename(f)

                # Calculate relative URL
                try:
                    rel_path = os.path.relpath(f, settings.DATA_DIR)
                    url = f"{base_url}/{rel_path}"
                except ValueError:
                    continue  # Path issue

                # Extract page number
                page_match = re.search(r"page(\d+)", filename)
                page_num = int(page_match.group(1)) if page_match else 0

                # Match description
                desc = descriptions.get(filename)
                if not desc:
                    # Try matching without extension
                    desc = descriptions.get(
                        os.path.splitext(filename)[0], "No description available."
                    )

                charts.append(
                    {
                        "url": url,
                        "filename": filename,
                        "doc_name": doc.get("original_filename", "Unknown"),
                        "page": page_num,
                        "description": desc,
                    }
                )

        charts.sort(key=lambda x: (x["doc_name"], x["page"]))
        return charts
