#!/usr/bin/env python3
import tempfile
from pathlib import Path

from report_api_usage import baseline_document, legacy_document, scan_text, validate_policy


def check(condition, message, errors):
    if not condition:
        errors.append(message)


def main():
    errors = []
    sample = r'''
// android.os.Bad.fake();
var Handler = android.os.Handler;
var handler = new Handler();
handler.post(task);
android.graphics.Color.parseColor("#fff");
shortx.getShortXDir();
var ignored = "android.os.Bad.fake()";
java.lang.Class.forName("android.content.res.ColorStateList");
clazz.getMethod("setColor");
'''
    usage = scan_text(sample, "fixture.js")
    keys = set(usage)
    expected = {
        "android|class|android.os.Handler",
        "android|method|android.os.Handler#post",
        "android|method|android.graphics.Color#parseColor",
        "shortx|method|shortx#getShortXDir",
        "reflection|class|android.content.res.ColorStateList",
        "reflection|method|*#setColor",
    }
    for key in expected:
        check(key in keys, "missing scanner key: " + key, errors)
    check(not any("Bad" in key for key in keys), "comments or strings leaked into scanner", errors)

    entries = []
    for key in sorted(keys):
        item = usage[key]
        item["files"] = sorted(item["files"])
        item["locations"] = sorted(item["locations"], key=lambda value: (value["file"], value["line"], value["form"]))
        entries.append(item)
    current = baseline_document(["fixture.js"], entries)
    baseline = baseline_document(["fixture.js"], entries)
    legacy = legacy_document(baseline)
    api_doc = {"rules": []}
    check(validate_policy(current, baseline, legacy, api_doc) == [], "matching legacy baseline should pass", errors)

    new_current = baseline_document(["fixture.js"], entries + [{
        "key": "android|method|android.os.Vibrator#vibrate",
        "source": "android",
        "kind": "method",
        "classOrObject": "android.os.Vibrator",
        "method": "vibrate",
        "files": ["fixture.js"],
        "locations": [],
        "occurrenceCount": 1,
    }])
    new_errors = validate_policy(new_current, baseline, legacy, api_doc)
    check(any(item.startswith("NEW_API ") for item in new_errors), "new API was not detected", errors)
    check(any(item.startswith("UNCLASSIFIED_API ") for item in new_errors), "unclassified API was not detected", errors)

    expanded = baseline_document(["fixture.js", "other.js"], [dict(item, files=["fixture.js", "other.js"]) for item in entries])
    expanded_errors = validate_policy(expanded, expanded, legacy, api_doc)
    check(any(item.startswith("UNREVIEWED_API_SCOPE_EXPANSION ") for item in expanded_errors),
          "legacy scope expansion was not detected", errors)

    if errors:
        for item in errors:
            print("FAIL api-usage-scanner: " + item)
        return 1
    print("OK api-usage-scanner keys=%d" % len(keys))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
