from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager

from src.core.parser import DocumentParser
from src.core.detector import ChartDetector
from src.utils.logger import logger
from src.config import config

# Global State
detector = ChartDetector()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load Model
    logger.info("Starting Parser Service...")
    detector.load_model()
    yield
    # Shutdown: Clean up
    logger.info("Shutting down Parser Service...")
    detector.offload()


app = FastAPI(lifespan=lifespan)


class ParseRequest(BaseModel):
    file_path: str
    output_dir: str


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": detector._is_loaded,
        "device": detector.cfg.MODEL.DEVICE if detector.cfg else "unknown",
    }


@app.post("/parse")
def parse_document(req: ParseRequest):
    logger.info(f"Received parse request for: {req.file_path}")

    # Initialize Parser with the singleton detector
    parser = DocumentParser(detector=detector, output_dir=req.output_dir)

    try:
        result = parser.parse(req.file_path)
        return {
            "status": "success",
            "text": result["text"],
            "images": result["images"],
            "audio_path": result.get("audio_path"), # Pass this through
            "metrics": {"images_found": len(result["images"])},
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error during parsing", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.HOST, port=config.PORT)
