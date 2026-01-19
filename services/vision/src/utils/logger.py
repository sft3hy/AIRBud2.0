import logging
import sys
import os
from typing import Optional

def setup_logger(name: str = "vision_service", log_level: Optional[str] = None) -> logging.Logger:
    """
    Configures a production-ready logger with environment-controlled levels
    and precise formatting.
    """
    logger = logging.getLogger(name)
    
    # 1. Determine Log Level
    if not log_level:
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    try:
        level = getattr(logging, log_level)
    except AttributeError:
        level = logging.INFO
        
    logger.setLevel(level)

    # 2. Configure Handler
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        # Format: [Time] [Level] [File:Line] Message
        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # 3. Prevent Propagation to Root Logger (Uvicorn duplicate log fix)
    logger.propagate = False

    return logger

logger = setup_logger()