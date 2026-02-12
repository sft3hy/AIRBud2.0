import os
from pathlib import Path


class Config:
    # Service Settings
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8001"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Paths
    BASE_DIR = Path(__file__).resolve().parent.parent
    MODEL_CACHE_DIR = Path.home() / ".torch" / "detectron2_models"

    # Model Settings
    # PubLayNet ResNet50 (Standard benchmark for document layout)
    MODEL_CONFIG = "COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml"
    MODEL_WEIGHTS_URL = "https://huggingface.co/nlpconnect/PubLayNet-faster_rcnn_R_50_FPN_3x/resolve/main/model_final.pth?download=true"
    MODEL_WEIGHTS_FILE = "publaynet_faster_rcnn_R_50_FPN_3x.pth"
    
    # Offline Mode
    OFFLINE_MODEL_PATH = os.getenv("OFFLINE_MODEL_PATH")

    CONFIDENCE_THRESHOLD = 0.5
    DETECTION_PADDING = 60


config = Config()
