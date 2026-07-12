#!/usr/bin/env python3
"""临时应用 SQLite 防抖任务并发修复。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "code" / "th_02_core.js"
text = path.read_text(encoding="utf-8")

if "// @version 2.0.1" not in text:
    text = text.replace("// @version 2.0.0", "// @version 2.0.1", 1)

old_fields = '''      _timer: null,
      _jobs: {},
      _blockedWrites: {},'''
new_fields = '''      _timer: null,
      _jobs: {},
      _jobLock: new java.util.concurrent.locks.ReentrantLock(),
      _writeLock: new java.util.concurrent.locks.ReentrantLock(),
      _jobSequence: 0,
      _blockedWrites: {},'''
if old_fields in text:
    text = text.replace(old_fields, new_fields, 1)
elif "_jobLock: new java.util.concurrent.locks.ReentrantLock()" not in text:
    raise SystemExit("missing StructuredStore field anchor")

start = text.find("      ensureTimer: function() {")
end = text.find("      queryCount: function(db, tableName) {", start)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("missing debounce section boundaries")

new_section = r'''      writeManagedNowSerialized: function(path, content) {
        var p = String(path || "");
        this._writeLock.lock();
        try {
          this._jobLock.lock();
          try {
            var pending = this._jobs[p];
            if (pending) {
              try { if (pending.task) pending.task.cancel(); } catch (eCancel) {}
              try { delete this._jobs[p]; } catch (eDelete) { this._jobs[p] = null; }
            }
          } finally {
            this._jobLock.unlock();
          }
          return this.writeManagedNow(p, content);
        } finally {
          this._writeLock.unlock();
        }
      },

      ensureTimer: function() {
        this._jobLock.lock();
        try {
          if (!this._timer) this._timer = new java.util.Timer("sx-toolhub-structured-sqlite", true);
          return !!this._timer;
        } catch (e) {
          this._lastError = "ensureTimer: " + String(e);
          return false;
        } finally {
          this._jobLock.unlock();
        }
      },

      runScheduledJob: function(job) {
        if (!job) return false;
        var p = String(job.path || "");
        var shouldRun = false;
        var ok = false;

        this._writeLock.lock();
        try {
          this._jobLock.lock();
          try {
            var live = this._jobs[p];
            shouldRun = !!live && live === job && Number(live.version) === Number(job.version);
            if (shouldRun) {
              live.running = true;
              live.task = null;
            }
          } finally {
            this._jobLock.unlock();
          }
          if (!shouldRun) return true;

          ok = this.writeManagedNow(p, job.payload);

          this._jobLock.lock();
          try {
            var current = this._jobs[p];
            if (current === job && Number(current.version) === Number(job.version)) {
              current.running = false;
              if (ok) {
                try { delete this._jobs[p]; } catch (eDelete) { this._jobs[p] = null; }
              } else {
                current.task = null;
                current.lastError = String(this._lastError || "structured write failed");
              }
            }
          } finally {
            this._jobLock.unlock();
          }
          return ok;
        } finally {
          this._writeLock.unlock();
        }
      },

      scheduleWrite: function(path, content, delayMs) {
        var p = String(path || "");
        if (!this.isManagedPath(p)) return false;
        try { this.parseManagedContent(p, content); } catch (eParse) { this._lastError = String(eParse); return false; }
        if (this._blockedWrites[p] === true) return false;

        var d = 0;
        try { d = parseInt(String(delayMs), 10); } catch (eDelay) { d = 0; }
        if (isNaN(d) || d < 0) d = 0;

        var payload = String(content);
        var task = null;
        var job = null;
        var fallbackNow = false;
        var self = this;

        this._writeLock.lock();
        try {
          this._jobLock.lock();
          try {
            var old = this._jobs[p];
            if (old && old.task) {
              try { old.task.cancel(); } catch (eCancel) {}
            }

            this._jobSequence = Number(this._jobSequence || 0) + 1;
            job = {
              path: p,
              payload: payload,
              version: Number(this._jobSequence),
              task: null,
              running: false,
              lastError: ""
            };

            task = new JavaAdapter(java.util.TimerTask, {
              run: function() {
                self.runScheduledJob(job);
              }
            });
            job.task = task;
            this._jobs[p] = job;

            try {
              if (!this._timer) this._timer = new java.util.Timer("sx-toolhub-structured-sqlite", true);
              this._timer.schedule(task, d);
            } catch (eSchedule) {
              this._lastError = "scheduleWrite: " + String(eSchedule);
              if (this._jobs[p] === job) {
                try { delete this._jobs[p]; } catch (eDelete2) { this._jobs[p] = null; }
              }
              fallbackNow = true;
            }
          } finally {
            this._jobLock.unlock();
          }

          if (fallbackNow) return this.writeManagedNow(p, payload);
          return true;
        } finally {
          this._writeLock.unlock();
        }
      },

      flushWrites: function() {
        var allOk = true;
        var snapshot = [];
        var failed = [];

        this._writeLock.lock();
        try {
          this._jobLock.lock();
          try {
            for (var p in this._jobs) {
              if (!this._jobs.hasOwnProperty(p)) continue;
              var job = this._jobs[p];
              if (!job) continue;
              try { if (job.task) job.task.cancel(); } catch (eCancel) {}
              snapshot.push(job);
            }
            this._jobs = {};
            if (this._timer) {
              try { this._timer.cancel(); } catch (eTimerCancel) {}
              try { this._timer.purge(); } catch (ePurge) {}
              this._timer = null;
            }
          } finally {
            this._jobLock.unlock();
          }

          for (var i = 0; i < snapshot.length; i++) {
            var item = snapshot[i];
            var ok = this.writeManagedNow(item.path, item.payload);
            if (!ok) {
              allOk = false;
              item.task = null;
              item.running = false;
              item.lastError = String(this._lastError || "structured write failed");
              failed.push(item);
            }
          }

          if (failed.length > 0) {
            this._jobLock.lock();
            try {
              for (var j = 0; j < failed.length; j++) {
                var failedJob = failed[j];
                var current = this._jobs[failedJob.path];
                if (!current || Number(current.version) < Number(failedJob.version)) {
                  this._jobs[failedJob.path] = failedJob;
                }
              }
            } finally {
              this._jobLock.unlock();
            }
          }
          return allOk;
        } catch (e) {
          this._lastError = "flushWrites: " + String(e);
          return false;
        } finally {
          this._writeLock.unlock();
        }
      },

'''
text = text[:start] + new_section + text[end:]

text = text.replace(
    "if (StructuredStore.isManagedPath(path)) return StructuredStore.writeManagedNow(path, content);",
    "if (StructuredStore.isManagedPath(path)) return StructuredStore.writeManagedNowSerialized(path, content);",
)

old_pending = '''        try {
          for (var k in this._jobs) {
            if (this._jobs.hasOwnProperty(k) && this._jobs[k]) pending++;
          }
        } catch (ePending) {}'''
new_pending = '''        try {
          this._jobLock.lock();
          try {
            for (var k in this._jobs) {
              if (this._jobs.hasOwnProperty(k) && this._jobs[k]) pending++;
            }
          } finally {
            this._jobLock.unlock();
          }
        } catch (ePending) {}'''
if old_pending in text:
    text = text.replace(old_pending, new_pending, 1)
elif "this._jobLock.lock();" not in text[text.find("getInfo: function()"):text.find("getInfo: function()") + 900]:
    raise SystemExit("missing getInfo pending anchor")

required = [
    "// @version 2.0.1",
    "_jobLock: new java.util.concurrent.locks.ReentrantLock()",
    "_writeLock: new java.util.concurrent.locks.ReentrantLock()",
    "writeManagedNowSerialized: function(path, content)",
    "runScheduledJob: function(job)",
    "live === job",
    "current === job",
    "this._writeLock.lock();",
    "this._jobLock.lock();",
]
for token in required:
    if token not in text:
        raise SystemExit("generated core missing token: %s" % token)

path.write_text(text, encoding="utf-8")
print("SQLite debounce locking patch applied")
