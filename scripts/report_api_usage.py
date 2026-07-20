#!/usr/bin/env python3
import argparse
import fnmatch
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = ROOT / "constraints" / "API_USAGE_BASELINE.json"
DEFAULT_LEGACY = ROOT / "constraints" / "API_USAGE_LEGACY.json"
DEFAULT_API_RULES = ROOT / "constraints" / "api.json"
ROOT_NAMES = ("android", "java", "javax")
IDENT = r"[A-Za-z_$][A-Za-z0-9_$]*"
CHAIN = r"(?:(?:Packages\.)?(?:android|java|javax))(?:\." + IDENT + r")+"
DIRECT_CALL_RE = re.compile(r"\b(" + CHAIN + r")\.((?:" + IDENT + r"))\s*\(")
DIRECT_NEW_RE = re.compile(r"\bnew\s+(" + CHAIN + r")\s*\(")
ALIAS_RE = re.compile(r"\b(?:var\s+)?(" + IDENT + r")\s*=\s*(" + CHAIN + r")(?=\s*[;,\n])")
INSTANCE_ALIAS_RE = re.compile(r"\b(?:var\s+)?((?:this\.)?" + IDENT + r")\s*=\s*new\s+(" + IDENT + r")\s*\(")
INSTANCE_DIRECT_RE = re.compile(r"\b(?:var\s+)?((?:this\.)?" + IDENT + r")\s*=\s*new\s+(" + CHAIN + r")\s*\(")
SHORTX_CALL_RE = re.compile(r"\bshortx\.((?:" + IDENT + r"))\s*\(")
SHORTX_BRACKET_RE = re.compile(r"\bshortx\s*\[\s*(['\"])(" + IDENT + r")\1\s*\]\s*\(")
REFLECTION_CLASS_LITERAL_RE = re.compile(r"\b(?:java\.lang\.)?Class\.forName\s*\(\s*(['\"])([A-Za-z_$][A-Za-z0-9_$.]+)\1")
REFLECTION_CLASS_DYNAMIC_RE = re.compile(r"\b(?:java\.lang\.)?Class\.forName\s*\(\s*(?!['\"])")
REFLECTION_METHOD_LITERAL_RE = re.compile(r"\.get(?:Declared)?Method\s*\(\s*(['\"])(" + IDENT + r")\1")
REFLECTION_METHOD_DYNAMIC_RE = re.compile(r"\.get(?:Declared)?Method\s*\(\s*(?!['\"])")
PACKAGES_DYNAMIC_RE = re.compile(r"\bPackages\s*\[")
CALL_ON_NAME_TEMPLATE = r"(?<![.$A-Za-z0-9_])%s\.((?:%s))\s*\(" % ("%s", IDENT)

KNOWN_INSTANCES = {
    "context": "android.content.Context",
}


class ApiUsageError(Exception):
    pass


def mask_comments_and_strings(text):
    out = list(text)
    i = 0
    state = "code"
    quote = ""
    escaped = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "line_comment"
                continue
            if ch == "/" and nxt == "*":
                out[i] = out[i + 1] = " "
                i += 2
                state = "block_comment"
                continue
            if ch in ("'", '"'):
                quote = ch
                out[i] = " "
                i += 1
                escaped = False
                state = "string"
                continue
            i += 1
            continue
        if state == "line_comment":
            if ch == "\n":
                state = "code"
            else:
                out[i] = " "
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "code"
            else:
                if ch != "\n":
                    out[i] = " "
                i += 1
            continue
        if state == "string":
            if ch != "\n":
                out[i] = " "
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    return "".join(out)


def mask_comments_only(text):
    out = list(text)
    i = 0
    state = "code"
    quote = ""
    escaped = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "line_comment"
                continue
            if ch == "/" and nxt == "*":
                out[i] = out[i + 1] = " "
                i += 2
                state = "block_comment"
                continue
            if ch in ("'", '"'):
                quote = ch
                escaped = False
                state = "string"
            i += 1
            continue
        if state == "line_comment":
            if ch == "\n":
                state = "code"
            else:
                out[i] = " "
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "code"
            else:
                if ch != "\n":
                    out[i] = " "
                i += 1
            continue
        if state == "string":
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    return "".join(out)


def line_number(text, pos):
    return text.count("\n", 0, pos) + 1


def normalize_chain(chain):
    if chain.startswith("Packages."):
        chain = chain[len("Packages."):]
    return chain


def source_for(name):
    if name.startswith("android."):
        return "android"
    if name.startswith("java."):
        return "java"
    if name.startswith("javax."):
        return "javax"
    if name == "shortx":
        return "shortx"
    if name.startswith("reflection"):
        return "reflection"
    return "unknown"


def usage_key(source, kind, class_or_object, method=None):
    suffix = "#" + method if method else ""
    return "%s|%s|%s%s" % (source, kind, class_or_object, suffix)


def add_usage(store, source, kind, class_or_object, method, file_name, line, form):
    key = usage_key(source, kind, class_or_object, method)
    item = store.setdefault(key, {
        "key": key,
        "source": source,
        "kind": kind,
        "classOrObject": class_or_object,
        "method": method,
        "files": set(),
        "locations": [],
        "occurrenceCount": 0,
    })
    item["files"].add(file_name)
    item["occurrenceCount"] += 1
    location = {"file": file_name, "line": line, "form": form}
    if location not in item["locations"] and len(item["locations"]) < 12:
        item["locations"].append(location)


def scan_text(text, file_name):
    code = mask_comments_and_strings(text)
    comment_free = mask_comments_only(text)
    found = {}
    aliases = {}
    instances = dict(KNOWN_INSTANCES)

    for match in ALIAS_RE.finditer(code):
        alias = match.group(1)
        class_name = normalize_chain(match.group(2))
        if class_name.split(".")[-1][:1].isupper():
            aliases[alias] = class_name
            add_usage(found, source_for(class_name), "class", class_name, None, file_name,
                      line_number(text, match.start(2)), "class_alias")

    for match in DIRECT_NEW_RE.finditer(code):
        class_name = normalize_chain(match.group(1))
        add_usage(found, source_for(class_name), "class", class_name, None, file_name,
                  line_number(text, match.start(1)), "direct_constructor")

    for match in DIRECT_CALL_RE.finditer(code):
        class_name = normalize_chain(match.group(1))
        method = match.group(2)
        add_usage(found, source_for(class_name), "method", class_name, method, file_name,
                  line_number(text, match.start(1)), "direct_static_call")

    for match in INSTANCE_DIRECT_RE.finditer(code):
        receiver = match.group(1)
        class_name = normalize_chain(match.group(2))
        instances[receiver] = class_name
        add_usage(found, source_for(class_name), "class", class_name, None, file_name,
                  line_number(text, match.start(2)), "direct_constructor_assignment")

    for match in INSTANCE_ALIAS_RE.finditer(code):
        receiver = match.group(1)
        class_name = aliases.get(match.group(2))
        if class_name:
            instances[receiver] = class_name

    for alias, class_name in sorted(aliases.items()):
        pattern = re.compile(CALL_ON_NAME_TEMPLATE % re.escape(alias))
        for match in pattern.finditer(code):
            method = match.group(1)
            add_usage(found, source_for(class_name), "method", class_name, method, file_name,
                      line_number(text, match.start()), "class_alias_call")

    for receiver, class_name in sorted(instances.items()):
        pattern = re.compile(CALL_ON_NAME_TEMPLATE % re.escape(receiver))
        for match in pattern.finditer(code):
            method = match.group(1)
            add_usage(found, source_for(class_name), "method", class_name, method, file_name,
                      line_number(text, match.start()), "instance_call")

    for match in SHORTX_CALL_RE.finditer(code):
        add_usage(found, "shortx", "method", "shortx", match.group(1), file_name,
                  line_number(text, match.start()), "shortx_call")
    for match in SHORTX_BRACKET_RE.finditer(comment_free):
        add_usage(found, "shortx", "method", "shortx", match.group(2), file_name,
                  line_number(text, match.start()), "shortx_bracket_call")

    for match in REFLECTION_CLASS_LITERAL_RE.finditer(comment_free):
        target = match.group(2)
        add_usage(found, "reflection", "class", target, None, file_name,
                  line_number(text, match.start()), "reflection_class_literal")
    for match in REFLECTION_METHOD_LITERAL_RE.finditer(comment_free):
        add_usage(found, "reflection", "method", "*", match.group(2), file_name,
                  line_number(text, match.start()), "reflection_method_literal")
    for match in REFLECTION_CLASS_DYNAMIC_RE.finditer(code):
        add_usage(found, "reflection", "dynamic", "Class.forName", None, file_name,
                  line_number(text, match.start()), "reflection_dynamic_class")
    for match in REFLECTION_METHOD_DYNAMIC_RE.finditer(code):
        add_usage(found, "reflection", "dynamic", "getMethod", None, file_name,
                  line_number(text, match.start()), "reflection_dynamic_method")
    for match in PACKAGES_DYNAMIC_RE.finditer(code):
        add_usage(found, "reflection", "dynamic", "Packages[]", None, file_name,
                  line_number(text, match.start()), "packages_dynamic_lookup")
    return found


def merge_usage(target, source):
    for key, item in source.items():
        current = target.setdefault(key, {
            "key": key,
            "source": item["source"],
            "kind": item["kind"],
            "classOrObject": item["classOrObject"],
            "method": item["method"],
            "files": set(),
            "locations": [],
            "occurrenceCount": 0,
        })
        current["files"].update(item["files"])
        current["occurrenceCount"] += item["occurrenceCount"]
        for location in item["locations"]:
            if location not in current["locations"] and len(current["locations"]) < 12:
                current["locations"].append(location)


def scan_repository(root=ROOT):
    files = [root / "ToolHub.js"] + sorted((root / "code").glob("*.js"))
    files = [path for path in files if path.exists()]
    all_usage = {}
    for path in files:
        rel = path.relative_to(root).as_posix()
        merge_usage(all_usage, scan_text(path.read_text(encoding="utf-8", errors="replace"), rel))
    entries = []
    for key in sorted(all_usage):
        item = all_usage[key]
        item["files"] = sorted(item["files"])
        item["locations"] = sorted(item["locations"], key=lambda value: (value["file"], value["line"], value["form"]))
        entries.append(item)
    return [path.relative_to(root).as_posix() for path in files], entries


def baseline_document(files, entries):
    core = {
        "schema": 1,
        "policy": "generated_api_usage",
        "scanner": "scripts/report_api_usage.py",
        "coverage": [
            "qualified android/java/javax constructors and static calls",
            "class aliases and directly constructed instance calls",
            "shortx direct calls",
            "literal and dynamic reflection signals"
        ],
        "filesScanned": files,
        "usageCount": len(entries),
        "entries": entries
    }
    digest_input = json.dumps(entries, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    core["usageDigest"] = "sha256:" + hashlib.sha256(digest_input).hexdigest()
    return core


def legacy_document(baseline):
    return {
        "schema": 1,
        "policy": "initial_usage_only",
        "description": "第二阶段启用时已经存在的高置信度 API 使用。不得把后续新增 API 写入本文件。",
        "sourceUsageDigest": baseline["usageDigest"],
        "entries": [
            {"key": item["key"], "files": item["files"]}
            for item in baseline["entries"]
        ]
    }


def load_json(path, label):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    if not path.exists():
        raise ApiUsageError("%s missing: %s" % (label, path.relative_to(ROOT)))
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise ApiUsageError("%s invalid JSON: %s" % (label, exc))


def scope_matches(path, patterns):
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns or [])


def rule_matches_key(rule, key):
    if key in (rule.get("usageKeys") or []):
        return True
    return any(key.startswith(prefix) for prefix in (rule.get("usageKeyPrefixes") or []))


def validate_policy(current, baseline, legacy, api_doc):
    errors = []
    current_map = {item["key"]: item for item in current["entries"]}
    baseline_map = {item["key"]: item for item in baseline.get("entries") or []}
    legacy_map = {item["key"]: set(item.get("files") or []) for item in legacy.get("entries") or []}
    rules = [rule for rule in (api_doc.get("rules") or []) if rule.get("usageKeys") or rule.get("usageKeyPrefixes")]

    for key in sorted(set(current_map) - set(baseline_map)):
        item = current_map[key]
        errors.append("NEW_API key=%s files=%s" % (key, ",".join(item["files"])))
    for key in sorted(set(baseline_map) - set(current_map)):
        errors.append("STALE_API_BASELINE key=%s" % key)
    for key in sorted(set(current_map) & set(baseline_map)):
        current_files = set(current_map[key]["files"])
        baseline_files = set(baseline_map[key].get("files") or [])
        if current_files != baseline_files:
            errors.append("API_BASELINE_LOCATION_MISMATCH key=%s current=%s baseline=%s" % (
                key, ",".join(sorted(current_files)), ",".join(sorted(baseline_files))))

    for key, item in sorted(current_map.items()):
        matching = [rule for rule in rules if rule_matches_key(rule, key)]
        legacy_files = legacy_map.get(key)
        if legacy_files is None and not matching:
            errors.append("UNCLASSIFIED_API key=%s files=%s" % (key, ",".join(item["files"])))
            continue
        if legacy_files is not None:
            expanded = set(item["files"]) - legacy_files
            if expanded:
                allowed = False
                for rule in matching:
                    if rule.get("allowScopeExpansion") and all(scope_matches(path, rule.get("scope")) for path in expanded):
                        allowed = True
                        break
                if not allowed:
                    errors.append("UNREVIEWED_API_SCOPE_EXPANSION key=%s files=%s" % (key, ",".join(sorted(expanded))))
        for rule in matching:
            for path in item["files"]:
                if not scope_matches(path, rule.get("scope")):
                    errors.append("API_RULE_SCOPE_MISMATCH rule=%s key=%s file=%s" % (rule.get("id"), key, path))
    return errors


def write_json(path, data):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate and verify high-confidence external API usage")
    parser.add_argument("--write", help="write generated API usage baseline")
    parser.add_argument("--write-legacy", help="write immutable initial API usage set")
    parser.add_argument("--check", default=None, help="verify committed baseline and policy")
    parser.add_argument("--legacy", default=str(DEFAULT_LEGACY.relative_to(ROOT)))
    parser.add_argument("--api-rules", default=str(DEFAULT_API_RULES.relative_to(ROOT)))
    parser.add_argument("--diff", action="store_true", help="print API usage differences")
    args = parser.parse_args(argv)

    files, entries = scan_repository(ROOT)
    current = baseline_document(files, entries)
    if args.write:
        write_json(args.write, current)
        print("OK api-usage baseline written usages=%d files=%d" % (len(entries), len(files)))
    if args.write_legacy:
        write_json(args.write_legacy, legacy_document(current))
        print("OK api-usage legacy written usages=%d" % len(entries))
    if args.check or args.diff:
        baseline = load_json(args.check or DEFAULT_BASELINE, "API usage baseline")
        legacy = load_json(args.legacy, "API legacy usage")
        api_doc = load_json(args.api_rules, "API rules")
        errors = validate_policy(current, baseline, legacy, api_doc)
        if errors:
            for item in errors:
                print("FAIL api-usage: " + item)
            return 1
        print("OK api-usage usages=%d legacy=%d explicit_rules=%d digest=%s" % (
            len(entries), len(legacy.get("entries") or []),
            len([rule for rule in (api_doc.get("rules") or []) if rule.get("usageKeys") or rule.get("usageKeyPrefixes")]),
            current["usageDigest"]))
    if not (args.write or args.write_legacy or args.check or args.diff):
        parser.error("one of --write, --write-legacy, --check or --diff is required")
    return 0


if __name__ == "__main__":
    sys.exit(main())
