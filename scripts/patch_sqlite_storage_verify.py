#!/usr/bin/env python3
"""临时同步 SQLite 存储验证到新的防抖并发语义。"""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "scripts" / "verify_sqlite_storage.py"
text = path.read_text(encoding="utf-8")
old = '''    schedule = section(group, text, "scheduleWrite: function", "flushWrites: function")
    if "live.task = null" not in schedule:
        fail(group, "failed debounced writes must remain pending")

    flush = section(group, text, "flushWrites: function", "queryCount: function")
    if "allOk = false" not in flush or "job.lastError" not in flush:
        fail(group, "failed flush jobs are not retained")'''
new = '''    schedule = section(group, text, "scheduleWrite: function", "flushWrites: function")
    for marker in [
        "self.runScheduledJob(job)",
        "this._jobSequence = Number(this._jobSequence || 0) + 1",
        "this._jobs[p] = job",
    ]:
        if marker not in schedule:
            fail(group, "debounced scheduling is missing " + marker)

    runner = section(group, text, "runScheduledJob: function", "scheduleWrite: function")
    for marker in [
        "live === job",
        "current === job",
        "current.lastError",
    ]:
        if marker not in runner:
            fail(group, "debounced job identity handling is missing " + marker)

    flush = section(group, text, "flushWrites: function", "queryCount: function")
    for marker in ["allOk = false", "item.lastError", "failed.push(item)"]:
        if marker not in flush:
            fail(group, "failed flush jobs are not retained: " + marker)'''
if old not in text:
    if new in text:
        print("SQLite storage verification already current")
        raise SystemExit(0)
    raise SystemExit("missing SQLite verification anchor")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("SQLite storage verification updated")
