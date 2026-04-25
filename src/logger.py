import logging
from datetime import datetime
from pathlib import Path


def setup_logger(name: str = "caption_writer", log_dir: str = "logs") -> logging.Logger:
    """Configure and return a logger with console (INFO) and rotating file (DEBUG) handlers."""
    Path(log_dir).mkdir(exist_ok=True)

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s  [%(levelname)-8s]  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    log_file = Path(log_dir) / f"caption_writer_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


def log_api_response(logger: logging.Logger, client_name: str, response) -> None:
    """Log token usage and key metadata from an Anthropic API response."""
    usage = response.usage
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_created = getattr(usage, "cache_creation_input_tokens", 0) or 0

    logger.info(
        f"[{client_name}] API call complete | "
        f"model={response.model} | "
        f"stop_reason={response.stop_reason} | "
        f"input_tokens={usage.input_tokens} | "
        f"output_tokens={usage.output_tokens} | "
        f"cache_read={cache_read} | "
        f"cache_written={cache_created}"
    )
    logger.debug(f"[{client_name}] Response ID: {response.id}")
