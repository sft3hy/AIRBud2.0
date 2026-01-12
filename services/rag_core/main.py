import os
import shutil
import uuid
import traceback
from typing import List, Dict
import glob
import json

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.core.rag_pipeline import SmartRAG
from src.utils.db_utils import DatabaseManager

# --- Configuration ---
DATA_DIR = "/app/data"
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
CHARTS_DIR = os.path.join(DATA_DIR, "charts")

# Ensure directories exist on startup
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHARTS_DIR, exist_ok=True)

# --- App Initialization ---
app = FastAPI(title="Smart RAG API", version="2.0")
db = DatabaseManager(db_path=os.path.join(DATA_DIR, "history.db"))

# --- Middleware (CORS) ---
# Allows the React frontend (running on port 5173) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files ---
# Mounts /app/data to /static so React can load images via URL
# e.g. http://localhost:8000/static/charts/xyz/image.png
app.mount("/static", StaticFiles(directory=DATA_DIR), name="static")
job_status: Dict[str, Dict] = {}


# --- Pydantic Models ---
class SessionCreate(BaseModel):
    filenames: List[str]


class ProcessRequest(BaseModel):
    session_id: int
    filename: str
    vision_model: str


class QueryRequest(BaseModel):
    session_id: int
    question: str


# --- Endpoints ---


@app.get("/sessions/{session_id}/charts")
def get_session_charts(session_id: int):
    """
    Scans for charts AND matches them with descriptions from the DB.
    """
    docs = db.get_session_documents(session_id)
    charts = []

    base_url = "http://localhost:8000/static"

    for doc in docs:
        chart_dir = doc.get("chart_dir")

        # 1. Parse descriptions safely
        # They might be stored as a JSON string or a dict depending on DB state
        descriptions = doc.get("chart_descriptions", {})
        if isinstance(descriptions, str):
            try:
                descriptions = json.loads(descriptions)
            except:
                descriptions = {}

        # 2. Find files
        if chart_dir and os.path.exists(chart_dir):
            search_path = os.path.join(chart_dir, "**", "*.png")
            files = glob.glob(search_path, recursive=True)

            for f in files:
                try:
                    filename = os.path.basename(f)
                    rel_path = os.path.relpath(f, "/app/data")
                    url = f"{base_url}/{rel_path}"

                    # Extract page number
                    import re

                    page_match = re.search(r"page(\d+)", filename)
                    page_num = int(page_match.group(1)) if page_match else 0

                    # 3. Lookup Description
                    # We try exact match, then match without extension
                    desc = descriptions.get(filename)
                    if not desc:
                        desc = descriptions.get(
                            os.path.splitext(filename)[0], "No description available."
                        )

                    charts.append(
                        {
                            "url": url,
                            "filename": filename,
                            "doc_name": doc.get("original_filename", "Unknown"),
                            "page": page_num,
                            "description": desc,  # <--- Added this field
                        }
                    )
                except ValueError:
                    continue

    charts.sort(key=lambda x: (x["doc_name"], x["page"]))
    return charts


@app.get("/")
def health_check():
    return {"status": "online", "service": "rag_core"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": "File saved successfully", "path": file_location}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.get("/sessions")
def get_sessions():
    """Returns list of past sessions."""
    try:
        results = db.get_all_sessions()
        # Map tuple to dict for JSON response
        return [{"id": s[0], "name": s[1], "date": s[2], "docs": s[3]} for s in results]
    except Exception as e:
        print(f"DB Error: {e}")
        return []


@app.post("/sessions")
def create_session(req: SessionCreate):
    """Creates a new session entry in the DB."""
    session_id = db.create_session(req.filenames)
    return {"session_id": session_id}


@app.get("/sessions/{session_id}/history")
def get_history(session_id: int):
    """Returns chat history for a specific session."""
    return db.get_queries_for_session(session_id)


@app.get("/sessions/{session_id}/documents")
def get_session_documents(session_id: int):
    """Returns all documents processed in this session."""
    return db.get_session_documents(session_id)


@app.get("/sessions/{session_id}/status")
def get_session_status(session_id: str):
    """Frontend polls this to get updates."""
    return job_status.get(
        str(session_id), {"status": "idle", "step": "", "progress": 0}
    )


# --- BACKGROUND WORKER ---
def run_pipeline_task(session_id: int, filename: str, vision_model: str):
    sid = str(session_id)
    try:
        # 1. Update Status
        job_status[sid] = {
            "status": "processing",
            "step": "Initializing Pipeline...",
            "progress": 10,
        }

        file_path = os.path.join(UPLOAD_DIR, filename)
        unique_folder = f"{uuid.uuid4()}_{filename}"
        output_dir = os.path.join(CHARTS_DIR, unique_folder)
        os.makedirs(output_dir, exist_ok=True)

        rag = SmartRAG(output_dir=output_dir, vision_model_name=vision_model)

        # 2. Update Status: Parsing
        job_status[sid] = {
            "status": "processing",
            "step": "Parsing Document Layout...",
            "progress": 25,
        }

        # Note: We can't easily hook into rag.index_document internals without modifying it,
        # but we can update status before/after major blocks if you broke them up.
        # For now, we assume this step takes the bulk of time.

        # 3. Update Status: Vision
        # We simulate a "step" update here. In a deeper refactor, you'd pass a callback to SmartRAG.
        # Since this call blocks, the UI will stay on "Parsing/Analyzing" for a while.
        rag.index_document(file_path)

        # 4. Update Status: Saving
        job_status[sid] = {
            "status": "processing",
            "step": "Generating Embeddings...",
            "progress": 80,
        }

        doc_id = db.add_document_record(
            filename=filename,
            vision_model=vision_model,
            chart_dir=output_dir,
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            session_id=session_id,
        )

        rag.save_state(doc_id)

        faiss_path = f"/app/data/faiss_indexes/index_{doc_id}.faiss"
        chunks_path = f"/app/data/chunks/chunks_{doc_id}.pkl"
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        # 5. Done
        job_status[sid] = {"status": "completed", "step": "Ready!", "progress": 100}

    except Exception as e:
        traceback.print_exc()
        job_status[sid] = {"status": "error", "step": str(e), "progress": 0}


@app.post("/process")
def process_document(req: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Now returns immediately and runs logic in background.
    """
    file_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Set initial status
    job_status[str(req.session_id)] = {
        "status": "queued",
        "step": "Queued for processing...",
        "progress": 5,
    }

    # Dispatch to background
    background_tasks.add_task(
        run_pipeline_task, req.session_id, req.filename, req.vision_model
    )

    return {"status": "queued", "message": "Processing started in background"}


@app.post("/query")
def query(req: QueryRequest):
    docs = db.get_session_documents(req.session_id)
    if not docs:
        return {"response": "No documents found in this session.", "results": []}

    pipelines = []
    try:
        for doc in docs:
            p = SmartRAG(output_dir=doc["chart_dir"], load_vision=False)
            if os.path.exists(doc["faiss_index_path"]) and os.path.exists(
                doc["chunks_path"]
            ):
                p.load_state(doc["faiss_index_path"], doc["chunks_path"])
                pipelines.append(p)

        if not pipelines:
            return {
                "response": "Error: Document indexes could not be loaded.",
                "results": [],
            }

        result = pipelines[0].query_multiple(req.question, pipelines)
        if "error" not in result:
            db.add_query_record(
                req.session_id, req.question, result["response"], result["results"]
            )
        return result
    except Exception as e:
        traceback.print_exc()
        return {"response": "An error occurred.", "results": [], "error": str(e)}
