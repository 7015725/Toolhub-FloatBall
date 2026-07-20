#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "constraints" / "registry.json"
REQUIRED_DOMAINS = ("syntax", "methods", "api", "threading", "lifecycle", "exceptions")
PLUGIN_DOMAINS = set(REQUIRED_DOMAINS) - {"exceptions"}
ALLOWED_ENFORCEMENT = {"declarative", "hybrid", "plugin"}
ALLOWED_API_CLASSIFICATIONS = {"safe", "guarded", "wrapped", "plugin_validated", "forbidden"}


class ConstraintError(Exception):
    pass


def _relative_path(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ConstraintError("%s must be a non-empty relative path" % label)
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ConstraintError("%s must stay inside repository: %s" % (label, value))
    return path


def _load_json(path, label):
    if not path.exists():
        raise ConstraintError("%s missing: %s" % (label, path.relative_to(ROOT)))
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise ConstraintError("%s invalid JSON: %s" % (label, exc))


def _collect_values(node, keys, out):
    if isinstance(node, dict):
        for item_key, value in node.items():
            if item_key in keys and isinstance(value, str):
                out.add(value)
            _collect_values(value, keys, out)
    elif isinstance(node, list):
        for value in node:
            _collect_values(value, keys, out)


def _collect_rule_ids(node, out):
    if isinstance(node, dict):
        value = node.get("id")
        if isinstance(value, str) and value:
            out.add(value)
        for child in node.values():
            _collect_rule_ids(child, out)
    elif isinstance(node, list):
        for child in node:
            _collect_rule_ids(child, out)


def validate_registry(registry_path=DEFAULT_REGISTRY):
    registry_path = Path(registry_path)
    if not registry_path.is_absolute():
        registry_path = ROOT / registry_path
    registry = _load_json(registry_path, "constraint registry")
    errors = []

    def check(condition, message):
        if not condition:
            errors.append(message)

    check(registry.get("schema") == 1, "registry schema must be 1")
    check(registry.get("policy") == "constraints_only", "registry policy must be constraints_only")

    environment = registry.get("environment")
    check(isinstance(environment, dict), "environment must be an object")
    if isinstance(environment, dict):
        check(environment.get("javascriptEngine") == "Rhino", "javascriptEngine must be Rhino")
        check(environment.get("ecmascriptVersion") == "ES5", "ecmascriptVersion must be ES5")
        for key in ("androidMinApi", "androidPrimaryApi"):
            check(isinstance(environment.get(key), int), "environment.%s must be an integer" % key)
        if isinstance(environment.get("androidMinApi"), int) and isinstance(environment.get("androidPrimaryApi"), int):
            check(environment["androidMinApi"] <= environment["androidPrimaryApi"], "androidMinApi cannot exceed androidPrimaryApi")

    domains = registry.get("domains")
    check(isinstance(domains, dict), "domains must be an object")
    domain_docs = {}
    if isinstance(domains, dict):
        check(set(REQUIRED_DOMAINS) == set(domains), "domains must be exactly: %s" % ", ".join(REQUIRED_DOMAINS))
        for domain in REQUIRED_DOMAINS:
            item = domains.get(domain)
            if not isinstance(item, dict):
                errors.append("domain %s must be an object" % domain)
                continue
            if item.get("enforcement") not in ALLOWED_ENFORCEMENT:
                errors.append("domain %s has invalid enforcement" % domain)
            try:
                relative = _relative_path(item.get("file"), "domain %s file" % domain)
                data = _load_json(ROOT / relative, "domain %s" % domain)
            except ConstraintError as exc:
                errors.append(str(exc))
                continue
            domain_docs[domain] = data
            check(data.get("schema") in (1, 2), "domain %s schema must be 1 or 2" % domain)
            if domain == "methods":
                check(data.get("policy") == "constraints_only", "MODULE_BOUNDARIES.json policy must be constraints_only")
            else:
                check(data.get("domain") == domain, "domain file %s must declare domain=%s" % (relative, domain))

    plugins = registry.get("plugins")
    check(isinstance(plugins, list) and plugins, "plugins must be a non-empty list")
    plugin_ids = set()
    plugin_scripts = set()
    if isinstance(plugins, list):
        for index, plugin in enumerate(plugins):
            label = "plugins[%d]" % index
            if not isinstance(plugin, dict):
                errors.append(label + " must be an object")
                continue
            plugin_id = plugin.get("id")
            if not isinstance(plugin_id, str) or not plugin_id:
                errors.append(label + ".id must be a non-empty string")
            elif plugin_id in plugin_ids:
                errors.append("duplicate plugin id: " + plugin_id)
            else:
                plugin_ids.add(plugin_id)
            if plugin.get("domain") not in PLUGIN_DOMAINS:
                errors.append("%s has invalid domain" % label)
            try:
                relative = _relative_path(plugin.get("script"), label + ".script")
            except ConstraintError as exc:
                errors.append(str(exc))
                continue
            script = ROOT / relative
            if not script.exists():
                errors.append("%s script missing: %s" % (label, relative))
            elif script.suffix != ".py":
                errors.append("%s script must be Python: %s" % (label, relative))
            if str(relative) in plugin_scripts:
                errors.append("duplicate plugin script: " + str(relative))
            plugin_scripts.add(str(relative))
            args = plugin.get("args")
            if not isinstance(args, list) or not all(isinstance(value, str) for value in args):
                errors.append(label + ".args must be a string list")
            if not isinstance(plugin.get("blocking"), bool):
                errors.append(label + ".blocking must be boolean")
            timeout = plugin.get("timeoutSeconds")
            if not isinstance(timeout, int) or timeout < 1 or timeout > 900:
                errors.append(label + ".timeoutSeconds must be 1..900")

    referenced_validators = set()
    all_rule_ids = set()
    for data in domain_docs.values():
        _collect_values(data, {"validator", "parserValidator", "featureValidator"}, referenced_validators)
        _collect_rule_ids(data, all_rule_ids)
    unknown = sorted(referenced_validators - plugin_ids)
    if unknown:
        errors.append("domain files reference unknown validators: " + ", ".join(unknown))
    orphan = sorted(plugin_ids - referenced_validators)
    if orphan:
        errors.append("plugins not referenced by any domain file: " + ", ".join(orphan))

    api_doc = domain_docs.get("api")
    if isinstance(api_doc, dict):
        classifications = api_doc.get("classifications")
        check(isinstance(classifications, list), "api classifications must be a list")
        if isinstance(classifications, list):
            check(set(classifications) == ALLOWED_API_CLASSIFICATIONS, "api classifications must match supported set")
        rules = api_doc.get("rules")
        check(isinstance(rules, list), "api rules must be a list")
        if isinstance(rules, list):
            seen = set()
            for rule in rules:
                if not isinstance(rule, dict):
                    errors.append("api rule must be an object")
                    continue
                rule_id = rule.get("id")
                if not isinstance(rule_id, str) or not rule_id:
                    errors.append("api rule id must be a non-empty string")
                elif rule_id in seen:
                    errors.append("duplicate api rule id: " + rule_id)
                else:
                    seen.add(rule_id)
                if rule.get("classification") not in ALLOWED_API_CLASSIFICATIONS:
                    errors.append("api rule %s has invalid classification" % rule_id)
                for key in ("scope", "reason"):
                    if not rule.get(key):
                        errors.append("api rule %s missing %s" % (rule_id, key))

    exceptions_doc = domain_docs.get("exceptions")
    if isinstance(exceptions_doc, dict):
        forbidden_scopes = set(exceptions_doc.get("forbiddenScopes") or [])
        exceptions = exceptions_doc.get("exceptions")
        check(isinstance(exceptions, list), "exceptions must be a list")
        if isinstance(exceptions, list):
            seen = set()
            for item in exceptions:
                if not isinstance(item, dict):
                    errors.append("exception must be an object")
                    continue
                exception_id = item.get("id")
                if not isinstance(exception_id, str) or not exception_id:
                    errors.append("exception id must be a non-empty string")
                elif exception_id in seen:
                    errors.append("duplicate exception id: " + exception_id)
                else:
                    seen.add(exception_id)
                if item.get("rule") not in all_rule_ids:
                    errors.append("exception %s references unknown rule" % exception_id)
                files = item.get("files")
                if not isinstance(files, list) or not files:
                    errors.append("exception %s files must be non-empty" % exception_id)
                elif forbidden_scopes.intersection(files):
                    errors.append("exception %s uses forbidden broad scope" % exception_id)
                for key in ("symbols", "reason", "owner"):
                    if not item.get(key):
                        errors.append("exception %s missing %s" % (exception_id, key))

    independent = registry.get("independentReleaseSecurityValidators")
    check(isinstance(independent, list) and independent, "independentReleaseSecurityValidators must be non-empty")
    if isinstance(independent, list):
        seen = set()
        for value in independent:
            try:
                relative = _relative_path(value, "independent validator")
            except ConstraintError as exc:
                errors.append(str(exc))
                continue
            if str(relative) in seen:
                errors.append("duplicate independent validator: " + str(relative))
            seen.add(str(relative))
            if not (ROOT / relative).exists():
                errors.append("independent validator missing: " + str(relative))
            if str(relative) in plugin_scripts:
                errors.append("release security validator cannot be a code plugin: " + str(relative))

    readme = ROOT / "constraints" / "README.md"
    if not readme.exists():
        errors.append("constraints/README.md missing")
    else:
        text = readme.read_text(encoding="utf-8")
        for name in ("registry.json", "syntax.json", "methods.json", "MODULE_BOUNDARIES.json", "api.json", "threading.json", "lifecycle.json", "exceptions.json"):
            if name not in text:
                errors.append("constraints/README.md missing reference: " + name)

    if errors:
        raise ConstraintError("\n".join(errors))
    return registry, domain_docs


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REGISTRY
    try:
        registry, domains = validate_registry(path)
    except ConstraintError as exc:
        for line in str(exc).splitlines():
            print("FAIL constraint-registry: " + line)
        return 1
    print("OK constraint-registry domains=%d plugins=%d independent_release=%d" % (
        len(domains), len(registry["plugins"]), len(registry["independentReleaseSecurityValidators"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
