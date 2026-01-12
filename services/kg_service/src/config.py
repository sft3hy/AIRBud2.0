import os

class Config:
    SERVICE_NAME = "kg_service"
    VERSION = "1.0"
    
    # Environment
    TEST_MODE = os.getenv("TEST", "False").lower() == "true"
    
    # Neo4j
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "smartrag_password")

    # LLM
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    SANCTUARY_API_KEY = os.getenv("SANCTUARY_API_KEY")
    
    # Dynamic Model
    if TEST_MODE:
        LLM_PROVIDER = "groq"
        # We use a fast model for extraction to keep ingestion speed high
        MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct" 
    else:
        LLM_PROVIDER = "sanctuary"
        MODEL_NAME = "claude-3-haiku-20240307" # Haiku is great/cheap for graph extraction

settings = Config()