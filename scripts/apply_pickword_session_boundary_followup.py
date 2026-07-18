#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / "code" / "th_20_pickword.js"
verify_path = ROOT / "scripts" / "verify_pickword_unified_cleanup.py"
source = source_path.read_text(encoding="utf-8")

old_cancel_tail = '''        pendingFingerPreviewWarmupRunnable = null;
        pendingAdjustRunnable = null;
        dragUpdateScheduled = false;
    }
'''
new_cancel_tail = '''        pendingFingerPreviewWarmupRunnable = null;
        pendingAdjustRunnable = null;
        dragUpdateScheduled = false;
        isAutoScrolling = false;
        try {
            拾字Floaty.currentScrollDirection = 0;
            拾字Floaty.currentScrollSpeed = 0;
        } catch (eState) {}
    }
'''
if source.count(old_cancel_tail) != 1:
    raise SystemExit("cancelMainPickwordCallbacks20 tail marker missing")
source = source.replace(old_cancel_tail, new_cancel_tail, 1)

old_reset_head = '''        resetSessionState: function(text) {
            this.resetTextLoadState((typeof text === 'string') ? text : String(text || ""));
            if (dragUpdateScheduled) {
                try { mainHandler.removeCallbacks(dragUpdateProcessor); } catch (eDragCancel) {}
            }
            dragUpdateScheduled = false;
'''
new_reset_head = '''        resetSessionState: function(text) {
            // 新文本进入同一窗口前先终止上一会话的长按、自动滚动、延迟排版与拖选刷新。
            cancelMainPickwordCallbacks20();
            this.resetTextLoadState((typeof text === 'string') ? text : String(text || ""));
'''
if source.count(old_reset_head) != 1:
    raise SystemExit("resetSessionState head marker missing")
source = source.replace(old_reset_head, new_reset_head, 1)
source_path.write_text(source, encoding="utf-8")

verify = verify_path.read_text(encoding="utf-8")
needle = 'require("dragUpdateProcessor" in main_block, "main cleanup must cancel drag processor")\n'
addition = needle + 'require("isAutoScrolling = false;" in main_block, "main cleanup must stop auto-scroll state")\n'
if addition not in verify:
    if verify.count(needle) != 1:
        raise SystemExit("main cleanup verifier marker missing")
    verify = verify.replace(needle, addition, 1)

hide_marker = 'require("removeMainPickwordWindowNow20();" in hide_block, "hide does not use unified main cleanup")\n'
session_checks = hide_marker + '''
reset_start = source.find("        resetSessionState: function(text) {")
reset_end = source.find("        show: function(text) {", reset_start)
require(reset_start >= 0 and reset_end > reset_start, "resetSessionState block missing")
reset_block = source[reset_start:reset_end]
require("cancelMainPickwordCallbacks20();" in reset_block, "new session must cancel previous main callbacks")
require(reset_block.find("cancelMainPickwordCallbacks20();") < reset_block.find("this.resetTextLoadState"), "callback cancellation must precede text reset")
'''
if session_checks not in verify:
    if verify.count(hide_marker) != 1:
        raise SystemExit("session verifier insertion marker missing")
    verify = verify.replace(hide_marker, session_checks, 1)
verify_path.write_text(verify, encoding="utf-8")

print("pickword session boundary follow-up applied")
