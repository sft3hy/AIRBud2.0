import os
import time
import pickle
import asyncio
import logging
import numpy as np
import faiss
from typing import List, Dict, Tuple, Optional
from threading import Lock

# Third-party
from sentence_transformers import SentenceTransformer

# Internal
from src.config import settings
from src.core.chunking import DocumentChunker
from src.core.services import ExternalServices
from src.core.llm import get_llm_client, BaseLLMClient
from src.core.data_models import Chunk
from src.utils.logger import logger


# --- Singleton Embedding Model ---
# Loading the model is expensive (RAM & CPU). We must do it once.
_embedding_model: Optional[SentenceTransformer] = None
_model_lock = Lock()

def get_embedding_model() -> SentenceTransformer:
    """
    Thread-safe singleton provider for the embedding model.
    """
    global _embedding_model
    if _embedding_model is None:
        with _model_lock:
            # Double-check locking pattern
            if _embedding_model is None:
                logger.info(f"Loading Embedding Model: {settings.EMBEDDING_MODEL} ...")
                # explicit device config for stability
                _embedding_model = SentenceTransformer(
                    settings.EMBEDDING_MODEL,
                    device="cpu", # Force CPU to avoid CUDA contention in web workers unless explicitly managed
                    model_kwargs={"low_cpu_mem_usage": True}
                )
                logger.info("Embedding Model loaded successfully.")
    return _embedding_model

# --- LRU Cache for FAISS Index & Chunks ---
# Avoiding repeated disk I/O on every query is critical for performance.
from collections import OrderedDict

# Cache structure: { faiss_path: (index, child_chunks, parent_map) }
_index_cache = OrderedDict()
_cache_lock = Lock()
CACHE_CAPACITY = 500

def get_cached_state(faiss_path: str):
    with _cache_lock:
        if faiss_path in _index_cache:
            # Move to end (most recently used)
            _index_cache.move_to_end(faiss_path)
            return _index_cache[faiss_path]
    return None

def put_cached_state(faiss_path: str, data: Tuple):
    with _cache_lock:
        if faiss_path in _index_cache:
            _index_cache.move_to_end(faiss_path)
        _index_cache[faiss_path] = data
        
        # Evict oldest
        if len(_index_cache) > CACHE_CAPACITY:
            _index_cache.popitem(last=False)


class SmartRAG:
    """
    Asynchronous RAG Pipeline.
    Handles document indexing, state management, and vector search.
    """

    def __init__(self, output_dir: str = None, vision_model_name: str = "Moondream2"):
        self.output_dir = output_dir
        self.vision_model_name = vision_model_name
        self.llm: BaseLLMClient = get_llm_client()
        self.chunker = DocumentChunker()
        
        # State containers
        self.index: Optional[faiss.Index] = None
        self.child_chunks: List[Chunk] = []
        self.parent_map: Dict[str, Chunk] = []
        self.chart_descriptions: Dict[str, str] = {}

    async def optimize_query(self, query: str) -> str:
        """
        Asynchronously rewrites the user query using the LLM.
        """
        return await self.llm.reword_query(query)

    async def index_document(self, file_path: str, status_callback=None) -> str:
        """
        Full indexing pipeline: Parse -> Analyze Images -> Transcribe Audio -> Chunk -> Embed -> Index.
        Runs blocking operations in thread pool to maintain async concurrency.
        """
        file_path_str = str(file_path)
        logger.info(f"Indexing document: {file_path_str}")

        # 1. Parse Layout (Blocking IO)
        # We assume ExternalServices are synchronous requests, so we offload them.
        data = await asyncio.to_thread(
            ExternalServices.parse_document, file_path_str, self.output_dir, status_callback
        )
        
        markdown_text = data.get("text", "")
        image_paths = data.get("images", [])
        audio_path = data.get("audio_path")

        # 2. Vision Analysis (Screenshots) - Parallelizable potentially, but kept serial for safety
        if image_paths:
            total_images = len(image_paths)
            logger.info(f"Analyzing {total_images} images...")
            
            for i, img_path in enumerate(image_paths):
                fname = os.path.basename(img_path)
                
                # Granular Status Update
                if status_callback: 
                    # Calculate progress: Vision takes 20% -> 40% (20 points total)
                    current_progress_increment = int((i / total_images) * 20)
                    status_callback(
                        "vision", 
                        f"Analyzing Image {i+1}/{total_images}", 
                        20 + current_progress_increment,
                        details={
                            "current_file": fname,
                            "current_image_idx": i + 1,
                            "total_images": total_images
                        }
                    )

                # Offload vision API call
                start_time = time.time()
                desc = await asyncio.to_thread(
                    ExternalServices.analyze_image, img_path, self.vision_model_name
                )
                duration = time.time() - start_time
                
                # Log completion
                if status_callback:
                    status_callback(
                        "vision", 
                        f"Analyzing Image {i+1}/{total_images}", 
                        20 + current_progress_increment,
                        details={
                            "log": f"Analyzed {fname} in {duration:.2f}s"
                        }
                    )

                self.chart_descriptions[fname] = desc
                
                # Visual context injection
                placeholder = f"[CHART_PLACEHOLDER:{fname}]"
                replacement = f"\n> **Visual Scene Analysis ({fname}):**\n> {desc}\n"
                markdown_text = markdown_text.replace(placeholder, replacement)

        # 3. Audio Transcription
        if audio_path:
            logger.info("Processing audio track...")
            if status_callback: status_callback("audio", "Transcribing Audio...", 40)
            
            transcript = await asyncio.to_thread(
                ExternalServices.transcribe_audio, audio_path
            )
            markdown_text += f"\n\n# FULL AUDIO TRANSCRIPT\n\n{transcript}"

        # 4. Chunking (CPU Bound)
        if status_callback: status_callback("indexing", "Chunking Text...", 60)
        
        self.child_chunks, self.parent_map = await asyncio.to_thread(
            self.chunker.process, markdown_text, file_path_str
        )

        # 5. Embeddings (Heavy CPU)
        if self.child_chunks:
            if status_callback: status_callback("indexing", "Generating Vectors...", 75)
            
            # Use singleton model
            model = get_embedding_model()
            texts = [c.text for c in self.child_chunks]
            
            # Offload inference
            embeddings = await asyncio.to_thread(model.encode, texts)
            
            # Create Index
            self.index = faiss.IndexFlatL2(settings.EMBEDDING_DIM)
            await asyncio.to_thread(
                self.index.add, np.array(embeddings).astype("float32")
            )
        else:
            logger.warning("No text chunks generated for document.")

        return markdown_text

    async def save_state(self, doc_id: int) -> Tuple[str, str]:
        """
        Persists FAISS index and chunk data to disk.
        """
        if not self.index: 
            return "", ""
            
        faiss_path = settings.FAISS_DIR / f"index_{doc_id}.faiss"
        chunks_path = settings.CHUNKS_DIR / f"chunks_{doc_id}.pkl"
        parents_path = settings.CHUNKS_DIR / f"parents_{doc_id}.pkl"

        # Offload file writes
        await asyncio.to_thread(self._write_state_sync, str(faiss_path), str(chunks_path), str(parents_path))
            
        return str(faiss_path), str(chunks_path)

    def _write_state_sync(self, faiss_path: str, chunks_path: str, parents_path: str):
        """Helper for synchronous file writing."""
        faiss.write_index(self.index, faiss_path)
        
        with open(chunks_path, "wb") as f:
            pickle.dump(self.child_chunks, f)
            
        with open(parents_path, "wb") as f:
            pickle.dump(self.parent_map, f)

    async def load_state(self, faiss_path: str, chunks_path: str):
        """
        Loads FAISS index and chunk data from disk or cache.
        """
        # 1. Check Cache
        cached = get_cached_state(faiss_path)
        if cached:
            self.index, self.child_chunks, self.parent_map = cached
            return

        # 2. Check Disk
        if not os.path.exists(faiss_path) or not os.path.exists(chunks_path):
            raise FileNotFoundError(f"Index files missing: {faiss_path} or {chunks_path}")
            
        # 3. Load & Cache
        await asyncio.to_thread(self._load_state_sync, faiss_path, chunks_path)
        put_cached_state(faiss_path, (self.index, self.child_chunks, self.parent_map))

    def _load_state_sync(self, faiss_path: str, chunks_path: str):
        """Helper for synchronous file reading."""
        self.index = faiss.read_index(faiss_path)
        
        with open(chunks_path, "rb") as f:
            self.child_chunks = pickle.load(f)
            
        parent_path = chunks_path.replace("chunks_", "parents_")
        if os.path.exists(parent_path):
            with open(parent_path, "rb") as f:
                self.parent_map = pickle.load(f)

    async def search(self, query: str, top_k: int = 5) -> List[Tuple[Chunk, float]]:
        """
        Performs semantic vector search.
        """
        if not self.index or not self.child_chunks:
            return []
        
        model = get_embedding_model()
        
        # 1. Encode Query (CPU)
        query_emb = await asyncio.to_thread(model.encode, [query])
        
        # 2. Search Index (CPU)
        # Search for 3x top_k to allow for parent-deduplication
        D, I = await asyncio.to_thread(
            self.index.search, np.array(query_emb).astype("float32"), top_k * 3
        )

        results = []
        seen_parents = set()

        # Process results
        for dist, idx in zip(D[0], I[0]):
            if idx < 0 or idx >= len(self.child_chunks):
                continue

            child = self.child_chunks[idx]
            
            # Retrieve Parent if available (Parent-Child Retrieval)
            if child.parent_id and child.parent_id in self.parent_map:
                if child.parent_id not in seen_parents:
                    parent = self.parent_map[child.parent_id]
                    results.append((parent, float(dist)))
                    seen_parents.add(child.parent_id)
            else:
                # Fallback to child if no parent or parent not found
                results.append((child, float(dist)))
                
            if len(results) >= top_k:
                break
                
        return results

    async def generate_answer(self, question: str, context_chunks: List[Tuple[Chunk, float]], graph_context: str = ""):
        """
        Generates answer using Hybrid Context (Vector + Graph) via the Async LLM.
        """
        # Build Vector Context
        vector_text = ""
        for chunk, score in context_chunks:
            vector_text += f"SOURCE: {chunk.source} (Page {chunk.page})\nCONTENT: {chunk.text}\n\n"

        # Build Hybrid Prompt
        prompt = (
            f"You are an intelligent research assistant. Answer the question using the provided context.\n\n"
            f"=== KNOWLEDGE GRAPH CONTEXT (Relationships & Entities) ===\n"
            f"{graph_context if graph_context else 'No graph data available.'}\n\n"
            f"=== DOCUMENT EXCERPTS (Detailed Text & Data) ===\n"
            f"{vector_text if vector_text else 'No relevant text found.'}\n\n"
            f"---\n"
            f"Question: {question}\n\n"
            f"Instructions:\n"
            f"1. Synthesize information from both the Graph and Documents.\n"
            f"2. If the Graph provides relationships/connections not explicit in the text, highlight them.\n"
            f"3. If the answer is not in the context, state that you don't know.\n"
            f"Answer:"
        )
        
        return await self.llm.generate(prompt)