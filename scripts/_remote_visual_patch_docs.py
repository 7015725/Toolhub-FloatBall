#!/usr/bin/env python3
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]


def fail(message):
    raise RuntimeError("REMOTE DOC PATCH: " + message)


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected 1 anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def apply():
    verifier = r'''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "code" / "th_01_base.js"
MAIN_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
BASE = BASE_PATH.read_text(encoding="utf-8")
MAIN = MAIN_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")
DOC_PATHS = (
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "STRUCTURE.md",
)

def fail(message):
    raise SystemExit("FAIL main-panel-visual-tuning: " + message)

def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))

def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))

def version(text, expected, name):
    match = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", text)
    if not match or match.group(1) != expected:
        fail("%s expected version %s" % (name, expected))

version(BASE, "1.1.8", "th_01_base.js")
version(MAIN, "1.4.1", "th_15_main_panel.js")

for marker, label in (
    ('PANEL_BG_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.92 }', "alpha validator default"),
    ('PANEL_VISUAL_TUNING_VERSION: { type: "int", min: 0, max: 9999, default: 1 }', "migration validator"),
    ("PANEL_BG_ALPHA: 0.92", "runtime alpha default"),
    ("PANEL_VISUAL_TUNING_VERSION: 1", "runtime migration default"),
    ("var panelVisualTuningDirty = false", "one-time migration state"),
    ("typeof user.PANEL_VISUAL_TUNING_VERSION", "persisted migration detection"),
    ("panelVisualTuningVersion < 1", "migration version guard"),
    ("Math.abs(legacyPanelAlpha - 0.85) < 0.000001", "old default-only alpha migration"),
    ("merged.PANEL_BG_ALPHA = 0.92", "old default alpha upgrade"),
    ("var sanitizedSettings = ConfigValidator.sanitizeConfig(merged)", "load-time normalization"),
    ("settingsSanitizedDirty", "normalization dirty detection"),
    ("JSON.stringify(sanitizedSettings) !== JSON.stringify(merged)", "normalization comparison"),
    ("JSON.stringify(sanitizedSettings, null, 2)", "normalized settings writeback"),
    ("this._settingsCache = sanitizedSettings", "normalized cache"),
):
    require(BASE, marker, label)

load_start = BASE.find("    loadSettings: function(forceReload)")
load_end = BASE.find("    saveSettings: function(obj)", load_start)
if load_start < 0 or load_end <= load_start:
    fail("cannot isolate ConfigManager.loadSettings")
load_source = BASE[load_start:load_end]
sanitize_pos = load_source.find("var sanitizedSettings = ConfigValidator.sanitizeConfig(merged)")
write_pos = load_source.find("JSON.stringify(sanitizedSettings, null, 2)")
cache_pos = load_source.find("this._settingsCache = sanitizedSettings")
if not (0 <= sanitize_pos < write_pos < cache_pos):
    fail("required order is sanitize -> write normalized values -> cache")
if "merged.PANEL_BG_ALPHA = 0.92" not in load_source:
    fail("alpha migration must stay inside loadSettings")
if "legacyPanelAlpha - 0.85" not in load_source:
    fail("alpha migration must only target the legacy default")

for marker, label in (
    ("var footerHeight = pageCount > 1 ? spec.footerHeight : this.dp(8)", "compact single-page footer"),
    ("if (pageCount > 1) {", "multi-page-only dot container"),
    ("dotTarget.setClickable(pageCount > 1)", "dot click semantics"),
    ("dotTarget.setFocusable(pageCount > 1)", "dot focus semantics"),
    ("pageContext.dotViews = dotViews", "empty single-page dot state"),
    ("pageContext.dotTargets = dotTargets", "empty single-page target state"),
    ("单页没有分页语义", "single-page source contract"),
    ("旧灰色“把手”没有拖动行为", "non-functional handle rationale"),
):
    require(MAIN, marker, label)

footer_start = MAIN.find("// 单页没有分页语义，不创建绿色圆点")
footer_end = MAIN.find("if (pageCount > 1 && android.os.Build.VERSION.SDK_INT >= 23)", footer_start)
if footer_start < 0 or footer_end <= footer_start:
    fail("cannot isolate footer region")
footer = MAIN[footer_start:footer_end]
for fragment, label in (
    ("var handle = new android.view.View", "non-functional drag handle"),
    ("footer.addView(handle", "drag-handle attachment"),
):
    forbid(footer, fragment, label)
if footer.find("if (pageCount > 1) {") > footer.find("var dots ="):
    fail("dot container must be created only inside multi-page branch")

for name in (
    "verify_main_panel_runtime_status.py",
    "verify_main_panel_drag_sort.py",
    "verify_main_panel_paging.py",
    "verify_main_panel_adaptive_layout.py",
    "verify_main_panel_close_lifecycle.py",
):
    source = (ROOT / "scripts" / name).read_text(encoding="utf-8")
    require(source, "1.4.1", name + " current version")
    forbid(source, "1.4.0", name + " stale version")

require(WORKFLOW, "python3 scripts/verify_main_panel_visual_tuning.py", "workflow verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry version")
for path in DOC_PATHS:
    text = path.read_text(encoding="utf-8")
    require(text, "单页隐藏分页圆点", path.name + " single-page documentation")
    require(text, "0.92", path.name + " alpha documentation")

def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))

if clamp(5, 8, 32) != 8:
    fail("padding normalization model failed")
if clamp(12, 8, 32) != 12:
    fail("valid padding preservation model failed")

def migrate_alpha(value, version_number):
    if version_number < 1 and abs(value - 0.85) < 0.000001:
        return 0.92
    return value

if migrate_alpha(0.85, 0) != 0.92:
    fail("legacy default alpha migration model failed")
if migrate_alpha(0.80, 0) != 0.80:
    fail("custom alpha preservation model failed")
if migrate_alpha(0.85, 1) != 0.85:
    fail("completed migration must not repeat")

for path in (BASE_PATH, MAIN_PATH):
    raw = path.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        fail(path.name + " EOF must be exactly one LF")

print(
    "OK main_panel_visual_tuning settings=normalized alpha=0.92 "
    "custom_alpha=preserved single_page_dots=hidden footer=8dp handle=removed"
)
'''
    write("scripts/verify_main_panel_visual_tuning.py", verifier)
    os.chmod(ROOT / "scripts" / "verify_main_panel_visual_tuning.py", 0o755)

    readme = read("README.md")
    lines = readme.splitlines()
    indices = [
        i for i, line in enumerate(lines)
        if line.startswith("- 主按钮面板采用可配置自适应网格")
    ]
    if len(indices) != 1:
        fail("README main-panel capability line count=%d" % len(indices))
    lines[indices[0]] = (
        "- 主按钮面板采用可配置自适应网格，按安全宽度和布局参数实时计算列数；"
        "旧越界设置会规范化回写，默认背景透明度为 0.92，"
        "单页隐藏分页圆点，多页保留圆点导航；"
        "继续支持实时运行状态、拖动排序和分页吸附，"
        "新增和编辑按钮直接保存，关闭时避免关闭闪烁。"
    )
    write("README.md", "\n".join(lines))

    arch = read("ARCHITECTURE.md")
    anchor = (
        "- 网格列数由安全宽度、`PANEL_WIDTH_PERCENT`、`PANEL_AUTO_MAX_COLS`、"
        "`PANEL_MIN_CARD_WIDTH_DP`、间距和内边距动态计算；"
        "`PANEL_CARD_HEIGHT_DP` 与 `PANEL_ROWS` 控制卡片高度和可视行数。"
    )
    note = (
        "- 设置加载时通过 `ConfigValidator.sanitizeConfig()` 规范化旧越界值并回写结构化 SQLite；"
        "旧默认透明度 `0.85` 一次性迁移到 `0.92`，其他自定义透明度保持不变。"
        "单页隐藏分页圆点并使用 8dp 底部留白，多页才创建圆点导航。"
    )
    if note not in arch:
        arch = replace_once(
            arch,
            anchor,
            anchor + "\n" + note,
            "architecture note",
        )
    write("ARCHITECTURE.md", arch)

    structure = read("STRUCTURE.md")
    slines = structure.splitlines()
    sidx = [
        i for i, line in enumerate(slines)
        if line.startswith("| `th_15_main_panel.js` |")
    ]
    if len(sidx) != 1:
        fail("STRUCTURE th_15 row count=%d" % len(sidx))
    slines[sidx[0]] = (
        "| `th_15_main_panel.js` | 主按钮面板顶部工具栏、可配置自适应网格、"
        "安全区域避让、分页吸附与多页圆点导航、单页隐藏分页圆点、"
        "方向展开/退出动画、实时运行状态和显式编辑模式拖动排序；"
        "默认背景透明度 0.92 |"
    )
    write("STRUCTURE.md", "\n".join(slines))

    workflow = read(".github/workflows/verify.yml")
    target = "          python3 scripts/verify_main_panel_visual_tuning.py\n"
    if target not in workflow:
        workflow = replace_once(
            workflow,
            "          python3 scripts/verify_main_panel_adaptive_layout.py\n"
            "          python3 scripts/verify_main_panel_close_lifecycle.py",
            "          python3 scripts/verify_main_panel_adaptive_layout.py\n"
            "          python3 scripts/verify_main_panel_visual_tuning.py\n"
            "          python3 scripts/verify_main_panel_close_lifecycle.py",
            "verify workflow",
        )
    write(".github/workflows/verify.yml", workflow)
