#!/usr/bin/env python3
"""验证入口更新安全模式对非法配置执行失败关闭。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL update-security-mode: " + message)


def require(fragment, label):
    if fragment not in ENTRY:
        fail("missing %s: %s" % (label, fragment))


def forbid(fragment, label):
    if fragment in ENTRY:
        fail("forbidden %s: %s" % (label, fragment))


require('String(UPDATE_SECURITY_MODE).replace(/^\\s+|\\s+$/g, "")', "strict text normalization")
require('/^[012]$/.test(__updateSecurityModeText)', "strict mode allowlist")
require('UPDATE_SECURITY_MODE = 2;', "secure fallback")
require('__updateSecurityModeFallback = true;', "fallback observability flag")
require('WARN invalid UPDATE_SECURITY_MODE, forced to secure mode 2', "fallback warning")
forbid('String(UPDATE_SECURITY_MODE || 0)', "plain-mode coercion")
forbid('> 2) UPDATE_SECURITY_MODE = 0', "fail-open fallback")


def normalize(value):
    try:
        text = str(value).strip()
    except Exception:
        text = ""
    if text in ("0", "1", "2"):
        return int(text), False
    return 2, True


cases = [
    (0, (0, False)),
    ("0", (0, False)),
    (1, (1, False)),
    (" 2 ", (2, False)),
    (None, (2, True)),
    ("", (2, True)),
    ("x", (2, True)),
    (3, (2, True)),
    (-1, (2, True)),
    ("2abc", (2, True)),
    ("2.5", (2, True)),
]

for raw, expected in cases:
    actual = normalize(raw)
    if actual != expected:
        fail("model mismatch raw=%r actual=%r expected=%r" % (raw, actual, expected))

print("Update security mode verification passed")
