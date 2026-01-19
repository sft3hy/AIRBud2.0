
import os
import re
import logging
from typing import List, Tuple, Dict
from uuid import uuid4

# Use settings for limits if available, else default to safe constants

try:
    from src.config import settings
    # Default to 500MB limit if not specified in settings
    MAX_DOCUMENT_SIZE_CHARS = getattr(settings, "MAX_DOCUMENT_SIZE_CHARS", 500 * 1024 * 1024)
except ImportError:
    MAX_DOCUMENT_SIZE_CHARS = 500 * 1024 * 1024

from src.core.data_models import Chunk
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.utils.logger import logger

class DocumentChunker:
    """
    Implements the Parent-Child chunking strategy with Page awareness.
    Designed to be thread-safe and scalable. Enforces input limits to prevent
    resource exhaustion (DoS) during text processing.
    """

    # Pre-compile regex for performance during high concurrency
    # Capture group () is essential for re.split to retain the delimiter
    PAGE_MARKER_PATTERN = re.compile(r"(## Page \d+)")

    def __init__(
        self,
        child_chunk_size: int = 400,
        child_chunk_overlap: int = 50,
        parent_chunk_size: int = 2000,
        parent_chunk_overlap: int = 200,
    ):
        """
        Initialize text splitters. 
        RecursiveCharacterTextSplitter is stateless for processing, so these instances
        can be safely shared across threads if this class is used as a singleton.
        """
        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=child_chunk_size,
            chunk_overlap=child_chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )
        self.parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=parent_chunk_size,
            chunk_overlap=parent_chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )

    def process(self, text: str, source: str) -> Tuple[List[Chunk], Dict[str, Chunk]]:
        """
        Splits a document into parent and child chunks based on page delimiters.
        
        Args:
            text (str): The full document text.
            source (str): The filename or source identifier.

        Returns:
            Tuple[List[Chunk], Dict[str, Chunk]]: (Child Chunks, Parent Map)
        
        Raises:
            ValueError: If document exceeds maximum safe size.
        """
        # 1. Input Validation & Security limits
        if not text:
            return [], {}
        
        if len(text) > MAX_DOCUMENT_SIZE_CHARS:
            msg = f"Document {source} exceeds size limit ({len(text)} > {MAX_DOCUMENT_SIZE_CHARS})"
            logger.error(msg)
            raise ValueError("Document too large to process safely.")

        filename = os.path.basename(str(source))
        parent_map: Dict[str, Chunk] = {}
        child_chunks: List[Chunk] = []

        try:
            # 2. Split text by page markers
            # re.split with capturing group returns: [pre_text, marker, post_text, marker, ...]
            parts = self.PAGE_MARKER_PATTERN.split(text)
            
            # Iterate through parts to associate content with page numbers
            current_page = 0
            i = 0
            n = len(parts)

            while i < n:
                part = parts[i]
                
                # Check if current part is a Page Marker
                marker_match = self.PAGE_MARKER_PATTERN.match(part)

                if marker_match:
                    # Update current page
                    # part string format is "## Page 123"
                    try:
                        # Split by space to get number safely
                        page_num_str = part.rsplit(' ', 1)[-1]
                        current_page = int(page_num_str)
                    except (ValueError, IndexError):
                        logger.warning(f"Malformed page marker in {source}: '{part}'. Continuing with page {current_page}.")

                    # The next part in the list is the content for this page
                    if i + 1 < n:
                        content = parts[i+1]
                        if content.strip():
                            self._chunk_page_text(
                                content, filename, current_page, parent_map, child_chunks
                            )
                        # Skip the content part in next iteration
                        i += 2
                    else:
                        i += 1
                else:
                    # Handle Preamble or text before the first page marker
                    if part.strip():
                        # Assign to page 0 if no page marker seen yet
                        self._chunk_page_text(
                            part, filename, current_page, parent_map, child_chunks
                        )
                    i += 1

        except Exception as e:
            logger.error(f"Error chunking document {source}: {e}", exc_info=True)
            raise

        logger.info(f"Chunking complete for {source}: {len(parent_map)} parents, {len(child_chunks)} children.")
        return child_chunks, parent_map

    def _chunk_page_text(
        self, 
        text: str, 
        source: str, 
        page: int, 
        parent_map: Dict[str, Chunk], 
        child_chunks: List[Chunk]
    ) -> None:
        """
        Helper to process a single page's text into Parent and Child chunks.
        Updates parent_map and child_chunks in place.
        """
        # 1. Create Parent Chunks
        parent_docs = self.parent_splitter.create_documents([text])

        for p_idx, p_doc in enumerate(parent_docs):
            parent_id = str(uuid4())
            
            # Create Parent Chunk Object
            parent_chunk = Chunk(
                text=p_doc.page_content,
                source=source,
                page=page,
                chunk_id=parent_id,
                is_parent=True,
                metadata={"index": p_idx},
                parent_id=None 
            )
            parent_map[parent_id] = parent_chunk

            # 2. Create Child Chunks (Strictly within the Parent context)
            child_docs = self.child_splitter.create_documents([p_doc.page_content])
            
            for c_doc in child_docs:
                child_id = str(uuid4())
                child_chunk = Chunk(
                    text=c_doc.page_content,
                    source=source,
                    page=page,
                    chunk_id=child_id,
                    parent_id=parent_id,
                    is_parent=False,
                    metadata={}
                )
                child_chunks.append(child_chunk)