#!/usr/bin/env python3
from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


shortcut_path = Path("code/th_14_button_shortcut.js")
shortcut = shortcut_path.read_text(encoding="utf-8")
shortcut = replace_once(shortcut, "// @version 1.0.4", "// @version 1.0.5", "shortcut version")
shortcut = replace_once(
    shortcut,
    "        renderRunnable: null,\n        searchRunnable: null,\n        pendingQuery: \"\",",
    "        renderRunnable: null,\n        pendingQuery: \"\",",
    "search runnable state",
)
shortcut = replace_once(
    shortcut,
    """                try {
                    if (scInlineState.searchRunnable) scList.removeCallbacks(scInlineState.searchRunnable);
                    var query = __scStr(s);
                    scInlineState.searchRunnable = new java.lang.Runnable({
                        run: function() { __scScheduleRender(query, 0); }
                    });
                    scList.postDelayed(scInlineState.searchRunnable, 180);
                } catch(eSearch) {
""",
    """                try {
                    __scScheduleRender(__scStr(s), 180);
                } catch(eSearch) {
""",
    "text watcher debounce",
)
shortcut = replace_once(
    shortcut,
    """                try { if (scInlineState.renderRunnable) scList.removeCallbacks(scInlineState.renderRunnable); } catch(eRemoveRender) {}
                try { if (scInlineState.searchRunnable) scList.removeCallbacks(scInlineState.searchRunnable); } catch(eRemoveSearch) {}
""",
    """                try { if (scInlineState.renderRunnable) scList.removeCallbacks(scInlineState.renderRunnable); } catch(eRemoveRender) {}
""",
    "detach debounce cleanup",
)
shortcut_path.write_text(shortcut, encoding="utf-8")

verify_path = Path("scripts/verify_button_shortcut_thread_affinity.py")
verify = verify_path.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    '    require(source, "addOnAttachStateChangeListener", "lifecycle listener")\n',
    '    require(source, "addOnAttachStateChangeListener", "lifecycle listener")\n'
    '    require(source, "__scScheduleRender(__scStr(s), 180)", "single search debounce")\n'
    '    if "searchRunnable" in source:\n'
    '        fail("shortcut search must use renderRunnable only")\n',
    "debounce verification",
)
verify = replace_once(
    verify,
    '    if not version_match or tuple(map(int, version_match.groups())) < (1, 0, 2):\n',
    '    if not version_match or tuple(map(int, version_match.groups())) < (1, 0, 5):\n',
    "minimum version",
)
verify = replace_once(
    verify,
    '    print("OK shortcut_picker_thread_affinity owner_view_post=1 generation=1 lifecycle=1 logging=1")\n',
    '    print("OK shortcut_picker_thread_affinity owner_view_post=1 generation=1 lifecycle=1 search_debounce=1 logging=1")\n',
    "verification summary",
)
verify_path.write_text(verify, encoding="utf-8")

print("Applied shortcut search debounce cleanup")
