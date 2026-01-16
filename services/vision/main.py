import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

from src.config import config
from src.utils.logger import logger
from src.core.manager import manager

app = FastAPI(title="Vision Service", version=config.VERSION)


class DescriptionRequest(BaseModel):
    image_path: str
    prompt: str
    model_name: str

class TranscribeRequest(BaseModel):
    audio_path: str


@app.get("/health")
def health():
    return {
        "status": "online",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "ollama_host": config.OLLAMA_BASE_URL,
        "active_model": manager.active_model_name or "None",
    }

@app.post("/transcribe")
def transcribe_audio(req: TranscribeRequest):
    logger.info(f"Request: Transcribe audio")
    
    if not os.path.exists(req.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        model = manager.get_whisper()
        text = model.transcribe(req.audio_path)
        
        # Cleanup to allow vision models back in memory later
        model.offload()
        manager.whisper_model = None 
        
        return {"text": text}
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/describe")
def describe_image(req: DescriptionRequest):
    logger.info(f"Request: Describe image with {req.model_name}")

    # 1. Validate File
    if not os.path.exists(req.image_path):
        raise HTTPException(
            status_code=404, detail=f"Image file not found: {req.image_path}"
        )

    # 2. Get Model (Auto-loads/offloads)
    model = manager.get_model(req.model_name)
    if not model:
        raise HTTPException(
            status_code=500, detail=f"Failed to load model: {req.model_name}"
        )

    # 3. Process
    try:
        image = Image.open(req.image_path).convert("RGB")
        description = model.describe(image, req.prompt)
        return {"description": description}
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        return {"description": f"Error analyzing image: {str(e)}"}
