#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
MAIN_PATH = ROOT / "code" / "th_15_main_panel.js"
PAGING_VERIFY_PATH = ROOT / "scripts" / "verify_main_panel_paging.py"
GRID_VERIFY_PATH = ROOT / "scripts" / "verify_main_panel_grid_sizing.py"


def fail(message):
    raise SystemExit("FAIL apply-main-panel-paging-fix: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected one anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        fail("%s expected one match, found %d" % (label, count))
    return updated


def write(path, text):
    path.write_text(text.rstrip() + "\n", encoding="utf-8", newline="\n")


main = MAIN_PATH.read_text(encoding="utf-8")
main = replace_once(main, "// @version 1.5.1", "// @version 1.5.2", "main version")
main = replace_once(
    main,
    "// ToolHub - 主按钮面板第六阶段：网格决定面板宽高与精确窗口尺寸",
    "// ToolHub - 主按钮面板第七阶段：整页分页与稳定吸附",
    "main stage title",
)

max_scroll_method = r'''FloatBallAppWM.prototype.getMainPanelPageMaxScrollY = function(pageContext) {
  try {
    if (!pageContext) return 0;
    var pageRows = Number(pageContext.pageRows || pageContext.rows || 1);
    var rowUnit = Number(pageContext.spec && pageContext.spec.rowUnit ? pageContext.spec.rowUnit : 1);
    var viewport = Number(pageContext.gridHeight || 0);
    if (isNaN(pageRows) || pageRows < 1) pageRows = 1;
    if (isNaN(rowUnit) || rowUnit < 1) rowUnit = 1;
    if (isNaN(viewport) || viewport < 0) viewport = 0;
    return Math.max(0, Math.floor(pageRows * rowUnit - viewport));
  } catch (e) {}
  return 0;
};'''
main = regex_once(
    main,
    r"FloatBallAppWM\.prototype\.getMainPanelPageMaxScrollY = function\(pageContext\) \{.*?\n\};",
    max_scroll_method,
    "page max scroll",
)

cancel_method = r'''FloatBallAppWM.prototype.cancelMainPanelPageSnap = function(pageContext) {
  try {
    var current = pageContext || (this.state ? this.state.mainPanelPagingContext : null);
    if (!current) return false;
    var runner = current.snapRunnable;
    try {
      if (runner && this.state && this.state.h) this.state.h.removeCallbacks(runner);
    } catch (eRemove) {}
    current.snapGeneration = Number(current.snapGeneration || 0) + 1;
    current.snapRunnable = null;
    return true;
  } catch (e) {}
  return false;
};'''
main = regex_once(
    main,
    r"FloatBallAppWM\.prototype\.cancelMainPanelPageSnap = function\(pageContext\) \{.*?\n\};",
    cancel_method,
    "cancel page snap",
)

scroll_method = r'''FloatBallAppWM.prototype.scrollMainPanelToPage = function(pageContext, index, animate, reason) {
  try {
    if (!pageContext || !pageContext.scroll) return false;
    this.cancelMainPanelPageSnap(pageContext);

    var page = this.clampMainPanelPageIndex(index, pageContext.pageCount);
    var pageHeight = this.getMainPanelPageHeight(pageContext);
    var maxY = this.getMainPanelPageMaxScrollY(pageContext);
    var targetY = Math.min(maxY, Math.max(0, Math.floor(page * pageHeight)));

    pageContext.programmaticScroll = true;
    var finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
    pageContext.finishGeneration = finishGeneration;

    if (animate === true && pageContext.scroll.smoothScrollTo) {
      pageContext.scroll.smoothScrollTo(0, targetY);
    } else {
      pageContext.scroll.scrollTo(0, targetY);
    }

    this.rememberMainPanelPageIndex(pageContext, page);
    this.updateMainPanelPageDots(
      pageContext.dotViews,
      page,
      pageContext.dotTargets,
      pageContext.pageCount
    );

    var self = this;
    var finishAttempts = 0;
    var finishStableSamples = 0;
    var finishLastY = null;
    var finish = null;
    finish = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (Number(pageContext.finishGeneration || 0) !== finishGeneration) return;

        var currentY = Number(pageContext.scroll.getScrollY() || 0);
        if (isNaN(currentY)) currentY = 0;
        if (finishLastY !== null && Math.abs(currentY - finishLastY) <= 1) {
          finishStableSamples++;
        } else {
          finishStableSamples = 0;
        }
        finishLastY = currentY;
        finishAttempts++;

        var reachedTarget = Math.abs(currentY - targetY) <= 1;
        if ((reachedTarget && finishStableSamples >= 1) || finishAttempts >= 24) {
          pageContext.programmaticScroll = false;
          self.updateMainPanelPageNavigation(pageContext, currentY);
          return;
        }

        if (self.state.h) self.state.h.postDelayed(finish, 32);
        else {
          pageContext.programmaticScroll = false;
          self.updateMainPanelPageNavigation(pageContext, currentY);
        }
      } catch (eFinish) {
        pageContext.programmaticScroll = false;
      }
    }});
    if (this.state && this.state.h) this.state.h.postDelayed(finish, animate === true ? 32 : 16);
    else {
      pageContext.programmaticScroll = false;
      this.updateMainPanelPageNavigation(pageContext, targetY);
    }

    safeLog(this.L, 'd', 'main panel page scroll page=' + String(page) + ' reason=' + String(reason || ''));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'scroll main panel to page fail: ' + String(e));
  }
  return false;
};'''
main = regex_once(
    main,
    r"FloatBallAppWM\.prototype\.scrollMainPanelToPage = function\(pageContext, index, animate, reason\) \{.*?\n\};",
    scroll_method,
    "scroll page",
)

snap_method = r'''FloatBallAppWM.prototype.scheduleMainPanelPageSnap = function(pageContext, delayMs, reason) {
  try {
    if (!pageContext || Number(pageContext.pageCount || 1) <= 1) return false;
    if (pageContext.touching === true) return false;
    try {
      if (this.state && this.state.mainPanelEditDrag && this.state.mainPanelEditDrag.started) return false;
    } catch (eDrag) {}

    this.cancelMainPanelPageSnap(pageContext);
    var self = this;
    var generation = Number(pageContext.snapGeneration || 0) + 1;
    pageContext.snapGeneration = generation;
    var delay = Number(delayMs || 0);
    if (isNaN(delay) || delay < 40) delay = 40;
    var startedAt = java.lang.System.currentTimeMillis();
    var lastY = null;
    var stableSamples = 0;

    var runner = null;
    runner = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (Number(pageContext.snapGeneration || 0) !== generation) return;
        if (self.state.panel !== pageContext.panel || !self.state.addedPanel) return;
        if (pageContext.touching === true) return;
        if (self.state.mainPanelEditDrag && self.state.mainPanelEditDrag.started) return;

        var elapsed = java.lang.System.currentTimeMillis() - startedAt;
        if (pageContext.programmaticScroll === true && elapsed < 1200) {
          if (self.state.h) self.state.h.postDelayed(runner, 60);
          return;
        }

        var currentY = Number(pageContext.scroll.getScrollY() || 0);
        if (isNaN(currentY)) currentY = 0;
        if (lastY !== null && Math.abs(currentY - lastY) <= 1) {
          stableSamples++;
        } else {
          stableSamples = 0;
        }
        lastY = currentY;

        if (stableSamples < 2 && elapsed < 1200) {
          if (self.state.h) self.state.h.postDelayed(runner, 60);
          return;
        }

        pageContext.snapRunnable = null;
        var page = self.getMainPanelPageIndexForScrollY(pageContext, currentY);
        var pageHeight = self.getMainPanelPageHeight(pageContext);
        var maxY = self.getMainPanelPageMaxScrollY(pageContext);
        var targetY = Math.min(maxY, Math.max(0, Math.floor(page * pageHeight)));

        if (Math.abs(targetY - currentY) <= 1) {
          self.updateMainPanelPageNavigation(pageContext, currentY);
          return;
        }
        self.scrollMainPanelToPage(pageContext, page, true, reason || 'snap');
      } catch (eRun) {
        safeLog(self.L, 'w', 'main panel page snap fail: ' + String(eRun));
      }
    }});

    pageContext.snapRunnable = runner;
    if (this.state && this.state.h) this.state.h.postDelayed(runner, delay);
    else runner.run();
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'schedule main panel page snap fail: ' + String(e));
  }
  return false;
};'''
main = regex_once(
    main,
    r"FloatBallAppWM\.prototype\.scheduleMainPanelPageSnap = function\(pageContext, delayMs, reason\) \{.*?\n\};",
    snap_method,
    "schedule page snap",
)

spacer_method = r'''FloatBallAppWM.prototype.createMainPanelPageSpacer = function(spec) {
  var spacer = new android.view.View(context);
  var lp = new android.widget.GridLayout.LayoutParams();
  lp.width = spec.cardWidth;
  lp.height = spec.cardHeight;
  lp.setMargins(
    spec.gapBefore,
    spec.gapBefore,
    spec.gapAfter,
    spec.gapAfter
  );
  spacer.setLayoutParams(lp);
  spacer.setVisibility(android.view.View.INVISIBLE);
  spacer.setClickable(false);
  spacer.setFocusable(false);
  return spacer;
};

'''
main = replace_once(
    main,
    "FloatBallAppWM.prototype.buildMainPanelView = function() {",
    spacer_method + "FloatBallAppWM.prototype.buildMainPanelView = function() {",
    "page spacer insertion",
)

old_rows = '''  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var viewportHeight = visibleRows * spec.rowUnit;
  var fullGridHeight = rows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));'''
new_rows = '''  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var viewportHeight = visibleRows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var pageRows = pageCount * visibleRows;
  var fullGridHeight = pageRows * spec.rowUnit;'''
main = replace_once(main, old_rows, new_rows, "whole-page grid model")
main = replace_once(
    main,
    "    ' grid=' + String(spec.gridWidth) + 'x' + String(fullGridHeight) +",
    "    ' grid=' + String(spec.gridWidth) + 'x' + String(fullGridHeight) +\n    ' rows=' + String(rows) + '/' + String(pageRows) +",
    "grid paging diagnostics",
)
main = replace_once(
    main,
    "  try { grid.setRowCount(rows); } catch (eRows) {}",
    "  try { grid.setRowCount(pageRows); } catch (eRows) {}",
    "page row count",
)
main = replace_once(
    main,
    "    rows: rows,\n    visibleRows: visibleRows,",
    "    rows: rows,\n    pageRows: pageRows,\n    visibleRows: visibleRows,",
    "paging context rows",
)

old_touch = '''        if (action === android.view.MotionEvent.ACTION_DOWN) {
          pageContext.touching = true;
          self.cancelMainPanelPageSnap(pageContext);
        } else if (action === android.view.MotionEvent.ACTION_UP ||
                   action === android.view.MotionEvent.ACTION_CANCEL) {
          pageContext.touching = false;
          self.scheduleMainPanelPageSnap(pageContext, 90, 'touch_release');
        }'''
new_touch = '''        if (action === android.view.MotionEvent.ACTION_DOWN) {
          pageContext.touching = true;
          pageContext.finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
          pageContext.programmaticScroll = false;
          self.cancelMainPanelPageSnap(pageContext);
        } else if (action === android.view.MotionEvent.ACTION_UP ||
                   action === android.view.MotionEvent.ACTION_CANCEL) {
          pageContext.touching = false;
          self.scheduleMainPanelPageSnap(pageContext, 80, 'touch_release');
        }'''
main = replace_once(main, old_touch, new_touch, "touch paging timing")
main = replace_once(
    main,
    "          self.scheduleMainPanelPageSnap(pageContext, 170, 'scroll_idle');",
    "          self.scheduleMainPanelPageSnap(pageContext, 90, 'scroll_idle');",
    "scroll idle timing",
)

old_initial_render = '''  for (var j = 0; j < items.length; j++) {
    items[j].visibleIndex = j;
    grid.addView(this.createMainPanelFunctionCard(items[j], spec, colors, editContext));
  }'''
new_initial_render = '''  for (var j = 0; j < items.length; j++) {
    items[j].visibleIndex = j;
    grid.addView(this.createMainPanelFunctionCard(items[j], spec, colors, editContext));
  }
  for (var filler = items.length; filler < pageRows * spec.cols; filler++) {
    grid.addView(this.createMainPanelPageSpacer(spec));
  }'''
main = replace_once(main, old_initial_render, new_initial_render, "initial page spacers")

old_edit_render = '''    var nextRows = Math.max(1, Math.ceil(nextItems.length / spec.cols));
    try { grid.setRowCount(nextRows); } catch (eNextRows) {}
    for (var ri = 0; ri < nextItems.length; ri++) {
      nextItems[ri].visibleIndex = ri;
      grid.addView(self.createMainPanelFunctionCard(nextItems[ri], spec, colors, editContext));
    }'''
new_edit_render = '''    var nextRows = Math.max(1, Math.ceil(nextItems.length / spec.cols));
    try { grid.setRowCount(pageContext.pageRows); } catch (eNextRows) {}
    for (var ri = 0; ri < nextItems.length; ri++) {
      nextItems[ri].visibleIndex = ri;
      grid.addView(self.createMainPanelFunctionCard(nextItems[ri], spec, colors, editContext));
    }
    for (var rf = nextItems.length; rf < pageContext.pageRows * spec.cols; rf++) {
      grid.addView(self.createMainPanelPageSpacer(spec));
    }'''
main = replace_once(main, old_edit_render, new_edit_render, "edit page spacers")
write(MAIN_PATH, main)

version_paths = [
    ROOT / "scripts" / "verify_main_panel_adaptive_layout.py",
    ROOT / "scripts" / "verify_main_panel_visual_tuning.py",
    ROOT / "scripts" / "verify_panel_layout_settings_cleanup.py",
    ROOT / "scripts" / "verify_main_panel_grid_sizing.py",
    ROOT / "scripts" / "verify_main_panel_close_lifecycle.py",
    ROOT / "scripts" / "verify_legacy_main_panel_cleanup.py",
    ROOT / "scripts" / "verify_main_panel_drag_sort.py",
    ROOT / "scripts" / "verify_main_panel_runtime_status.py",
    ROOT / "scripts" / "verify_main_panel_paging.py",
]
for path in version_paths:
    text = path.read_text(encoding="utf-8")
    if "1.5.1" not in text:
        fail("missing old main-panel version in %s" % path.name)
    write(path, text.replace("1.5.1", "1.5.2"))

paging = PAGING_VERIFY_PATH.read_text(encoding="utf-8")
paging = replace_once(
    paging,
    'if SOURCE.count("setOnScrollChangeListener") != 1:',
    '''if SOURCE.count("FloatBallAppWM.prototype.createMainPanelPageSpacer = function") != 1:
    fail("expected one page spacer builder")

if SOURCE.count("setOnScrollChangeListener") != 1:''',
    "paging spacer verifier",
)
paging = replace_once(
    paging,
    '    ("Math.round(y / pageHeight)", "nearest page calculation"),',
    '''    ("Math.round(y / pageHeight)", "nearest page calculation"),
    ("pageRows = pageCount * visibleRows", "whole-page row padding"),
    ("pageRows * spec.rowUnit", "whole-page content height"),
    ("pageRows * spec.cols", "page spacer cell count"),
    ("stableSamples < 2", "native fling stability wait"),
    ("finishStableSamples", "programmatic scroll stability wait"),''',
    "paging markers",
)
paging = replace_once(
    paging,
    '    ("new java.lang.Thread", "dedicated paging thread"),',
    '''    ("new java.lang.Thread", "dedicated paging thread"),
    ("postDelayed(finish, animate === true ? 260 : 20)", "fixed programmatic completion timer"),''',
    "paging forbidden fixed timer",
)
new_model = '''visible_rows = 3
row_unit = 88


def paging_model(rows):
    page_height = visible_rows * row_unit
    page_count = max(1, (rows + visible_rows - 1) // visible_rows)
    page_rows = page_count * visible_rows
    viewport = page_height
    max_y = page_rows * row_unit - viewport

    def clamp_page(index):
        return max(0, min(page_count - 1, round(index)))

    def page_for_y(y):
        y = max(0, min(max_y, y))
        return clamp_page(round(y / page_height))

    if max_y != (page_count - 1) * page_height:
        fail("whole-page max scroll invariant failed rows=%d" % rows)
    for page in range(page_count):
        target = min(max_y, page * page_height)
        if page_for_y(target) != page:
            fail("page target round trip failed rows=%d page=%d" % (rows, page))
    return page_count, max_y


for rows, expected_pages in ((1, 1), (4, 2), (5, 2), (7, 3), (8, 3)):
    actual_pages, _ = paging_model(rows)
    if actual_pages != expected_pages:
        fail("page count failed rows=%d expected=%d actual=%d" % (rows, expected_pages, actual_pages))
'''
paging = regex_once(
    paging,
    r"visible_rows = 3\n.*?\n\nprint\(",
    new_model + "\n\nprint(",
    "paging partial-page model",
)
paging = replace_once(
    paging,
    '    "snap=nearest lifecycle=guarded" % len(methods)',
    '    "snap=stable whole_page=1 partial_page=covered lifecycle=guarded" % len(methods)',
    "paging summary",
)
write(PAGING_VERIFY_PATH, paging)

grid_verify = GRID_VERIFY_PATH.read_text(encoding="utf-8")
grid_verify = replace_once(
    grid_verify,
    '("fullGridHeight = rows * spec.rowUnit", "full height identity"),',
    '("fullGridHeight = pageRows * spec.rowUnit", "whole-page full height identity"),',
    "grid verifier marker",
)
grid_verify = replace_once(
    grid_verify,
    '''rows = 3
card_height = 72
visible_rows = 3
grid_width = cols * (card_width + gap_before + gap_after)
panel_width = padding * 2 + grid_width
row_unit = card_height + gap_before + gap_after
full_grid_height = rows * row_unit
viewport_height = visible_rows * row_unit''',
    '''rows = 4
card_height = 72
visible_rows = 3
page_count = (rows + visible_rows - 1) // visible_rows
page_rows = page_count * visible_rows
grid_width = cols * (card_width + gap_before + gap_after)
panel_width = padding * 2 + grid_width
row_unit = card_height + gap_before + gap_after
full_grid_height = page_rows * row_unit
viewport_height = visible_rows * row_unit''',
    "grid verifier model",
)
grid_verify = replace_once(
    grid_verify,
    'if full_grid_height != rows * row_unit:\n    fail("full grid height invariant")',
    '''if full_grid_height != page_rows * row_unit:
    fail("whole-page full grid height invariant")
if full_grid_height - viewport_height != (page_count - 1) * viewport_height:
    fail("whole-page max scroll invariant")''',
    "grid verifier invariant",
)
grid_verify = replace_once(
    grid_verify,
    'print("OK main_panel_grid_sizing width=grid height=viewport window=exact")',
    'print("OK main_panel_grid_sizing width=grid height=whole-page viewport window=exact")',
    "grid verifier summary",
)
write(GRID_VERIFY_PATH, grid_verify)

for rel in (
    ".github/tmp/apply_main_panel_paging_fix.py",
    ".github/workflows/tmp-apply-main-panel-paging-fix.yml",
):
    path = ROOT / rel
    if path.exists():
        path.unlink()

print("OK apply_main_panel_paging_fix version=1.5.2 whole_page=1 stable_snap=1")
