
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
@dataclass(frozen=True, slots=True)
class Chunk:
    """
    Core data model representing a unit of text for vector processing.
    Attributes:
    text: The content of the chunk.
    source: Origin filename or identifier.
    page: Page number (0-indexed).
    chunk_id: Unique UUID for this chunk.
    parent_id: UUID of the parent chunk (if applicable).
    is_parent: True if this chunk contains smaller child chunks.
    metadata: flexible dictionary for additional context (embeddings, timestamps, etc).
    
    Design Decisions:
    - frozen=True: Ensures immutability for thread safety when passing objects between pipeline stages.
    - slots=True: drastically reduces memory footprint when processing thousands of chunks per request.
    """
    text: str
    source: str
    page: int
    chunk_id: str

    # Optional fields with defaults must come after required fields
    parent_id: Optional[str] = None
    is_parent: bool = False

    # Mutable container within immutable object allows updating metadata (scores, vectors)
    # without recreating the heavy text object.
    metadata: Dict[str, Any] = field(default_factory=dict)