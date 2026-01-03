from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import uuid
from src.core.rag_pipeline import SmartRAG
from src.utils.db_utils import DatabaseManager

app = FastAPI()
db = DatabaseManager(db_path="/app/data/history.db")


# Models
class SessionCreate(BaseModel):
    filenames: List[str]


class ProcessRequest(BaseModel):
    session_id: int
    filename: str
    vision_model: str


class QueryRequest(BaseModel):
    session_id: int
    question: str


@app.get("/sessions")
def get_sessions():
    return [
        {"id": s[0], "name": s[1], "date": s[2], "docs": s[3]}
        for s in db.get_all_sessions()
    ]


@app.post("/sessions")
def create_session(req: SessionCreate):
    session_id = db.create_session(req.filenames)
    return {"session_id": session_id}


@app.get("/sessions/{session_id}/history")
def get_history(session_id: int):
    return db.get_queries_for_session(session_id)

@app.get("/sessions/{session_id}/documents")
def get_session_documents(session_id: int):
    docs = db.get_session_documents(session_id)
    # Ensure chart_descriptions are parsed from JSON string if necessary
    # (The db_utils usually handles this, but good to be safe)
    return docs


@app.post("/process")
def process_document(req: ProcessRequest):
    file_path = f"/app/data/uploads/{req.filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found in uploads")

    # Initialize RAG Pipeline
    output_dir = f"/app/data/charts/{uuid.uuid4()}_{req.filename}"
    os.makedirs(output_dir, exist_ok=True)

    rag = SmartRAG(output_dir=output_dir, vision_model_name=req.vision_model)

    try:
        # Index (Calls Parser -> Vision -> Embeds)
        rag.index_document(file_path)

        # Save State
        doc_id = db.add_document_record(
            filename=req.filename,
            vision_model=req.vision_model,
            chart_dir=output_dir,
            faiss_path="",  # Updated in save_state
            chunks_path="",
            chart_descriptions=rag.chart_descriptions,
            session_id=req.session_id,
        )

        rag.save_state(doc_id)

        # Update DB paths
        faiss_path = f"data/faiss_indexes/index_{doc_id}.faiss"
        chunks_path = f"data/chunks/chunks_{doc_id}.pkl"
        db.update_document_paths(doc_id, faiss_path, chunks_path)

        return {"status": "success", "doc_id": doc_id}
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
def query(req: QueryRequest):
    # Load all documents for this session
    docs = db.get_session_documents(req.session_id)
    if not docs:
        return {"response": "No documents found in this session."}

    pipelines = []
    for doc in docs:
        p = SmartRAG(output_dir=doc["chart_dir"], load_vision=False)
        p.load_state(doc["faiss_index_path"], doc["chunks_path"])
        pipelines.append(p)

    if not pipelines:
        raise HTTPException(status_code=500, detail="Failed to load pipelines")

    # Orchestrate Multi-Doc Query
    # Use the first pipeline instance to run the multi-doc logic
    result = pipelines[0].query_multiple(req.question, pipelines)

    if "error" not in result:
        db.add_query_record(
            req.session_id, req.question, result["response"], result["results"]
        )

    return result
