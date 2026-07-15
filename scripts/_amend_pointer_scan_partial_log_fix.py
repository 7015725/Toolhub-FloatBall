from pathlib import Path

path = Path(__file__).resolve().parent / "verify_pointer_regressions.py"
text = path.read_text(encoding="utf-8")
old = '''        and "windowsScanMs" in pointer
        and "fallbackSkippedDueBudget" in pointer,
'''
new = '''        and "windowsScanMs" in pointer
        and "fallbackPartial" in pointer
        and "fallbackSkipReason" in pointer
        and "budgetTimedOut" in pointer,
'''
count = text.count(old)
if count != 1:
    raise SystemExit("final scan regression update: expected 1 match, got %d" % count)
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("OK final scan regression updated for partial scan metadata")
