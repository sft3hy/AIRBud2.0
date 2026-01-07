import os
import shutil
import uuid
import traceback
from typing import List, Optional
import glob
import json
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import your custom modules
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
    """
    Receives a file from the React frontend and saves it to the shared volume.
    """
    try:
        file_location = os.path.join(UPLOAD_DIR, file.filename)

        # Save file to disk
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


@app.post("/process")
def process_document(req: ProcessRequest):
    """
    Triggers the RAG pipeline: Parser -> Vision -> Embedding.
    NOTE: This is a long-running synchronous process.
    """
    file_path = os.path.join(UPLOAD_DIR, req.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found at {file_path}")

    # Generate a unique directory for charts
    # We use uuid to prevent collisions if same filename uploaded twice
    unique_folder = f"{uuid.uuid4()}_{req.filename}"
    output_dir = os.path.join(CHARTS_DIR, unique_folder)
    os.makedirs(output_dir, exist_ok=True)

    print(f"🚀 Starting processing for {req.filename} using {req.vision_model}")

    try:
        # 1. Initialize Pipeline
        rag = SmartRAG(output_dir=output_dir, vision_model_name=req.vision_model)

        # 2. Index (Calls Parser Microservice -> Vision Microservice -> Local Embeds)
        rag.index_document(file_path)

        # 3. Add initial record to DB
        doc_id = db.add_document_record(
            filename=req.filename,
            vision_model=req.vision_model,
            chart_dir=output_dir,
            faiss_path="",  # Placeholder, updated below
            chunks_path="",  # Placeholder, updated below
            chart_descriptions=rag.chart_descriptions,
            session_id=req.session_id,
        )

        # 4. Save FAISS Index and Chunks to disk
        rag.save_state(doc_id)

        # 5. Update DB with the specific paths where FAISS/Chunks were saved
        # Note: SmartRAG.save_state usually saves to data/faiss_indexes/...
        # We need to ensure these paths match what your SmartRAG class actually does.
        faiss_path = f"/app/data/faiss_indexes/index_{doc_id}.faiss"
        chunks_path = f"/app/data/chunks/chunks_{doc_id}.pkl"

        db.update_document_paths(doc_id, faiss_path, chunks_path)

        return {"status": "success", "doc_id": doc_id}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/query")
def query(req: QueryRequest):
    """
    Orchestrates a query across all documents in the session.
    """
    # 1. Get docs
    docs = db.get_session_documents(req.session_id)
    if not docs:
        return {"response": "No documents found in this session.", "results": []}

    pipelines = []

    # 2. Re-hydrate RAG pipelines for each document
    # (In a production app, we would cache these in memory to avoid reloading FAISS every time)
    try:
        for doc in docs:
            # We don't need to load the vision model again for querying, just the vector store
            p = SmartRAG(output_dir=doc["chart_dir"], load_vision=False)

            # Check if files exist before loading
            if os.path.exists(doc["faiss_index_path"]) and os.path.exists(
                doc["chunks_path"]
            ):
                p.load_state(doc["faiss_index_path"], doc["chunks_path"])
                pipelines.append(p)
            else:
                print(
                    f"⚠️ Warning: Index files missing for doc {doc.get('original_filename')}"
                )

        if not pipelines:
            return {
                "response": "Error: Document indexes could not be loaded.",
                "results": [],
            }

        # 3. Execute Query
        # Use the first pipeline instance to drive the multi-doc logic
        result = pipelines[0].query_multiple(req.question, pipelines)

        if "error" not in result:
            db.add_query_record(
                req.session_id, req.question, result["response"], result["results"]
            )

        return result

    except Exception as e:
        traceback.print_exc()
        return {
            "response": "An error occurred during generation.",
            "results": [],
            "error": str(e),
        }
