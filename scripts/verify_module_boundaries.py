#!/usr/bin/env python3
"""校验 ToolHub 子模块原型方法定义基线、包装链和有效所有者。"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
BOUNDARIES_PATH = ROOT / "constraints/MODULE_BOUNDARIES.json"
LOADER_PATH = ROOT / "ToolHub.js"

METHOD_PATTERN = re.compile(
    r"^[ \t]*(?:FloatBallAppWM\.prototype|proto)\."
    r"([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\b",
    re.MULTILINE,
)
MODULES_PATTERN = re.compile(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", re.DOTALL)
MODULE_NAME_PATTERN = re.compile(r'"(th_[^"]+\.js)"')
VALID_TYPES = {
    "wrapper",
    "wrapper_chain",
    "deferred_wrapper",
    "intentional_override",
    "temporary_override",
    "temporary_override_chain",
    "wrapper_then_override",
}


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


def validate_wrapper_source(
    method: str,
    wrapper: dict,
    sources: Dict[str, str],
    module_index: Dict[str, int],
    failures: List[str],
) -> None:
    module = str(wrapper.get("module", ""))
    owner = str(wrapper.get("owner", ""))
    old_var = str(wrapper.get("oldVariable", ""))
    install_mode = str(wrapper.get("installMode", "normal") or "normal")

    if module not in module_index:
        failures.append("wrapper %s references unloaded module %s" % (method, module))
        return
    if owner not in module_index:
        failures.append("wrapper %s references unloaded owner %s" % (method, owner))
        return
    if not old_var:
        failures.append("wrapper %s in %s is missing oldVariable" % (method, module))
        return

    source = sources.get(module, "")
    capture = re.compile(
        r"\bvar\s+%s\s*=\s*(?:proto|FloatBallAppWM\.prototype)\.%s\s*;"
        % (re.escape(old_var), re.escape(method))
    )
    call = re.compile(r"\b%s\.call\s*\(\s*this\b" % re.escape(old_var))
    if not capture.search(source):
        failures.append(
            "wrapper %s in %s does not capture the original method as %s"
            % (method, module, old_var)
        )
    if not call.search(source):
        failures.append(
            "wrapper %s in %s does not call %s.call(this, ...)"
            % (method, module, old_var)
        )

    if install_mode == "normal":
        if module_index[owner] >= module_index[module]:
            failures.append(
                "normal wrapper %s must load after owner: owner=%s wrapper=%s"
                % (method, owner, module)
            )
    elif install_mode == "deferred_retry":
        if module_index[module] >= module_index[owner]:
            failures.append(
                "deferred wrapper %s must be declared before its later owner: wrapper=%s owner=%s"
                % (method, module, owner)
            )
        retry_markers = (
            "new java.lang.Thread",
            "java.lang.Thread.sleep",
            "for (var ",
        )
        for marker in retry_markers:
            if marker not in source:
                failures.append(
                    "deferred wrapper %s in %s is missing retry marker %s"
                    % (method, module, marker)
                )
    else:
        failures.append(
            "wrapper %s in %s has unsupported installMode %s"
            % (method, module, install_mode)
        )


def main() -> int:
    boundaries = load_json(BOUNDARIES_PATH)
    if int(boundaries.get("schema", 0)) != 2:
        fail("unsupported MODULE_BOUNDARIES.json schema")
    if str(boundaries.get("policy", "")) != "constraints_only":
        fail("MODULE_BOUNDARIES.json policy must be constraints_only")

    modules = load_modules()
    module_set = set(modules)
    module_index = {name: index for index, name in enumerate(modules)}
    definitions, sources = scan_definitions(modules)
    failures: List[str] = []

    records = boundaries.get("duplicateDefinitions", [])
    if not isinstance(records, list):
        fail("duplicateDefinitions must be an array")

    records_by_method: Dict[str, dict] = {}
    for record in records:
        if not isinstance(record, dict):
            failures.append("duplicateDefinitions contains non-object record")
            continue
        method = str(record.get("method", ""))
        if not method:
            failures.append("duplicateDefinitions record missing method")
            continue
        if method in records_by_method:
            failures.append("duplicateDefinitions repeats method " + method)
            continue
        records_by_method[method] = record

        relation_type = str(record.get("type", ""))
        if relation_type not in VALID_TYPES:
            failures.append(
                "duplicate definition %s has unsupported type %s"
                % (method, relation_type)
            )

        expected = record.get("definitions", [])
        if not isinstance(expected, list) or len(expected) < 2:
            failures.append(
                "duplicate definition %s must list at least two definitions"
                % method
            )
            continue
        for module in expected:
            if str(module) not in module_set:
                failures.append(
                    "duplicate definition %s references unloaded module %s"
                    % (method, module)
                )

        effective_owner = str(record.get("effectiveOwner", ""))
        if not effective_owner:
            failures.append(
                "duplicate definition %s is missing effectiveOwner" % method
            )
        elif effective_owner not in expected:
            failures.append(
                "effectiveOwner for %s is not present in definitions: %s"
                % (method, effective_owner)
            )

        runtime_mode = str(record.get("runtimeMode", "normal") or "normal")
        if runtime_mode not in ("normal", "deferred_retry"):
            failures.append(
                "duplicate definition %s has unsupported runtimeMode %s"
                % (method, runtime_mode)
            )

        wrappers = record.get("wrappers", [])
        if not isinstance(wrappers, list):
            failures.append("wrappers for %s must be an array" % method)
            wrappers = []
        for wrapper in wrappers:
            if not isinstance(wrapper, dict):
                failures.append("wrapper record for %s is not an object" % method)
                continue
            validate_wrapper_source(
                method, wrapper, sources, module_index, failures
            )

    actual_duplicate_methods = {
        method for method, items in definitions.items() if len(items) > 1
    }
    declared_duplicate_methods = set(records_by_method)

    for method in sorted(actual_duplicate_methods - declared_duplicate_methods):
        failures.append(
            "unregistered duplicate method %s: %s"
            % (method, format_locations(definitions[method]))
        )
    for method in sorted(declared_duplicate_methods - actual_duplicate_methods):
        failures.append(
            "stale duplicate baseline for %s: method is no longer duplicated"
            % method
        )

    for method in sorted(actual_duplicate_methods & declared_duplicate_methods):
        record = records_by_method[method]
        expected = [str(item) for item in record.get("definitions", [])]
        actual = modules_for(definitions, method)
        if actual != expected:
            failures.append(
                "duplicate baseline changed for %s; expected=%s actual=%s locations=%s"
                % (
                    method,
                    expected,
                    actual,
                    format_locations(definitions[method]),
                )
            )
            continue
        effective_owner = str(record.get("effectiveOwner", ""))
        runtime_mode = str(record.get("runtimeMode", "normal") or "normal")
        if runtime_mode == "normal" and actual[-1] != effective_owner:
            failures.append(
                "final source owner mismatch for %s: expected=%s actual=%s"
                % (method, effective_owner, actual[-1])
            )
        if runtime_mode == "deferred_retry":
            wrappers = record.get("wrappers", [])
            if not any(
                isinstance(item, dict)
                and str(item.get("module", "")) == effective_owner
                and str(item.get("installMode", "")) == "deferred_retry"
                for item in wrappers
            ):
                failures.append(
                    "deferred effective owner for %s lacks deferred_retry wrapper declaration"
                    % method
                )

    direct_owners = boundaries.get("directOwners", {})
    if not isinstance(direct_owners, dict):
        failures.append("directOwners must be an object")
        direct_owners = {}
    for method, owner_value in sorted(direct_owners.items()):
        owner = str(owner_value)
        if owner not in module_set:
            failures.append(
                "direct owner for %s references unloaded module %s"
                % (method, owner)
            )
            continue
        actual = modules_for(definitions, str(method))
        if not actual:
            failures.append("owned method is not defined: %s" % method)
        elif len(actual) != 1:
            failures.append(
                "direct owner method %s is duplicated and must move to duplicateDefinitions"
                % method
            )
        elif actual[0] != owner:
            failures.append(
                "direct owner mismatch for %s: expected=%s actual=%s"
                % (method, owner, actual[0])
            )

    cleanup_candidates = boundaries.get("cleanupCandidates", [])
    if not isinstance(cleanup_candidates, list):
        failures.append("cleanupCandidates must be an array")
        cleanup_candidates = []
    for candidate in cleanup_candidates:
        if not isinstance(candidate, dict):
            failures.append("cleanupCandidates contains non-object record")
            continue
        method = str(candidate.get("method", ""))
        module = str(candidate.get("module", ""))
        occurrences = int(candidate.get("occurrences", 0) or 0)
        if not method or module not in module_set or occurrences < 1:
            failures.append("invalid cleanup candidate: %r" % candidate)
            continue
        actual_count = sum(
            1
            for item in definitions.get(method, [])
            if item["module"] == module
        )
        if actual_count != occurrences:
            failures.append(
                "cleanup candidate baseline changed for %s.%s: expected=%d actual=%d"
                % (module, method, occurrences, actual_count)
            )

    forbidden = boundaries.get("forbiddenDefinitions", {})
    if not isinstance(forbidden, dict):
        failures.append("forbiddenDefinitions must be an object")
        forbidden = {}
    for module, methods in forbidden.items():
        if module not in module_set:
            failures.append(
                "forbiddenDefinitions references unloaded module " + str(module)
            )
            continue
        if not isinstance(methods, list):
            failures.append(
                "forbiddenDefinitions[%s] must be an array" % module
            )
            continue
        for method in methods:
            if any(
                item["module"] == module
                for item in definitions.get(str(method), [])
            ):
                failures.append(
                    "forbidden method definition restored: %s.%s"
                    % (module, method)
                )

    if failures:
        print(
            "FAIL: module boundary verification found %d problem(s)"
            % len(failures)
        )
        for item in failures:
            print("- " + item)
        return 1

    print(
        "OK: module boundaries verified; modules=%d methods=%d duplicates=%d "
        "wrappers=%d cleanup_candidates=%d"
        % (
            len(modules),
            len(definitions),
            len(actual_duplicate_methods),
            sum(
                len(record.get("wrappers", []))
                for record in records_by_method.values()
            ),
            len(cleanup_candidates),
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
