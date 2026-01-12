import os
import io
import fitz  # PyMuPDF
from PIL import Image
from docx import Document
from pptx import Presentation
from typing import List, Tuple
import subprocess
import tempfile
import shutil

from src.utils.logger import logger
from src.core.detector import ChartDetector


class DocumentParser:
    def __init__(self, detector: ChartDetector, output_dir: str):
        self.output_dir = output_dir
        self.detector = detector

    def parse(self, file_path: str) -> Tuple[str, List[str]]:
        """
        Main entry point for parsing.
        Returns (markdown_text, list_of_image_paths)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_ext = os.path.splitext(file_path)[1].lower()
        file_name = os.path.splitext(os.path.basename(file_path))[0]

        # Create a specific folder for this file's assets
        self.file_output_dir = os.path.join(self.output_dir, file_name)
        os.makedirs(self.file_output_dir, exist_ok=True)

        logger.info(f"Parsing {file_ext} document: {file_name}")

        try:
            if file_ext == ".pdf":
                return self._extract_from_pdf(file_path)
            elif file_ext == ".docx":
                return self._extract_from_docx(file_path)
            elif file_ext == ".pptx":
                return self._extract_from_pptx(file_path)
            else:
                raise ValueError(f"Unsupported format: {file_ext}")
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}", exc_info=True)
            raise

    def _extract_from_pdf(self, path: str) -> Tuple[str, List[str]]:
        doc = fitz.open(path)
        full_text = []
        extracted_images = []

        for i, page in enumerate(doc):
            # 1. Extract Text
            full_text.append(f"## Page {i+1}\n{page.get_text()}")

            # 2. Render Page for Vision Detection
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            img = Image.open(io.BytesIO(pix.tobytes("png")))

            # 3. Detect & Crop
            crops = self._process_visuals(img, f"page{i+1}")
            extracted_images.extend(crops)

            # 4. Insert Placeholders
            for crop_path in crops:
                filename = os.path.basename(crop_path)
                full_text.append(f"\n[CHART_PLACEHOLDER:{filename}]\n")

        doc.close()
        return "\n".join(full_text), extracted_images

    def _extract_from_docx(self, path: str) -> Tuple[str, List[str]]:
        doc = Document(path)
        full_text = []
        extracted_images = []

        # 1. Text
        for para in doc.paragraphs:
            full_text.append(para.text)

        # 2. Images (Embedded blobs)
        # Note: DOCX structure makes layout detection hard without conversion.
        # We extract embedded images based on size heuristics.
        count = 0
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    img_data = rel.target_part.blob
                    img = Image.open(io.BytesIO(img_data))

                    # Filter small icons/lines
                    if img.width > 200 and img.height > 200:
                        count += 1
                        fname = f"docx_visual_{count}.png"
                        save_path = os.path.join(self.file_output_dir, fname)
                        img.save(save_path)
                        extracted_images.append(save_path)
                        full_text.append(f"\n[CHART_PLACEHOLDER:{fname}]\n")
                except Exception as e:
                    logger.warning(f"Failed to extract DOCX image: {e}")

        return "\n\n".join(full_text), extracted_images

    def _extract_from_pptx(self, path: str) -> Tuple[str, List[str]]:
        prs = Presentation(path)
        full_text = []
        extracted_images = []

        # 1. Convert Slides to Images (for visual detection)
        slide_images = self._convert_pptx_to_images(path)
        logger.info(f"Converted {len(slide_images)} slides to images.")

        for i, slide in enumerate(prs.slides):
            full_text.append(f"## Slide {i+1}")

            # 2. Text Extraction
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    full_text.append(shape.text)

            # 3. Visual Processing (on the rendered slide image)
            if i < len(slide_images):
                crops = self._process_visuals(slide_images[i], f"slide{i+1}")
                extracted_images.extend(crops)

                for crop_path in crops:
                    filename = os.path.basename(crop_path)
                    full_text.append(f"\n[CHART_PLACEHOLDER:{filename}]\n")

        return "\n\n".join(full_text), extracted_images

    def _convert_pptx_to_images(self, pptx_path: str) -> List[Image.Image]:
        images = []
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                # Convert PPTX -> PDF
                cmd = [
                    "soffice",
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    tmpdir,
                    pptx_path,
                ]

                logger.debug("Running LibreOffice conversion...")
                subprocess.run(
                    cmd,
                    check=True,
                    timeout=120,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )

                pdf_name = os.path.splitext(os.path.basename(pptx_path))[0] + ".pdf"
                pdf_path = os.path.join(tmpdir, pdf_name)

                if os.path.exists(pdf_path):
                    doc = fitz.open(pdf_path)
                    for page in doc:
                        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                        img = Image.open(io.BytesIO(pix.tobytes("png")))
                        images.append(img)
                    doc.close()
                else:
                    logger.error("LibreOffice finished but PDF was not found.")

        except subprocess.TimeoutExpired:
            logger.error("LibreOffice conversion timed out.")
        except Exception as e:
            logger.error(f"PPTX conversion failed: {e}")

        return images

    def _process_visuals(self, page_image: Image.Image, prefix: str) -> List[str]:
        bboxes = self.detector.detect(page_image)
        saved_paths = []

        for i, (x1, y1, x2, y2) in enumerate(bboxes):
            try:
                crop = page_image.crop((x1, y1, x2, y2))
                fname = f"{prefix}_visual_{i+1}.png"
                path = os.path.join(self.file_output_dir, fname)
                crop.save(path)
                saved_paths.append(path)
            except Exception as e:
                logger.warning(f"Failed to save crop {i}: {e}")

        return saved_paths
