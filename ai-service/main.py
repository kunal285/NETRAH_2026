#!/usr/bin/env python3
"""
PRAHARI V3 — AI Microservice Root Forwarder
Delegates to modular app.main application.
"""

import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
