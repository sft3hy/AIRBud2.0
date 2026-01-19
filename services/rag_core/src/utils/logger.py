import logging
import sys
import os
from typing import Optional

def setup_logger(name: str = "rag_core", log_level: Optional[str] = None) -> logging.Logger:
    """
    Configures a production-ready logger with environment-controlled levels
    and precise formatting.
    
    Args:
        name: The name of the logger (usually the service name).
        log_level: Explicit level override (otherwise reads env LOG_LEVEL).
    """
    logger = logging.getLogger(name)
    
    # 1. Determine Log Level
    # Safe fallback to INFO if env var is missing or invalid
    if not log_level:
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    try:
        level = getattr(logging, log_level)
    except AttributeError:
        level = logging.INFO
        
    logger.setLevel(level)

    # 2. Configure Handler
    # Only add handler if one doesn't exist to prevent duplicate logs on reload
    if not logger.handlers:
        # Stream to stdout (Standard for Docker/K8s log aggregation)
        handler = logging.StreamHandler(sys.stdout)
        
        # Format: [Time] [Level] [File:Line] Message
        # 'filename:lineno' is crucial for debugging async stack traces
        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # 3. Prevent Propagation
    # Stops logs from bubbling up to the root logger, avoiding double-printing
    # when managed by Uvicorn/Gunicorn
    logger.propagate = False

    return logger

# Singleton instance exported for application-wide use
logger = setup_logger()