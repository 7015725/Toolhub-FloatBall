#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/runtime-src/zxing"
OUT_DIR="$ROOT/runtime"
WORK="$SRC/target/toolhub-dex"
VERSION="3.5.4-r1"
FINAL="$OUT_DIR/toolhub-zxing-runtime-${VERSION}.jar"

ANDROID_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [ -z "$ANDROID_ROOT" ]; then
  echo "ANDROID_SDK_ROOT/ANDROID_HOME is required" >&2
  exit 1
fi

ANDROID_JAR=""
for candidate in "$ANDROID_ROOT"/platforms/android-*/android.jar; do
  if [ -f "$candidate" ]; then ANDROID_JAR="$candidate"; fi
done
if [ -z "$ANDROID_JAR" ]; then
  echo "android.jar not found under $ANDROID_ROOT/platforms" >&2
  exit 1
fi

D8=""
for candidate in "$ANDROID_ROOT"/build-tools/*/d8; do
  if [ -x "$candidate" ]; then D8="$candidate"; fi
done
if [ -z "$D8" ]; then
  echo "d8 not found under $ANDROID_ROOT/build-tools" >&2
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$WORK/dex" "$OUT_DIR"

mvn -q -f "$SRC/pom.xml" -Dandroid.jar="$ANDROID_JAR" -DskipTests package
SHADED="$SRC/target/toolhub-zxing-runtime-${VERSION}-shaded.jar"
if [ ! -s "$SHADED" ]; then
  echo "shaded runtime jar missing: $SHADED" >&2
  exit 1
fi

"$D8" --min-api 24 --lib "$ANDROID_JAR" --output "$WORK/dex" "$SHADED"
if [ ! -s "$WORK/dex/classes.dex" ]; then
  echo "classes.dex was not generated" >&2
  exit 1
fi

cat > "$WORK/toolhub-runtime.properties" <<EOF
runtime.id=toolhub-zxing-runtime
runtime.version=$VERSION
zxing.core.version=3.5.4
min.api=24
bridge.class=toolhub.runtime.qr.ToolHubQrRuntime
local.install.dir=shortx.getShortXDir()/lib
EOF

python3 - "$FINAL" "$WORK/dex/classes.dex" "$WORK/toolhub-runtime.properties" "$SRC/LICENSE-zxing.txt" "$SRC/THIRD_PARTY_NOTICES.md" <<'PY'
import sys
import zipfile
from pathlib import Path

out = Path(sys.argv[1])
entries = [
    (Path(sys.argv[2]), "classes.dex"),
    (Path(sys.argv[3]), "META-INF/toolhub-runtime.properties"),
    (Path(sys.argv[4]), "META-INF/LICENSE-zxing.txt"),
    (Path(sys.argv[5]), "META-INF/NOTICE-zxing.txt"),
]
fixed = (2026, 1, 1, 0, 0, 0)
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for src, name in entries:
        data = src.read_bytes()
        info = zipfile.ZipInfo(name, date_time=fixed)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100444 << 16
        zf.writestr(info, data)
print(out)
PY

python3 - "$FINAL" <<'PY'
import hashlib
import sys
import zipfile
from pathlib import Path
p = Path(sys.argv[1])
with zipfile.ZipFile(p) as zf:
    names = set(zf.namelist())
    required = {"classes.dex", "META-INF/toolhub-runtime.properties", "META-INF/LICENSE-zxing.txt", "META-INF/NOTICE-zxing.txt"}
    missing = sorted(required - names)
    if missing:
        raise SystemExit("runtime jar missing entries: " + ", ".join(missing))
h = hashlib.sha256(p.read_bytes()).hexdigest()
print("runtime=%s" % p)
print("size=%s" % p.stat().st_size)
print("sha256=%s" % h)
PY
