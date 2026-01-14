import torch
import gc
import warnings
from abc import ABC, abstractmethod
from PIL import Image
from src.config import config
from src.utils.logger import logger

warnings.filterwarnings("ignore")


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


class Qwen3VLModel(VisionModel):
    def load(self) -> bool:
        try:
            from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

            logger.info(f"Loading Qwen3-VL on {self.device}...")

            model_id = "Qwen/Qwen3-VL-2B-Instruct"
            self.processor = AutoProcessor.from_pretrained(
                model_id, trust_remote_code=True
            )

            dtype = torch.float16 if self.device == "cuda" else torch.float32
            
            # Qwen usually handles device_map better, but let's be explicit for safety
            self.model = Qwen3VLForConditionalGeneration.from_pretrained(
                model_id, 
                dtype=dtype, 
                device_map="auto" if self.device == "cuda" else None, 
                trust_remote_code=True
            )
            
            if self.device != "cuda":
                self.model = self.model.to(self.device)
                
            self.model.eval()
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to load Qwen3: {e}")
            return False

    def describe(self, image: Image.Image, prompt: str) -> str:
        try:
            from qwen_vl_utils import process_vision_info

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": prompt},
                    ],
                }
            ]
            text = self.processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            image_inputs, video_inputs = process_vision_info(messages)
            inputs = self.processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            ).to(self.device)

            with torch.inference_mode():
                generated_ids = self.model.generate(**inputs, max_new_tokens=512)
                generated_ids_trimmed = [
                    out_ids[len(in_ids) :]
                    for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
                ]
                return self.processor.batch_decode(
                    generated_ids_trimmed, skip_special_tokens=True
                )[0]
        except Exception as e:
            return f"Error: {e}"

    def get_name(self):
        return "Qwen3-VL-2B"


class InternVL3Model(VisionModel):
    def load(self) -> bool:
        try:
            from transformers import AutoModel, AutoTokenizer

            logger.info(f"Loading InternVL on {self.device}...")

            model_id = "OpenGVLab/InternVL3_5-1B-Flash"
            dtype = torch.float16 if self.device == "cuda" else torch.float32

            # Use explicit loading for CPU safety
            self.model = AutoModel.from_pretrained(
                model_id, 
                dtype=dtype, 
                trust_remote_code=True, 
                device_map="auto" if self.device == "cuda" else None
            )
            
            if self.device != "cuda":
                self.model = self.model.to(self.device)

            self.tokenizer = AutoTokenizer.from_pretrained(
                model_id, trust_remote_code=True, use_fast=True
            )
            self.model.eval()
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to load InternVL: {e}")
            return False

    def describe(self, image: Image.Image, prompt: str) -> str:
        try:
            from torchvision import transforms as T
            from torchvision.transforms.functional import InterpolationMode

            IMAGENET_MEAN = (0.485, 0.456, 0.406)
            IMAGENET_STD = (0.229, 0.224, 0.225)
            transform = T.Compose(
                [
                    T.Lambda(
                        lambda img: img.convert("RGB") if img.mode != "RGB" else img
                    ),
                    T.Resize((448, 448), interpolation=InterpolationMode.BICUBIC),
                    T.ToTensor(),
                    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
                ]
            )
            
            # Ensure proper casting for CPU/GPU mix
            pixel_values = transform(image).unsqueeze(0)
            if self.device == "cuda":
                pixel_values = pixel_values.to(torch.float16).to(self.device)
            else:
                pixel_values = pixel_values.to(torch.float32).to(self.device)
            
            question = f"<image>\n{prompt}"
            return self.model.chat(
                self.tokenizer, pixel_values, question, dict(max_new_tokens=512)
            )
        except Exception as e:
            return f"Error: {e}"

    def get_name(self):
        return "InternVL3.5"


# --- Ollama Wrapper ---


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