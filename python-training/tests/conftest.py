import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for rel in ["service", "src/simulation", "src/models", "src/data_access"]:
    path = str(ROOT / rel)
    if path not in sys.path:
        sys.path.insert(0, path)
