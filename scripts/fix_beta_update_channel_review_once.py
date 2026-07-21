#!/usr/bin/env python3
import json
import re
from pathlib import Path

PANEL_VERSION_BEFORE = "// @version 1.1.12"
PANEL_VERSION_AFTER = "// @version 1.1.13"
CHANNEL_MARKER = "// =======================【更新通道：Stable / Beta】======================="


def reset_release_record():
    record_path = Path("updates/records/20260721-beta-update-channel.json")
    record = json.loads(record_path.read_text(encoding="utf-8"))
    record["manifestVersion"] = 0
    for key in ("date", "modules", "entry"):
        record.pop(key, None)
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main():
    panel_path = Path("code/th_14_panels.js")
    panel = panel_path.read_text(encoding="utf-8")
    if PANEL_VERSION_AFTER in panel and "channelCardRoot" in panel:
        print("Beta channel UI type-inference fix already applied")
        return
    if PANEL_VERSION_BEFORE not in panel:
        raise SystemExit("unexpected th_14_panels version")
    marker_index = panel.find(CHANNEL_MARKER)
    if marker_index < 0:
        raise SystemExit("update channel block missing")

    prefix = panel[:marker_index]
    block = panel[marker_index:]
    replacements = (
        ("card", "channelCardRoot"),
        ("row", "channelChoiceRow"),
        ("mark", "channelChoiceMark"),
        ("body", "channelChoiceBody"),
        ("actions", "channelActionRow"),
        ("actionLp", "channelActionLp"),
        ("cancel", "channelCancelButton"),
        ("gap", "channelActionGap"),
        ("confirm", "channelConfirmButton"),
    )
    for old, new in replacements:
        block = re.sub(r"\b%s\b" % re.escape(old), new, block)

    panel = prefix + block
    panel = panel.replace(PANEL_VERSION_BEFORE, PANEL_VERSION_AFTER, 1)
    panel_path.write_text(panel, encoding="utf-8")
    reset_release_record()
    print("Applied Beta channel UI type-inference fix")


if __name__ == "__main__":
    main()
