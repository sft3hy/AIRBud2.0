from typing import Optional
from src.core.models import (
    VisionModel,
    Moondream2Model,
    OllamaVisionModel,
    WhisperAudioModel,
)
from src.utils.logger import logger


class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance.active_model = None
            cls._instance.active_model_name = ""
            cls._instance.whisper_model = None
        return cls._instance

    def get_model(self, model_name: str) -> Optional[VisionModel]:
        # If requested model is already loaded, return it
        if self.active_model and self.active_model_name == model_name:
            return self.active_model

        # If a different model is loaded, offload it
        if self.active_model:
            logger.info(f"Switching models: {self.active_model_name} -> {model_name}")
            self.active_model.offload()
            self.active_model = None

        # Load new model
        logger.info(f"Initializing {model_name}...")
        new_model = self._factory(model_name)

        if new_model and new_model.load():
            self.active_model = new_model
            self.active_model_name = model_name
            return new_model

        logger.error(f"Failed to initialize {model_name}")
        return None
    
    def get_whisper(self):
        if self.whisper_model:
            return self.whisper_model
        
        logger.info("Initializing Whisper (Audio)...")
        # Offload vision model to free VRAM for Whisper if needed
        if self.active_model:
            logger.info("Offloading Vision model to make room for Whisper...")
            self.active_model.offload()
            self.active_model = None
            self.active_model_name = ""

        self.whisper_model = WhisperAudioModel()
        self.whisper_model.load()
        return self.whisper_model

    def _factory(self, name: str) -> Optional[VisionModel]:
        if name == "Moondream2":
            return Moondream2Model()
        if name == "Ollama-Gemma3":
            return OllamaVisionModel("gemma3")
        if name == "Ollama-Granite3.2-Vision":
            return OllamaVisionModel("granite3.2-vision")
        return None


manager = ModelManager()
