from pathlib import Path
import sys

BACKEND_SERVICE_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_ROOT))
