#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
pointer_path = ROOT / "code" / "th_17_pointer.js"
verify_path = ROOT / "scripts" / "verify_pointer_regressions.py"
pointer = pointer_path.read_text(encoding="utf-8")
verify = verify_path.read_text(encoding="utf-8")

old_automation = 'var a = preparedAutomation || this.getPointerUiAutomation(isFinal ? "final_scan" : "scan");'
new_automation = 'var a = preparedAutomation || this.getPointerUiAutomation(isFinal ? "final_prepare" : "scan");'
if pointer.count(old_automation) != 1:
    raise RuntimeError("prepared automation fallback marker mismatch")
pointer = pointer.replace(old_automation, new_automation, 1)

old_cap = '              if (windowsScanned >= maxExtraWindows) break;'
new_cap = '''              if (windowsScanned >= maxExtraWindows) {
                fallbackSkippedDueBudget = true;
                break;
              }'''
if pointer.count(old_cap) != 1:
    raise RuntimeError("window cap marker mismatch")
pointer = pointer.replace(old_cap, new_cap, 1)

old_contract = '''        "preparedAutomation" in pointer
        and 'this.getPointerUiAutomation("final_prepare")' in pointer'''
new_contract = '''        "preparedAutomation" in pointer
        and 'preparedAutomation || this.getPointerUiAutomation(isFinal ? "final_prepare" : "scan")' in pointer
        and 'this.getPointerUiAutomation("final_prepare")' in pointer'''
if verify.count(old_contract) != 1:
    raise RuntimeError("final scan contract marker mismatch")
verify = verify.replace(old_contract, new_contract, 1)

pointer_path.write_text(pointer, encoding="utf-8")
verify_path.write_text(verify, encoding="utf-8")
print("OK amended pointer final scan budget fix")
