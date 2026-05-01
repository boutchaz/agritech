"""
Launch script for VS Code debugpy attach.
Usage: ./venv/bin/python debug_server.py
Then attach VS Code with "Python: Attach backend-service (debugpy :5678)"
"""
import debugpy

debugpy.listen(("127.0.0.1", 5678))
print("⏳ Waiting for VS Code debugger to attach on port 5678...")
debugpy.wait_for_client()
print("✅ Debugger attached — starting uvicorn")

import uvicorn

uvicorn.run("app.main:app", host="127.0.0.1", port=8001, log_level="info")
