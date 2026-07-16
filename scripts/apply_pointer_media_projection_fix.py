#!/usr/bin/env python3
from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts"
parts = sorted(SCRIPT.glob("apply_pointer_media_projection_fix.payload.*"))
if not parts:
    raise SystemExit("missing pointer screenshot patch payload")
data = "".join(part.read_text(encoding="utf-8").strip() for part in parts)
source = base64.b64decode(data).decode("utf-8")
namespace = {"__name__": "__main__", "__file__": str(__file__)}
exec(compile(source, "apply_pointer_media_projection_fix.payload.py", "exec"), namespace, namespace)
for part in parts:
    try:
        part.unlink()
    except Exception:
        pass
try:
    Path(__file__).unlink()
except Exception:
    pass
