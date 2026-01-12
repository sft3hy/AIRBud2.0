import os
import requests
import gc
import cv2
import numpy as np
import torch
from PIL import Image
from typing import List, Tuple
from pathlib import Path

from src.config import config
from src.utils.logger import logger

# Guarded Import for Detectron2
try:
    from detectron2.config import get_cfg
    from detectron2.engine import DefaultPredictor
    from detectron2 import model_zoo

    _DETECTRON2_AVAILABLE = True
except ImportError:
    _DETECTRON2_AVAILABLE = False
    logger.warning(
        "Detectron2 not installed. Vision features will rely on CV heuristics."
    )


class ChartDetector:
    """
    Singleton wrapper for Detectron2 PubLayNet model.
    Detects Figures, Tables, and Charts.
    """

    def __init__(self):
        self.predictor = None
        self.cfg = None
        self._is_loaded = False
        self.label_map = {
            0: "Text",
            1: "Title",
            2: "List",
            3: "Table",
            4: "Figure",
            5: "Other",
        }
        self.target_classes = ["Figure", "Table"]

    def load_model(self):
        """Initializes the heavy ML model. Should be called at startup."""
        if self._is_loaded or not _DETECTRON2_AVAILABLE:
            return

        logger.info("Loading PubLayNet Detector...")
        try:
            # 1. Config
            self.cfg = get_cfg()
            self.cfg.merge_from_file(model_zoo.get_config_file(config.MODEL_CONFIG))

            # 2. Settings
            self.cfg.MODEL.ROI_HEADS.NUM_CLASSES = 6
            self.cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = config.CONFIDENCE_THRESHOLD

            # Device Selection
            if torch.cuda.is_available():
                self.cfg.MODEL.DEVICE = "cuda"
            elif torch.backends.mps.is_available():
                self.cfg.MODEL.DEVICE = (
                    "cpu"  # MPS often unstable with some Detectron ops
                )
            else:
                self.cfg.MODEL.DEVICE = "cpu"

            # 3. Weights
            self._ensure_weights()
            self.cfg.MODEL.WEIGHTS = str(
                config.MODEL_CACHE_DIR / config.MODEL_WEIGHTS_FILE
            )

            # 4. Predictor
            self.predictor = DefaultPredictor(self.cfg)
            self._is_loaded = True
            logger.info(f"Model loaded successfully on {self.cfg.MODEL.DEVICE}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            self._is_loaded = False

    def _ensure_weights(self):
        """Downloads weights if missing."""
        config.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        weights_path = config.MODEL_CACHE_DIR / config.MODEL_WEIGHTS_FILE

        if not weights_path.exists():
            logger.info(f"Downloading weights to {weights_path}...")
            try:
                response = requests.get(config.MODEL_WEIGHTS_URL, stream=True)
                response.raise_for_status()
                with open(weights_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                logger.info("Download complete.")
            except Exception as e:
                logger.error("Failed to download weights.")
                if weights_path.exists():
                    weights_path.unlink()
                raise e

    def detect(self, page_image: Image.Image) -> List[Tuple[int, int, int, int]]:
        """
        Detects charts/tables in an image.
        Returns: [(x1, y1, x2, y2), ...]
        """
        if self._is_loaded:
            return self._detect_ml(page_image)
        return self._detect_cv_heuristic(page_image)

    def _detect_ml(self, page_image: Image.Image) -> List[Tuple[int, int, int, int]]:
        # Convert PIL -> BGR (OpenCV)
        img_np = np.array(page_image)
        if img_np.shape[-1] == 4:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
        else:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

        detections = []
        try:
            outputs = self.predictor(img_np)
            instances = outputs["instances"].to("cpu")

            boxes = instances.pred_boxes.tensor.numpy()
            scores = instances.scores.numpy()
            classes = instances.pred_classes.numpy()
            h, w = img_np.shape[:2]

            for box, score, cls_id in zip(boxes, scores, classes):
                cls_name = self.label_map.get(int(cls_id))
                if cls_name in self.target_classes:
                    x1, y1, x2, y2 = map(int, box)

                    # Apply Padding
                    pad = config.DETECTION_PADDING
                    x1 = max(0, x1 - pad)
                    y1 = max(0, y1 - pad)
                    x2 = min(w, x2 + pad)
                    y2 = min(h, y2 + pad)

                    detections.append((x1, y1, x2, y2))

            # If ML returns nothing, we could fallback to CV,
            # but usually ML is reliable enough to mean "no chart present".
            return detections

        except Exception as e:
            logger.error(f"ML Detection failed: {e}")
            return self._detect_cv_heuristic(page_image)

    def _detect_cv_heuristic(
        self, page_image: Image.Image
    ) -> List[Tuple[int, int, int, int]]:
        """Fallback computer vision algorithm."""
        img_np = np.array(page_image)
        if img_np.shape[-1] == 4:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
        else:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

        gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        h, w = img_np.shape[:2]

        edges = cv2.Canny(gray, 50, 150)
        dilated = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=3)
        contours, _ = cv2.findContours(
            dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        bboxes = []
        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)

            # Filter noise and extreme aspect ratios
            if bw < 100 or bh < 100:
                continue
            if bw / bh > 5 or bh / bw > 5:
                continue

            area_pct = (bw * bh) / (w * h)
            if area_pct < 0.05 or area_pct > 0.9:
                continue

            pad = config.DETECTION_PADDING
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(w, x + bw + pad)
            y2 = min(h, y + bh + pad)

            bboxes.append((x1, y1, x2, y2))

        return bboxes

    def offload(self):
        """Cleans up resources."""
        self.predictor = None
        self.cfg = None
        self._is_loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
