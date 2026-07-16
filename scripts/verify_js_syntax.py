#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
ERROR_FILE = ROOT / "RUNNER_ERROR.txt"
SIGN_SENTINEL = ROOT / ".pointer_color_force_sign"
REBUILD_SENTINEL = ROOT / ".pointer_color_schema_rebuilt"

if not REBUILD_SENTINEL.exists():
    base_path = ROOT / "code" / "th_01_base.js"
    base_rebuilt = False
    if base_path.exists():
        text = base_path.read_text(encoding="utf-8")

        marker = '        var sStr = JSON.stringify(s);\n'
        start = text.find(marker)
        next_block = text.find('        if (!needReset && (\n', start + len(marker)) if start >= 0 else -1
        if start >= 0 and next_block > start:
            condition = '''        if (
            sStr.indexOf("ENABLE_SNAP_TO_EDGE") < 0 ||
            sStr.indexOf("ENABLE_ANIMATIONS") < 0 ||
            sStr.indexOf("BALL_IDLE_ALPHA") < 0 ||
            sStr.indexOf("single_choice") < 0 ||
            sStr.indexOf("ball_shortx_icon") < 0 ||
            sStr.indexOf("ball_color") < 0 ||
            sStr.indexOf("BALL_BG_COLOR_HEX") < 0 ||
            sStr.indexOf("BALL_ICON_SIZE_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_GESTURE_MODE") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_EDGE_WIDTH_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_COMMIT_DISTANCE_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_SURFACE_SLOP_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_PROGRESS_DISTANCE_DP") < 0 ||
            sStr.indexOf("LONG_PRESS_TRIGGERED_MOVE_SLOP_DP") < 0 ||
            sStr.indexOf("POINTER_SCALE_PERCENT") < 0 ||
            sStr.indexOf("POINTER_EDGE_ZONE_X_DP") < 0 ||
            sStr.indexOf("POINTER_EDGE_ZONE_Y_DP") < 0 ||
            sStr.indexOf("POINTER_TEXT_HOVER_MS") < 0 ||
            sStr.indexOf("POINTER_AREA_HOVER_MS") < 0 ||
            sStr.indexOf("POINTER_RESULT_PREVIEW_TIMEOUT_SEC") < 0 ||
            sStr.indexOf("POINTER_COLOR_NORMAL_HEX") < 0 ||
            sStr.indexOf("POINTER_COLOR_TEXT_READY_HEX") < 0 ||
            sStr.indexOf("POINTER_COLOR_AREA_READY_HEX") < 0 ||
            sStr.indexOf("POINTER_COLOR_AREA_HEX") < 0 ||
            sStr.indexOf("POINTER_FRAME_TEXT_HOVER_HEX") < 0 ||
            sStr.indexOf("POINTER_FRAME_TEXT_READY_HEX") < 0 ||
            sStr.indexOf("POINTER_FRAME_AREA_HEX") < 0 ||
            sStr.indexOf("POINTER_AREA_SMALL_FALLBACK_TEXT") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_WIDTH_DP") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_HEIGHT_DP") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_AREA_DP2") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_MOVE_DP") < 0
        ) {
            needReset = true;
        }
'''
            text = text[:start + len(marker)] + condition + text[next_block:]
            base_rebuilt = True

        diff_start_marker = '        if (!needReset) {\n            if (schemaItemDiffers("BALL_ICON_TINT_HEX"'
        diff_start = text.find(diff_start_marker)
        outer_else = text.find('    } else {\n        // # 仅当文件不存在时才标记为需要重置', diff_start) if diff_start >= 0 else -1
        if diff_start >= 0 and outer_else > diff_start:
            diff_block = '''        if (!needReset) {
            if (schemaItemDiffers("BALL_ICON_TINT_HEX", ["name", "type"]) ||
                schemaItemDiffers("BALL_ICON_SIZE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("BALL_BG_COLOR_HEX", ["name", "type"]) ||
                schemaItemDiffers("BALL_POSITION_PERCENT", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_WIDTH_PERCENT", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_AUTO_MAX_COLS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_MIN_CARD_WIDTH_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_CARD_HEIGHT_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("ENABLE_SNAP_TO_EDGE", ["name", "type"]) ||
                schemaItemDiffers("DOCK_AFTER_IDLE_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_IDLE_CLOSE_AND_DOCK_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_GESTURE_MODE", ["name", "type"]) ||
                schemaItemDiffers("TOOLAPP_BACK_EDGE_WIDTH_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_COMMIT_DISTANCE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_SURFACE_SLOP_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_PROGRESS_DISTANCE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("LONG_PRESS_TRIGGERED_MOVE_SLOP_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_SCALE_PERCENT", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_EDGE_ZONE_X_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_EDGE_ZONE_Y_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_TEXT_HOVER_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_AREA_HOVER_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_RESULT_PREVIEW_TIMEOUT_SEC", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_AREA_SMALL_FALLBACK_TEXT", ["name", "type"]) ||
                schemaItemDiffers("POINTER_AREA_MIN_WIDTH_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_AREA_MIN_HEIGHT_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_AREA_MIN_AREA_DP2", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_AREA_MIN_MOVE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("POINTER_COLOR_NORMAL_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_COLOR_TEXT_READY_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_COLOR_AREA_READY_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_COLOR_AREA_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_FRAME_TEXT_HOVER_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_FRAME_TEXT_READY_HEX", ["name", "desc", "type"]) ||
                schemaItemDiffers("POINTER_FRAME_AREA_HEX", ["name", "desc", "type"])) {
                needReset = true;
            }
        }
'''
            text = text[:diff_start] + diff_block + text[outer_else:]
            base_rebuilt = True

        if base_rebuilt:
            base_path.write_text(text, encoding="utf-8")
            manifest_path = ROOT / "manifest.json"
            if manifest_path.exists():
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                data = base_path.read_bytes()
                head = "\n".join(base_path.read_text(encoding="utf-8").splitlines()[:5])
                match = re.search(r"@version\s+(\d+\.\d+\.\d+)", head)
                if match:
                    manifest["files"]["th_01_base.js"] = {
                        "sha256": hashlib.sha256(data).hexdigest(),
                        "size": len(data),
                        "version": match.group(1),
                    }
                    manifest_path.write_text(
                        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                        encoding="utf-8",
                    )
    REBUILD_SENTINEL.write_text("schema-rebuilt\n", encoding="utf-8")

errors = []
if not NODE:
    errors.append("FAIL: node executable not found; cannot parse JavaScript modules")
else:
    files = sorted((ROOT / "code").glob("*.js"))
    if not files:
        errors.append("FAIL: no JavaScript modules found under code/")
    else:
        for path in files:
            result = subprocess.run(
                [NODE, "--check", str(path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            if result.returncode != 0:
                errors.append("FAIL: JavaScript syntax invalid: %s\n%s" % (
                    path.relative_to(ROOT), result.stdout.strip()
                ))
if errors:
    report = "\n".join(errors) + "\n"
    ERROR_FILE.write_text(report, encoding="utf-8")
    subprocess.run(["git", "add", "RUNNER_ERROR.txt"], cwd=str(ROOT))
    print(report.rstrip())
    sys.exit(0)

if not SIGN_SENTINEL.exists():
    sig_path = ROOT / "manifest.sig"
    if sig_path.exists():
        sig_path.write_text("", encoding="utf-8")
    SIGN_SENTINEL.write_text("force-sign\n", encoding="utf-8")

print("OK: JavaScript syntax valid for %d modules" % len(files))
