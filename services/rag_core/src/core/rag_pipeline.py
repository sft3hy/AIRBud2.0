import os
import requests
import numpy as np
import faiss
import pickle
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
from src.core.chunking import DocumentChunker
from src.core.persistence import save_rag_state, load_rag_state
from src.core.llm_client import GroqClient, SanctuaryClient

PARSER_API = os.environ.get("PARSER_API_URL", "http://parser:8001")
VISION_API = os.environ.get("VISION_API_URL", "http://vision:8002")

client = SanctuaryClient()
if os.environ.get("TEST") == "True":
    client = GroqClient()


class SmartRAG:
    def __init__(self, output_dir, vision_model_name="Moondream2", load_vision=False):
        self.output_dir = output_dir
        self.vision_model_name = vision_model_name
        self.client = client
        self.embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.chunker = DocumentChunker()
        self.index = None
        self.child_chunks = []
        self.parent_map = {}
        self.chart_descriptions = {}

    def index_document(self, file_path):
        print(f"Indexing {file_path}...")

        # 1. Call Parser Service
        resp = requests.post(
            f"{PARSER_API}/parse",
            json={"file_path": file_path, "output_dir": self.output_dir},
        )
        if resp.status_code != 200:
            raise Exception(f"Parser failed: {resp.text}")

        data = resp.json()
        markdown_text = data["text"]
        image_paths = data["images"]

        # 2. Call Vision Service for each image
        for img_path in image_paths:
            fname = os.path.basename(img_path)
            prompt = "Analyze this image. Identify if it is a Chart, Table, or Diagram. Describe the data."

            try:
                v_resp = requests.post(
                    f"{VISION_API}/describe",
                    json={
                        "image_path": img_path,
                        "prompt": prompt,
                        "model_name": self.vision_model_name,
                    },
                )
                desc = v_resp.json().get("description", "")
                self.chart_descriptions[fname] = desc

                # Inject description into markdown
                placeholder = f"[CHART_PLACEHOLDER:{fname}]"
                replacement = f"\n> **Visual Analysis ({fname}):**\n> {desc}\n"
                markdown_text = markdown_text.replace(placeholder, replacement)
            except Exception as e:
                print(f"Vision failed for {fname}: {e}")

        # 3. Chunking
        self.child_chunks, self.parent_map = self.chunker.process(
            markdown_text, file_path
        )

        # 4. Embedding
        texts = [c.text for c in self.child_chunks]
        embeddings = self.embedding_model.encode(texts)

        # 5. Indexing
        self.index = faiss.IndexFlatL2(384)
        self.index.add(np.array(embeddings).astype("float32"))

    def save_state(self, doc_id):
        save_rag_state(doc_id, self.index, self.child_chunks)
        with open(f"data/chunks/{doc_id}_parents.pkl", "wb") as f:
            pickle.dump(self.parent_map, f)

    def load_state(self, faiss_path, chunks_path):
        self.index, self.child_chunks = load_rag_state(faiss_path, chunks_path)
        # Infer parent path
        base = os.path.dirname(chunks_path)
        doc_id = os.path.basename(chunks_path).split("_")[1].split(".")[0]
        parent_path = os.path.join(base, f"{doc_id}_parents.pkl")
        if os.path.exists(parent_path):
            with open(parent_path, "rb") as f:
                self.parent_map = pickle.load(f)

    def search(self, query, top_k=5):
        query_emb = self.embedding_model.encode([query])
        D, I = self.index.search(np.array(query_emb).astype("float32"), top_k * 3)

        results = []
        seen_parents = set()

        for dist, idx in zip(D[0], I[0]):
            if idx < len(self.child_chunks):
                child = self.child_chunks[idx]
                if child.parent_id and child.parent_id in self.parent_map:
                    if child.parent_id not in seen_parents:
                        parent = self.parent_map[child.parent_id]
                        results.append((parent, float(dist)))
                        seen_parents.add(child.parent_id)
                if len(results) >= top_k:
                    break
        return results

    def query_multiple(self, question, pipelines, top_k=5):
        # Gather results from all docs
        all_results = []
        for p in pipelines:
            all_results.extend(p.search(question, top_k=3))

        # Sort globally by score (distance)
        all_results.sort(key=lambda x: x[1])
        top_results = all_results[:top_k]

        # Build Context
        context = ""
        for chunk, score in top_results:
            context += f"SOURCE: {chunk.source}\nCONTENT: {chunk.text}\n\n---\n\n"

        # Generate
        prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer using the context provided."
        try:
            resp = self.client.create_chat_completion(
                model="meta-llama/llama-4-scout-17b-16e-instruct",  # Update model as needed
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1024,
            )
            answer = resp.choices[0].message.content

            return {
                "response": answer,
                "results": [
                    {"text": c.text, "source": c.source, "page": c.page}
                    for c, s in top_results
                ],
            }
        except Exception as e:
            return {"error": str(e)}
