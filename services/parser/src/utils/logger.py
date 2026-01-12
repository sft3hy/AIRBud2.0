import logging
import sys
from src.config import config


def setup_logger(name: str = "parser_service"):
    logger = logging.getLogger(name)
    logger.setLevel(config.LOG_LEVEL)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logger()
