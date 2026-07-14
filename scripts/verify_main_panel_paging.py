#!/usr/bin/env python3
# 验证主按钮面板第四阶段分页吸附、圆点导航和生命周期清理。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
RUNTIME_VERIFY_PATH = ROOT / "scripts" / "verify_main_panel_runtime_status.py"
DRAG_VERIFY_PATH = ROOT / "scripts" / "verify_main_panel_drag_sort.py"
ENTRY_PATH = ROOT / "ToolHub.js"
DOC_PATHS = (
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "STRUCTURE.md",
)

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
RUNTIME_VERIFY = RUNTIME_VERIFY_PATH.read_text(encoding="utf-8")
DRAG_VERIFY = DRAG_VERIFY_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-paging: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", SOURCE)
if not version or version.group(1) != "1.3.0":
    fail("expected th_15_main_panel.js version 1.3.0")

methods = (
    "clampMainPanelPageIndex",
    "getMainPanelPageHeight",
    "getMainPanelPageMaxScrollY",
    "getMainPanelPageIndexForScrollY",
    "rememberMainPanelPageIndex",
    "updateMainPanelPageNavigation",
    "cancelMainPanelPageSnap",
    "scrollMainPanelToPage",
    "scheduleMainPanelPageSnap",
    "restoreMainPanelPage",
    "disposeMainPanelPaging",
)
for method in methods:
    marker = "FloatBallAppWM.prototype.%s = function" % method
    if SOURCE.count(marker) != 1:
        fail("%s must have exactly one definition" % method)

for marker, label in (
    ("Math.round(y / pageHeight)", "nearest page calculation"),
    ("Math.min(maxY", "last-page max-scroll clamp"),
    ("pageContext.scroll.smoothScrollTo(0, targetY)", "animated page navigation"),
    ("pageContext.scroll.scrollTo(0, targetY)", "non-animated page restore"),
    ("mainPanelPageIndex", "normal page memory"),
    ("mainPanelEditPageIndex", "edit page memory"),
    ("mainPanelPagingContext", "active paging context"),
    ("removeCallbacks(runner)", "pending snap cancellation"),
    ("snapGeneration", "snap generation guard"),
    ("finishGeneration", "programmatic scroll completion guard"),
    ("pageContext.touching === true", "touch-time snap suppression"),
    ("mainPanelEditDrag.started", "drag-time snap suppression"),
    ("'touch_release'", "release snap"),
    ("'scroll_idle'", "fling idle snap"),
    ("'dot_click'", "dot navigation"),
    ("'restore'", "page restore"),
    ("dotTarget.setClickable(pageCount > 1)", "clickable dots"),
    ("dotTarget.setFocusable(pageCount > 1)", "focusable dots"),
    ("'第 ' + String(i + 1) + ' 页，共 '", "page accessibility description"),
    ("android.view.MotionEvent.ACTION_DOWN", "touch down cancellation"),
    ("android.view.MotionEvent.ACTION_UP", "touch release"),
    ("android.view.MotionEvent.ACTION_CANCEL", "touch cancel"),
    ("self.restoreMainPanelPage(pageContext)", "attach restore"),
    ("self.disposeMainPanelPaging(panel)", "detach cleanup"),
    ("self.scheduleMainPanelPageSnap(pageContext, 60, 'edit_render')", "edit rerender alignment"),
):
    require(SOURCE, marker, label)

if SOURCE.count("setOnScrollChangeListener") != 1:
    fail("expected one main-panel scroll change listener")

paging_start = SOURCE.find(
    "FloatBallAppWM.prototype.clampMainPanelPageIndex = function"
)
paging_end = SOURCE.find(
    "FloatBallAppWM.prototype.isMainPanelEditMode = function"
)
if paging_start < 0 or paging_end <= paging_start:
    fail("cannot isolate paging method region")
paging_source = SOURCE[paging_start:paging_end]

# 分页功能不得直接持久化；第三阶段模块其他区域合法保留 saveButtons。
for fragment, label in (
    ("SQLiteDatabase", "direct SQLite access"),
    ("execSQL(", "direct SQL write"),
    ("ConfigManager.saveButtons", "button persistence write"),
    ("FileIO.writeText", "direct file write"),
    ("setInterval(", "unmanaged paging interval"),
    ("new java.lang.Thread", "dedicated paging thread"),
):
    forbid(paging_source, fragment, label)

require(RUNTIME_VERIFY, 'version.group(1) != "1.3.0"', "runtime verifier current version")
require(DRAG_VERIFY, 'version.group(1) != "1.3.0"', "drag verifier current version")
require(WORKFLOW, "python3 scripts/verify_main_panel_paging.py", "workflow paging verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry version")

for path in DOC_PATHS:
    text = path.read_text(encoding="utf-8")
    require(text, "分页吸附", path.name + " paging documentation")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

visible_rows = 3
row_unit = 88
rows = 8
page_height = visible_rows * row_unit
viewport = page_height
max_y = rows * row_unit - viewport
page_count = 3


def clamp_page(index):
    return max(0, min(page_count - 1, round(index)))


def page_for_y(y):
    y = max(0, min(max_y, y))
    return clamp_page(round(y / page_height))


if page_for_y(0) != 0:
    fail("first page model failed")
if page_for_y(160) != 1:
    fail("nearest page model failed")
last_page = page_for_y(9999)
last_target = min(max_y, last_page * page_height)
if last_page != 2 or last_target != max_y:
    fail("last page clamp model failed")

print(
    "OK main_panel_paging methods=%d clickable_dots=1 "
    "snap=nearest lifecycle=guarded" % len(methods)
)
