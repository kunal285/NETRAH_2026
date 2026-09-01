import logging
import sys
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """Structured JSON formatter for production log parsing."""
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
        if hasattr(record, "event_id"):
            log_record["event_id"] = record.event_id
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def get_logger(name: str = "prahari-ai") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

logger = get_logger("prahari-ai")
