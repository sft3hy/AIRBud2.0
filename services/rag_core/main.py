import os
import uuid
import shutil
import traceback
import asyncio
import httpx
import json
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger
from src.core.pipeline import SmartRAG
from src.core.services import ChartService
from src.core.auth import auth_handler

# --- Configuration & State ---

KG_SERVICE_URL = os.getenv("KG_SERVICE_URL", "http://kg-service:8003")

# Global Job Status Tracker
# Global Job Status Tracker - MOVED TO DB
# job_status: Dict[str, Dict] = {}

# DB Instance
db = DatabaseManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Service Startup: Checking directories...")
    for d in [settings.UPLOAD_DIR, settings.CHARTS_DIR, settings.FAISS_DIR, settings.CHUNKS_DIR]:
        os.makedirs(d, exist_ok=True)
    yield
    logger.info("Service Shutdown.")

app = FastAPI(title="AIRBud 2.0 API", version=settings.VERSION, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=settings.DATA_DIR), name="static")

# --- Models ---
class CollectionCreate(BaseModel):
    name: str
    group_id: Optional[int] = None

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
    
class GroupUpdateRequest(BaseModel):
    name: str
    description: str

# --- Helper: Safe DB Check ---
def _check_db_sync() -> bool:
    try:
        with db.get_cursor() as cur:
            cur.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Health Check DB Error: {e}")
        return False

# --- Async Background Task ---

async def run_pipeline_task(collection_id: int, filename: str, vision_model: str):
    cid = str(collection_id)
    is_video = filename.lower().endswith('.mp4')

    from datetime import datetime

    def update_status(stage: str, step: str, progress: int, details: Optional[Dict] = None):
        # Fetch current logs to append (Read-Modify-Write pattern isn't atomic here but acceptable for logs)
        # Ideally, we'd just push to a list in DB, but JSONB append is tricky in standard SQL without logic.
        # For simplicity, we fetch mostly for the logs.
        current = db.get_job_status(collection_id) or {}
        current_details = current.get("details") or {}
        logs = current_details.get("logs") or []
        
        new_details = current_details.copy()
        if details:
            if "log" in details:
                ts = datetime.now().strftime("%H:%M:%S")
                logs.append(f"[{ts}] {details['log']}")
            new_details.update(details)
        
        # Always inject current filename context
        new_details["current_file"] = filename
        
        new_details["logs"] = logs

        db.upsert_job_status(
            collection_id,
            "processing",
            stage,
            step,
            progress,
            new_details
        )

    try:
        init_step = f"Extracting Media ({filename})..." if is_video else f"Analyzing Layout ({filename})..."
        update_status("parsing", init_step, 5)
        
        file_path = settings.UPLOAD_DIR / filename
        unique_folder = f"{uuid.uuid4()}_{filename}"
        output_dir = settings.CHARTS_DIR / unique_folder
        
        logger.info(f"Pipeline starting for: {filename} (Path: {file_path})")
        os.makedirs(output_dir, exist_ok=True)

        rag = SmartRAG(output_dir=output_dir, vision_model_name=vision_model)
        
        markdown_text = await rag.index_document(str(file_path), status_callback=update_status)

        # NEW: Save Markdown Preview
        preview_filename = f"preview_{uuid.uuid4()}.md"
        preview_path = settings.PREVIEWS_DIR / preview_filename
        with open(preview_path, "w", encoding="utf-8") as f:
            f.write(markdown_text)

        update_status("indexing", "Finalizing Vector Index...", 85)    

        doc_id = await asyncio.to_thread(
            db.add_document_record,
            filename=filename,
            vision_model=vision_model,
            chart_dir=str(output_dir),
            faiss_path="",
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            collection_id=collection_id,
            preview_path=str(preview_path) # Pass the path

        )
        
        if not settings.EPHEMERAL_MODE:
            try:
                update_status("graph", "Extracting Entities...", 90)
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{KG_SERVICE_URL}/ingest",
                        json={
                            "text": markdown_text[:100000],
                            "doc_id": doc_id,
                            "collection_id": collection_id
                        }
                    )
            except Exception as e:
                logger.error(f"Failed to trigger KG ingest: {e}")
        else:
            logger.info("Skipping KG Ingestion (Ephemeral Mode)")

        faiss_path, chunks_path = await rag.save_state(doc_id)
        await asyncio.to_thread(db.update_document_paths, doc_id, faiss_path, chunks_path)

        # Mark as completed
        db.upsert_job_status(
            collection_id,
            "completed",
            "done",
            "Processing Complete!",
            100,
            {"logs": ["Processing Finished Successfully."]}
        )
        
        # Cleanup status after delay (allow frontend to poll 'completed')
        await asyncio.sleep(30) 
        # Check if still completed (hasn't been overwritten by new job)
        final_check = db.get_job_status(collection_id)
        if final_check and final_check.get("status") == "completed":
            db.delete_job_status(collection_id)

    except Exception as e:
        logger.error(f"Pipeline failed for collection {cid}: {e}", exc_info=True)
        db.upsert_job_status(
            collection_id,
            "error",
            "error",
            str(e),
            0,
            {"error": str(e)}
        )

# --- Service Health Check ---

@app.get("/health")
def health_check_simple():
    return {"status": "online"}

async def check_http_service(name: str, url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            return "online" if resp.status_code == 200 else "degraded"
    except Exception as e:
        logger.error(f"Health check failed for {name} at {url}: {e}")
        return "offline"

@app.get("/")
async def health_check(request: Request):
    user = auth_handler.get_current_user(request)
    
    postgres_status = "offline"
    try:
        is_up = await asyncio.to_thread(_check_db_sync)
        if is_up:
            postgres_status = "online"
    except Exception:
        pass

    checks = [
        check_http_service("Parser", f"{settings.PARSER_API_URL}/health"),
        check_http_service("Vision", f"{settings.VISION_API_URL}/health")
    ]
    
    if not settings.EPHEMERAL_MODE:
        checks.insert(0, check_http_service("KG", f"{KG_SERVICE_URL}/health"))
        
    results = await asyncio.gather(*checks)
    
    kg_idx = 0 if not settings.EPHEMERAL_MODE else -1
    parser_idx = 1 if not settings.EPHEMERAL_MODE else 0
    vision_idx = 2 if not settings.EPHEMERAL_MODE else 1

    services = {
        "Rag Core (API)": "online",
        "PostgreSQL": postgres_status if not settings.EPHEMERAL_MODE else "online (N/A)",
        "Knowledge Graph": results[kg_idx] if not settings.EPHEMERAL_MODE else "online (N/A)",
        "Parser (Layout)": results[parser_idx],
        "Vision (AI)": results[vision_idx],
    }
    
    system_healthy = all("online" in s for s in services.values())
    
    return {
        "status": "online" if system_healthy else "outage",
        "service": settings.SERVICE_NAME,
        "user": user,
        "dependencies": services
    }

# --- Collections API ---

@app.get("/collections")
def get_collections(user: Dict = Depends(auth_handler.require_user)):
    return db.get_all_collections(user['id'])

@app.post("/collections")
def create_collection(req: CollectionCreate, user: Dict = Depends(auth_handler.require_user)):
    cid = db.create_collection(req.name, user['id'], req.group_id)
    return {"id": cid, "name": req.name, "owner": user['cn']}

@app.delete("/collections/{cid}")
def delete_collection(cid: int, user: Dict = Depends(auth_handler.require_user)):
    success = db.delete_collection(cid, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        asyncio.create_task(cleanup_kg_collection(cid))
    except: 
        pass
    return {"status": "deleted", "id": cid}

async def cleanup_kg_collection(cid: int):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.delete(f"{KG_SERVICE_URL}/collections/{cid}")
    except Exception as e:
        logger.warning(f"Failed async KG cleanup: {e}")

@app.put("/collections/{cid}")
def rename_collection_endpoint(cid: int, req: RenameRequest, user: Dict = Depends(auth_handler.require_user)):
    success = db.rename_collection(cid, req.name, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"status": "updated", "name": req.name}

# --- Document Processing ---

@app.post("/upload")
def upload_file(file: UploadFile = File(...), user: Dict = Depends(auth_handler.require_user)):
    try:
        filename = os.path.basename(file.filename)
        allowed = {'.pdf', '.pptx', '.docx', '.txt', '.md', '.mp4', '.xlsx'} 
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_location = settings.UPLOAD_DIR / filename
        
        logger.info(f"Saving upload to: {file_location}")
        
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        return {"info": "File saved", "path": str(file_location)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("UPLOAD CRASHED")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@app.post("/process")
def process_document(req: ProcessRequest, background_tasks: BackgroundTasks, user: Dict = Depends(auth_handler.require_user)):
    filename = req.filename
    logger.info(f"Process request received for collection {req.collection_id}, file: {filename}")
    
    file_path = settings.UPLOAD_DIR / filename
    
    # Check absolute existence and try unquoting if first attempt fails
    if not os.path.exists(file_path):
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        if decoded_filename != filename:
            logger.info(f"File not found as '{filename}', trying decoded: '{decoded_filename}'")
            filename = decoded_filename
            file_path = settings.UPLOAD_DIR / filename

    if not os.path.exists(file_path):
        # Specific handling for "Split Brain" state (DB has record, Disk does not)
        error_msg = (
            f"File '{filename}' exists in the database but was not found on disk. "
            "This often happens after a system redeployment where the database persisted but the file storage was reset. "
            "Please DELETE this document/collection and RE-UPLOAD the file."
        )
        logger.error(f"Process failed: {error_msg}. Disk content: {os.listdir(settings.UPLOAD_DIR) if os.path.exists(settings.UPLOAD_DIR) else 'DIR_MISSING'}")
        raise HTTPException(
            status_code=404, 
            detail=error_msg
        )

    cid_str = str(req.collection_id)
    
    # Check if job already running
    current_job = db.get_job_status(req.collection_id)
    
    if current_job:
        status = current_job.get("status")
        if status in ["queued", "processing"]:
            logger.warning(f"Rejected double process request for {cid_str} (Status: {status})")
            return {"status": "already_queued", "message": "Job running"}

    # Initialize status in DB
    db.upsert_job_status(
        req.collection_id, 
        "queued", 
        "Initializing...", 
        "Initiating Pipeline", 
        5, 
        {"logs": []}
    )
    
    background_tasks.add_task(run_pipeline_task, req.collection_id, filename, req.vision_model)
    return {"status": "queued"}

@app.get("/collections/{cid}/status")
def get_status(cid: str, user: Dict = Depends(auth_handler.require_user)):
    try:
        collection_id = int(cid)
        # Fetch from DB
        status = db.get_job_status(collection_id)
        if status:
            return status
        return {"status": "idle", "step": "", "progress": 0}
    except ValueError:
        return {"status": "error", "step": "Invalid ID", "progress": 0}

# --- Query System ---

@app.post("/query")
async def query_collection(req: QueryRequest, user: Dict = Depends(auth_handler.require_user)):
    
    async def generate():
        try:
            docs = await asyncio.to_thread(db.get_collection_documents, req.collection_id)
            
            if not docs:
                yield json.dumps({"result": {"response": "This collection has no documents.", "results": []}}) + "\n"
                return

            yield json.dumps({"step": "Loading Indexes..."}) + "\n"
            
            pipelines: List[SmartRAG] = []
            
            async def load_doc(doc):
                if doc['faiss_index_path'] and os.path.exists(doc['faiss_index_path']):
                    try:
                        p = SmartRAG(output_dir=doc['chart_dir'])
                        await p.load_state(doc['faiss_index_path'], doc['chunks_path'])
                        return p
                    except Exception as e:
                        logger.error(f"Failed to load doc {doc['id']}: {e}")
                return None

            loaded_pipelines = await asyncio.gather(*[load_doc(d) for d in docs])
            pipelines = [p for p in loaded_pipelines if p is not None]

            if not pipelines:
                yield json.dumps({"result": {"response": "Error loading document indexes.", "results": []}}) + "\n"
                return

            yield json.dumps({"step": "Optimizing Query..."}) + "\n"
            search_query = await pipelines[0].optimize_query(req.question)

            yield json.dumps({"step": "Scanning Vectors..."}) + "\n"
            
            async def search_pipeline(p):
                return await p.search(search_query, top_k=3)

            results_list = await asyncio.gather(*[search_pipeline(p) for p in pipelines])
            
            all_results = []
            for res in results_list:
                all_results.extend(res)
            
            all_results.sort(key=lambda x: x[1])
            top_results = all_results[:5]

            graph_context = ""
            graph_results_raw = []
            
            if not settings.EPHEMERAL_MODE:
                yield json.dumps({"step": "Consulting Knowledge Graph..."}) + "\n"
                try:
                    async with httpx.AsyncClient(timeout=4.0) as client:
                        kg_resp = await client.post(
                            f"{KG_SERVICE_URL}/search",
                            json={"query": search_query, "collection_id": req.collection_id}
                        )
                        if kg_resp.status_code == 200:
                            data = kg_resp.json()
                            graph_context = data.get("context", "")
                            graph_results_raw = data.get("raw", [])
                except Exception as e:
                    logger.error(f"KG Search failed: {e}")
            else:
                logger.debug("Skipping KG Search (Ephemeral Mode)")

            yield json.dumps({"step": "Synthesizing Answer..."}) + "\n"
            
            llm_resp = await pipelines[0].generate_answer(
                req.question, 
                top_results, 
                graph_context=graph_context
            )
            response_text = llm_resp.content or f"Error: {llm_resp.error}"

            results_formatted = [
                {"type": "text", "text": c.text, "source": c.source, "page": c.page, "score": float(s)} 
                for c, s in top_results
            ]
            
            for g in graph_results_raw:
                results_formatted.append({
                    "type": "graph",
                    "text": f"{g['source']} --[{g['rel']}]--> {g['target']}",
                    "source": "Knowledge Graph",
                    "score": 1.0
                })
            
            await asyncio.to_thread(
                db.add_query_record, 
                req.collection_id, 
                user['id'], 
                req.question, 
                response_text, 
                results_formatted
            )
            
            yield json.dumps({"result": {"response": response_text, "results": results_formatted}}) + "\n"

        except Exception as e:
            logger.error(f"Query error: {e}", exc_info=True)
            yield json.dumps({"result": {"response": "Error generating answer.", "results": [], "error": str(e)}}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson", headers={"X-Accel-Buffering": "no"})

# --- Document Management ---

@app.get("/collections/{cid}/documents")
def get_documents(cid: int, user: Dict = Depends(auth_handler.require_user)):
    return db.get_collection_documents(cid)

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, user: Dict = Depends(auth_handler.require_user)):
    doc_info = db.get_document_ownership(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc_info['owner_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the collection owner can delete documents.")

    doc = db.get_document_by_id(doc_id)
    if doc:
        for path in [doc['faiss_index_path'], doc['chunks_path']]:
            if path and os.path.exists(path):
                try: os.remove(path)
                except OSError: pass
        if doc['chunks_path']:
             p_path = doc['chunks_path'].replace("chunks_", "parents_")
             if os.path.exists(p_path): 
                 try: os.remove(p_path)
                 except: pass
        if doc['chart_dir'] and os.path.exists(doc['chart_dir']):
             try: shutil.rmtree(doc['chart_dir'])
             except: pass

    try:
        asyncio.create_task(cleanup_kg_document(doc_id))
    except:
        pass

    db.delete_document(doc_id)
    return {"status": "deleted"}

async def cleanup_kg_document(doc_id: int):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.delete(f"{KG_SERVICE_URL}/documents/{doc_id}")
    except:
        pass

@app.get("/collections/{cid}/charts")
def get_charts(cid: int, user: Dict = Depends(auth_handler.require_user)):
    docs = db.get_collection_documents(cid)
    return ChartService.get_charts_for_session(docs) 

@app.get("/collections/{cid}/history")
def get_history(cid: int, user: Dict = Depends(auth_handler.require_user)):
    return db.get_queries_for_collection(cid, user['id'])

@app.get("/documents/{doc_id}/preview")
def get_document_preview(doc_id: int, user: Dict = Depends(auth_handler.require_user)):
    """
    Returns the raw markdown content of the document.
    """
    # 1. Check ownership via DB
    doc_info = db.get_document_ownership(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Optional: Check if user owns the collection or is in the group. 
    # (Simplified here assuming get_document_ownership check + existing user session is sufficient context)
    
    doc = db.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    path = doc.get("preview_path")
    
    if not path or not os.path.exists(path):
        # Fallback for old documents created before this feature
        return {"content": "# Preview Not Available\n\nThis document was processed before the preview feature was enabled."}
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        logger.error(f"Error reading preview file: {e}")
        raise HTTPException(status_code=500, detail="Could not read preview file")

# --- Groups API ---

@app.get("/groups")
def get_my_groups(user: Dict = Depends(auth_handler.require_user)):
    return db.get_user_groups(user['id'])

@app.get("/groups/public")
def get_public_groups(user: Dict = Depends(auth_handler.require_user)):
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

@app.post("/groups/{gid}/leave")
def leave_group(gid: int, user: Dict = Depends(auth_handler.require_user)):
    success = db.leave_group(gid, user['id'])
    if not success:
        raise HTTPException(status_code=400, detail="Cannot leave group (Owner must delete)")
    return {"status": "left"}

@app.put("/groups/{gid}")
def update_group_endpoint(gid: int, req: GroupUpdateRequest, user: Dict = Depends(auth_handler.require_user)):
    success = db.update_group(gid, req.name, req.description, user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"status": "updated", "name": req.name, "description": req.description}

