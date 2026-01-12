import os
from pathlib import Path


class Config:
    # Service Metadata
    SERVICE_NAME = "rag_core"
    VERSION = "2.0"

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

    # LLM Provider
    # Options: "sanctuary", "groq"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "sanctuary")
    SANCTUARY_API_KEY = os.getenv("SANCTUARY_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    # RAG Settings
    EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM = 384

    # Model Generation
    GEN_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"


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
