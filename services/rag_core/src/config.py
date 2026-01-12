import os
from pathlib import Path


class Config:
    # Service Metadata
    SERVICE_NAME = "rag_core"
    VERSION = "2.0"

    # Environment Logic
    TEST_MODE = os.getenv("TEST", "False").lower() == "true"

    # Paths
    BASE_DIR = Path("/app")
    DATA_DIR = BASE_DIR / "data"
    UPLOAD_DIR = DATA_DIR / "uploads"
    CHARTS_DIR = DATA_DIR / "charts"
    FAISS_DIR = DATA_DIR / "faiss_indexes"
    CHUNKS_DIR = DATA_DIR / "chunks"

    # Database
    DB_HOST = os.getenv("POSTGRES_SERVER", "postgres")
    DB_USER = os.getenv("POSTGRES_USER", "rag_user")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "rag_password")
    DB_NAME = os.getenv("POSTGRES_DB", "rag_db")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")

    # External Microservices
    PARSER_API_URL = os.getenv("PARSER_API_URL", "http://parser:8001")
    VISION_API_URL = os.getenv("VISION_API_URL", "http://vision:8002")

    # LLM Settings
    SANCTUARY_API_KEY = os.getenv("SANCTUARY_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    # DYNAMIC MODEL SELECTION
    if TEST_MODE:
        LLM_PROVIDER = "groq"
        GEN_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"  # or "llama3-70b-8192" based on Groq availability
    else:
        LLM_PROVIDER = "sanctuary"
        GEN_MODEL_NAME = "claude-3.5-sonnet"

    # RAG Settings
    EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM = 384


settings = Config()

# Ensure directories exist
for d in [
    settings.DATA_DIR,
    settings.UPLOAD_DIR,
    settings.CHARTS_DIR,
    settings.FAISS_DIR,
    settings.CHUNKS_DIR,
]:
    os.makedirs(d, exist_ok=True)
