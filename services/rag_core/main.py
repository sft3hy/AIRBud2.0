import os
import uuid
import shutil
import traceback
from typing import Dict, List
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger
from src.core.pipeline import SmartRAG
from src.core.services import ChartService

# --- Initialization ---
app = FastAPI(title="Smart RAG API", version=settings.VERSION)
db = DatabaseManager()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Mount ---
app.mount("/static", StaticFiles(directory=settings.DATA_DIR), name="static")

# --- In-Memory Status ---
job_status: Dict[str, Dict] = {}


# --- Models ---
class SessionCreate(BaseModel):
    filenames: List[str]


class ProcessRequest(BaseModel):
    session_id: int
    filename: str
    vision_model: str


class QueryRequest(BaseModel):
    session_id: int
    question: str


# --- Helpers ---
def run_pipeline_task(session_id: int, filename: str, vision_model: str):
    sid = str(session_id)
    try:
        job_status[sid] = {
            "status": "processing",
            "step": "Initializing...",
            "progress": 10,
        }

        file_path = settings.UPLOAD_DIR / filename
        unique_folder = f"{uuid.uuid4()}_{filename}"
        output_dir = settings.CHARTS_DIR / unique_folder
        os.makedirs(output_dir, exist_ok=True)

        rag = SmartRAG(output_dir=output_dir, vision_model_name=vision_model)

        job_status[sid] = {
            "status": "processing",
            "step": "Parsing Layout & Vision...",
            "progress": 25,
        }
        rag.index_document(str(file_path))

        job_status[sid] = {
            "status": "processing",
            "step": "Saving Embeddings...",
            "progress": 80,
        }

        # Save to Disk
        doc_id = db.add_document_record(
            filename=filename,
            vision_model=vision_model,
            chart_dir=str(output_dir),
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            session_id=session_id,
        )

        faiss_path, chunks_path = rag.save_state(doc_id)
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        job_status[sid] = {"status": "completed", "step": "Ready!", "progress": 100}

    except Exception as e:
        logger.error(f"Pipeline failed for session {sid}: {e}", exc_info=True)
        job_status[sid] = {"status": "error", "step": str(e), "progress": 0}


# --- Routes ---


@app.get("/")
def health_check():
    return {"status": "online", "service": settings.SERVICE_NAME}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_location = settings.UPLOAD_DIR / file.filename
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": "File saved", "path": str(file_location)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
def get_sessions():
    return [
        {
            "id": s["id"],
            "name": s["session_name"],
            "date": s["timestamp"],
            "docs": s["docs"],
        }
        for s in db.get_all_sessions()
    ]


@app.post("/sessions")
def create_session(req: SessionCreate):
    session_id = db.create_session(req.filenames)
    return {"session_id": session_id}


@app.get("/sessions/{session_id}/status")
def get_session_status(session_id: str):
    return job_status.get(
        str(session_id), {"status": "idle", "step": "", "progress": 0}
    )


@app.post("/process")
def process_document(req: ProcessRequest, background_tasks: BackgroundTasks):
    file_path = settings.UPLOAD_DIR / req.filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    job_status[str(req.session_id)] = {
        "status": "queued",
        "step": "Queued...",
        "progress": 5,
    }
    background_tasks.add_task(
        run_pipeline_task, req.session_id, req.filename, req.vision_model
    )
    return {"status": "queued"}


@app.get("/sessions/{session_id}/documents")
def get_documents(session_id: int):
    return db.get_session_documents(session_id)


@app.get("/sessions/{session_id}/charts")
def get_charts(session_id: int):
    docs = db.get_session_documents(session_id)
    return ChartService.get_charts_for_session(docs)


@app.get("/sessions/{session_id}/history")
def get_history(session_id: int):
    return db.get_queries_for_session(session_id)


@app.post("/query")
def query_session(req: QueryRequest):
    docs = db.get_session_documents(req.session_id)
    if not docs:
        return {"response": "No documents found.", "results": []}

    # Load pipelines for all docs
    pipelines = []
    for doc in docs:
        if doc["faiss_index_path"] and os.path.exists(doc["faiss_index_path"]):
            try:
                p = SmartRAG(output_dir=doc["chart_dir"])
                p.load_state(doc["faiss_index_path"], doc["chunks_path"])
                pipelines.append(p)
            except Exception as e:
                logger.error(f"Failed to load doc {doc['id']}: {e}")

    if not pipelines:
        return {"response": "Error loading document indexes.", "results": []}

    # Search & Aggregation
    all_results = []
    for p in pipelines:
        all_results.extend(p.search(req.question, top_k=3))

    # Sort by relevance (vector distance)
    all_results.sort(key=lambda x: x[1])
    top_results = all_results[:5]

    # Generate
    try:
        # Use the first pipeline's LLM client to generate
        llm_resp = pipelines[0].generate_answer(req.question, top_results)

        response_text = llm_resp.content
        if llm_resp.error:
            response_text = f"Error generating answer: {llm_resp.error}"

        # Save History
        # --- BUG FIX: Added 'score' field here ---
        results_formatted = [
            {"text": c.text, "source": c.source, "page": c.page, "score": s}
            for c, s in top_results
        ]
        # -----------------------------------------

        db.add_query_record(
            req.session_id, req.question, response_text, results_formatted
        )

        return {"response": response_text, "results": results_formatted}
    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        return {
            "response": "An unexpected error occurred.",
            "results": [],
            "error": str(e),
        }
