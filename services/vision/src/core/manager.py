import threading
import time
from contextlib import contextmanager
from typing import Optional
from src.core.models import (
    VisionModel,
    OllamaVisionModel,
    WhisperAudioModel,
)
from src.utils.logger import logger


class ModelManager:
    """
    Singleton class to manage heavy ML models (Vision & Audio).
    Ensures thread safety and manages VRAM usage by strictly serializing 
    model loading/unloading to prevent OOM errors.
    
    Implements a Reader-Writer lock pattern where:
    - Multiple "Readers" (inference requests) can use the SAME model concurrently 
      (though the model itself might serialize them via internal locks).
    - "Writers" (model swaps) must wait for all current users to finish.
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
                
                # Concurrency Control
                cls._instance.lock = threading.RLock()
                cls._instance.condition = threading.Condition(cls._instance.lock)
                cls._instance.active_users = 0
                cls._instance.pending_swaps = 0 # To convert to fair locking if needed
                
        return cls._instance

    @contextmanager
    def use_vision_model(self, model_name: str):
        """
        Context manager to safely acquire and use a vision model.
        """
        # 1. ACQUIRE
        with self.lock:
            # Check if we need to swap
            while not self._is_vision_ready(model_name):
                # If the wrong model is loaded or Whisper is loaded, we need to swap.
                # But we can't swap if ANYONE is using the current setup.
                if self.active_users > 0:
                    logger.info(f"Waiting for {self.active_users} active users to release resources before loading {model_name}...")
                    self.condition.wait()
                else:
                    # No users, safe to swap
                    self._perform_switch_to_vision(model_name)
                    # Loop will re-check _is_vision_ready to be sure
            
            # Ready to go
            self.active_users += 1
            model = self.active_model

        # 2. YIELD (Inference happens here)
        try:
            yield model
        finally:
            # 3. RELEASE
            with self.lock:
                self.active_users -= 1
                # If we were the last user, notify potential swappers
                if self.active_users == 0:
                    self.condition.notify_all()

    @contextmanager
    def use_whisper_model(self):
        """
        Context manager to safely acquire and use the Whisper model.
        """
        with self.lock:
            while not self._is_whisper_ready():
                if self.active_users > 0:
                    logger.info(f"Waiting for {self.active_users} active users to release resources before loading Whisper...")
                    self.condition.wait()
                else:
                    self._perform_switch_to_whisper()
            
            self.active_users += 1
            model = self.whisper_model

        try:
            yield model
        finally:
            with self.lock:
                self.active_users -= 1
                if self.active_users == 0:
                    self.condition.notify_all()

    # --- Helper Predicates (Must be called under lock) ---
    
    def _is_vision_ready(self, model_name: str) -> bool:
        return (self.active_model is not None and 
                self.active_model_name == model_name and 
                self.whisper_model is None)

    def _is_whisper_ready(self) -> bool:
        return (self.whisper_model is not None and 
                self.active_model is None)

    # --- Helper Switchers (Must be called under lock AND active_users==0) ---

    def _perform_switch_to_vision(self, model_name: str):
        logger.info(f"Perform switch -> Vision: {model_name}")
        
        # 1. Offload Whisper if present
        if self.whisper_model:
            try:
                self.whisper_model.offload()
            except Exception as e:
                logger.error(f"Error offloading Whisper: {e}")
            self.whisper_model = None
        
        # 2. Offload wrong Vision if present
        if self.active_model and self.active_model_name != model_name:
            try:
                self.active_model.offload()
            except Exception as e:
                logger.error(f"Error offloading {self.active_model_name}: {e}")
            self.active_model = None
            self.active_model_name = ""

        # 3. Load Target (if not already)
        if not self.active_model:
            new_model = self._factory(model_name)
            if new_model:
                if new_model.load():
                    self.active_model = new_model
                    self.active_model_name = model_name
                else:
                    raise RuntimeError(f"Failed to load vision model: {model_name}")
            else:
                raise ValueError(f"Unknown vision model: {model_name}")

    def _perform_switch_to_whisper(self):
        logger.info("Perform switch -> Whisper")
        
        # 1. Offload Vision if present
        if self.active_model:
            try:
                self.active_model.offload()
            except Exception as e:
                logger.error(f"Error offloading Vision: {e}")
            self.active_model = None
            self.active_model_name = ""
        
        # 2. Load Whisper (if not already)
        if not self.whisper_model:
            model = WhisperAudioModel()
            if model.load():
                self.whisper_model = model
            else:
                raise RuntimeError("Failed to load Whisper model")

    def _factory(self, name: str) -> Optional[VisionModel]:
        try:
            # Explicit Mappings for Common Models
            if name == "Ollama-Granite3.2-Vision":
                 return OllamaVisionModel("granite3.2-vision")
            
            # Fallback: Generic Ollama handler
            if name.startswith("Ollama-"):
                clean_name = name.replace("Ollama-", "").lower()
                return OllamaVisionModel(clean_name)
            
            return None
        except Exception as e:
            logger.error(f"Factory instantiation error for {name}: {e}")
            return None

# Singleton Instance
manager = ModelManager()