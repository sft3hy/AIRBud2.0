from fastapi import FastAPI, BackgroundTasks
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
    return {"status": "online", "neo4j": "connected"}

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
    cypher = """
    MATCH (s:Entity)-[r:RELATED]->(t:Entity)
    WHERE (s)-[:MENTIONED_IN]->(:Document {collection_id: $cid})
    RETURN s.name as source, r.type as rel, t.name as target, s.type as source_type, t.type as target_type
    LIMIT 500
    """
    try:
        with graph_store.driver.session() as session:
            result = session.run(cypher, cid=cid)
            data = [record.data() for record in result]
            
        nodes = {}
        links = []
        
        for row in data:
            if row['source'] not in nodes:
                nodes[row['source']] = {"id": row['source'], "group": "Entity", "type": row.get('source_type', 'Unknown')}
            if row['target'] not in nodes:
                nodes[row['target']] = {"id": row['target'], "group": "Entity", "type": row.get('target_type', 'Unknown')}
                
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