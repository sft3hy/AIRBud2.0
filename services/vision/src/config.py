import os
from pathlib import Path


class Config:
    SERVICE_NAME = "vision_service"
    VERSION = "2.0"

    # Environment
    TEST_MODE = os.getenv("TEST", "False").lower() == "true"

    # Ollama Connection
    # docker-compose.yml sets this to 'http://host.docker.internal:11434' for local testing
    # or 'http://ollama:11434' for production.
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")

    # Torch / Device
    DEVICE = "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu"


config = Config()
