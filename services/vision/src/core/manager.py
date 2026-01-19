import threading
from typing import Optional
from src.core.models import (
    VisionModel,
    Moondream2Model,
    OllamaVisionModel,
    WhisperAudioModel,
)
from src.utils.logger import logger


class ModelManager:
    """
    Singleton class to manage heavy ML models (Vision & Audio).
    Ensures thread safety and manages VRAM usage by strictly serializing 
    model loading/unloading to prevent OOM errors.
    """
    _instance = None
    _creation_lock = threading.Lock()

    def __new__(cls):
        with cls._creation_lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                # State
                cls._instance.active_model: Optional[VisionModel] = None
                cls._instance.active_model_name: str = ""
                cls._instance.whisper_model: Optional[WhisperAudioModel] = None
                
                # Internal lock for resource swapping (distinct from creation lock)
                # This ensures only one thread can load/unload weights at a time.
                cls._instance.resource_lock = threading.Lock()
        return cls._instance

    def get_model(self, model_name: str) -> Optional[VisionModel]:
        """
        Retrieves the requested vision model.
        Swaps out existing models if necessary to save VRAM.
        Thread-safe: Blocks other threads during heavy load/unload operations.
        """
        # 1. Fast path: Check without lock (Performance optimization)
        if self.active_model and self.active_model_name == model_name:
            return self.active_model

        # 2. Slow path: Acquire lock to modify state
        with self.resource_lock:
            # Double-check inside lock to handle race conditions
            if self.active_model and self.active_model_name == model_name:
                return self.active_model

            # A. Offload Whisper if active (Prioritize VRAM for Vision)
            if self.whisper_model:
                logger.info("Offloading Whisper to free VRAM for Vision...")
                try:
                    self.whisper_model.offload()
                except Exception as e:
                    logger.error(f"Error offloading Whisper: {e}")
                self.whisper_model = None

            # B. Offload current vision model if it differs from requested
            if self.active_model:
                logger.info(f"Switching Vision models: {self.active_model_name} -> {model_name}")
                try:
                    self.active_model.offload()
                except Exception as e:
                    logger.error(f"Error offloading {self.active_model_name}: {e}")
                self.active_model = None
                self.active_model_name = ""

            # C. Load new model
            logger.info(f"Initializing Vision Model: {model_name}...")
            new_model = self._factory(model_name)

            if new_model:
                try:
                    if new_model.load():
                        self.active_model = new_model
                        self.active_model_name = model_name
                        logger.info(f"Successfully loaded {model_name}")
                        return new_model
                    else:
                        logger.error(f"Model.load() returned False for {model_name}")
                except Exception as e:
                    logger.error(f"Crash during model load: {e}", exc_info=True)
            else:
                logger.error(f"Unknown or unsupported model name: {model_name}")
            
            return None
    
    def get_whisper(self) -> Optional[WhisperAudioModel]:
        """
        Retrieves the Whisper audio model.
        Offloads vision models to ensure VRAM availability.
        """
        # Fast path
        if self.whisper_model:
            return self.whisper_model
        
        with self.resource_lock:
            # Double-check
            if self.whisper_model:
                return self.whisper_model

            logger.info("Initializing Whisper (Audio)...")
            
            # Offload Vision model to free VRAM
            if self.active_model:
                logger.info(f"Offloading Vision model ({self.active_model_name}) to make room for Whisper...")
                try:
                    self.active_model.offload()
                except Exception as e:
                    logger.error(f"Error offloading vision model: {e}")
                self.active_model = None
                self.active_model_name = ""

            try:
                model = WhisperAudioModel()
                if model.load():
                    self.whisper_model = model
                    return self.whisper_model
            except Exception as e:
                logger.error(f"Critical error loading Whisper: {e}", exc_info=True)
            
            return None

    def _factory(self, name: str) -> Optional[VisionModel]:
        """
        Instantiates model classes based on string identifiers.
        """
        try:
            if name == "Moondream2":
                return Moondream2Model()
            
            # Handle variable Ollama models (e.g. "Ollama-Gemma3" -> "gemma3")
            if name.startswith("Ollama-"):
                clean_name = name.replace("Ollama-", "").lower()
                return OllamaVisionModel(clean_name)
            
            # Backward compatibility
            if name == "Ollama-Granite3.2-Vision":
                 return OllamaVisionModel("granite3.2-vision")
                 
            return None
        except Exception as e:
            logger.error(f"Factory instantiation error for {name}: {e}")
            return None

# Singleton Instance
manager = ModelManager()