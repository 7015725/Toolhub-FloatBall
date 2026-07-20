#!/usr/bin/env python3
import fnmatch
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_PATH = ROOT / "constraints" / "api.json"
BASELINE_PATH = ROOT / "constraints" / "API_USAGE_BASELINE.json"
LEGACY_PATH = ROOT / "constraints" / "API_USAGE_LEGACY.json"
ALLOWED_CLASSIFICATIONS = {
    "safe",
    "guarded",
    "wrapped",
    "plugin_validated",
    "forbidden",
}


def load_json(path, label, errors):
    if not path.exists():
        errors.append("%s missing: %s" % (label, path.relative_to(ROOT)))
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        errors.append("%s invalid JSON: %s" % (label, exc))
        return {}


def digest_entries(entries):
    raw = json.dumps(
        entries,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def rule_matches(rule, key):
    if key in (rule.get("usageKeys") or []):
        return True
    return any(key.startswith(prefix) for prefix in (rule.get("usageKeyPrefixes") or []))


def validate_entries(document, label, errors):
    entries = document.get("entries")
    if not isinstance(entries, list):
        errors.append(label + " entries must be a list")
        return []
    keys = []
    seen = set()
    for index, item in enumerate(entries):
        if not isinstance(item, dict):
            errors.append("%s entries[%d] must be an object" % (label, index))
            continue
        key = item.get("key")
        files = item.get("files")
        if not isinstance(key, str) or not key:
            errors.append("%s entries[%d] key must be non-empty" % (label, index))
            continue
        if key in seen:
            errors.append("%s duplicate key: %s" % (label, key))
        seen.add(key)
        keys.append(key)
        if not isinstance(files, list) or not files or not all(isinstance(value, str) and value for value in files):
            errors.append("%s key %s files must be non-empty strings" % (label, key))
        elif files != sorted(set(files)):
            errors.append("%s key %s files must be sorted and unique" % (label, key))
    if keys != sorted(keys):
        errors.append(label + " entries must be sorted by key")
    return entries


def main():
    errors = []
    api_doc = load_json(API_PATH, "API rules", errors)
    baseline = load_json(BASELINE_PATH, "API usage baseline", errors)
    legacy = load_json(LEGACY_PATH, "API legacy usage", errors)

    if api_doc.get("schema") != 2:
        errors.append("api.json schema must be 2")
    if api_doc.get("policy") != "classified_usage":
        errors.append("api.json policy must be classified_usage")
    if api_doc.get("migrationState") != "phase2_usage_baseline_enforced":
        errors.append("api.json migrationState must enable phase2 usage baseline")
    if api_doc.get("unclassifiedPolicy") != "error":
        errors.append("api.json unclassifiedPolicy must be error")
    if api_doc.get("usageBaseline") != "constraints/API_USAGE_BASELINE.json":
        errors.append("api.json usageBaseline path mismatch")
    if api_doc.get("legacyUsage") != "constraints/API_USAGE_LEGACY.json":
        errors.append("api.json legacyUsage path mismatch")
    if set(api_doc.get("classifications") or []) != ALLOWED_CLASSIFICATIONS:
        errors.append("api.json classifications mismatch")

    if baseline.get("schema") != 1 or baseline.get("policy") != "generated_api_usage":
        errors.append("API usage baseline schema/policy mismatch")
    baseline_entries = validate_entries(baseline, "API usage baseline", errors)
    if baseline.get("usageCount") != len(baseline_entries):
        errors.append("API usage baseline usageCount mismatch")
    if baseline.get("usageDigest") != digest_entries(baseline_entries):
        errors.append("API usage baseline digest mismatch")

    if legacy.get("schema") != 1 or legacy.get("policy") != "initial_usage_only":
        errors.append("API legacy usage schema/policy mismatch")
    legacy_entries = validate_entries(legacy, "API legacy usage", errors)
    if legacy.get("sourceUsageDigest") != baseline.get("usageDigest"):
        errors.append("API legacy sourceUsageDigest must match initial baseline digest")

    baseline_keys = {item.get("key") for item in baseline_entries if isinstance(item, dict)}
    legacy_keys = {item.get("key") for item in legacy_entries if isinstance(item, dict)}
    if not legacy_keys.issubset(baseline_keys):
        errors.append("API legacy usage contains keys absent from current baseline")

    rules = api_doc.get("rules")
    if not isinstance(rules, list):
        errors.append("api.json rules must be a list")
        rules = []
    explicit_rules = []
    seen_ids = set()
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict):
            errors.append("api rule[%d] must be an object" % index)
            continue
        rule_id = rule.get("id")
        if not isinstance(rule_id, str) or not rule_id:
            errors.append("api rule[%d] id missing" % index)
            continue
        if rule_id in seen_ids:
            errors.append("duplicate API rule id: " + rule_id)
        seen_ids.add(rule_id)
        classification = rule.get("classification")
        if classification not in ALLOWED_CLASSIFICATIONS:
            errors.append("API rule %s classification invalid" % rule_id)
        if not rule.get("scope") or not rule.get("reason"):
            errors.append("API rule %s requires scope and reason" % rule_id)
        has_selector = bool(rule.get("usageKeys") or rule.get("usageKeyPrefixes"))
        if has_selector:
            explicit_rules.append(rule)
            for field in ("owner", "source", "classOrObject", "method"):
                if not rule.get(field):
                    errors.append("explicit API rule %s missing %s" % (rule_id, field))
            for field in ("usageKeys", "usageKeyPrefixes"):
                values = rule.get(field)
                if values is not None and (
                    not isinstance(values, list)
                    or not all(isinstance(value, str) and value for value in values)
                ):
                    errors.append("explicit API rule %s %s must be string list" % (rule_id, field))
            if classification == "guarded" and not (rule.get("minApi") or rule.get("guard")):
                errors.append("guarded API rule %s requires minApi or guard" % rule_id)
            if classification == "wrapped" and not rule.get("allowedWrappers"):
                errors.append("wrapped API rule %s requires allowedWrappers" % rule_id)
            if classification == "plugin_validated" and not rule.get("validator"):
                errors.append("plugin_validated API rule %s requires validator" % rule_id)

    for key in sorted(baseline_keys - legacy_keys):
        matching = [rule for rule in explicit_rules if rule_matches(rule, key)]
        if len(matching) != 1:
            errors.append(
                "non-legacy API key must match exactly one explicit rule: %s matches=%d"
                % (key, len(matching))
            )
    for rule in explicit_rules:
        matched = [key for key in baseline_keys if rule_matches(rule, key)]
        if not matched:
            errors.append("explicit API rule matches no baseline key: " + rule.get("id", "?"))
        for key in matched:
            entry = next((item for item in baseline_entries if item.get("key") == key), None)
            for file_name in (entry or {}).get("files") or []:
                if not any(fnmatch.fnmatch(file_name, pattern) for pattern in rule.get("scope") or []):
                    errors.append(
                        "explicit API rule scope mismatch: rule=%s key=%s file=%s"
                        % (rule.get("id"), key, file_name)
                    )

    if errors:
        for item in errors:
            print("FAIL api-usage-policy: " + item)
        return 1
    print(
        "OK api-usage-policy baseline=%d legacy=%d explicit_rules=%d digest=%s"
        % (
            len(baseline_entries),
            len(legacy_entries),
            len(explicit_rules),
            baseline.get("usageDigest"),
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
