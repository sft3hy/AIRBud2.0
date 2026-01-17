from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # <--- Import this
from pydantic import BaseModel
from typing import List, Dict
from src.extractor import GraphExtractor
from src.graph_store import Neo4jStore

app = FastAPI(title="Knowledge Graph Service")

# --- FIX: Enable CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (Frontend is on 5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------

extractor = GraphExtractor()
graph_store = Neo4jStore()

class IngestRequest(BaseModel):
    text: str
    doc_id: int
    collection_id: int

class SearchRequest(BaseModel):
    query: str
    collection_id: int

@app.on_event("shutdown")
def shutdown():
    graph_store.close()

@app.get("/health")
def health():
    try:
        # Simple connectivity check
        with graph_store.driver.session() as session:
            session.run("RETURN 1")
        return {"status": "online", "neo4j": "connected"}
    except Exception as e:
        # Return 503 if DB is down so RAG Core knows
        raise HTTPException(status_code=503, detail=f"Neo4j Disconnected: {str(e)}")

def process_ingest(text: str, doc_id: int, collection_id: int):
    # Extract entities
    triples = extractor.extract_triples(text)
    print(f"Extracted {len(triples)} triples for doc {doc_id}")
    # Write to DB
    graph_store.insert_triples(triples, doc_id, collection_id)

@app.post("/ingest")
def ingest_text(req: IngestRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_ingest, req.text, req.doc_id, req.collection_id)
    return {"status": "processing"}

@app.post("/search")
def search_graph(req: SearchRequest):
    results = graph_store.search_subgraph(req.query, req.collection_id)
    context_str = ""
    for r in results:
        context_str += f"{r['source']} {r['rel']} {r['target']}\n"
    return {"context": context_str, "raw": results}

@app.get("/collections/{cid}/graph")
def get_full_graph(cid: int):
    # CHANGED: We now collect 'id' instead of 'original_filename'
    # This works for ALL docs (old and new) because 'id' is always present on Document nodes.
    cypher = """
    MATCH (s:Entity)-[r:RELATED]->(t:Entity)
    WHERE (s)-[:MENTIONED_IN]->(:Document {collection_id: $cid})
    
    OPTIONAL MATCH (s)-[:MENTIONED_IN]->(ds:Document {collection_id: $cid})
    OPTIONAL MATCH (t)-[:MENTIONED_IN]->(dt:Document {collection_id: $cid})
    
    RETURN 
        s.name as source, 
        s.type as source_type, 
        collect(distinct ds.id) as source_doc_ids,
        r.type as rel, 
        t.name as target, 
        t.type as target_type,
        collect(distinct dt.id) as target_doc_ids
    LIMIT 750
    """
    try:
        with graph_store.driver.session() as session:
            result = session.run(cypher, cid=cid)
            data = [record.data() for record in result]
            
        nodes = {}
        links = []
        
        for row in data:
            # Process Source Node
            if row['source'] not in nodes:
                nodes[row['source']] = {
                    "id": row['source'], 
                    "group": "Entity", 
                    "type": row.get('source_type', 'Unknown'),
                    # Store IDs, frontend will map to names
                    "doc_ids": row.get('source_doc_ids', []) 
                }
            
            # Process Target Node
            if row['target'] not in nodes:
                nodes[row['target']] = {
                    "id": row['target'], 
                    "group": "Entity", 
                    "type": row.get('target_type', 'Unknown'),
                    # Store IDs, frontend will map to names
                    "doc_ids": row.get('target_doc_ids', [])
                }
                
            links.append({
                "source": row['source'],
                "target": row['target'],
                "label": row['rel']
            })
            
        return {"nodes": list(nodes.values()), "links": links}
    except Exception as e:
        print(f"Graph Fetch Error: {e}")
        return {"nodes": [], "links": []}
      
@app.delete("/collections/{cid}")
def delete_collection(cid: int):
    graph_store.delete_collection(cid)
    return {"status": "deleted"}

@app.delete("/documents/{doc_id}")
def delete_document_nodes(doc_id: int):
    graph_store.delete_document(doc_id)
    return {"status": "deleted"}