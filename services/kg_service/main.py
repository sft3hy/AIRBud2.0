from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict
from src.extractor import GraphExtractor
from src.graph_store import Neo4jStore

app = FastAPI(title="Knowledge Graph Service")
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
    triples = extractor.extract_triples(text)
    print(f"Extracted {len(triples)} triples for doc {doc_id}")
    graph_store.insert_triples(triples, doc_id, collection_id)

@app.post("/ingest")
def ingest_text(req: IngestRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_ingest, req.text, req.doc_id, req.collection_id)
    return {"status": "processing"}

@app.post("/search")
def search_graph(req: SearchRequest):
    results = graph_store.search_subgraph(req.query, req.collection_id)
    # Context string for LLM
    context_str = ""
    for r in results:
        context_str += f"{r['source']} {r['rel']} {r['target']}\n"
    # Return both raw data (for UI attribution) and context string (for LLM)
    return {"context": context_str, "raw": results}

# --- NEW: Full Graph Visualization Endpoint ---
@app.get("/collections/{cid}/graph")
def get_full_graph(cid: int):
    # Fetch all nodes and relationships for this collection
    # We limit to 500 relationships to prevent browser crash on huge graphs
    cypher = """
    MATCH (s:Entity)-[r:RELATED]->(t:Entity)
    WHERE (s)-[:MENTIONED_IN]->(:Document {collection_id: $cid})
    RETURN s.name as source, r.type as rel, t.name as target, s.type as source_type, t.type as target_type
    LIMIT 500
    """
    with graph_store.driver.session() as session:
        result = session.run(cypher, cid=cid)
        data = [record.data() for record in result]
        
    # Transform for React Force Graph ({ nodes: [], links: [] })
    nodes = {}
    links = []
    
    for row in data:
        # Add Nodes if not exist
        if row['source'] not in nodes:
            nodes[row['source']] = {"id": row['source'], "group": "Entity", "type": row.get('source_type', 'Unknown')}
        if row['target'] not in nodes:
            nodes[row['target']] = {"id": row['target'], "group": "Entity", "type": row.get('target_type', 'Unknown')}
            
        # Add Link
        links.append({
            "source": row['source'],
            "target": row['target'],
            "label": row['rel']
        })
        
    return {"nodes": list(nodes.values()), "links": links}
# ----------------------------------------------

@app.delete("/collections/{cid}")
def delete_collection(cid: int):
    graph_store.delete_collection(cid)
    return {"status": "deleted"}