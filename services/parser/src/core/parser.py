import os
import io
import fitz  # PyMuPDF
import cv2
from PIL import Image
from docx import Document
from pptx import Presentation
from typing import List, Tuple, Dict, Any
import subprocess
import pandas as pd # <--- NEW IMPORT
import tempfile
import shutil
from moviepy import VideoFileClip

from src.utils.logger import logger
from src.core.detector import ChartDetector


class DocumentParser:
    def __init__(self, detector: ChartDetector, output_dir: str):
        self.output_dir = output_dir
        self.detector = detector

    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Returns {
            "text": str, 
            "images": List[str], 
            "audio_path": Optional[str]
        }
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_ext = os.path.splitext(file_path)[1].lower()
        file_name = os.path.splitext(os.path.basename(file_path))[0]

        # Create a specific folder for this file's assets
        self.file_output_dir = os.path.join(self.output_dir, file_name)
        os.makedirs(self.file_output_dir, exist_ok=True)

        logger.info(f"Parsing {file_ext} document: {file_name}")

        text = ""
        images = []
        audio_path = None

        try:
            if file_ext == ".pdf":
                text, images = self._extract_from_pdf(file_path)
            elif file_ext == ".docx":
                text, images = self._extract_from_docx(file_path)
            elif file_ext == ".pptx":
                text, images = self._extract_from_pptx(file_path)
            elif file_ext == ".xlsx": # <--- NEW BRANCH
                text = self._extract_from_xlsx(file_path)
            elif file_ext == ".txt":
                text = self._extract_from_txt(file_path)
            elif file_ext == ".mp4":
                text, images, audio_path = self._extract_from_mp4(file_path, file_name)
            else:
                raise ValueError(f"Unsupported format: {file_ext}")
            
            return {
                "text": text,
                "images": images,
                "audio_path": audio_path
            }

        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}", exc_info=True)
            raise

    def _extract_from_xlsx(self, path: str) -> str:
        """
        Reads an Excel file and converts sheets to Markdown tables.
        """
        full_text = []
        try:
            # Read all sheets
            xls = pd.read_excel(path, sheet_name=None)
            
            for sheet_name, df in xls.items():
                full_text.append(f"## Sheet: {sheet_name}\n")
                
                # Clean data: Replace NaN with empty string
                df = df.fillna("")
                
                # Convert to Markdown for better LLM comprehension
                # requires 'tabulate' installed
                markdown_table = df.to_markdown(index=False)
                full_text.append(markdown_table)
                full_text.append("\n\n")
                
        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Could not parse Excel file: {e}")

        return "".join(full_text)

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
    
    def _extract_from_txt(self, path: str) -> str:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    def _extract_from_mp4(self, path: str, filename_base: str) -> Tuple[str, List[str], str]:
        images = []
        full_text = [f"# Video Analysis: {filename_base}\n"]
        
        # 1. Extract Audio
        audio_path = os.path.join(self.file_output_dir, f"{filename_base}.mp3")
        try:
            logger.info("Extracting audio track...")
            clip = VideoFileClip(path)
            if clip.audio:
                clip.audio.write_audiofile(audio_path, logger=None)
                logger.info(f"Audio extracted to {audio_path}")
            else:
                logger.warning("No audio track found in video.")
                audio_path = None
            clip.close()
        except Exception as e:
            logger.error(f"Audio extraction failed: {e}")
            audio_path = None

        # 2. Extract Screenshots (1 frame every 5 seconds, max 20 frames)
        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0: fps = 24 # Fallback
        
        frame_interval = int(fps * 5) # Every 5 seconds
        max_frames = 20
        count = 0
        saved_count = 0

        logger.info(f"Extracting frames (Interval: {frame_interval}, Max: {max_frames})...")

        while cap.isOpened() and saved_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if count % frame_interval == 0:
                # Convert BGR (OpenCV) to RGB (PIL)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(rgb_frame)
                
                # Save Image
                timestamp = count / fps
                fname = f"frame_{int(timestamp)}s.png"
                save_path = os.path.join(self.file_output_dir, fname)
                img.save(save_path)
                
                images.append(save_path)
                full_text.append(f"\n## Timestamp: {int(timestamp)}s\n[CHART_PLACEHOLDER:{fname}]\n")
                saved_count += 1

            count += 1

        cap.release()
        
        return "\n".join(full_text), images, audio_path

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
