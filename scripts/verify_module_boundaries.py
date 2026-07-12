#!/usr/bin/env python3
"""校验 ToolHub 子模块的原型方法所有权和已登记覆盖关系。"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
BOUNDARIES_PATH = ROOT / "MODULE_BOUNDARIES.json"
LOADER_PATH = ROOT / "ToolHub.js"

METHOD_PATTERN = re.compile(
    r"^[ \t]*(?:FloatBallAppWM\.prototype|proto)\."
    r"([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\b",
    re.MULTILINE,
)
MODULES_PATTERN = re.compile(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", re.DOTALL)
MODULE_NAME_PATTERN = re.compile(r'"(th_[^"]+\.js)"')


def fail(message: str) -> None:
    raise SystemExit("FAIL: " + message)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail("missing " + str(path.relative_to(ROOT)))
    except json.JSONDecodeError as exc:
        fail("invalid JSON in %s: %s" % (path.relative_to(ROOT), exc))
    return {}


def load_modules() -> List[str]:
    try:
        loader = LOADER_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        fail("missing ToolHub.js")
    match = MODULES_PATTERN.search(loader)
    if not match:
        fail("cannot parse ToolHub.js modules[]")
    modules = MODULE_NAME_PATTERN.findall(match.group(1))
    if not modules:
        fail("ToolHub.js modules[] is empty")
    duplicates = [name for name, count in Counter(modules).items() if count > 1]
    if duplicates:
        fail("duplicate modules in ToolHub.js: " + ", ".join(sorted(duplicates)))
    return modules


def scan_definitions(modules: Iterable[str]) -> Tuple[Dict[str, List[dict]], Dict[str, str]]:
    definitions: Dict[str, List[dict]] = defaultdict(list)
    sources: Dict[str, str] = {}
    for module in modules:
        path = ROOT / "code" / module
        if not path.exists():
            fail("loaded module file missing: code/" + module)
        source = path.read_text(encoding="utf-8")
        sources[module] = source
        for match in METHOD_PATTERN.finditer(source):
            line = source.count("\n", 0, match.start()) + 1
            definitions[match.group(1)].append({"module": module, "line": line})
    return definitions, sources


def modules_for(definitions: Dict[str, List[dict]], method: str) -> List[str]:
    return [item["module"] for item in definitions.get(method, [])]


def format_locations(items: Iterable[dict]) -> str:
    return ", ".join("%s:%s" % (item["module"], item["line"]) for item in items)


def check_record_modules(record: dict, fields: Iterable[str], module_set: set, failures: List[str]) -> None:
    for field in fields:
        name = str(record.get(field, ""))
        if not name:
            failures.append("boundary record missing field %s: %r" % (field, record))
        elif name not in module_set:
            failures.append("boundary record references unloaded module %s: %s" % (field, name))


def build_declared_relations(boundaries: dict, failures: List[str]) -> Dict[str, str]:
    declared: Dict[str, str] = {}
    sections = (
        ("temporaryDuplicateDefinitions", "temporary"),
        ("allowedWrappers", "wrapper"),
        ("allowedOverrides", "override"),
    )
    for section, kind in sections:
        records = boundaries.get(section, [])
        if not isinstance(records, list):
            failures.append(section + " must be an array")
            continue
        for record in records:
            if not isinstance(record, dict):
                failures.append(section + " contains non-object record")
                continue
            method = str(record.get("method", ""))
            if not method:
                failures.append(section + " record missing method")
                continue
            if method in declared:
                failures.append(
                    "method %s declared in multiple boundary relation types: %s, %s"
                    % (method, declared[method], kind)
                )
            declared[method] = kind
    return declared


def expected_modules_for_record(kind: str, record: dict) -> List[str]:
    if kind == "temporary":
        return [str(record.get("obsolete", "")), str(record.get("effective", ""))]
    if kind == "wrapper":
        return [str(record.get("owner", "")), str(record.get("wrapper", ""))]
    return [str(record.get("owner", "")), str(record.get("override", ""))]


def validate_wrapper_source(record: dict, source: str, failures: List[str]) -> None:
    method = str(record.get("method", ""))
    old_var = str(record.get("oldVariable", ""))
    wrapper = str(record.get("wrapper", ""))
    if not old_var:
        failures.append("allowed wrapper %s is missing oldVariable" % method)
        return
    capture = re.compile(
        r"\bvar\s+%s\s*=\s*(?:proto|FloatBallAppWM\.prototype)\.%s\s*;"
        % (re.escape(old_var), re.escape(method))
    )
    call = re.compile(r"\b%s\.call\s*\(\s*this\b" % re.escape(old_var))
    if not capture.search(source):
        failures.append("wrapper %s in %s does not capture the original method as %s" % (method, wrapper, old_var))
    if not call.search(source):
        failures.append("wrapper %s in %s does not call %s.call(this, ...)" % (method, wrapper, old_var))


def main() -> None:
    boundaries = load_json(BOUNDARIES_PATH)
    if int(boundaries.get("schema", 0)) != 1:
        fail("unsupported MODULE_BOUNDARIES.json schema")
    if str(boundaries.get("policy", "")) != "constraints_only":
        fail("MODULE_BOUNDARIES.json policy must be constraints_only")

    modules = load_modules()
    module_set = set(modules)
    module_index = {name: index for index, name in enumerate(modules)}
    definitions, sources = scan_definitions(modules)
    failures: List[str] = []

    declared_relations = build_declared_relations(boundaries, failures)

    temporary_records = {
        str(record.get("method", "")): record
        for record in boundaries.get("temporaryDuplicateDefinitions", [])
        if isinstance(record, dict) and record.get("method")
    }
    wrapper_records = {
        str(record.get("method", "")): record
        for record in boundaries.get("allowedWrappers", [])
        if isinstance(record, dict) and record.get("method")
    }
    override_records = {
        str(record.get("method", "")): record
        for record in boundaries.get("allowedOverrides", [])
        if isinstance(record, dict) and record.get("method")
    }

    for record in temporary_records.values():
        check_record_modules(record, ("obsolete", "effective"), module_set, failures)
    for record in wrapper_records.values():
        check_record_modules(record, ("owner", "wrapper"), module_set, failures)
    for record in override_records.values():
        check_record_modules(record, ("owner", "override"), module_set, failures)

    # 所有重复原型定义都必须显式登记，避免后续补丁静默覆盖现有所有者。
    for method, items in sorted(definitions.items()):
        if len(items) <= 1:
            continue
        if method not in declared_relations:
            failures.append("unregistered duplicate method %s: %s" % (method, format_locations(items)))
            continue
        kind = declared_relations[method]
        record = (
            temporary_records.get(method)
            if kind == "temporary"
            else wrapper_records.get(method)
            if kind == "wrapper"
            else override_records.get(method)
        )
        expected = expected_modules_for_record(kind, record or {})
        actual = [item["module"] for item in items]
        if Counter(actual) != Counter(expected):
            failures.append(
                "%s relation for %s does not match definitions; expected=%s actual=%s"
                % (kind, method, expected, actual)
            )

    # 每一条登记关系必须确实对应当前源码，不能留下失真的白名单。
    for method, record in temporary_records.items():
        actual = modules_for(definitions, method)
        expected = expected_modules_for_record("temporary", record)
        if Counter(actual) != Counter(expected):
            failures.append("temporary relation is stale for %s; expected=%s actual=%s" % (method, expected, actual))
            continue
        obsolete = str(record.get("obsolete"))
        effective = str(record.get("effective"))
        if module_index[obsolete] >= module_index[effective]:
            failures.append("temporary effective owner must load after obsolete owner for %s" % method)
        if actual[-1] != effective:
            failures.append("temporary effective owner is not the final definition for %s" % method)

    for method, record in wrapper_records.items():
        actual = modules_for(definitions, method)
        expected = expected_modules_for_record("wrapper", record)
        if Counter(actual) != Counter(expected):
            failures.append("wrapper relation is stale for %s; expected=%s actual=%s" % (method, expected, actual))
            continue
        owner = str(record.get("owner"))
        wrapper = str(record.get("wrapper"))
        if module_index[owner] >= module_index[wrapper]:
            failures.append("wrapper must load after owner for %s" % method)
        if actual[-1] != wrapper:
            failures.append("wrapper is not the final definition for %s" % method)
        validate_wrapper_source(record, sources.get(wrapper, ""), failures)

    for method, record in override_records.items():
        actual = modules_for(definitions, method)
        expected = expected_modules_for_record("override", record)
        if Counter(actual) != Counter(expected):
            failures.append("override relation is stale for %s; expected=%s actual=%s" % (method, expected, actual))
            continue
        owner = str(record.get("owner"))
        override = str(record.get("override"))
        if module_index[owner] >= module_index[override]:
            failures.append("override must load after owner for %s" % method)
        if actual[-1] != override:
            failures.append("override is not the final definition for %s" % method)

    direct_owners = boundaries.get("directOwners", {})
    if not isinstance(direct_owners, dict):
        failures.append("directOwners must be an object")
        direct_owners = {}
    for method, owner_value in sorted(direct_owners.items()):
        owner = str(owner_value)
        if owner not in module_set:
            failures.append("direct owner for %s references unloaded module %s" % (method, owner))
            continue
        actual = modules_for(definitions, str(method))
        if not actual:
            failures.append("owned method is not defined: %s" % method)
        elif actual[-1] != owner:
            failures.append("final owner mismatch for %s: expected=%s actual=%s" % (method, owner, actual[-1]))

    forbidden = boundaries.get("forbiddenDefinitions", {})
    if not isinstance(forbidden, dict):
        failures.append("forbiddenDefinitions must be an object")
        forbidden = {}
    for module, methods in forbidden.items():
        if module not in module_set:
            failures.append("forbiddenDefinitions references unloaded module " + str(module))
            continue
        if not isinstance(methods, list):
            failures.append("forbiddenDefinitions[%s] must be an array" % module)
            continue
        source_methods = {
            method
            for method, items in definitions.items()
            if any(item["module"] == module for item in items)
        }
        for method in methods:
            if str(method) in source_methods:
                failures.append("forbidden method definition restored: %s.%s" % (module, method))

    if failures:
        print("FAIL: module boundary verification found %d problem(s)" % len(failures))
        for item in failures:
            print("- " + item)
        return 1

    duplicate_count = sum(1 for items in definitions.values() if len(items) > 1)
    print(
        "OK: module boundaries verified; modules=%d methods=%d registered_duplicates=%d temporary=%d wrappers=%d overrides=%d"
        % (
            len(modules),
            len(definitions),
            duplicate_count,
            len(temporary_records),
            len(wrapper_records),
            len(override_records),
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
