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
from fastapi.responses import JSONResponse, StreamingResponse

import json
import time

from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger
from src.core.pipeline import SmartRAG
from src.core.services import ChartService
from src.core.auth import auth_handler

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

job_status: Dict[str, Dict] = {}
KG_SERVICE_URL = "http://kg_service:8003"

# --- Models ---
class CollectionCreate(BaseModel):
    name: str
    group_id: Optional[int] = None # NEW

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: bool = False

class ProcessRequest(BaseModel):
    collection_id: int
    filename: str
    vision_model: str

class QueryRequest(BaseModel):
    collection_id: int
    question: str

class RenameRequest(BaseModel):
    name: str

# --- Pipeline Task (Identical to before) ---
def run_pipeline_task(collection_id: int, filename: str, vision_model: str):
    cid = str(collection_id)
    try:
        # 1. PARSING
        job_status[cid] = {
            "status": "processing", 
            "stage": "parsing", # <--- NEW
            "step": f"Analyzing Layout & Structure ({filename})...", 
            "progress": 10
        }
        
        file_path = settings.UPLOAD_DIR / filename
        unique_folder = f"{uuid.uuid4()}_{filename}"
        output_dir = settings.CHARTS_DIR / unique_folder
        os.makedirs(output_dir, exist_ok=True)

        # Initialize
        rag = SmartRAG(output_dir=output_dir, vision_model_name=vision_model)

        # 2. VISION & OCR
        # We hook into index_document, but for simplicity here we update before calling it
        # ideally SmartRAG would callback, but we'll simulate the transition
        job_status[cid]["stage"] = "vision"
        job_status[cid]["step"] = "Generating image descriptions..."
        job_status[cid]["progress"] = 70
        
        markdown_text = rag.index_document(str(file_path))

        # 3. VECTOR INDEXING
        job_status[cid] = {
            "status": "processing", 
            "stage": "indexing", 
            "step": "Generating Embeddings & Vector Index...", 
            "progress": 80
        }
        
        doc_id = db.add_document_record(
            filename=filename,
            vision_model=vision_model,
            chart_dir=str(output_dir),
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            collection_id=collection_id,
        )

        time.sleep(2)
        
        # 4. KNOWLEDGE GRAPH
        try:
            job_status[cid] = {
                "status": "processing", 
                "stage": "graph", 
                "step": "Extracting Entities & Relationships...", 
                "progress": 90
            }
            requests.post(
                f"{KG_SERVICE_URL}/ingest",
                json={
                    "text": markdown_text[:100000],
                    "doc_id": doc_id,
                    "collection_id": collection_id
                },
                timeout=5
            )
            time.sleep(2)
        except Exception as e:
            logger.error(f"Failed to trigger KG ingest: {e}")

        # Finalize
        faiss_path, chunks_path = rag.save_state(doc_id)
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        job_status[cid] = {"status": "completed", "stage": "done", "step": "Ready!", "progress": 100}

    except Exception as e:
        logger.error(f"Pipeline failed for collection {cid}: {e}", exc_info=True)
        job_status[cid] = {"status": "error", "stage": "error", "step": str(e), "progress": 0}

# --- Routes ---

@app.get("/")
def health_check(request: Request):
    user = auth_handler.get_current_user(request)
    return {
        "status": "online", 
        "service": settings.SERVICE_NAME,
        "user": user
    }

@app.get("/auth/debug")
def auth_debug(request: Request):
    headers = dict(request.headers)
    debug_info = {
        "x-subject-dn": headers.get("x-subject-dn", "MISSING"),
        "x-client-verify": headers.get("x-client-verify", "MISSING"),
        "test_mode": settings.TEST_MODE
    }
    return debug_info

# --- GROUPS API (NEW) ---

@app.get("/groups")
def get_my_groups(user: Dict = Depends(auth_handler.require_user)):
    """Groups I am a member of"""
    return db.get_user_groups(user['id'])

@app.get("/groups/public")
def get_public_groups(user: Dict = Depends(auth_handler.require_user)):
    """Groups I am NOT a member of that are public"""
    return db.get_public_groups(user['id'])

@app.post("/groups")
def create_group(req: GroupCreate, user: Dict = Depends(auth_handler.require_user)):
    gid, token = db.create_group(req.name, req.description, req.is_public, user['id'])
    return {"id": gid, "token": token, "status": "created"}

@app.post("/groups/join/{token}")
def join_group_via_link(token: str, user: Dict = Depends(auth_handler.require_user)):
    gid = db.join_group_by_token(user['id'], token)
    if not gid:
        raise HTTPException(status_code=404, detail="Invalid token")
    return {"id": gid, "status": "joined"}

@app.post("/groups/public/{gid}/join")
def join_public_group(gid: int, user: Dict = Depends(auth_handler.require_user)):
    success = db.join_group_by_id(user['id'], gid)
    if not success:
        raise HTTPException(status_code=403, detail="Group not found or not public")
    return {"status": "joined"}

@app.delete("/groups/{gid}")
def delete_group(gid: int, user: Dict = Depends(auth_handler.require_user)):
    success = db.delete_group(gid, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or group not found")
    return {"status": "deleted"}

# --- COLLECTIONS API (Updated) ---

@app.get("/collections")
def get_collections(user: Dict = Depends(auth_handler.require_user)):
    return db.get_all_collections(user['id']) # Updated to filter by user access

@app.post("/collections")
def create_collection(req: CollectionCreate, user: Dict = Depends(auth_handler.require_user)):
    # Pass optional group_id
    cid = db.create_collection(req.name, user['id'], req.group_id)
    return {"id": cid, "name": req.name, "owner": user['cn']}

@app.delete("/collections/{cid}")
def delete_collection(cid: int, user: Dict = Depends(auth_handler.require_user)):
    try:
        requests.delete(f"{KG_SERVICE_URL}/collections/{cid}", timeout=3)
    except:
        pass
    db.delete_collection(cid)
    return {"status": "deleted", "id": cid}

@app.get("/collections/{cid}/status")
def get_status(cid: str, user: Dict = Depends(auth_handler.require_user)):
    return job_status.get(str(cid), {"status": "idle", "step": "", "progress": 0})

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: Dict = Depends(auth_handler.require_user)):
    try:
        # 1. Sanitize Filename (Remove directories)
        filename = os.path.basename(file.filename)
        
        # 2. Ensure Directory Exists (Fixes volume mount race conditions)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        file_location = settings.UPLOAD_DIR / filename
        
        logger.info(f"Saving upload to: {file_location}")

        # 3. Write File
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        return {"info": "File saved", "path": str(file_location)}
        
    except Exception as e:
        # 4. Log the full crash
        logger.error("UPLOAD CRASHED")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

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
    # 1. Get File Paths
    doc = db.get_document_by_id(doc_id)
    if doc:
        # Remove FAISS Index
        if doc['faiss_index_path'] and os.path.exists(doc['faiss_index_path']):
            try:
                os.remove(doc['faiss_index_path'])
            except OSError: 
                pass # Ignore if already gone

        # Remove Chunks
        if doc['chunks_path'] and os.path.exists(doc['chunks_path']):
            try:
                os.remove(doc['chunks_path'])
            except OSError:
                pass
                
        # Remove Parent Chunks Map (if exists)
        parent_path = doc['chunks_path'].replace("chunks_", "parents_") if doc['chunks_path'] else ""
        if parent_path and os.path.exists(parent_path):
            try:
                os.remove(parent_path)
            except OSError:
                pass

        # Remove Chart Directory (Images)
        if doc['chart_dir'] and os.path.exists(doc['chart_dir']):
            try:
                shutil.rmtree(doc['chart_dir'])
            except OSError:
                pass

    # 2. Delete from Knowledge Graph
    try:
        requests.delete(f"{KG_SERVICE_URL}/documents/{doc_id}", timeout=3)
    except Exception as e:
        logger.error(f"Failed to delete graph nodes for doc {doc_id}: {e}")

    # 3. Delete from SQL DB
    db.delete_document(doc_id)
    return {"status": "deleted"}

@app.get("/collections/{cid}/charts")
def get_charts(cid: int, user: Dict = Depends(auth_handler.require_user)):
    docs = db.get_collection_documents(cid)
    return ChartService.get_charts_for_session(docs) 

@app.get("/collections/{cid}/history")
def get_history(cid: int, user: Dict = Depends(auth_handler.require_user)):
    return db.get_queries_for_collection(cid)

@app.post("/query")
async def query_collection(req: QueryRequest, user: Dict = Depends(auth_handler.require_user)):
    """
    Streams status updates and finally the result using NDJSON.
    Format:
    {"step": "Scanning..."}
    {"step": "Thinking..."}
    {"result": { ...final_response... }}
    """
    
    def generate():
        # 1. Validation
        docs = db.get_collection_documents(req.collection_id)
        if not docs:
            yield json.dumps({"result": {"response": "This collection has no documents.", "results": []}}) + "\n"
            return

        # 2. Vector Setup
        yield json.dumps({"step": "Loading Vector Index..."}) + "\n"
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
            yield json.dumps({"result": {"response": "Error loading document indexes.", "results": []}}) + "\n"
            return

        # 3. Vector Search
        yield json.dumps({"step": "Scanning Semantic Vectors..."}) + "\n"
        all_results = []
        for p in pipelines:
            all_results.extend(p.search(req.question, top_k=3))
        
        all_results.sort(key=lambda x: x[1])
        top_results = all_results[:5]

        # 4. Knowledge Graph
        yield json.dumps({"step": "Traversing Knowledge Graph..."}) + "\n"
        graph_context = ""
        graph_results_raw = []
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

        # 5. LLM Generation
        yield json.dumps({"step": "Synthesizing Answer with LLM..."}) + "\n"
        try:
            llm_resp = pipelines[0].generate_answer(
                req.question, 
                top_results, 
                graph_context=graph_context
            )
            response_text = llm_resp.content or f"Error: {llm_resp.error}"

            results_formatted = [
                {"type": "text", "text": c.text, "source": c.source, "page": c.page, "score": s} 
                for c, s in top_results
            ]
            
            for g in graph_results_raw:
                results_formatted.append({
                    "type": "graph",
                    "text": f"{g['source']} --[{g['rel']}]--> {g['target']}",
                    "source": "Knowledge Graph",
                    "score": 1.0
                })
            
            # Save to DB
            db.add_query_record(req.collection_id, req.question, response_text, results_formatted)
            
            # Final Yield
            yield json.dumps({"result": {
                "response": response_text,
                "results": results_formatted
            }}) + "\n"

        except Exception as e:
            logger.error(f"Query error: {e}", exc_info=True)
            yield json.dumps({"result": {"response": "An unexpected error occurred.", "results": [], "error": str(e)}}) + "\n"

    # X-Accel-Buffering: no is crucial for Nginx to stream chunks immediately
    return StreamingResponse(generate(), media_type="application/x-ndjson", headers={"X-Accel-Buffering": "no"})
    
@app.put("/collections/{cid}")
def rename_collection_endpoint(cid: int, req: RenameRequest, user: Dict = Depends(auth_handler.require_user)):
    success = db.rename_collection(cid, req.name, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or collection not found")
    return {"status": "updated", "name": req.name}

@app.put("/groups/{gid}")
def rename_group_endpoint(gid: int, req: RenameRequest, user: Dict = Depends(auth_handler.require_user)):
    success = db.rename_group(gid, req.name, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or group not found")
    return {"status": "updated", "name": req.name}