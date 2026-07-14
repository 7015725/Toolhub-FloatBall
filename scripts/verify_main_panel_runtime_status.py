#!/usr/bin/env python3
# 验证主按钮面板第二阶段实时运行状态与生命周期约束。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
DOC_PATHS = (
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "STRUCTURE.md",
)

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-runtime-status: " + message)


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
    "getMainPanelRuntimeStatusSnapshot",
    "applyMainPanelRuntimeStatusSnapshot",
    "refreshMainPanelRuntimeStatus",
    "showMainPanelRuntimeStatusDetail",
    "stopMainPanelRuntimeStatusTicker",
    "startMainPanelRuntimeStatusTicker",
)
for method in methods:
    marker = "FloatBallAppWM.prototype.%s = function" % method
    if SOURCE.count(marker) != 1:
        fail("%s must have exactly one definition" % method)

for marker, label in (
    ("typeof TOOLHUB_UPDATE_STATE !== 'undefined'", "runtime update state"),
    ("typeof loadErrors !== 'undefined'", "module load errors"),
    ("typeof modules !== 'undefined'", "module count"),
    ("typeof __manualUpdateRunning !== 'undefined'", "manual update running"),
    ("typeof __runtimeUpdateCheckRunning !== 'undefined'", "update check running"),
    ("state.closed === true", "closed status"),
    ("state.closing === true", "closing status"),
    ("loadCount > 0", "degraded status"),
    ("manualRunning", "updating status"),
    ("checkRunning", "checking status"),
    ("updateStatus === 'error'", "error status"),
    ("needRestart", "restart status"),
    ("availableCount > 0", "available status"),
    ("updateStatus === 'plain'", "plain mode status"),
    ("updateStatus === 'updated'", "updated status"),
    ("'运行正常'", "healthy status"),
    ("'降级运行'", "degraded label"),
    ("'正在更新'", "updating label"),
    ("'检查更新'", "checking label"),
    ("'更新异常'", "error label"),
    ("'待重启'", "restart label"),
    ("'发现更新'", "available label"),
    ("'普通模式'", "plain label"),
    ("'更新完成'", "updated label"),
):
    require(SOURCE, marker, label)

order_markers = (
    "if (loadCount > 0)",
    "if (manualRunning)",
    "if (checkRunning)",
    "if (updateStatus === 'error' || update.ok === false)",
    "if (needRestart)",
    "if (availableCount > 0 || updateStatus === 'available')",
)
positions = [SOURCE.find(marker) for marker in order_markers]
if any(pos < 0 for pos in positions) or positions != sorted(positions):
    fail("runtime status priority order changed")

for marker, label in (
    ("mainPanelStatusGeneration", "generation guard"),
    ("removeCallbacks(runner)", "ticker cancellation"),
    ("postDelayed(runner, 800)", "low frequency refresh"),
    ("panel.addOnAttachStateChangeListener", "attach lifecycle"),
    ("onViewDetachedFromWindow", "detach cleanup"),
    ("self.stopMainPanelRuntimeStatusTicker(panel)", "detached ticker stop"),
    ("main_runtime_status_detail", "detail click guard"),
    ("self.showMainPanelRuntimeStatusDetail()", "detail click action"),
    ("statusText.setSingleLine(true)", "compact status text"),
    ("statusText.setEllipsize(android.text.TextUtils.TruncateAt.END)", "status ellipsis"),
):
    require(SOURCE, marker, label)

forbid(SOURCE, "statusText.setText('运行中')", "static runtime status")
forbid(SOURCE, "setInterval(", "unmanaged interval")
forbid(SOURCE, "new java.lang.Thread", "dedicated status thread")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

require(WORKFLOW, "python3 scripts/verify_main_panel_runtime_status.py", "workflow verification")

for path in DOC_PATHS:
    text = path.read_text(encoding="utf-8")
    require(text, "实时运行状态", path.name + " runtime status documentation")

print("OK main_panel_runtime_status methods=%d refresh_ms=800 states=11" % len(methods))
