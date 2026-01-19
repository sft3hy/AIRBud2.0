import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError
from contextlib import asynccontextmanager
from typing import Dict, Any

from src.config import config
from src.utils.logger import logger
from src.core.manager import manager

# --- Data Models ---
class DescriptionRequest(BaseModel):
    image_path: str
    prompt: str
    model_name: str

class TranscribeRequest(BaseModel):
    audio_path: str

# --- Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Vision Service ({config.VERSION}) starting up...")
    logger.info(f"Device: {config.DEVICE}")
    yield
    logger.info("Vision Service shutting down...")
    # Optional: Force cleanup of any loaded models on shutdown
    if manager.active_model:
        manager.active_model.offload()
    if manager.whisper_model:
        manager.whisper_model.offload()

app = FastAPI(title="Vision Service", version=config.VERSION, lifespan=lifespan)

# --- Routes ---

@app.get("/health")
def health() -> Dict[str, Any]:
    """
    Health check endpoint. 
    Quickly returns status without loading heavy models.
    """
    return {
        "status": "online",
        "service": config.SERVICE_NAME,
        "device": config.DEVICE,
        "active_model": manager.active_model_name or "None",
        "gpu_available": torch.cuda.is_available(),
        "ollama_host": config.OLLAMA_BASE_URL,
    }

@app.post("/transcribe")
def transcribe_audio(req: TranscribeRequest):
    """
    Transcribes an audio file using OpenAI Whisper.
    Blocking operation run in threadpool.
    """
    logger.info(f"Request: Transcribe audio -> {req.audio_path}")
    
    if not os.path.exists(req.audio_path):
        logger.warning(f"Audio file not found: {req.audio_path}")
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        # Get Model (Thread-safe, handles locking/swapping)
        model = manager.get_whisper()
        if not model:
            raise HTTPException(status_code=500, detail="Failed to initialize Whisper model")

        # Run Inference (Thread-safe)
        text = model.transcribe(req.audio_path)
        
        # Immediate cleanup policy for Audio:
        # Since audio is rare compared to vision, we offload immediately to free VRAM.
        # This prevents the 1.5GB+ Whisper model from sitting idle in GPU memory.
        manager.whisper_model = None
        model.offload()
        
        return {"text": text}

    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription Error: {str(e)}")


@app.post("/describe")
def describe_image(req: DescriptionRequest):
    """
    Generates a description for an image using a Vision-Language Model.
    Blocking operation run in threadpool.
    """
    logger.info(f"Request: Describe image -> {req.model_name}")

    # 1. Validate File
    if not os.path.exists(req.image_path):
        logger.warning(f"Image file not found: {req.image_path}")
        raise HTTPException(
            status_code=404, detail=f"Image file not found: {req.image_path}"
        )

    # 2. Get Model (Auto-loads requested model, offloads others)
    model = manager.get_model(req.model_name)
    if not model:
        logger.error(f"Model load failure: {req.model_name}")
        raise HTTPException(
            status_code=500, detail=f"Failed to load model: {req.model_name}"
        )

    # 3. Process Image
    try:
        # Open image safely
        try:
            image = Image.open(req.image_path).convert("RGB")
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="Invalid image file format")

        # Run Inference
        description = model.describe(image, req.prompt)
        
        return {"description": description}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        return {"description": f"Error analyzing image: {str(e)}"}