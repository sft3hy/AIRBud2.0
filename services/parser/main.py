from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from src.core.document_parser import DocumentParser

app = FastAPI()


class ParseRequest(BaseModel):
    file_path: str
    output_dir: str


@app.post("/parse")
def parse_document(req: ParseRequest):
    print(f"Received parse request for: {req.file_path}")

    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    os.makedirs(req.output_dir, exist_ok=True)

    # Initialize parser (Vision is None because this service only detects/crops)
    parser = DocumentParser(vision_model=None, output_dir=req.output_dir)

    try:
        # Helper to get both text and images
        markdown_text, image_paths = parser.parse_and_get_images(req.file_path)
        return {"text": markdown_text, "images": image_paths}
    except Exception as e:
        print(f"Error parsing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
