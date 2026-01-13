import os
import uuid
import shutil
import traceback
import requests
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.responses import JSONResponse # Add this

from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger
from src.core.pipeline import SmartRAG
from src.core.services import ChartService
from src.core.auth import auth_handler  # <--- Import Auth

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
KG_SERVICE_URL = "http://kg_service:8003"

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

        # 1. Parse & Index (Local Vector)
        job_status[cid] = {"status": "processing", "step": "Parsing & Vision Analysis...", "progress": 30}
        markdown_text = rag.index_document(str(file_path))

        job_status[cid] = {"status": "processing", "step": "Saving Embeddings...", "progress": 80}
        
        # 2. Save to DB (Get ID)
        doc_id = db.add_document_record(
            filename=filename,
            vision_model=vision_model,
            chart_dir=str(output_dir),
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            collection_id=collection_id,
        )
        
        # 3. Trigger Graph Ingestion
        # We send the text to KG Service to extract entities/relationships asynchronously
        try:
            job_status[cid] = {"status": "processing", "step": "Updating Knowledge Graph...", "progress": 90}
            requests.post(
                f"{KG_SERVICE_URL}/ingest",
                json={
                    "text": markdown_text[:100000],  # Limit payload just in case
                    "doc_id": doc_id,
                    "collection_id": collection_id
                },
                timeout=5  # Fire and forget (kg_service handles background)
            )
            logger.info(f"Triggered KG ingestion for doc {doc_id}")
        except Exception as e:
            logger.error(f"Failed to trigger KG ingest: {e}")
            # Don't fail the whole job if KG fails

        # 4. Save Vector State
        faiss_path, chunks_path = rag.save_state(doc_id)
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        job_status[cid] = {"status": "completed", "step": "Ready!", "progress": 100}

    except Exception as e:
        logger.error(f"Pipeline failed for collection {cid}: {e}", exc_info=True)
        job_status[cid] = {"status": "error", "step": str(e), "progress": 0}

# --- Routes ---

# 1. PUBLIC ROUTE (Allows Guest)
@app.get("/")
def health_check(request: Request):
    user = auth_handler.get_current_user(request)
    return {
        "status": "online", 
        "service": settings.SERVICE_NAME,
        "user": user  # Frontend checks this. If id=0, show Login Page.
    }

# 2. PROTECTED ROUTES (Require Smart Card)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: Dict = Depends(auth_handler.require_user)):
    try:
        file_location = settings.UPLOAD_DIR / file.filename
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": "File saved", "path": str(file_location)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Collections ---
@app.get("/collections")
def get_collections(user: Dict = Depends(auth_handler.require_user)):
    # In future, we can filter by user['id'] here
    return [{"id": s['id'], "name": s['name'], "created_at": s['created_at'], "docs": s['docs'], "owner": s.get('owner_name')} 
            for s in db.get_all_collections()]

@app.post("/collections")
def create_collection(req: CollectionCreate, user: Dict = Depends(auth_handler.require_user)):
    cid = db.create_collection(req.name, user['id'])  # Pass Owner ID
    print(user)
    return {"id": cid, "name": req.name, "owner": user['cn']}

@app.delete("/collections/{cid}")
def delete_collection(cid: int, user: Dict = Depends(auth_handler.require_user)):
    # Also notify KG service to delete graph data
    try:
        requests.delete(f"{KG_SERVICE_URL}/collections/{cid}", timeout=3)
    except:
        pass
    db.delete_collection(cid)
    return {"status": "deleted", "id": cid}

@app.get("/collections/{cid}/status")
def get_status(cid: str, user: Dict = Depends(auth_handler.require_user)):
    return job_status.get(str(cid), {"status": "idle", "step": "", "progress": 0})

# --- Documents ---
@app.post("/process")
def process_document(req: ProcessRequest, background_tasks: BackgroundTasks, user: Dict = Depends(auth_handler.require_user)):
    file_path = settings.UPLOAD_DIR / req.filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    job_status[str(req.collection_id)] = {"status": "queued", "step": "Queued...", "progress": 5}
    background_tasks.add_task(run_pipeline_task, req.collection_id, req.filename, req.vision_model)
    return {"status": "queued"}

@app.get("/collections/{cid}/documents")
def get_documents(cid: int, user: Dict = Depends(auth_handler.require_user)):
    return db.get_collection_documents(cid)

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, user: Dict = Depends(auth_handler.require_user)):
    db.delete_document(doc_id)
    return {"status": "deleted"}

@app.get("/collections/{cid}/charts")
def get_charts(cid: int, user: Dict = Depends(auth_handler.require_user)):
    docs = db.get_collection_documents(cid)
    return ChartService.get_charts_for_session(docs) 

# --- Chat ---
@app.get("/collections/{cid}/history")
def get_history(cid: int, user: Dict = Depends(auth_handler.require_user)):
    return db.get_queries_for_collection(cid)

@app.get("/auth/debug")
def auth_debug(request: Request):
    """
    Returns raw headers relevant to Auth to diagnose Nginx/Cert issues.
    """
    headers = dict(request.headers)
    
    # Filter for relevant headers to return safely
    debug_info = {
        "x-subject-dn": headers.get("x-subject-dn", "MISSING"),
        "x-client-verify": headers.get("x-client-verify", "MISSING"),
        "x-real-ip": headers.get("x-real-ip", "MISSING"),
        "host": headers.get("host", "MISSING"),
        "test_mode": settings.TEST_MODE
    }
    return debug_info

@app.post("/query")
def query_collection(req: QueryRequest, user: Dict = Depends(auth_handler.require_user)):
    docs = db.get_collection_documents(req.collection_id)
    if not docs:
        return {"response": "This collection has no documents.", "results": []}

    # 1. Load Vector Pipelines
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

    # 2. Vector Search (Aggregated)
    all_results = []
    for p in pipelines:
        all_results.extend(p.search(req.question, top_k=3))
    
    all_results.sort(key=lambda x: x[1])
    top_results = all_results[:5]

    # 3. Knowledge Graph Search (Remote)
    graph_context = ""
    graph_results_raw = []  # Store raw data
    try:
        kg_resp = requests.post(
            f"{KG_SERVICE_URL}/search",
            json={"query": req.question, "collection_id": req.collection_id},
            timeout=3
        )
        if kg_resp.status_code == 200:
            data = kg_resp.json()
            graph_context = data.get("context", "")
            graph_results_raw = data.get("raw", [])
    except Exception as e:
        logger.error(f"KG Search failed: {e}")

    # 4. Generate Answer (Hybrid)
    try:
        llm_resp = pipelines[0].generate_answer(
            req.question, 
            top_results, 
            graph_context=graph_context
        )
        
        response_text = llm_resp.content or f"Error: {llm_resp.error}"

        # Combine results with a 'type' field
        # Vector results
        results_formatted = [
            {"type": "text", "text": c.text, "source": c.source, "page": c.page, "score": s} 
            for c, s in top_results
        ]
        
        # Add Graph results
        for g in graph_results_raw:
            results_formatted.append({
                "type": "graph",
                "text": f"{g['source']} --[{g['rel']}]--> {g['target']}",
                "source": "Knowledge Graph",
                "score": 1.0  # High confidence for graph facts
            })
        
        db.add_query_record(req.collection_id, req.question, response_text, results_formatted)
        
        return {
            "response": response_text,
            "results": results_formatted
        }
    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        return {"response": "An unexpected error occurred.", "results": [], "error": str(e)}