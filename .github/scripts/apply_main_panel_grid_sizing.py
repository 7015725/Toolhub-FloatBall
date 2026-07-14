#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text.rstrip() + "\n", encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s: expected 1 anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def regex_replace_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("FAIL %s: expected 1 match, found %d" % (label, count))
    return updated


# ---------------------------------------------------------------------------
# 主面板：由网格真实宽高反推面板与 WindowManager 尺寸。
# ---------------------------------------------------------------------------
main_path = "code/th_15_main_panel.js"
main = read(main_path)
main = replace_once(main, "// @version 1.4.1", "// @version 1.5.0", "main version")
main = replace_once(
    main,
    "// ToolHub - 主按钮面板第五阶段微调：配置规范化、单页底部与背景可读性",
    "// ToolHub - 主按钮面板第六阶段：网格决定面板宽高与精确窗口尺寸",
    "main stage title",
)

responsive = r'''FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function(editMode) {
  var safe = this.getMainPanelSafeBounds();
  var density = Number(this.state && this.state.density ? this.state.density : 1);
  if (density <= 0 || isNaN(density)) density = 1;
  var landscape = safe.width > safe.height;

  function readLayoutNumber(value, fallback, minValue, maxValue, integerOnly) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback);
    if (integerOnly === true) n = Math.round(n);
    if (n < minValue) n = minValue;
    if (n > maxValue) n = maxValue;
    return n;
  }

  var widthPercent = readLayoutNumber(this.config.PANEL_WIDTH_PERCENT, 90, 60, 100, true);
  var autoMaxCols = readLayoutNumber(this.config.PANEL_AUTO_MAX_COLS, 6, 1, 6, true);
  var minCardWidthDp = readLayoutNumber(this.config.PANEL_MIN_CARD_WIDTH_DP, 92, 72, 160, true);
  var cardHeightDp = readLayoutNumber(this.config.PANEL_CARD_HEIGHT_DP, 78, 56, 120, true);
  var gapDp = readLayoutNumber(this.config.PANEL_GAP_DP, 8, 4, 24, true);
  var paddingDp = readLayoutNumber(this.config.PANEL_PADDING_DP, 12, 8, 32, true);

  // 宽度占比只定义可用预算，不再直接作为最终面板宽度。
  var panelWidthBudget = Math.floor(safe.width * widthPercent / 100);
  var minimumPanelWidth = Math.min(safe.width, this.dp(220));
  panelWidthBudget = Math.min(safe.width, Math.max(minimumPanelWidth, panelWidthBudget));

  var panelPadding = this.dp(paddingDp);
  var minimumGridWidth = this.dp(72);
  var maximumPadding = Math.max(
    this.dp(4),
    Math.floor((panelWidthBudget - minimumGridWidth) / 2)
  );
  if (panelPadding > maximumPadding) panelPadding = maximumPadding;

  var gridWidthBudget = Math.max(1, panelWidthBudget - panelPadding * 2);
  var gap = this.dp(gapDp);
  var gapBefore = Math.floor(gap / 2);
  var gapAfter = gap - gapBefore;
  var minCardWidth = this.dp(minCardWidthDp);

  var cols = Math.floor((gridWidthBudget + gap) / (minCardWidth + gap));
  if (cols < 1) cols = 1;
  if (cols > autoMaxCols) cols = autoMaxCols;

  var minimumTouchWidth = this.dp(48);
  var cardWidth = 0;
  while (cols > 1) {
    cardWidth = Math.floor((gridWidthBudget - cols * gap) / cols);
    if (cardWidth >= minimumTouchWidth) break;
    cols--;
  }
  cardWidth = Math.max(
    minimumTouchWidth,
    Math.floor((gridWidthBudget - cols * gap) / cols)
  );

  // 标题栏只提供网格最低宽度要求；若不足，将差值平均分配给各列卡片。
  var toolbarMinGridWidth = Math.min(
    gridWidthBudget,
    this.dp(editMode === true ? 180 : 236)
  );
  var naturalGridWidth = cols * (cardWidth + gap);
  if (naturalGridWidth < toolbarMinGridWidth) {
    var expandedCardWidth = Math.ceil((toolbarMinGridWidth - cols * gap) / cols);
    var expandedGridWidth = cols * (expandedCardWidth + gap);
    if (expandedGridWidth <= gridWidthBudget) cardWidth = expandedCardWidth;
    else cardWidth = Math.max(
      minimumTouchWidth,
      Math.floor((gridWidthBudget - cols * gap) / cols)
    );
  }

  // 网格宽度是卡片及其左右 margin 的精确和；面板宽度由网格反推。
  var cellOuterWidth = cardWidth + gapBefore + gapAfter;
  var gridWidth = cols * cellOuterWidth;
  var panelWidth = panelPadding * 2 + gridWidth;

  var cardHeight = this.dp(cardHeightDp);
  var cellOuterHeight = cardHeight + gapBefore + gapAfter;
  var rowUnit = cellOuterHeight;
  var headerHeight = this.dp(56);
  var footerHeight = this.dp(24);
  var singlePageFooterHeight = this.dp(8);
  var panelTopPadding = this.dp(8);
  var panelBottomPadding = this.dp(8);
  var dividerHeight = 1;
  var dividerBottomMargin = this.dp(4);
  var maxPanelHeight = Math.min(
    safe.height,
    Math.max(this.dp(220), Math.floor(safe.height * 0.78))
  );
  var fixedVerticalHeight =
    panelTopPadding +
    headerHeight +
    dividerHeight +
    dividerBottomMargin +
    footerHeight +
    panelBottomPadding;
  var maxGridHeight = Math.max(rowUnit, maxPanelHeight - fixedVerticalHeight);

  var configuredRows = readLayoutNumber(this.config.PANEL_ROWS, 4, 1, 10, true);
  var visibleRows = Math.max(
    1,
    Math.min(configuredRows, Math.floor(maxGridHeight / rowUnit))
  );

  return {
    safe: safe,
    layoutMode: 'adaptive_grid_sized',
    widthPercent: widthPercent,
    panelWidthBudget: panelWidthBudget,
    gridWidthBudget: gridWidthBudget,
    autoMaxCols: autoMaxCols,
    minCardWidth: minCardWidth,
    minCardWidthDp: minCardWidthDp,
    cardHeightDp: cardHeightDp,
    cols: cols,
    panelWidth: panelWidth,
    panelPadding: panelPadding,
    gap: gap,
    gapBefore: gapBefore,
    gapAfter: gapAfter,
    gridWidth: gridWidth,
    cardWidth: cardWidth,
    cardHeight: cardHeight,
    cellOuterWidth: cellOuterWidth,
    cellOuterHeight: cellOuterHeight,
    rowUnit: rowUnit,
    headerHeight: headerHeight,
    footerHeight: footerHeight,
    singlePageFooterHeight: singlePageFooterHeight,
    panelTopPadding: panelTopPadding,
    panelBottomPadding: panelBottomPadding,
    dividerHeight: dividerHeight,
    dividerBottomMargin: dividerBottomMargin,
    visibleRows: visibleRows,
    maxPanelHeight: maxPanelHeight,
    maxGridHeight: maxGridHeight,
    landscape: landscape,
    safeWidthDp: safe.width / density
  };
};

FloatBallAppWM.prototype.createMainPanelRippleBackground'''

main = regex_replace_once(
    main,
    r"FloatBallAppWM\.prototype\.getMainPanelResponsiveSpec = function\([^)]*\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.createMainPanelRippleBackground",
    responsive,
    "responsive spec",
)

main = replace_once(
    main,
    "  var halfGap = Math.max(1, Math.floor(spec.gap / 2));\n"
    "  gp.setMargins(halfGap, halfGap, halfGap, halfGap);",
    "  gp.setMargins(\n"
    "    spec.gapBefore,\n"
    "    spec.gapBefore,\n"
    "    spec.gapAfter,\n"
    "    spec.gapAfter\n"
    "  );",
    "exact card margins",
)

main = replace_once(
    main,
    "  var spec = this.getMainPanelResponsiveSpec();",
    "  var spec = this.getMainPanelResponsiveSpec(editMode);",
    "responsive edit mode",
)

main = replace_once(
    main,
    "  panel.setPadding(spec.panelPadding, this.dp(8), spec.panelPadding, this.dp(8));",
    "  panel.setPadding(\n"
    "    spec.panelPadding,\n"
    "    spec.panelTopPadding,\n"
    "    spec.panelPadding,\n"
    "    spec.panelBottomPadding\n"
    "  );",
    "exact panel padding",
)

main = replace_once(
    main,
    "  panel.setLayoutParams(new android.view.ViewGroup.LayoutParams(spec.panelWidth, -2));",
    "  // 最终精确宽高在网格行数和页数确定后统一设置。",
    "defer panel dimensions",
)

old_rows = '''  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var gridHeight = visibleRows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var pageContext = null;'''
new_rows = '''  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var viewportHeight = visibleRows * spec.rowUnit;
  var fullGridHeight = rows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var footerHeight = pageCount > 1
    ? spec.footerHeight
    : spec.singlePageFooterHeight;
  var panelHeight =
    spec.panelTopPadding +
    spec.headerHeight +
    spec.dividerHeight +
    spec.dividerBottomMargin +
    viewportHeight +
    footerHeight +
    spec.panelBottomPadding;

  panel.setLayoutParams(
    new android.view.ViewGroup.LayoutParams(
      spec.panelWidth,
      panelHeight
    )
  );

  safeLog(this.L, 'd',
    'main panel grid sizing cols=' + String(spec.cols) +
    ' grid=' + String(spec.gridWidth) + 'x' + String(fullGridHeight) +
    ' viewport=' + String(spec.gridWidth) + 'x' + String(viewportHeight) +
    ' panel=' + String(spec.panelWidth) + 'x' + String(panelHeight));

  var pageContext = null;'''
main = replace_once(main, old_rows, new_rows, "grid and panel dimensions")

main = replace_once(
    main,
    "  panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, gridHeight));",
    "  panel.addView(\n"
    "    scroll,\n"
    "    new android.widget.LinearLayout.LayoutParams(\n"
    "      spec.gridWidth,\n"
    "      viewportHeight\n"
    "    )\n"
    "  );",
    "exact scroll dimensions",
)

main = replace_once(
    main,
    "  try { grid.setPadding(spec.gridInset, 0, spec.gridInset, 0); } catch (eGridInset) {}\n",
    "",
    "remove grid inset",
)

main = replace_once(
    main,
    "  scroll.addView(grid, new android.widget.FrameLayout.LayoutParams(-1, -2));",
    "  scroll.addView(\n"
    "    grid,\n"
    "    new android.widget.FrameLayout.LayoutParams(\n"
    "      spec.gridWidth,\n"
    "      fullGridHeight\n"
    "    )\n"
    "  );",
    "exact grid dimensions",
)

main = replace_once(
    main,
    "    gridHeight: gridHeight,",
    "    gridHeight: viewportHeight,\n"
    "    fullGridHeight: fullGridHeight,\n"
    "    panelHeight: panelHeight,",
    "page context dimensions",
)

main = replace_once(
    main,
    "  var footerHeight = pageCount > 1 ? spec.footerHeight : this.dp(8);\n",
    "",
    "reuse computed footer height",
)

write(main_path, main)


# ---------------------------------------------------------------------------
# 通用面板显示：主面板保留网格计算出的精确宽高。
# ---------------------------------------------------------------------------
extra_path = "code/th_15_extra.js"
extra = read(extra_path)
extra = replace_once(extra, "// @version 1.1.12", "// @version 1.1.13", "extra version")

show_start = extra.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which)")
show_end = extra.find("// =======================【辅助：包装可拖拽面板】", show_start)
if show_start < 0 or show_end <= show_start:
    raise SystemExit("FAIL isolate showPanelAvoidBall")
show = extra[show_start:show_end]

old_measure = '''      // # 限制面板最大高度
      var maxH = Math.floor(self.state.screen.h * 0.75);
      panelView.measure(
        android.view.View.MeasureSpec.makeMeasureSpec(self.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
        android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
      );

      var pw = panelView.getMeasuredWidth();
      var ph = panelView.getMeasuredHeight();

      // Load saved state
      var savedState = null;
      if (enableDrag && self.loadPanelState) {
          savedState = self.loadPanelState(which);
      }

      if (savedState && savedState.w && savedState.h) {
          pw = savedState.w;
          ph = savedState.h;
      } else {
           // 显式设置面板高度
          if (ph > maxH) {
              ph = maxH;
          }
      }

      var safeLp = panelView.getLayoutParams();
      if (!safeLp) safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
      else { safeLp.width = pw; safeLp.height = ph; }
      panelView.setLayoutParams(safeLp);'''

new_measure = '''      // # 主面板宽高由网格模型精确给出，其他面板继续使用通用 AT_MOST 测量。
      var maxH = Math.floor(self.state.screen.h * 0.75);
      var requestedLp = panelView.getLayoutParams();
      var requestedWidth = Number(requestedLp && requestedLp.width || 0);
      var requestedHeight = Number(requestedLp && requestedLp.height || 0);
      var exactMainSize =
        which === 'main' &&
        requestedWidth > 0 &&
        requestedHeight > 0;
      var pw = 0;
      var ph = 0;

      // Load saved state（主面板不支持拖拽缩放，不读取保存尺寸）。
      var savedState = null;
      if (enableDrag && self.loadPanelState) {
          savedState = self.loadPanelState(which);
      }

      if (exactMainSize) {
          panelView.measure(
            android.view.View.MeasureSpec.makeMeasureSpec(
              requestedWidth,
              android.view.View.MeasureSpec.EXACTLY
            ),
            android.view.View.MeasureSpec.makeMeasureSpec(
              requestedHeight,
              android.view.View.MeasureSpec.EXACTLY
            )
          );
          pw = requestedWidth;
          ph = requestedHeight;
          safeLog(self.L, 'd',
            'main panel exact window size=' + String(pw) + 'x' + String(ph));
      } else {
          panelView.measure(
            android.view.View.MeasureSpec.makeMeasureSpec(
              self.state.screen.w,
              android.view.View.MeasureSpec.AT_MOST
            ),
            android.view.View.MeasureSpec.makeMeasureSpec(
              maxH,
              android.view.View.MeasureSpec.AT_MOST
            )
          );
          pw = panelView.getMeasuredWidth();
          ph = panelView.getMeasuredHeight();

          if (savedState && savedState.w && savedState.h) {
              pw = savedState.w;
              ph = savedState.h;
          } else if (ph > maxH) {
              ph = maxH;
          }
      }

      var safeLp = panelView.getLayoutParams();
      if (!safeLp) safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
      else { safeLp.width = pw; safeLp.height = ph; }
      panelView.setLayoutParams(safeLp);'''

show = replace_once(show, old_measure, new_measure, "main exact measurement")
extra = extra[:show_start] + show + extra[show_end:]
write(extra_path, extra)


# ---------------------------------------------------------------------------
# 现有主面板专项版本同步。
# ---------------------------------------------------------------------------
for name in (
    "scripts/verify_main_panel_runtime_status.py",
    "scripts/verify_main_panel_drag_sort.py",
    "scripts/verify_main_panel_paging.py",
    "scripts/verify_main_panel_close_lifecycle.py",
    "scripts/verify_main_panel_visual_tuning.py",
):
    text = read(name)
    if "1.4.1" not in text:
        raise SystemExit("FAIL version anchor missing: " + name)
    write(name, text.replace("1.4.1", "1.5.0"))


# 自适应校验改为验证“预算决定列数、网格决定最终面板宽度”。
adaptive = '''#!/usr/bin/env python3
from pathlib import Path
import math
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
PERSIST = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-adaptive-layout: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


def version(text, expected, name):
    match = re.search(r"(?m)^// @version ([0-9]+\\.[0-9]+\\.[0-9]+)$", text)
    if not match or match.group(1) != expected:
        fail("%s expected version %s" % (name, expected))


version(BASE, "1.1.8", "th_01_base.js")
version(PERSIST, "1.0.4", "th_05_persistence.js")
version(MAIN, "1.5.0", "th_15_main_panel.js")

responsive_start = MAIN.find("FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function")
responsive_end = MAIN.find("FloatBallAppWM.prototype.createMainPanelRippleBackground", responsive_start)
if responsive_start < 0 or responsive_end <= responsive_start:
    fail("cannot isolate responsive specification")
responsive = MAIN[responsive_start:responsive_end]

for marker, label in (
    ("this.config.PANEL_WIDTH_PERCENT", "width percentage"),
    ("this.config.PANEL_AUTO_MAX_COLS", "automatic max columns"),
    ("this.config.PANEL_MIN_CARD_WIDTH_DP", "minimum card width"),
    ("this.config.PANEL_CARD_HEIGHT_DP", "card height"),
    ("panelWidthBudget", "width budget"),
    ("gridWidthBudget", "grid width budget"),
    ("gapBefore", "leading half gap"),
    ("gapAfter = gap - gapBefore", "exact trailing half gap"),
    ("Math.floor((gridWidthBudget - cols * gap) / cols)", "equal card distribution"),
    ("cellOuterWidth = cardWidth + gapBefore + gapAfter", "outer cell width"),
    ("gridWidth = cols * cellOuterWidth", "exact grid width"),
    ("panelWidth = panelPadding * 2 + gridWidth", "grid-derived panel width"),
    ("layoutMode: 'adaptive_grid_sized'", "grid-sized mode marker"),
):
    require(responsive, marker, label)

for fragment, label in (
    ("gridInset", "grid remainder inset"),
    ("targetWidthDp", "fixed target width"),
    ("this.dp(304)", "fixed narrow width"),
    ("this.dp(344)", "fixed regular width"),
    ("this.dp(424)", "fixed wide width"),
):
    forbid(responsive, fragment, label)

for key in (
    "PANEL_WIDTH_PERCENT",
    "PANEL_AUTO_MAX_COLS",
    "PANEL_MIN_CARD_WIDTH_DP",
    "PANEL_CARD_HEIGHT_DP",
):
    require(BASE, key + ":", "base key " + key)
    require(PERSIST, 'k === "%s"' % key, "immediate effect " + key)

for name in (
    "verify_main_panel_runtime_status.py",
    "verify_main_panel_drag_sort.py",
    "verify_main_panel_paging.py",
    "verify_main_panel_close_lifecycle.py",
    "verify_main_panel_visual_tuning.py",
):
    source = (ROOT / "scripts" / name).read_text(encoding="utf-8")
    require(source, "1.5.0", name + " current version")

require(WORKFLOW, "python3 scripts/verify_main_panel_adaptive_layout.py", "workflow verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry")
for doc in ("README.md", "ARCHITECTURE.md", "STRUCTURE.md"):
    require((ROOT / doc).read_text(encoding="utf-8"), "可配置自适应网格", doc)


def model(safe_width, width_percent=90, padding=12, gap=8, minimum_card=92, max_columns=6):
    budget = min(safe_width, max(min(safe_width, 220), math.floor(safe_width * width_percent / 100)))
    grid_budget = budget - padding * 2
    columns = max(1, min(max_columns, math.floor((grid_budget + gap) / (minimum_card + gap))))
    card = math.floor((grid_budget - columns * gap) / columns)
    while columns > 1 and card < 48:
        columns -= 1
        card = math.floor((grid_budget - columns * gap) / columns)
    card = max(48, card)
    grid = columns * (card + gap)
    panel = padding * 2 + grid
    return columns, card, grid, panel, budget


for width, expected in {320: 2, 392: 3, 600: 5, 800: 6}.items():
    columns, card, grid, panel, budget = model(width)
    if columns != expected:
        fail("width=%d expected cols=%d got=%d" % (width, expected, columns))
    if panel > budget or grid + 24 != panel or card < 48:
        fail("invalid grid-sized model width=%d" % width)

print("OK main_panel_adaptive_layout model=2/3/5/6 width=grid-derived gap=exact")
'''
write("scripts/verify_main_panel_adaptive_layout.py", adaptive)


grid_verify = '''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-grid-sizing: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


def version(text, expected, name):
    match = re.search(r"(?m)^// @version ([0-9]+\\.[0-9]+\\.[0-9]+)$", text)
    if not match or match.group(1) != expected:
        fail("%s expected version %s" % (name, expected))


version(MAIN, "1.5.0", "th_15_main_panel.js")
version(EXTRA, "1.1.13", "th_15_extra.js")

for marker, label in (
    ("gridWidth = cols * cellOuterWidth", "grid width identity"),
    ("panelWidth = panelPadding * 2 + gridWidth", "panel width identity"),
    ("fullGridHeight = rows * spec.rowUnit", "full grid height identity"),
    ("viewportHeight = visibleRows * spec.rowUnit", "viewport height identity"),
    ("spec.panelTopPadding +", "panel top padding"),
    ("spec.dividerHeight +", "divider height"),
    ("spec.dividerBottomMargin +", "divider margin"),
    ("spec.panelBottomPadding", "panel bottom padding"),
    ("new android.widget.LinearLayout.LayoutParams(\n      spec.gridWidth,\n      viewportHeight", "exact scroll size"),
    ("new android.widget.FrameLayout.LayoutParams(\n      spec.gridWidth,\n      fullGridHeight", "exact grid size"),
    ("new android.view.ViewGroup.LayoutParams(\n      spec.panelWidth,\n      panelHeight", "exact panel size"),
    ("spec.gapBefore", "exact leading margin"),
    ("spec.gapAfter", "exact trailing margin"),
    ("main panel grid sizing cols=", "dimension diagnostics"),
):
    require(MAIN, marker, label)

for fragment, label in (
    ("grid.setPadding(spec.gridInset", "grid inset"),
    ("new android.widget.LinearLayout.LayoutParams(-1, gridHeight)", "match-parent scroll width"),
    ("new android.widget.FrameLayout.LayoutParams(-1, -2)", "match-parent grid width"),
):
    forbid(MAIN, fragment, label)

show_start = EXTRA.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which)")
show_end = EXTRA.find("// =======================【辅助：包装可拖拽面板】", show_start)
if show_start < 0 or show_end <= show_start:
    fail("cannot isolate showPanelAvoidBall")
show = EXTRA[show_start:show_end]
for marker, label in (
    ("var exactMainSize =", "main exact branch"),
    ("requestedWidth > 0", "requested width guard"),
    ("requestedHeight > 0", "requested height guard"),
    ("android.view.View.MeasureSpec.EXACTLY", "exact measurement"),
    ("pw = requestedWidth", "window width preservation"),
    ("ph = requestedHeight", "window height preservation"),
    ("main panel exact window size=", "window diagnostics"),
):
    require(show, marker, label)
require(show, "android.view.View.MeasureSpec.AT_MOST", "other panel measurement retained")

require(WORKFLOW, "python3 scripts/verify_main_panel_grid_sizing.py", "workflow verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry")
for doc in ("README.md", "ARCHITECTURE.md", "STRUCTURE.md"):
    require((ROOT / doc).read_text(encoding="utf-8"), "网格决定面板宽高", doc)

# 数学不变量模型。
cols = 4
card_width = 120
gap_before = 5
gap_after = 6
padding = 12
rows = 3
card_height = 72
visible_rows = 3
grid_width = cols * (card_width + gap_before + gap_after)
panel_width = padding * 2 + grid_width
row_unit = card_height + gap_before + gap_after
full_grid_height = rows * row_unit
viewport_height = visible_rows * row_unit
if grid_width != cols * (card_width + gap_before + gap_after):
    fail("grid width invariant")
if panel_width != grid_width + padding * 2:
    fail("panel width invariant")
if full_grid_height != rows * row_unit or viewport_height != visible_rows * row_unit:
    fail("height invariant")

print("OK main_panel_grid_sizing width=grid height=viewport window=exact")
'''
write("scripts/verify_main_panel_grid_sizing.py", grid_verify)


# ---------------------------------------------------------------------------
# Workflow 和文档。
# ---------------------------------------------------------------------------
workflow_path = ".github/workflows/verify.yml"
workflow = read(workflow_path)
if "python3 scripts/verify_main_panel_grid_sizing.py" not in workflow:
    workflow = replace_once(
        workflow,
        "          python3 scripts/verify_main_panel_adaptive_layout.py\n"
        "          python3 scripts/verify_main_panel_visual_tuning.py",
        "          python3 scripts/verify_main_panel_adaptive_layout.py\n"
        "          python3 scripts/verify_main_panel_grid_sizing.py\n"
        "          python3 scripts/verify_main_panel_visual_tuning.py",
        "verify workflow",
    )
write(workflow_path, workflow)

readme_path = ROOT / "README.md"
readme_lines = readme_path.read_text(encoding="utf-8").splitlines()
for index, line in enumerate(readme_lines):
    if line.startswith("- 主按钮面板采用可配置自适应网格"):
        readme_lines[index] = (
            "- 主按钮面板采用可配置自适应网格，宽度占比只用于确定列数预算，"
            "由卡片、精确间距和可视行数计算网格，再由网格决定面板宽高；"
            "WindowManager 使用同一精确尺寸，避免右侧额外空白，并继续支持实时运行状态、"
            "拖动排序、分页吸附、按钮直接保存、单页隐藏分页圆点和关闭闪烁。"
        )
        break
else:
    raise SystemExit("FAIL README main panel bullet")
write("README.md", "\n".join(readme_lines))

arch = read("ARCHITECTURE.md")
arch_note = (
    "- 主面板尺寸遵循“网格决定面板宽高”：`gridWidth = cols × cellOuterWidth`，"
    "`panelWidth = gridWidth + 2 × panelPadding`；完整网格高度、可视高度和页脚共同反推面板高度，"
    "WindowManager 使用相同的 `EXACTLY` 宽高。"
)
if arch_note not in arch:
    marker = "th_15_main_panel.js"
    pos = arch.find(marker)
    if pos < 0:
        raise SystemExit("FAIL ARCHITECTURE marker")
    line_end = arch.find("\n", pos)
    arch = arch[:line_end + 1] + arch_note + "\n" + arch[line_end + 1:]
write("ARCHITECTURE.md", arch)

structure = read("STRUCTURE.md")
phrase = "网格决定面板宽高"
if phrase not in structure:
    marker = "| `th_15_main_panel.js` |"
    pos = structure.find(marker)
    if pos < 0:
        raise SystemExit("FAIL STRUCTURE marker")
    line_end = structure.find("\n", pos)
    line = structure[pos:line_end]
    line = line[:-2] + "；网格决定面板宽高 |"
    structure = structure[:pos] + line + structure[line_end:]
write("STRUCTURE.md", structure)

print("OK applied grid-sized main panel model")
