import os
from pathlib import Path

class Config:
    # Service Metadata
    SERVICE_NAME = "rag_core"
    VERSION = "2.0"
    
    # Environment Logic
    TEST_MODE = os.getenv("TEST", "False").lower() == "true"
    EPHEMERAL_MODE = os.getenv("EPHEMERAL_MODE", "False").lower() == "true"
    
    # Paths
    BASE_DIR = Path("/app")
    
    # --- FIX: Move Data out of /app to avoid Permission Conflicts ---
    DATA_DIR = Path("/data") 
    # ----------------------------------------------------------------
    
    UPLOAD_DIR = DATA_DIR / "uploads"
    CHARTS_DIR = DATA_DIR / "charts"
    FAISS_DIR = DATA_DIR / "faiss_indexes"
    CHUNKS_DIR = DATA_DIR / "chunks"
    PREVIEWS_DIR = DATA_DIR / "previews" 


    # Database
    DB_HOST = os.getenv("POSTGRES_SERVER", "postgres")
    DB_USER = os.getenv("POSTGRES_USER", "slammy")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
    DB_NAME = os.getenv("POSTGRES_DB", "rag_db")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")

    # External Microservices
    PARSER_API_URL = os.getenv("PARSER_API_URL", "http://parser:8001")
    VISION_API_URL = os.getenv("VISION_API_URL", "http://vision:8002")

    # LLM Settings
    SANCTUARY_API_KEY = os.getenv("SANCTUARY_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    default_provider = "groq" if TEST_MODE else "sanctuary"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", default_provider).lower()

    if LLM_PROVIDER == "groq":
        GEN_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
    else:
        GEN_MODEL_NAME = "bedrock-claude-4-5-sonnet-v1"
    
    # RAG Settings
    EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM = 384

settings = Config()

# Ensure directories exist
for d in [settings.DATA_DIR, settings.UPLOAD_DIR, settings.CHARTS_DIR, settings.FAISS_DIR, settings.CHUNKS_DIR, settings.PREVIEWS_DIR]:
    os.makedirs(d, exist_ok=True)