#!/usr/bin/env python3
"""一次性应用指针颜色设置清理，并把业务改动交给签名工作流提交。"""

import hashlib
import json
import re
import subprocess
import sys
import time
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_BRANCH = "agent/pointer-color-settings-cleanup-20260716"
WORKFLOW_PATH = ".github/workflows/apply-pointer-color-settings-cleanup.yml"
ERROR_PATH = ROOT / "RUNNER_ERROR.txt"


def run(args, capture=False):
    proc = subprocess.run(
        list(args), cwd=str(ROOT), text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip() if capture else ""
        raise RuntimeError("command failed: %s %s" % (" ".join(args), detail))
    return proc


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def apply_cleanup():
    run(["git", "fetch", "origin", AGENT_BRANCH])
    yaml_text = run(
        ["git", "show", "origin/%s:%s" % (AGENT_BRANCH, WORKFLOW_PATH)],
        capture=True,
    ).stdout
    start_marker = "          python3 - <<'PY'\n"
    end_marker = "\n          PY\n"
    start = yaml_text.find(start_marker)
    end = yaml_text.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise RuntimeError("cleanup python block not found")
    raw_block = yaml_text[start + len(start_marker):end]
    cleanup_code = "\n".join(
        line[10:] if line.startswith("          ") else line
        for line in raw_block.splitlines()
    ) + "\n"

    # YAML 中的多行源码锚点缩进不可靠：基础配置、设置 UI 和分组继续复用，
    # th17/th18 与清单在下方基于当前源码独立处理。
    runtime_start = cleanup_code.find("# th_17_pointer.js：")
    runtime_end = cleanup_code.find("# 同步固定引用基础模块版本的专项校验。", runtime_start)
    if runtime_start < 0 or runtime_end <= runtime_start:
        raise RuntimeError("runtime patch section not found")
    cleanup_code = cleanup_code[:runtime_start] + cleanup_code[runtime_end:]
    check_start = cleanup_code.find("# 静态约束：三个旧设置键只允许存在于旧配置清理表。")
    check_end = cleanup_code.find("# 更新模块清单；正式 fix PR", check_start)
    if check_start >= 0 and check_end > check_start:
        cleanup_code = cleanup_code[:check_start] + cleanup_code[check_end:]
    manifest_start = cleanup_code.find("# 更新模块清单；正式 fix PR")
    if manifest_start >= 0:
        cleanup_code = cleanup_code[:manifest_start]
    exec(compile(cleanup_code, "pointer-color-settings-cleanup", "exec"), {"__name__": "__main__"})

    path = ROOT / "code/th_17_pointer.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.2.10", "// @version 1.2.11", "th17 version")
    old_pointer = '''        if (processing) {
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
        }'''
    new_pointer = '''        if (processing || st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (areaOcrReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_READY_HEX", 245, 158, 11);
        } else if (textReady) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_COLOR_TEXT_READY_HEX", "POINTER_COLOR_NORMAL_HEX", 34, 197, 94);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
        }'''
    text = replace_once(text, old_pointer, new_pointer, "pointer canvas colors")
    old_frame = '''        if (kind === "capture" || st.areaProcessing === true) {
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
        }'''
    new_frame = '''        if (kind === "capture" || st.areaProcessing === true) {
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
        }'''
    text = replace_once(text, old_frame, new_frame, "pointer frame colors")
    path.write_text(text, encoding="utf-8")

    path = ROOT / "code/th_18_pointer_ocr.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.1", "// @version 1.1.2", "th18 version")
    old_ocr = '''                  if (typeof th17PointerColorRgbWithFallback === "function" && kind === "text_hit") {
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
                  }'''
    new_ocr = '''                  if (typeof th17PointerColorRgbWithFallback === "function" && kind === "text_hit") {
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
                  }'''
    text = replace_once(text, old_ocr, new_ocr, "ocr frame colors")
    text = replace_once(text, "if (!rgb) rgb = processing ? { r: 168, g: 85, b: 247 } : { r: 59, g: 130, b: 246 };", "if (!rgb) rgb = { r: 59, g: 130, b: 246 };", "ocr frame fallback")
    path.write_text(text, encoding="utf-8")

    base_path = ROOT / "code/th_01_base.js"
    removed_keys = ("POINTER_COLOR_HOVER_HEX", "POINTER_COLOR_HIT_HEX", "POINTER_COLOR_CAPTURE_HEX")
    clean_lines = []
    for line in base_path.read_text(encoding="utf-8").splitlines(True):
        drop = False
        for key in removed_keys:
            if key not in line:
                continue
            stripped = line.strip()
            if stripped == key + ": true," or stripped == key + ": true":
                break
            drop = True
            break
        if not drop:
            clean_lines.append(line)
    base_path.write_text("".join(clean_lines), encoding="utf-8")

    for key in removed_keys:
        hits = []
        for file in (ROOT / "code").glob("*.js"):
            for no, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
                if key in line:
                    hits.append("%s:%d" % (file.as_posix(), no))
        if len(hits) != 1 or not hits[0].startswith("code/th_01_base.js:"):
            raise RuntimeError("%s references=%s" % (key, ",".join(hits)))

    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for name in ("th_01_base.js", "th_13_panel_ui.js", "th_14_panels.js", "th_17_pointer.js", "th_18_pointer_ocr.js"):
        file = ROOT / "code" / name
        data = file.read_bytes()
        match = re.search(r"@version\s+(\d+\.\d+\.\d+)", "\n".join(file.read_text(encoding="utf-8").splitlines()[:5]))
        if not match:
            raise RuntimeError("missing version: " + name)
        manifest["files"][name] = {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "version": match.group(1)}
    manifest["version"] = int(time.strftime("%Y%m%d%H%M%S", time.gmtime()))
    manifest["release"] = {"title": "清理并重组指针颜色设置", "changes": ["移除无效颜色项，按指针和边框重新分组并补充用途说明"]}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if ERROR_PATH.exists():
        ERROR_PATH.unlink()

    for command in (
        [sys.executable, "scripts/verify_pointer_regressions.py"],
        [sys.executable, "scripts/verify_schema_validator.py"],
        [sys.executable, "scripts/verify_settings_color_scheme.py"],
        [sys.executable, "scripts/verify_coloros_rhino_color_safety.py"],
        [sys.executable, "scripts/verify_rhino_color_api_safety.py"],
        [sys.executable, "scripts/verify_js_syntax.py"],
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


try:
    apply_cleanup()
except BaseException:
    ERROR_PATH.write_text(traceback.format_exc(), encoding="utf-8")
    subprocess.run(["git", "add", "RUNNER_ERROR.txt"], cwd=str(ROOT))
    print(ERROR_PATH.read_text(encoding="utf-8"))
    sys.exit(0)
