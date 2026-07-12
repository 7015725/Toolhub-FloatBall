#!/usr/bin/env python3
"""验证 SQLite 防抖任务的身份隔离、锁顺序和最新写入语义。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "code" / "th_02_core.js"


def fail(message):
    raise SystemExit("FAIL [sqlite-debounce-race]: " + message)


def section(text, start, end):
    try:
        a = text.index(start)
        b = text.index(end, a + len(start))
    except ValueError as exc:
        fail("cannot locate section %r -> %r: %s" % (start, end, exc))
    return text[a:b]


def verify_source():
    text = CORE.read_text(encoding="utf-8")
    required = [
        "// @version 2.0.1",
        "_jobLock: new java.util.concurrent.locks.ReentrantLock()",
        "_writeLock: new java.util.concurrent.locks.ReentrantLock()",
        "_jobSequence: 0",
        "writeManagedNowSerialized: function(path, content)",
        "runScheduledJob: function(job)",
        "live === job",
        "current === job",
        "this._jobs[p] === job",
        "snapshot.push(job)",
        "this._jobs = {}",
    ]
    for marker in required:
        if marker not in text:
            fail("missing marker: " + marker)

    serialized = section(text, "writeManagedNowSerialized: function", "ensureTimer: function")
    if serialized.index("this._writeLock.lock()") > serialized.index("this._jobLock.lock()"):
        fail("immediate writes must acquire write lock before job lock")
    if "pending.task.cancel()" not in serialized or "delete this._jobs[p]" not in serialized:
        fail("immediate writes must cancel and remove an older pending job")

    runner = section(text, "runScheduledJob: function", "scheduleWrite: function")
    if runner.index("this._writeLock.lock()") > runner.index("this._jobLock.lock()"):
        fail("scheduled writes must acquire write lock before job lock")
    if runner.count("=== job") < 2:
        fail("scheduled completion must verify job identity before and after writing")
    if "Number(live.version) === Number(job.version)" not in runner:
        fail("scheduled start is missing generation validation")
    if "Number(current.version) === Number(job.version)" not in runner:
        fail("scheduled completion is missing generation validation")

    schedule = section(text, "scheduleWrite: function", "flushWrites: function")
    if schedule.index("this._writeLock.lock()") > schedule.index("this._jobLock.lock()"):
        fail("scheduling must use the global write-before-job lock order")
    if "this._jobSequence = Number(this._jobSequence || 0) + 1" not in schedule:
        fail("jobs need a monotonic generation independent of the previous slot")
    if "self.runScheduledJob(job)" not in schedule:
        fail("TimerTask must execute the captured job identity")

    flush = section(text, "flushWrites: function", "queryCount: function")
    if flush.index("this._writeLock.lock()") > flush.index("this._jobLock.lock()"):
        fail("flush must use the global write-before-job lock order")
    for marker in ["snapshot.push(job)", "this._jobs = {}", "this._timer.cancel()", "failed.push(item)"]:
        if marker not in flush:
            fail("flush is missing: " + marker)

    if text.count("StructuredStore.writeManagedNowSerialized(path, content)") != 2:
        fail("both immediate managed write entry points must use serialized writes")

    info = section(text, "getInfo: function()", "    };\n\n    try { StructuredStore.ensureReady()")
    if "this._jobLock.lock()" not in info or "this._jobLock.unlock()" not in info:
        fail("storage diagnostics must not iterate _jobs without the job lock")


class JobModel:
    def __init__(self):
        self.current = None
        self.sequence = 0
        self.writes = []

    def schedule(self, payload):
        self.sequence += 1
        job = {"version": self.sequence, "payload": payload}
        self.current = job
        return job

    def complete(self, job):
        if self.current is not job:
            return False
        self.writes.append(job["payload"])
        if self.current is job:
            self.current = None
        return True

    def immediate(self, payload):
        self.current = None
        self.writes.append(payload)


def verify_model():
    model = JobModel()
    old = model.schedule("old")
    new = model.schedule("new")
    if model.complete(old):
        fail("a superseded task was allowed to write")
    if model.current is not new:
        fail("old completion cleared the new task")
    if not model.complete(new) or model.writes != ["new"]:
        fail("latest debounced payload did not win")

    model = JobModel()
    model.schedule("pending")
    model.immediate("immediate")
    if model.current is not None or model.writes != ["immediate"]:
        fail("immediate write did not supersede a pending debounce")

    model = JobModel()
    first = model.schedule("first")
    if not model.complete(first):
        fail("current task could not complete")
    second = model.schedule("second")
    if not model.complete(second) or model.writes != ["first", "second"]:
        fail("serialized writes did not preserve newest-last ordering")


def main():
    verify_source()
    verify_model()
    print("PASS sqlite-debounce-race")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
