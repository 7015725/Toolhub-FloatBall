#!/usr/bin/env python3
"""Register th_26 QR API usage without wildcard/global policy relaxation."""
import json
from pathlib import Path

from report_api_usage import rule_matches_key, scan_repository, scan_text, scope_matches

ROOT = Path(__file__).resolve().parents[1]
API_PATH = ROOT / "constraints" / "api.json"
QR_PATH = "code/th_26_qr_runtime.js"
QR_FILE = ROOT / QR_PATH
RULE_ID = "api-pickword-qr-runtime"


def main():
    api = json.loads(API_PATH.read_text(encoding="utf-8"))
    qr_usage = scan_text(QR_FILE.read_text(encoding="utf-8", errors="replace"), QR_PATH)
    qr_keys = sorted(qr_usage)
    if not qr_keys:
        raise SystemExit("QR API usage scan returned no keys")

    _, repository_entries = scan_repository(ROOT)
    repository_map = {str(item.get("key", "")): item for item in repository_entries}

    rules = api.get("rules") or []
    existing_qr = None
    for rule in rules:
        if str(rule.get("id", "")) == RULE_ID:
            existing_qr = rule
            break

    unmatched = []
    expanded_rule_ids = set()
    for key in qr_keys:
        matching = [
            rule for rule in rules
            if str(rule.get("id", "")) != RULE_ID and rule_matches_key(rule, key)
        ]
        if not matching:
            unmatched.append(key)
            continue
        for rule in matching:
            if str(rule.get("classification", "")) == "forbidden":
                raise SystemExit("QR module touches forbidden API rule %s key=%s" % (rule.get("id"), key))
            scope = list(rule.get("scope") or [])
            if not scope_matches(QR_PATH, scope):
                scope.append(QR_PATH)
                rule["scope"] = scope
                expanded_rule_ids.add(str(rule.get("id", "")))

    # Rules are evaluated against every file using each matching key. For keys that did
    # not previously have an explicit rule, record only the finite union of their current
    # repository locations. This avoids wildcard/global policy relaxation.
    unmatched_scope = set()
    for key in unmatched:
        item = repository_map.get(key) or {}
        for path in item.get("files") or []:
            unmatched_scope.add(str(path))
    unmatched_scope.add(QR_PATH)

    qr_rule = {
        "id": RULE_ID,
        "usageKeys": unmatched,
        "source": "android/java/shortx",
        "classOrObject": "QR runtime dependency, ShortX shared lib, worker and compact result UI APIs",
        "method": "mixed",
        "classification": "guarded",
        "scope": sorted(unmatched_scope),
        "allowScopeExpansion": True,
        "minApi": 24,
        "guard": "二维码入口仅在有效拾字截图存在且用户显式点击后执行；运行时文件必须来自签名清单、size/SHA-256 匹配并在 DexClassLoader 前设为只读",
        "owner": "ToolHub Beta pickword QR runtime",
        "threadContract": "下载、Bitmap/ZXing 解码和运行时加载在独立 worker；仅按钮与结果卡更新回 Android main Looper",
        "fallback": "任何下载、哈希、只读、类加载、图片解码或超时失败只降级二维码结果卡，不阻断 ToolHub、框选截图或 OCR",
        "reason": "显式登记 th_26_qr_runtime.js 引入的 API，并仅保留这些 usage key 当前实际存在的有限文件作用域；不使用通配符扩大到其他模块",
    }
    if existing_qr is None:
        rules.append(qr_rule)
    else:
        existing_qr.clear()
        existing_qr.update(qr_rule)

    api["rules"] = rules
    API_PATH.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "OK QR API policy keys=%d new_keys=%d expanded_rules=%s rule_scope_files=%d"
        % (
            len(qr_keys), len(unmatched),
            ",".join(sorted(expanded_rule_ids)) or "none",
            len(unmatched_scope),
        )
    )


if __name__ == "__main__":
    main()
