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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=settings.DATA_DIR), name="static")

# In-Memory Status (keyed by collection_id)
job_status: Dict[str, Dict] = {}

# --- Models ---
class CollectionCreate(BaseModel):
    name: str

class ProcessRequest(BaseModel):
    collection_id: int
    filename: str
    vision_model: str

class QueryRequest(BaseModel):
    collection_id: int
    question: str

# --- Pipeline Task ---
def run_pipeline_task(collection_id: int, filename: str, vision_model: str):
    cid = str(collection_id)
    try:
        job_status[cid] = {"status": "processing", "step": f"Processing {filename}...", "progress": 10}
        
        file_path = settings.UPLOAD_DIR / filename
        unique_folder = f"{uuid.uuid4()}_{filename}"
        output_dir = settings.CHARTS_DIR / unique_folder
        os.makedirs(output_dir, exist_ok=True)

        rag = SmartRAG(output_dir=output_dir, vision_model_name=vision_model)

        job_status[cid] = {"status": "processing", "step": "Parsing & Vision Analysis...", "progress": 30}
        rag.index_document(str(file_path))

        job_status[cid] = {"status": "processing", "step": "Saving Embeddings...", "progress": 80}
        
        # Save to Disk & DB
        doc_id = db.add_document_record(
            filename=filename,
            vision_model=vision_model,
            chart_dir=str(output_dir),
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            collection_id=collection_id,
        )
        
        faiss_path, chunks_path = rag.save_state(doc_id)
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        job_status[cid] = {"status": "completed", "step": "Ready!", "progress": 100}

    except Exception as e:
        logger.error(f"Pipeline failed for collection {cid}: {e}", exc_info=True)
        job_status[cid] = {"status": "error", "step": str(e), "progress": 0}

# --- Routes ---

@app.get("/")
def health_check():
    return {
        "status": "online", 
        "service": settings.SERVICE_NAME,
        "llm_model": settings.GEN_MODEL_NAME,
        "llm_provider": settings.LLM_PROVIDER
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_location = settings.UPLOAD_DIR / file.filename
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": "File saved", "path": str(file_location)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Collections ---
@app.get("/collections")
def get_collections():
    return [{"id": s['id'], "name": s['name'], "created_at": s['created_at'], "docs": s['docs']} 
            for s in db.get_all_collections()]

@app.post("/collections")
def create_collection(req: CollectionCreate):
    cid = db.create_collection(req.name)
    return {"id": cid, "name": req.name}

# --- NEW: Delete Collection Endpoint ---
@app.delete("/collections/{cid}")
def delete_collection(cid: int):
    db.delete_collection(cid)
    return {"status": "deleted", "id": cid}
# ---------------------------------------

@app.get("/collections/{cid}/status")
def get_status(cid: str):
    return job_status.get(str(cid), {"status": "idle", "step": "", "progress": 0})

# --- Documents ---
@app.post("/process")
def process_document(req: ProcessRequest, background_tasks: BackgroundTasks):
    file_path = settings.UPLOAD_DIR / req.filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    job_status[str(req.collection_id)] = {"status": "queued", "step": "Queued...", "progress": 5}
    background_tasks.add_task(run_pipeline_task, req.collection_id, req.filename, req.vision_model)
    return {"status": "queued"}

@app.get("/collections/{cid}/documents")
def get_documents(cid: int):
    return db.get_collection_documents(cid)

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int):
    db.delete_document(doc_id)
    return {"status": "deleted"}

@app.get("/collections/{cid}/charts")
def get_charts(cid: int):
    docs = db.get_collection_documents(cid)
    return ChartService.get_charts_for_session(docs) 

# --- Chat ---
@app.get("/collections/{cid}/history")
def get_history(cid: int):
    return db.get_queries_for_collection(cid)

@app.post("/query")
def query_collection(req: QueryRequest):
    docs = db.get_collection_documents(req.collection_id)
    if not docs:
        return {"response": "This collection has no documents.", "results": []}

    # Load pipelines for valid docs
    pipelines = []
    for doc in docs:
        if doc['faiss_index_path'] and os.path.exists(doc['faiss_index_path']):
            try:
                p = SmartRAG(output_dir=doc['chart_dir'])
                p.load_state(doc['faiss_index_path'], doc['chunks_path'])
                pipelines.append(p)
            except Exception as e:
                logger.error(f"Failed to load doc {doc['id']}: {e}")

    if not pipelines:
        return {"response": "Error loading document indexes.", "results": []}

    all_results = []
    for p in pipelines:
        all_results.extend(p.search(req.question, top_k=3))
    
    all_results.sort(key=lambda x: x[1])
    top_results = all_results[:5]

    try:
        llm_resp = pipelines[0].generate_answer(req.question, top_results)
        response_text = llm_resp.content or f"Error: {llm_resp.error}"

        results_formatted = [
            {"text": c.text, "source": c.source, "page": c.page, "score": s} 
            for c, s in top_results
        ]
        
        db.add_query_record(req.collection_id, req.question, response_text, results_formatted)
        
        return {
            "response": response_text,
            "results": results_formatted
        }
    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        return {"response": "An unexpected error occurred.", "results": [], "error": str(e)}