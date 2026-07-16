#!/usr/bin/env python3
from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


preview_path = Path("code/th_21_result_preview.js")
preview = preview_path.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.2.1", "// @version 1.2.2", "preview version")
preview = replace_once(
    preview,
    "        copyVisible: false,\n        copySlotWidth: 0,\n        downX: 0,",
    "        copyVisible: false,\n        downX: 0,",
    "copy slot state",
)
preview = replace_once(
    preview,
    "    if (st.copyVisible === undefined) st.copyVisible = false;\n    if (st.copySlotWidth === undefined) st.copySlotWidth = 0;\n    if (st.touchTarget === undefined) st.touchTarget = \"\";",
    "    if (st.copyVisible === undefined) st.copyVisible = false;\n    if (st.touchTarget === undefined) st.touchTarget = \"\";",
    "copy slot backfill",
)
preview = replace_once(
    preview,
    "    st.copySlotWidth = copySlot;\n\n    var w1 = 0;",
    "    var w1 = 0;",
    "copy slot assignment",
)
preview_path.write_text(preview, encoding="utf-8")

verify_path = Path("scripts/verify_result_preview.py")
verify = verify_path.read_text(encoding="utf-8")
marker = '''    require(
        "preview copy / minimum touch target",
'''
insert = '''    require(
        "preview copy / no cached slot width state",
        "copySlotWidth" not in preview
        and "var copySlot = st.copyVisible ? metrics.slotWidth : 0;" in preview
        and "var finalCopySlot = st.copyVisible ? finalMetrics.slotWidth : 0;" in preview,
        "copy slot width must remain a local layout value instead of persistent preview state",
        failures,
    )
    require(
        "preview copy / minimum touch target",
'''
verify = replace_once(verify, marker, insert, "slot state verification")
verify_path.write_text(verify, encoding="utf-8")

print("Applied result preview slot state cleanup")
