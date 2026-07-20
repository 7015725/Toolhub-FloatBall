#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from verify_constraint_registry import ConstraintError, DEFAULT_REGISTRY, ROOT, validate_registry


def run_plugin(plugin):
    script = ROOT / plugin["script"]
    command = [sys.executable, str(script)] + list(plugin.get("args") or [])
    started = time.monotonic()
    try:
        result = subprocess.run(
            command,
            cwd=str(ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=plugin["timeoutSeconds"],
        )
        status = "pass" if result.returncode == 0 else "fail"
        output = result.stdout or ""
        return_code = result.returncode
    except subprocess.TimeoutExpired as exc:
        status = "timeout"
        output = exc.stdout or ""
        if isinstance(output, bytes):
            output = output.decode("utf-8", errors="replace")
        return_code = None
    elapsed_ms = round((time.monotonic() - started) * 1000.0, 3)
    return {
        "id": plugin["id"],
        "domain": plugin["domain"],
        "script": plugin["script"],
        "blocking": plugin["blocking"],
        "status": status,
        "returnCode": return_code,
        "elapsedMs": elapsed_ms,
        "output": output.rstrip(),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Run registered ToolHub code constraint validators"
    )
    parser.add_argument(
        "--registry",
        default=str(DEFAULT_REGISTRY.relative_to(ROOT)),
        help="constraint registry path relative to repository",
    )
    parser.add_argument(
        "--domain",
        action="append",
        choices=("syntax", "methods", "api", "threading", "lifecycle"),
        help="run only selected domain; may be repeated",
    )
    parser.add_argument("--output", help="write machine-readable JSON report")
    parser.add_argument("--list", action="store_true", help="list registered plugins")
    args = parser.parse_args()

    try:
        registry, domain_docs = validate_registry(Path(args.registry))
    except ConstraintError as exc:
        for line in str(exc).splitlines():
            print("FAIL code-constraints registry: " + line)
        return 1

    selected_domains = set(args.domain or [])
    plugins = [
        plugin for plugin in registry["plugins"]
        if not selected_domains or plugin["domain"] in selected_domains
    ]

    if args.list:
        for plugin in plugins:
            print("%s\t%s\t%s" % (
                plugin["domain"], plugin["id"], plugin["script"]))
        return 0

    print("CODE_CONSTRAINTS_BEGIN")
    print("registry=%s domains=%d plugins=%d" % (
        args.registry, len(domain_docs), len(plugins)))

    results = []
    for plugin in plugins:
        print("\n[%s] %s" % (plugin["domain"], plugin["id"]))
        result = run_plugin(plugin)
        results.append(result)
        if result["output"]:
            print(result["output"])
        print(
            "CONSTRAINT_RESULT domain=%s validator=%s status=%s "
            "blocking=%s elapsed_ms=%.3f" % (
                result["domain"],
                result["id"],
                result["status"],
                str(result["blocking"]).lower(),
                result["elapsedMs"],
            )
        )

    blocking_failures = [
        item for item in results
        if item["blocking"] and item["status"] != "pass"
    ]
    warnings = [
        item for item in results
        if not item["blocking"] and item["status"] != "pass"
    ]
    per_domain = {}
    for domain in ("syntax", "methods", "api", "threading", "lifecycle"):
        items = [item for item in results if item["domain"] == domain]
        if not items:
            continue
        if any(item["blocking"] and item["status"] != "pass" for item in items):
            status = "fail"
        elif any(item["status"] != "pass" for item in items):
            status = "warning"
        else:
            status = "pass"
        per_domain[domain] = {
            "status": status,
            "plugins": len(items),
            "elapsedMs": round(sum(item["elapsedMs"] for item in items), 3),
        }

    report = {
        "schema": 1,
        "registry": args.registry,
        "environment": registry["environment"],
        "selectedDomains": sorted(selected_domains),
        "domains": per_domain,
        "results": results,
        "summary": {
            "plugins": len(results),
            "passed": sum(1 for item in results if item["status"] == "pass"),
            "failed": sum(1 for item in results if item["status"] == "fail"),
            "timeouts": sum(1 for item in results if item["status"] == "timeout"),
            "blockingFailures": len(blocking_failures),
            "warnings": len(warnings),
            "elapsedMs": round(sum(item["elapsedMs"] for item in results), 3),
        },
    }

    if args.output:
        output = ROOT / args.output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print("report=" + str(output.relative_to(ROOT)))

    for domain, summary in per_domain.items():
        print("DOMAIN_RESULT domain=%s status=%s plugins=%d elapsed_ms=%.3f" % (
            domain,
            summary["status"],
            summary["plugins"],
            summary["elapsedMs"],
        ))
    final_status = "fail" if blocking_failures else "pass"
    print(
        "CODE_CONSTRAINTS_END status=%s plugins=%d blocking_failures=%d warnings=%d" % (
            final_status, len(results), len(blocking_failures), len(warnings))
    )
    return 1 if blocking_failures else 0


if __name__ == "__main__":
    sys.exit(main())
