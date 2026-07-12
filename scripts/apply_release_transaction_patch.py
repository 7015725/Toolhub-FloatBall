#!/usr/bin/env python3
"""将拆分的事务更新片段写入 ToolHub.js。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ToolHub.js"
A = ROOT / "scripts" / "release_transaction_helpers_a.js.inc"
B = ROOT / "scripts" / "release_transaction_helpers_b.js.inc"
INSTALL = ROOT / "scripts" / "release_transaction_install.js.inc"


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    if "function executeStagedModuleTransaction(entries, installedManifest)" in text:
        raise SystemExit("transaction patch already applied")

    path_marker = 'function getInstalledManifestPath() { return getCodeDirPath() + ".installed_manifest.json"; }\n'
    if path_marker not in text:
        raise SystemExit("installed manifest path marker missing")
    path_helpers = (
        'function getModuleTxnMarkerPath() { return getCodeDirPath() + ".module_update_transaction.json"; }\n'
        'function getModuleTxnCommitPath() { return getCodeDirPath() + ".module_update_transaction.committed"; }\n'
    )
    text = text.replace(path_marker, path_marker + path_helpers, 1)

    install_start = text.find("function installPendingModuleUpdates() {")
    check_start = text.find("function checkToolHubModuleUpdatesNow() {", install_start)
    if install_start < 0 or check_start < 0:
        raise SystemExit("install function markers missing")

    helpers = A.read_text(encoding="utf-8") + "\n" + B.read_text(encoding="utf-8") + "\n\n"
    install = INSTALL.read_text(encoding="utf-8")
    text = text[:install_start] + helpers + install + text[check_start:]

    bottom = 'var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true, "th_19_position_state.js": true };\nfetchTrustedManifest();'
    replacement = 'var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true, "th_19_position_state.js": true };\nrecoverPendingModuleTransaction();\nfetchTrustedManifest();'
    if bottom not in text:
        raise SystemExit("startup recovery marker missing")
    text = text.replace(bottom, replacement, 1)

    TARGET.write_text(text, encoding="utf-8")
    print("release transaction patch applied")


if __name__ == "__main__":
    main()
