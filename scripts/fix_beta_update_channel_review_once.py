#!/usr/bin/env python3
import json
import re
from pathlib import Path

ENTRY_VERSION_BEFORE = "var TOOLHUB_ENTRY_VERSION = 20260721193000;"
ENTRY_VERSION_AFTER = "var TOOLHUB_ENTRY_VERSION = 20260721201500;"
PANEL_VERSION_BEFORE = "// @version 1.1.11"
PANEL_VERSION_AFTER = "// @version 1.1.12"


def main():
    entry_path = Path("ToolHub.js")
    panel_path = Path("code/th_14_panels.js")
    entry = entry_path.read_text(encoding="utf-8")
    panel = panel_path.read_text(encoding="utf-8")
    already_fixed = (
        ENTRY_VERSION_AFTER in entry
        and PANEL_VERSION_AFTER in panel
        and "oldBuildToolHubUpdateVersionPanelView" not in panel
    )
    if already_fixed:
        print("Beta channel review fixes already applied")
        return

    if ENTRY_VERSION_BEFORE not in entry:
        raise SystemExit("unexpected ToolHub entry version")
    entry = entry.replace(ENTRY_VERSION_BEFORE, ENTRY_VERSION_AFTER, 1)
    start = entry.index("function writeToolHubChannelStateAtomic(state) {")
    end = entry.index("\nvar TOOLHUB_CHANNEL_STATE = readToolHubChannelState();", start)
    replacement = r'''function writeToolHubChannelStateAtomic(state) {
    var out = null;
    var target = new java.io.File(getToolHubChannelStatePath());
    var parent = target.getParentFile();
    var tmp = new java.io.File(target.getAbsolutePath() + ".tmp");
    var bak = new java.io.File(target.getAbsolutePath() + ".bak");
    var hadTarget = false;
    try {
        if (parent && !parent.exists() && !parent.mkdirs()) throw "channel bootstrap mkdirs failed";
        if (tmp.exists() && !tmp.delete()) throw "delete stale channel tmp failed";
        var clean = {
            schema: 1,
            activeChannel: normalizeToolHubUpdateChannel(state && state.activeChannel),
            pendingChannel: "",
            lastGoodChannel: normalizeToolHubUpdateChannel(state && state.lastGoodChannel),
            generation: Math.max(0, Number(state && state.generation || 0)),
            updatedAt: Math.max(0, Number(state && state.updatedAt || java.lang.System.currentTimeMillis()))
        };
        var pending = String(state && state.pendingChannel || "").replace(/^\s+|\s+$/g, "").toLowerCase();
        if (TOOLHUB_CHANNEL_SPECS.hasOwnProperty(pending) && pending !== clean.activeChannel) clean.pendingChannel = pending;
        var content = JSON.stringify(clean, null, 2) + "\n";
        out = new java.io.FileOutputStream(tmp, false);
        out.write(new java.lang.String(content).getBytes("UTF-8"));
        syncFileOutput(out);
        toolHubChannelCloseQuietly(out);
        out = null;
        if (bak.exists() && !bak.delete()) throw "delete stale channel backup failed";
        hadTarget = target.exists();
        if (hadTarget && !target.renameTo(bak)) throw "backup channel state failed";
        if (!tmp.renameTo(target)) throw "install channel state failed";
        if (bak.exists() && !bak.delete()) throw "delete channel backup failed";
        return clean;
    } catch (eWriteChannel) {
        try {
            if (!target.exists() && bak.exists()) bak.renameTo(target);
        } catch (eRestoreChannel) {}
        throw String(eWriteChannel);
    } finally {
        toolHubChannelCloseQuietly(out);
        try { if (tmp.exists()) tmp.delete(); } catch (eDeleteTmp) {}
    }
}
'''
    entry_path.write_text(entry[:start] + replacement + entry[end:], encoding="utf-8")

    if PANEL_VERSION_BEFORE not in panel:
        raise SystemExit("unexpected th_14_panels version")
    panel = panel.replace(PANEL_VERSION_BEFORE, PANEL_VERSION_AFTER, 1)
    panel = panel.replace("      row.setEnabled(!current.switching);\n", "", 1)
    insertion = "    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));\n"
    inserted = '''    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
    var channelCard = this.buildToolHubUpdateChannelCard();
    var channelCardLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    channelCardLp.setMargins(0, 0, 0, this.dp(10));
    root.addView(channelCard, channelCardLp);
'''
    if panel.count(insertion) != 1:
        raise SystemExit("unexpected update panel insertion count")
    panel = panel.replace(insertion, inserted, 1)
    wrapper = re.compile(
        r"\n  var oldBuildToolHubUpdateVersionPanelView = FloatBallAppWM\.prototype\.buildToolHubUpdateVersionPanelView;.*?\n  };\n\}\)\(\);\s*$",
        re.S,
    )
    panel, count = wrapper.subn("\n})();\n", panel)
    if count != 1:
        raise SystemExit("update panel wrapper removal failed")
    panel_path.write_text(panel, encoding="utf-8")

    record_path = Path("updates/records/20260721-beta-update-channel.json")
    record = json.loads(record_path.read_text(encoding="utf-8"))
    record["manifestVersion"] = 0
    for key in ("date", "modules", "entry"):
        record.pop(key, None)
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("Applied Beta channel review fixes")


if __name__ == "__main__":
    main()
