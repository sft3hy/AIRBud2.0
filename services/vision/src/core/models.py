import torch
import gc
import warnings
from abc import ABC, abstractmethod
from PIL import Image
from src.config import config
from src.utils.logger import logger
import whisper

warnings.filterwarnings("ignore")

class WhisperAudioModel:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None

    def load(self):
        try:
            logger.info(f"Loading Whisper 'medium' on {self.device}...")
            self.model = whisper.load_model("medium", device=self.device)
            return True
        except Exception as e:
            logger.error(f"Failed to load Whisper: {e}")
            return False

    def transcribe(self, audio_path: str) -> str:
        if not self.model:
            self.load()
        
        try:
            logger.info(f"Transcribing {audio_path}...")
            result = self.model.transcribe(audio_path)
            return result["text"]
        except Exception as e:
            return f"[Transcription Error: {e}]"

    def offload(self):
        self.model = None
        gc.collect()
        torch.cuda.empty_cache()

class VisionModel(ABC):
    def __init__(self):
        # Detect MPS (Mac) vs CUDA vs CPU
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
            
        self._is_loaded = False
        self.model = None
        self.tokenizer = None
        self.processor = None

    @abstractmethod
    def load(self) -> bool:
        pass

    @abstractmethod
    def describe(self, image: Image.Image, prompt: str) -> str:
        pass

    @abstractmethod
    def get_name(self) -> str:
        pass

    def offload(self):
        if not self._is_loaded:
            return

        logger.info(f"Offloading {self.get_name()}...")
        self.model = None
        self.tokenizer = None
        self.processor = None

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        elif torch.backends.mps.is_available():
            torch.mps.empty_cache()

        self._is_loaded = False
        logger.info("Offload complete.")


# --- Native Transformers Models ---


class Moondream2Model(VisionModel):
    def load(self) -> bool:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            logger.info(f"Loading Moondream2 on {self.device}...")

            model_id = "vikhyatk/moondream2"
            
            # --- FIX: Avoid device_map on CPU/MPS to prevent Meta Tensor errors ---
            if self.device in ["cpu", "mps"]:
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    revision="2025-06-21",
                    trust_remote_code=True,
                    # No device_map="auto" or {"": device} for CPU/MPS
                ).to(self.device)
            else:
                # CUDA supports device_map well
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    revision="2025-06-21",
                    trust_remote_code=True,
                    device_map={"": self.device},
                )
            # ----------------------------------------------------------------------

            self.tokenizer = AutoTokenizer.from_pretrained(
                model_id, trust_remote_code=True
            )
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to load Moondream: {e}")
            return False

    def describe(self, image: Image.Image, prompt: str) -> str:
        if not self._is_loaded:
            return "Model not loaded."
        try:
            enc_image = self.model.encode_image(image)
            return self.model.answer_question(enc_image, prompt, self.tokenizer)
        except Exception as e:
            return f"Error: {e}"

    def get_name(self):
        return "Moondream2"



class OllamaVisionModel(VisionModel):
    def __init__(self, model_name):
        super().__init__()
        self.ollama_model_name = model_name
        self.host = config.OLLAMA_BASE_URL

    def load(self) -> bool:
        import ollama

        logger.info(
            f"Connecting to Ollama at {self.host} for model {self.ollama_model_name}..."
        )
        client = ollama.Client(host=self.host)
        try:
            client.list()  # Simple ping check
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Ollama connection failed: {e}")
            return False

    def describe(self, image: Image.Image, prompt: str) -> str:
        import ollama
        import io

        client = ollama.Client(host=self.host)
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format="PNG")

        try:
            response = client.chat(
                model=self.ollama_model_name,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [img_byte_arr.getvalue()],
                    }
                ],
            )
            return response["message"]["content"]
        except Exception as e:
            return f"[Ollama Error: {e}]"

    def get_name(self):
        return f"Ollama-{self.ollama_model_name}"