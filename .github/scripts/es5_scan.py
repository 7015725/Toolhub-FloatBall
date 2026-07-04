#!/usr/bin/env python3
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [ROOT / "ToolHub.js"] + sorted((ROOT / "code").glob("*.js"))
PATTERNS = [
    ("let_or_const", re.compile(r"\b(?:let|const)\b")),
    ("arrow_function", re.compile(r"=>")),
    ("optional_chaining", re.compile(r"\?\.")),
    ("nullish_coalescing", re.compile(r"\?\?")),
    ("template_literal", re.compile(r"`")),
]


def mask_comments_and_strings(text):
    out = list(text)
    i = 0
    n = len(text)
    state = "code"
    quote = ""
    escaped = False
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if state == "code":
            if c == "/" and nxt == "/":
                out[i] = " "
                out[i + 1] = " "
                i += 2
                while i < n and text[i] not in "\r\n":
                    out[i] = " "
                    i += 1
                continue
            if c == "/" and nxt == "*":
                out[i] = " "
                out[i + 1] = " "
                i += 2
                while i < n:
                    if text[i] == "*" and i + 1 < n and text[i + 1] == "/":
                        out[i] = " "
                        out[i + 1] = " "
                        i += 2
                        break
                    if text[i] not in "\r\n":
                        out[i] = " "
                    i += 1
                continue
            if c == "'" or c == '"':
                state = "string"
                quote = c
                escaped = False
                out[i] = " "
                i += 1
                continue
            i += 1
            continue
        if state == "string":
            if c not in "\r\n":
                out[i] = " "
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == quote:
                state = "code"
                quote = ""
            i += 1
            continue
    return "".join(out)


def line_col(text, pos):
    line = text.count("\n", 0, pos) + 1
    last = text.rfind("\n", 0, pos)
    col = pos + 1 if last < 0 else pos - last
    return line, col


def main():
    errors = []
    missing = [str(p.relative_to(ROOT)) for p in FILES if not p.exists()]
    if missing:
        print("Missing JS files: " + ", ".join(missing))
        return 1
    for path in FILES:
        raw = path.read_text(encoding="utf-8", errors="replace")
        masked = mask_comments_and_strings(raw)
        rel = path.relative_to(ROOT)
        for name, pattern in PATTERNS:
            for match in pattern.finditer(masked):
                line, col = line_col(raw, match.start())
                errors.append(f"{rel}:{line}:{col}: ES5 violation {name}: {match.group(0)}")
    if errors:
        print("ES5_ERRORS %d" % len(errors))
        for item in errors[:200]:
            print(item)
        if len(errors) > 200:
            print("... truncated %d more" % (len(errors) - 200))
        return 1
    print("ES5_ERRORS 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
