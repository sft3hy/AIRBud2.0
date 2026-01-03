from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.vision.vision_models import VisionModelFactory
from PIL import Image
import os
import gc
import torch

app = FastAPI()

active_model = None
active_model_name = ""

class DescriptionRequest(BaseModel):
    image_path: str
    prompt: str
    model_name: str

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "test_mode": os.environ.get("TEST")
    }

@app.post("/describe")
def describe_image(req: DescriptionRequest):
    global active_model, active_model_name
    
    # Check if model swap needed
    if active_model_name != req.model_name:
        if active_model:
            active_model.offload_model()
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
        print(f"Loading model: {req.model_name}")
        active_model = VisionModelFactory.create_model(req.model_name)
        if not active_model:
            raise HTTPException(status_code=500, detail="Failed to load model")
        active_model_name = req.model_name

    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    try:
        image = Image.open(req.image_path).convert("RGB")
        description = active_model.describe_image(image, req.prompt)
        return {"description": description}
    except Exception as e:
        print(f"Vision Error: {e}")
        return {"description": f"Error analyzing image: {str(e)}"}