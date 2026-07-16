#!/usr/bin/env python3
"""一次性应用指针颜色设置清理，并把业务改动暂存给签名工作流。"""

import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_BRANCH = "agent/pointer-color-settings-cleanup-20260716"
WORKFLOW_PATH = ".github/workflows/apply-pointer-color-settings-cleanup.yml"


def run(args):
    proc = subprocess.run(list(args), cwd=str(ROOT), text=True)
    if proc.returncode != 0:
        raise SystemExit("FAIL cleanup-runner: " + " ".join(args))


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL cleanup-runner: %s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


run(["git", "fetch", "origin", AGENT_BRANCH])
yaml_text = subprocess.check_output(
    ["git", "show", "origin/%s:%s" % (AGENT_BRANCH, WORKFLOW_PATH)],
    cwd=str(ROOT), text=True,
)
start_marker = "          python3 - <<'PY'\n"
end_marker = "\n          PY\n"
start = yaml_text.find(start_marker)
end = yaml_text.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise SystemExit("FAIL cleanup-runner: embedded patch not found")
raw = yaml_text[start + len(start_marker):end]
code = "\n".join(line[10:] if line.startswith("          ") else line for line in raw.splitlines()) + "\n"

# 基础配置、颜色项说明、设置页分组和固定版本校验沿用已审查补丁。
runtime_start = code.find("# th_17_pointer.js：")
runtime_end = code.find("# 同步固定引用基础模块版本的专项校验。", runtime_start)
if runtime_start < 0 or runtime_end <= runtime_start:
    raise SystemExit("FAIL cleanup-runner: runtime section not found")
code = code[:runtime_start] + code[runtime_end:]
check_start = code.find("# 静态约束：三个旧设置键只允许存在于旧配置清理表。")
check_end = code.find("# 更新模块清单；正式 fix PR", check_start)
if check_start >= 0 and check_end > check_start:
    code = code[:check_start] + code[check_end:]
manifest_start = code.find("# 更新模块清单；正式 fix PR")
if manifest_start >= 0:
    code = code[:manifest_start]
exec(compile(code, "pointer-color-settings-cleanup", "exec"), {"__name__": "__main__"})

# 指针本体颜色：普通、取字就绪、框选就绪、框选中。
path = "code/th_17_pointer.js"
text = read(path)
text = replace_once(text, "// @version 1.2.10", "// @version 1.2.11", "th17 version")
text = replace_once(text, '''        if (processing) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
        } else if (st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (areaOcrReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_READY_HEX", 245, 158, 11);
        } else if (textReady) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_COLOR_TEXT_READY_HEX", "POINTER_COLOR_HIT_HEX", 34, 197, 94);
        } else if (st.hot) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HIT_HEX", 245, 158, 11);
        } else if (hoverCandidate) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
        }''', '''        if (processing || st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (areaOcrReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_READY_HEX", 245, 158, 11);
        } else if (textReady) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_COLOR_TEXT_READY_HEX", "POINTER_COLOR_NORMAL_HEX", 34, 197, 94);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
        }''', "pointer colors")

# 边框颜色与指针颜色彻底分离。
text = replace_once(text, '''        if (kind === "capture" || st.areaProcessing === true) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
          fillAlpha = 56;
          strokeAlpha = 245;
          strokeWidth = self.dp(2.4);
        } else if (kind === "text_hit") {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_COLOR_TEXT_READY_HEX", 34, 197, 94);
          fillAlpha = 38;
          strokeAlpha = 248;
          strokeWidth = self.dp(2.3);
        } else if (kind === "text_hover") {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
          fillAlpha = 26;
          strokeAlpha = 215;
          strokeWidth = self.dp(1.8);
        } else if (kind === "area_armed") {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
          fillAlpha = 18;
          strokeAlpha = 150;
          strokeWidth = self.dp(1.4);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        }''', '''        if (kind === "capture" || st.areaProcessing === true) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
          fillAlpha = 56;
          strokeAlpha = 245;
          strokeWidth = self.dp(2.4);
        } else if (kind === "text_hit") {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_FRAME_TEXT_HOVER_HEX", 34, 197, 94);
          fillAlpha = 38;
          strokeAlpha = 248;
          strokeWidth = self.dp(2.3);
        } else if (kind === "text_hover") {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_HOVER_HEX", "POINTER_COLOR_NORMAL_HEX", 14, 165, 233);
          fillAlpha = 26;
          strokeAlpha = 215;
          strokeWidth = self.dp(1.8);
        } else if (kind === "area_armed") {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
          fillAlpha = 18;
          strokeAlpha = 150;
          strokeWidth = self.dp(1.4);
        } else {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        }''', "pointer frame colors")
write(path, text)

path = "code/th_18_pointer_ocr.js"
text = read(path)
text = replace_once(text, "// @version 1.1.1", "// @version 1.1.2", "th18 version")
text = replace_once(text, '''                  if (typeof th17PointerColorRgbWithFallback === "function" && kind === "text_hit") {
                    rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_COLOR_TEXT_READY_HEX", 34, 197, 94);
                    fillAlpha = 38;
                    strokeAlpha = 248;
                    strokeWidth = self.dp(2.3);
                  } else if (typeof th17PointerColorRgb === "function") {
                    if (processing || kind === "capture") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
                      fillAlpha = 56;
                      strokeAlpha = 245;
                    } else if (kind === "text_hover") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
                      fillAlpha = 26;
                      strokeAlpha = 215;
                      strokeWidth = self.dp(1.8);
                    } else if (kind === "area_armed") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 18;
                      strokeAlpha = 150;
                      strokeWidth = self.dp(1.4);
                    } else {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                    }
                  }''', '''                  if (typeof th17PointerColorRgbWithFallback === "function" && kind === "text_hit") {
                    rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_FRAME_TEXT_HOVER_HEX", 34, 197, 94);
                    fillAlpha = 38;
                    strokeAlpha = 248;
                    strokeWidth = self.dp(2.3);
                  } else if (typeof th17PointerColorRgbWithFallback === "function") {
                    if (processing || kind === "capture") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 56;
                      strokeAlpha = 245;
                    } else if (kind === "text_hover") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_HOVER_HEX", "POINTER_COLOR_NORMAL_HEX", 14, 165, 233);
                      fillAlpha = 26;
                      strokeAlpha = 215;
                      strokeWidth = self.dp(1.8);
                    } else if (kind === "area_armed") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 18;
                      strokeAlpha = 150;
                      strokeWidth = self.dp(1.4);
                    } else {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                    }
                  }''', "ocr frame colors")
text = replace_once(text, "if (!rgb) rgb = processing ? { r: 168, g: 85, b: 247 } : { r: 59, g: 130, b: 246 };", "if (!rgb) rgb = { r: 59, g: 130, b: 246 };", "ocr fallback")
write(path, text)

# 重建 Schema 完整性和文案一致性检查，移除三个旧键并加入新边框键。
path = "code/th_01_base.js"
text = read(path)
marker = '        var sStr = JSON.stringify(s);\n'
start = text.find(marker)
next_block = text.find('        if (!needReset && (\n', start + len(marker))
condition = '''        if (
            sStr.indexOf("ENABLE_SNAP_TO_EDGE") < 0 || sStr.indexOf("ENABLE_ANIMATIONS") < 0 ||
            sStr.indexOf("BALL_IDLE_ALPHA") < 0 || sStr.indexOf("single_choice") < 0 ||
            sStr.indexOf("ball_shortx_icon") < 0 || sStr.indexOf("ball_color") < 0 ||
            sStr.indexOf("BALL_BG_COLOR_HEX") < 0 || sStr.indexOf("BALL_ICON_SIZE_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_GESTURE_MODE") < 0 || sStr.indexOf("TOOLAPP_BACK_EDGE_WIDTH_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_COMMIT_DISTANCE_DP") < 0 || sStr.indexOf("TOOLAPP_BACK_SURFACE_SLOP_DP") < 0 ||
            sStr.indexOf("TOOLAPP_BACK_PROGRESS_DISTANCE_DP") < 0 || sStr.indexOf("LONG_PRESS_TRIGGERED_MOVE_SLOP_DP") < 0 ||
            sStr.indexOf("POINTER_SCALE_PERCENT") < 0 || sStr.indexOf("POINTER_EDGE_ZONE_X_DP") < 0 ||
            sStr.indexOf("POINTER_EDGE_ZONE_Y_DP") < 0 || sStr.indexOf("POINTER_TEXT_HOVER_MS") < 0 ||
            sStr.indexOf("POINTER_AREA_HOVER_MS") < 0 || sStr.indexOf("POINTER_RESULT_PREVIEW_TIMEOUT_SEC") < 0 ||
            sStr.indexOf("POINTER_COLOR_NORMAL_HEX") < 0 || sStr.indexOf("POINTER_COLOR_TEXT_READY_HEX") < 0 ||
            sStr.indexOf("POINTER_COLOR_AREA_READY_HEX") < 0 || sStr.indexOf("POINTER_COLOR_AREA_HEX") < 0 ||
            sStr.indexOf("POINTER_FRAME_TEXT_HOVER_HEX") < 0 || sStr.indexOf("POINTER_FRAME_TEXT_READY_HEX") < 0 ||
            sStr.indexOf("POINTER_FRAME_AREA_HEX") < 0 || sStr.indexOf("POINTER_AREA_SMALL_FALLBACK_TEXT") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_WIDTH_DP") < 0 || sStr.indexOf("POINTER_AREA_MIN_HEIGHT_DP") < 0 ||
            sStr.indexOf("POINTER_AREA_MIN_AREA_DP2") < 0 || sStr.indexOf("POINTER_AREA_MIN_MOVE_DP") < 0
        ) {
            needReset = true;
        }
'''
if start < 0 or next_block < 0:
    raise SystemExit("FAIL cleanup-runner: schema completeness boundaries")
text = text[:start + len(marker)] + condition + text[next_block:]

diff_start = text.find('        if (!needReset) {\n            if (schemaItemDiffers("BALL_ICON_TINT_HEX"')
outer_else = text.find('    } else {\n        // # 仅当文件不存在时才标记为需要重置', diff_start)
if diff_start < 0 or outer_else < 0:
    raise SystemExit("FAIL cleanup-runner: schema diff boundaries")
old_diff = text[diff_start:outer_else]
color_tail = '''                schemaItemDiffers("POINTER_COLOR_NORMAL_HEX", ["name", "desc", "type"]) ||
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
prefix_end = old_diff.find('                schemaItemDiffers("POINTER_COLOR_NORMAL_HEX"')
if prefix_end < 0:
    raise SystemExit("FAIL cleanup-runner: schema color diff anchor")
text = text[:diff_start] + old_diff[:prefix_end] + color_tail + text[outer_else:]
write(path, text)

# 清理诊断文件，并验证旧键只保留在迁移表中。
error_path = ROOT / "RUNNER_ERROR.txt"
if error_path.exists():
    error_path.unlink()
for key in ("POINTER_COLOR_HOVER_HEX", "POINTER_COLOR_HIT_HEX", "POINTER_COLOR_CAPTURE_HEX"):
    hits = []
    for file in (ROOT / "code").glob("*.js"):
        for no, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
            if key in line:
                hits.append((file.name, no, line.strip()))
    if len(hits) != 1 or hits[0][0] != "th_01_base.js" or "true" not in hits[0][2]:
        raise SystemExit("FAIL cleanup-runner: old key remains %s %s" % (key, hits))

manifest_path = ROOT / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
for name in ("th_01_base.js", "th_13_panel_ui.js", "th_14_panels.js", "th_17_pointer.js", "th_18_pointer_ocr.js"):
    file = ROOT / "code" / name
    data = file.read_bytes()
    match = re.search(r"@version\s+(\d+\.\d+\.\d+)", "\n".join(file.read_text(encoding="utf-8").splitlines()[:5]))
    if not match:
        raise SystemExit("FAIL cleanup-runner: missing version " + name)
    manifest["files"][name] = {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "version": match.group(1)}
manifest["version"] = int(time.strftime("%Y%m%d%H%M%S", time.gmtime()))
manifest["release"] = {"title": "清理并重组指针颜色设置", "changes": ["移除无效颜色项，按指针和边框重新分组并补充用途说明"]}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

for command in (
    [sys.executable, "scripts/verify_js_syntax.py"],
    [sys.executable, "scripts/verify_schema_validator.py"],
    [sys.executable, "scripts/verify_settings_color_scheme.py"],
    [sys.executable, "scripts/verify_coloros_rhino_color_safety.py"],
    [sys.executable, "scripts/verify_rhino_color_api_safety.py"],
    [sys.executable, "scripts/verify_pointer_regressions.py"],
    ["git", "diff", "--check"],
):
    run(command)

paths = [
    "code/th_01_base.js", "code/th_13_panel_ui.js", "code/th_14_panels.js",
    "code/th_17_pointer.js", "code/th_18_pointer_ocr.js",
    "scripts/verify_legacy_main_panel_cleanup.py", "scripts/verify_main_panel_visual_tuning.py",
    "scripts/verify_main_panel_adaptive_layout.py", "scripts/verify_panel_layout_settings_cleanup.py",
    "scripts/verify_coloros_rhino_color_safety.py", "manifest.json",
]
run(["git", "add"] + paths)
run(["git", "add", "-u", "RUNNER_ERROR.txt"])
print("Pointer color settings cleanup applied and staged")
