import os
import pickle
import numpy as np
import faiss
from typing import List, Dict, Optional, Callable
from sentence_transformers import SentenceTransformer

from src.config import settings
from src.core.chunking import DocumentChunker
from src.core.services import ExternalServices
from src.core.llm import get_llm_client
from src.core.data_models import Chunk
from src.utils.logger import logger

class SmartRAG:
    def __init__(self, output_dir: str = None, vision_model_name: str = "Moondream2"):
        self.output_dir = output_dir
        self.vision_model_name = vision_model_name
        self.llm = get_llm_client()
        
        # CPU-only configuration to prevent Docker/Accelerate issues
        self.embedding_model = SentenceTransformer(
            settings.EMBEDDING_MODEL, 
            device="cpu",
            model_kwargs={"low_cpu_mem_usage": False} 
        )
        
        self.chunker = DocumentChunker()
        
        # State
        self.index = None
        self.child_chunks: List[Chunk] = []
        self.parent_map: Dict[str, Chunk] = {}
        self.chart_descriptions: Dict[str, str] = {}
        
    def optimize_query(self, query: str) -> str:
        """Wraps the LLM's rewording capability."""
        return self.llm.reword_query(query)

    def index_document(self, file_path: str, status_callback: Optional[Callable[[str, str, int], None]] = None) -> str:
        file_path_str = str(file_path)
        logger.info(f"Indexing document: {file_path_str}")
        
        # 1. Parse Layout
        if status_callback:
            status_callback("parsing", "Extracting text, layout, and assets...", 10)
            
        data = ExternalServices.parse_document(file_path_str, self.output_dir)
        markdown_text = data.get("text", "")
        image_paths = data.get("images", [])
        audio_path = data.get("audio_path") 

        # Calculate Workload
        total_images = len(image_paths)
        has_audio = bool(audio_path)
        
        if status_callback:
            found_msg = f"Found {total_images} visual element{'s' if total_images != 1 else ''}"
            if has_audio:
                found_msg += " & 1 audio track"
            status_callback("parsing", found_msg, 15)

        # 2. Vision Analysis (Screenshots / Charts)
        # We allocate progress from 20% to 70% for Vision/Audio
        start_prog = 20
        end_prog = 70
        
        if total_images > 0:
            # If we have audio, reserve 20% for it at the end
            vision_end = end_prog - 20 if has_audio else end_prog
            prog_per_image = (vision_end - start_prog) / total_images
            
            for i, img_path in enumerate(image_paths):
                fname = os.path.basename(img_path)
                
                if status_callback:
                    current_prog = int(start_prog + (i * prog_per_image))
                    status_callback("vision", f"Analyzing Visual {i+1}/{total_images}: {fname}", current_prog)
                
                desc = ExternalServices.analyze_image(img_path, self.vision_model_name)
                self.chart_descriptions[fname] = desc
                
                placeholder = f"[CHART_PLACEHOLDER:{fname}]"
                # Visual context injection
                replacement = f"\n> **Visual Scene Analysis ({fname}):**\n> {desc}\n"
                markdown_text = markdown_text.replace(placeholder, replacement)
        else:
            if status_callback and not has_audio:
                status_callback("vision", "No visuals detected, skipping vision step...", 20)

        # 3. Audio Transcription
        if audio_path:
            if status_callback:
                status_callback("vision", "Transcribing Audio Track (Whisper AI)...", 60)
            
            logger.info("Processing audio track...")
            transcript = ExternalServices.transcribe_audio(audio_path)
            markdown_text += f"\n\n# FULL AUDIO TRANSCRIPT\n\n{transcript}"
            
            if status_callback:
                status_callback("vision", "Audio Transcription Complete", 70)

        # 4. Chunking
        if status_callback:
            status_callback("indexing", "Splitting text into Parent-Child chunks...", 75)
            
        self.child_chunks, self.parent_map = self.chunker.process(markdown_text, file_path_str)

        # 5. Embeddings
        if self.child_chunks:
            if status_callback:
                status_callback("indexing", f"Generating Embeddings for {len(self.child_chunks)} chunks...", 80)
                
            texts = [c.text for c in self.child_chunks]
            embeddings = self.embedding_model.encode(texts)
            
            self.index = faiss.IndexFlatL2(settings.EMBEDDING_DIM)
            self.index.add(np.array(embeddings).astype("float32"))
        else:
            logger.warning("No text chunks generated for document.")

        return markdown_text

    def save_state(self, doc_id: int):
        if not self.index: 
            return "", ""
            
        faiss_path = settings.FAISS_DIR / f"index_{doc_id}.faiss"
        chunks_path = settings.CHUNKS_DIR / f"chunks_{doc_id}.pkl"
        parents_path = settings.CHUNKS_DIR / f"parents_{doc_id}.pkl"

        faiss.write_index(self.index, str(faiss_path))
        
        with open(chunks_path, "wb") as f:
            pickle.dump(self.child_chunks, f)
            
        with open(parents_path, "wb") as f:
            pickle.dump(self.parent_map, f)
            
        return str(faiss_path), str(chunks_path)

    def load_state(self, faiss_path: str, chunks_path: str):
        if not os.path.exists(faiss_path) or not os.path.exists(chunks_path):
            raise FileNotFoundError("Index files missing")
            
        self.index = faiss.read_index(faiss_path)
        with open(chunks_path, "rb") as f:
            self.child_chunks = pickle.load(f)
            
        # Try load parents
        parent_path = chunks_path.replace("chunks_", "parents_")
        if os.path.exists(parent_path):
            with open(parent_path, "rb") as f:
                self.parent_map = pickle.load(f)

    def search(self, query: str, top_k: int = 5):
        """Vector search implementation."""
        if not self.index: return []
        
        query_emb = self.embedding_model.encode([query])
        D, I = self.index.search(np.array(query_emb).astype("float32"), top_k * 3)

        results = []
        seen_parents = set()

        for dist, idx in zip(D[0], I[0]):
            if idx < len(self.child_chunks):
                child = self.child_chunks[idx]
                
                # Retrieve Parent if available (Parent-Child Retrieval)
                if child.parent_id and child.parent_id in self.parent_map:
                    if child.parent_id not in seen_parents:
                        parent = self.parent_map[child.parent_id]
                        results.append((parent, float(dist)))
                        seen_parents.add(child.parent_id)
                else:
                    # Fallback to child
                    results.append((child, float(dist)))
                    
                if len(results) >= top_k:
                    break
        return results

    def generate_answer(self, question: str, context_chunks: List, graph_context: str = ""):
        """
        Generates answer using Hybrid Context (Vector + Graph).
        """
        # Build Vector Context
        vector_text = ""
        for chunk, score in context_chunks:
            vector_text += f"SOURCE: {chunk.source} (Page {chunk.page})\nCONTENT: {chunk.text}\n\n"

        # Build Hybrid Prompt
        prompt = f"""You are an intelligent research assistant. Answer the question using the provided context.

=== KNOWLEDGE GRAPH CONTEXT (Relationships & Entities) ===
{graph_context if graph_context else "No graph data available."}

=== DOCUMENT EXCERPTS (Detailed Text & Data) ===
{vector_text if vector_text else "No relevant text found."}

---
Question: {question}

Instructions:
1. Synthesize information from both the Graph and Documents.
2. If the Graph provides relationships/connections not explicit in the text, highlight them.
3. If the answer is not in the context, state that you don't know.
Answer:"""
        
        return self.llm.generate(prompt)