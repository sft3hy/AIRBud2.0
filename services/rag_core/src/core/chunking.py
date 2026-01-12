import os
import re
from typing import List, Tuple, Dict
from src.core.data_models import Chunk
from langchain_text_splitters import RecursiveCharacterTextSplitter
from uuid import uuid4


class DocumentChunker:
    """
    Implements the Parent-Child chunking strategy with Page awareness.
    """

    def __init__(
        self,
        child_chunk_size: int = 400,
        child_chunk_overlap: int = 50,
        parent_chunk_size: int = 2000,
        parent_chunk_overlap: int = 200,
    ):
        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=child_chunk_size,
            chunk_overlap=child_chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        self.parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=parent_chunk_size,
            chunk_overlap=parent_chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def process(self, text: str, source: str) -> Tuple[List[Chunk], Dict[str, Chunk]]:
        filename = os.path.basename(str(source))
        parent_map = {}
        child_chunks = []

        # 1. Split by Page Markers (## Page X)
        # The parser outputs: "## Page 1\nContent..."
        # We regex split but keep the delimiters to know the page number
        parts = re.split(r"(## Page \d+)", text)

        current_page = 0
        page_buffer = ""

        for part in parts:
            if not part.strip():
                continue

            # Check if this part is a page marker
            page_match = re.match(r"## Page (\d+)", part)
            if page_match:
                # Process the previous page buffer
                if page_buffer:
                    self._chunk_page_text(
                        page_buffer, filename, current_page, parent_map, child_chunks
                    )

                # Start new page
                current_page = int(page_match.group(1))
                page_buffer = ""
            else:
                # Accumulate content
                page_buffer += part

        # Process final buffer
        if page_buffer:
            self._chunk_page_text(
                page_buffer, filename, current_page, parent_map, child_chunks
            )

        return child_chunks, parent_map

    def _chunk_page_text(self, text, source, page, parent_map, child_chunks):
        # Create Parent Chunks for this page
        parent_docs = self.parent_splitter.create_documents([text])

        for p_idx, p_doc in enumerate(parent_docs):
            parent_id = str(uuid4())
            parent_chunk = Chunk(
                text=p_doc.page_content,
                source=source,
                page=page,
                chunk_id=parent_id,
                is_parent=True,
                metadata={"index": p_idx},
            )
            parent_map[parent_id] = parent_chunk

            # Child chunks
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
                )
                child_chunks.append(child_chunk)
