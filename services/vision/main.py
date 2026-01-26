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

import asyncio
from concurrent.futures import ThreadPoolExecutor

# --- Routes ---

@app.get("/health")
def health() -> Dict[str, Any]:
    """
    Health check endpoint. 
    Quickly returns status without loading heavy models.
    """
    # Peek at state (dirty read safe for monitoring)
    return {
        "status": "online",
        "service": config.SERVICE_NAME,
        "device": config.DEVICE,
        "active_model": manager.active_model_name or "None",
        "gpu_available": torch.cuda.is_available(),
        "ollama_host": config.OLLAMA_BASE_URL,
        "active_users": manager.active_users,
    }

@app.post("/transcribe")
async def transcribe_audio(req: TranscribeRequest):
    """
    Transcribes an audio file using OpenAI Whisper.
    """
    logger.info(f"Request: Transcribe audio -> {req.audio_path}")
    
    if not os.path.exists(req.audio_path):
        logger.warning(f"Audio file not found: {req.audio_path}")
        raise HTTPException(status_code=404, detail="Audio file not found")

    def _process():
        # Blocks in thread until resources are available
        with manager.use_whisper_model() as model:
            # Inference (also blocking)
            return model.transcribe(req.audio_path)

    try:
        # Offload entire locking+inference block to thread
        text = await asyncio.to_thread(_process)
        return {"text": text}

    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription Error: {str(e)}")


@app.post("/describe")
async def describe_image(req: DescriptionRequest):
    """
    Generates a description for an image using a Vision-Language Model.
    """
    logger.info(f"Request: Describe image -> {req.model_name}")

    if not os.path.exists(req.image_path):
        logger.warning(f"Image file not found: {req.image_path}")
        raise HTTPException(
            status_code=404, detail=f"Image file not found: {req.image_path}"
        )

    def _process():
        # Blocks in thread until resources are available
        with manager.use_vision_model(req.model_name) as model:
            # Inference
            try:
                try:
                    image = Image.open(req.image_path).convert("RGB")
                except UnidentifiedImageError:
                    raise HTTPException(status_code=400, detail="Invalid image file format")
                
                return model.describe(image, req.prompt)
            except HTTPException:
                raise
            except Exception as e:
                raise RuntimeError(f"Inner Inference Error: {e}")

    try:
        # Offload entire locking+inference block to thread
        description = await asyncio.to_thread(_process)
        return {"description": description}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        return {"description": f"Error analyzing image: {str(e)}"}