#!/usr/bin/env python3
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def normalize_mode(value):
    mode = str(value or "").strip().lower()
    if mode in ("compat_audit", "off"):
        return mode
    return "strict"


def match(uri, raw):
    for part in str(raw or "").split("|"):
        prefix = part.strip()
        if prefix and str(uri or "").startswith(prefix):
            return True
    return False


def security(mode, action, uri, read_allow, write_allow, check_error=False):
    normalized = normalize_mode(mode)
    if normalized == "off":
        return True
    write = str(action or "").strip().lower() in ("put", "update", "insert", "delete")
    allowed = match(uri, write_allow if write else read_allow)
    if allowed:
        return True
    if check_error:
        return normalized == "compat_audit"
    return normalized == "compat_audit"


def main():
    content = (ROOT / "code" / "th_08_content.js").read_text(encoding="utf-8")
    rebuild = (ROOT / "code" / "th_12_rebuild.js").read_text(encoding="utf-8")
    docs = (ROOT / "docs" / "security-config-clean.md").read_text(encoding="utf-8")

    checks = [
        ("content module version advanced", "// @version 1.0.3" in content),
        ("content defaults to strict", 'var mode = "strict"' in content),
        ("old audit is not accepted as allow mode", 'mode !== "compat_audit" && mode !== "off"' in content),
        ("read allowlist remains separate", "getContentUriAllowlist" in content),
        ("write allowlist getter exists", "getContentWriteUriAllowlist" in content),
        ("write allowlist config exists", "CONTENT_WRITE_URI_ALLOWLIST" in content and "CONTENT_WRITE_URI_ALLOWLIST" in rebuild),
        ("write actions use write allowlist", "isContentWriteUriAllowlisted" in content and 'out.scope = isWrite ? "write" : "read"' in content),
        ("compat audit is explicit", 'out.mode === "compat_audit"' in content),
        ("strict check failure is fail closed", 'out.ok = false' in content and 'fail closed' in content),
        ("rebuild schema defaults strict", 'values: ["strict", "compat_audit", "off"], default: "strict"' in rebuild),
        ("write allowlist defaults empty", 'putDefault("CONTENT_WRITE_URI_ALLOWLIST", "")' in rebuild),
        ("documentation explains write deny default", "写入白名单默认留空" in docs),
    ]

    read_allow = "content://settings/system/|content://settings/secure/|content://settings/global/"
    write_allow = ""
    model_checks = [
        ("unknown mode becomes strict", normalize_mode("mystery") == "strict"),
        ("old audit becomes strict", normalize_mode("audit") == "strict"),
        ("default settings read allowed", security("strict", "get", "content://settings/system/screen_brightness", read_allow, write_allow)),
        ("default settings write blocked", not security("strict", "put", "content://settings/system/screen_brightness", read_allow, write_allow)),
        ("explicit write prefix allows selected key", security("strict", "put", "content://settings/system/screen_brightness", read_allow, "content://settings/system/screen_brightness")),
        ("unlisted write remains blocked", not security("strict", "put", "content://settings/secure/enabled_accessibility_services", read_allow, "content://settings/system/screen_brightness")),
        ("compat audit preserves old action", security("compat_audit", "put", "content://example/private", read_allow, write_allow)),
        ("strict internal check error fails closed", not security("strict", "get", "content://example/private", read_allow, write_allow, check_error=True)),
        ("off remains explicit bypass", security("off", "put", "content://example/private", "", "")),
    ]

    failed = [name for name, ok in checks + model_checks if not ok]
    if failed:
        print("Content security verification FAILED:")
        for name in failed:
            print(" - " + name)
        return 1

    print("Content security verification OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
