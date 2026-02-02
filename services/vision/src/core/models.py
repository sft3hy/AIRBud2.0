import torch
import gc
import warnings
import threading
import io
from abc import ABC, abstractmethod
from typing import Optional
from PIL import Image

# Third-party libs
import whisper
# Try-except blocks allow the service to start even if some heavy dependencies 
# are missing (useful for dev/test environments), though they are required for ops.
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ImportError:
    AutoModelForCausalLM = None 
    AutoTokenizer = None

try:
    import ollama
except ImportError:
    ollama = None

from src.config import config
from src.utils.logger import logger

# Suppress HF warnings
warnings.filterwarnings("ignore")


class WhisperAudioModel:
    """
    Wrapper for OpenAI's Whisper model.
    Handles loading, transcription, and memory cleanup.
    """
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self._lock = threading.Lock() # Serialize inference to prevent OOM

    def load(self) -> bool:
        try:
            logger.info(f"Loading Whisper 'medium' model on {self.device}...")
            # 'medium' is a good balance of speed/accuracy for CPU/GPU
            self.model = whisper.load_model("medium", device=self.device)
            return True
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}", exc_info=True)
            return False

    def transcribe(self, audio_path: str) -> str:
        if not self.model:
            if not self.load():
                return "[Error: Model could not be loaded]"
        
        # Serialize inference
        with self._lock:
            try:
                logger.info(f"Transcribing audio file: {audio_path}")
                # fp16=False is safer for CPU/MPS compatibility
                result = self.model.transcribe(audio_path, fp16=(self.device == "cuda"))
                return result.get("text", "").strip()
            except Exception as e:
                logger.error(f"Transcription error for {audio_path}: {e}")
                return f"[Transcription Failed: {str(e)}]"

    def offload(self):
        """Releases VRAM/RAM resources."""
        with self._lock:
            self.model = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            elif torch.backends.mps.is_available():
                torch.mps.empty_cache()
            logger.info("Whisper model offloaded.")


class VisionModel(ABC):
    """
    Abstract Base Class for Vision-Language Models.
    """
    def __init__(self):
        # Hardware Detection
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
            
        self._is_loaded = False
        self.model = None
        self.tokenizer = None
        
        # Inference lock to prevent concurrent forward passes on the same model instance
        self._inference_lock = threading.Lock()

    @abstractmethod
    def load(self) -> bool:
        """Loads model weights into memory."""
        pass

    @abstractmethod
    def describe(self, image: Image.Image, prompt: str) -> str:
        """Generates a description for the image."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Returns the unique model identifier."""
        pass

    def offload(self):
        """Common offloading logic."""
        with self._inference_lock:
            if not self._is_loaded:
                return

            logger.info(f"Offloading {self.get_name()}...")
            self.model = None
            self.tokenizer = None

            # Force memory release
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            elif torch.backends.mps.is_available():
                torch.mps.empty_cache()

            self._is_loaded = False
            logger.info(f"{self.get_name()} offload complete.")


# --- Concrete Implementations ---


class OllamaVisionModel(VisionModel):
    """
    Connector for external Ollama service hosting larger models (Llava, Bakllava, etc.)
    Does not consume local VRAM in this container (offloaded to Ollama container).
    """
    def __init__(self, model_name: str):
        super().__init__()
        self.ollama_model_name = model_name
        self.host = config.OLLAMA_BASE_URL
        self.timeout = 120 # Seconds

    def load(self) -> bool:
        if not ollama:
            logger.error("Ollama library not installed.")
            return False

        logger.info(f"Checking Ollama connection at {self.host}...")
        try:
            # We don't "load" weights locally, but we check if the service is reachable
            # and potentially pull the model if missing?
            client = ollama.Client(host=self.host, timeout=10)
            client.list() 
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Ollama connection failed: {e}")
            return False

    def describe(self, image: Image.Image, prompt: str) -> str:
        # No inference lock needed strictly for safety (since it's HTTP), 
        # but arguably good to prevent network flooding. 
        # We will SKIP lock here to allow high concurrency against external service.
        
        client = ollama.Client(host=self.host, timeout=self.timeout)
        
        # Convert PIL to Bytes
        try:
            with io.BytesIO() as output:
                image.save(output, format="PNG")
                img_bytes = output.getvalue()

            response = client.chat(
                model=self.ollama_model_name,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [img_bytes],
                    }
                ],
            )
            content = response.get("message", {}).get("content", "")
            return content if content else "[No description generated]"
            
        except Exception as e:
            logger.error(f"Ollama inference error for {self.ollama_model_name}: {e}")
            return f"[Ollama Error: {str(e)}]"

    def get_name(self):
        return f"Ollama-{self.ollama_model_name}"