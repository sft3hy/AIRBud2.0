from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import json

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


def stream_parsing_results(parser: DocumentParser, file_path: str):
    """
    Generator that runs the parser and yields NDJSON lines.
    """
    try:
        # parser.parse is now a generator we can iterate
        for update in parser.parse(file_path):
            yield json.dumps(update) + "\n"
    except Exception as e:
        logger.error("Streaming error", exc_info=True)
        yield json.dumps({"status": "error", "error": str(e)}) + "\n"


@app.post("/parse")
def parse_document(req: ParseRequest):
    logger.info(f"Received parse request for: {req.file_path}")

    # Initialize Parser
    parser = DocumentParser(detector=detector, output_dir=req.output_dir)

    return StreamingResponse(
        stream_parsing_results(parser, req.file_path),
        media_type="application/x-ndjson"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
