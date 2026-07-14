#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "code" / "th_15_main_panel.js"
source = MODULE.read_text(encoding="utf-8")

if source.count("// @version 1.5.3") != 1:
    raise SystemExit("unexpected th_15_main_panel.js version")
source = source.replace("// @version 1.5.3", "// @version 1.5.4", 1)
source = source.replace(
    "// ToolHub - 主按钮面板第八阶段：同侧安全边缘对齐",
    "// ToolHub - 主按钮面板第九阶段：首帧页恢复与内容防透出",
    1,
)

# 保存页在构建阶段即确定，禁止新面板先按第一页初始化。
old_page_math = """  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var pageRows = pageCount * visibleRows;
  var fullGridHeight = pageRows * spec.rowUnit;
"""
new_page_math = """  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var pageRows = pageCount * visibleRows;
  var fullGridHeight = pageRows * spec.rowUnit;
  var initialPage = editMode
    ? Number(this.state.mainPanelEditPageIndex || 0)
    : Number(this.state.mainPanelPageIndex || 0);
  initialPage = this.clampMainPanelPageIndex(initialPage, pageCount);
"""
if source.count(old_page_math) != 1:
    raise SystemExit("page math marker mismatch")
source = source.replace(old_page_math, new_page_math, 1)

# 按钮内容视口使用独立不透明底层，空白页不再透出后方应用内容。
old_scroll = """  var scroll = new android.widget.ScrollView(context);
  scroll.setFillViewport(false);
  scroll.setVerticalScrollBarEnabled(false);
  scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
"""
new_scroll = """  var scroll = new android.widget.ScrollView(context);
  scroll.setFillViewport(false);
  scroll.setVerticalScrollBarEnabled(false);
  scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
  try { scroll.setBackgroundColor(this.withAlpha(panelBase, 1.0)); } catch (eViewportBg) {}
"""
if source.count(old_scroll) != 1:
    raise SystemExit("scroll marker mismatch")
source = source.replace(old_scroll, new_scroll, 1)

old_context = """    editMode: editMode,
    activePage: 0,
    touching: false,
    programmaticScroll: false,
    snapGeneration: 0,
    finishGeneration: 0,
    snapRunnable: null
"""
new_context = """    editMode: editMode,
    activePage: initialPage,
    initialPage: initialPage,
    initialPageReady: initialPage === 0,
    initialPageScheduled: false,
    initialPageListener: null,
    touching: false,
    programmaticScroll: false,
    snapGeneration: 0,
    finishGeneration: 0,
    snapRunnable: null
"""
if source.count(old_context) != 1:
    raise SystemExit("page context marker mismatch")
source = source.replace(old_context, new_context, 1)

old_dot_init = """    this.updateMainPanelPageDots(
      dotViews,
      0,
      dotTargets,
      pageCount
    );
"""
new_dot_init = """    this.updateMainPanelPageDots(
      dotViews,
      initialPage,
      dotTargets,
      pageCount
    );
"""
if source.count(old_dot_init) != 1:
    raise SystemExit("dot init marker mismatch")
source = source.replace(old_dot_init, new_dot_init, 1)

# 第二页及以后在首次真正绘制前恢复；return false 取消错误页首帧。
pre_draw_marker = """  pageContext.dotViews = dotViews;
  pageContext.dotTargets = dotTargets;

  if (pageCount > 1 && android.os.Build.VERSION.SDK_INT >= 23) {
"""
pre_draw_insert = """  pageContext.dotViews = dotViews;
  pageContext.dotTargets = dotTargets;

  if (initialPage > 0) {
    try {
      var initialPageObserver = scroll.getViewTreeObserver();
      var initialPageListener = null;
      initialPageListener = new android.view.ViewTreeObserver.OnPreDrawListener({ onPreDraw: function() {
        try {
          var activeObserver = scroll.getViewTreeObserver();
          if (activeObserver && activeObserver.isAlive()) {
            activeObserver.removeOnPreDrawListener(initialPageListener);
          }
        } catch (eInitialRemove) {}
        pageContext.initialPageListener = null;
        pageContext.initialPageScheduled = false;
        try {
          self.scrollMainPanelToPage(
            pageContext,
            pageContext.initialPage,
            false,
            'initial_pre_draw'
          );
          pageContext.initialPageReady = true;
          scroll.invalidate();
          return false;
        } catch (eInitialRestore) {
          pageContext.initialPageReady = true;
          safeLog(self.L, 'w', 'main panel initial page pre-draw fail: ' + String(eInitialRestore));
        }
        return true;
      }});
      if (initialPageObserver && initialPageObserver.isAlive()) {
        initialPageObserver.addOnPreDrawListener(initialPageListener);
        pageContext.initialPageListener = initialPageListener;
        pageContext.initialPageScheduled = true;
      }
    } catch (eInitialObserver) {
      pageContext.initialPageScheduled = false;
      safeLog(this.L, 'w', 'main panel initial page observer fail: ' + String(eInitialObserver));
    }
  }

  if (pageCount > 1 && android.os.Build.VERSION.SDK_INT >= 23) {
"""
if source.count(pre_draw_marker) != 1:
    raise SystemExit("pre-draw insertion marker mismatch")
source = source.replace(pre_draw_marker, pre_draw_insert, 1)

# 挂载回调只作为预绘制监听注册失败时的回退，不再重复异步覆盖首帧。
restore_pattern = re.compile(
    r"FloatBallAppWM\.prototype\.restoreMainPanelPage = function\(pageContext\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.disposeMainPanelPaging",
    re.S,
)
restore_replacement = """FloatBallAppWM.prototype.restoreMainPanelPage = function(pageContext) {
  try {
    if (!pageContext || !pageContext.scroll) return false;
    if (pageContext.initialPageReady === true || pageContext.initialPageScheduled === true) return true;

    var saved = Number(pageContext.initialPage || 0);
    if (pageContext.editMode) saved = Number(this.state.mainPanelEditPageIndex || saved);
    else saved = Number(this.state.mainPanelPageIndex || saved);
    saved = this.clampMainPanelPageIndex(saved, pageContext.pageCount);
    pageContext.initialPage = saved;

    var self = this;
    pageContext.scroll.post(new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (self.state.panel !== pageContext.panel || !self.state.addedPanel) return;
        self.scrollMainPanelToPage(pageContext, saved, false, 'restore_fallback');
        pageContext.initialPageReady = true;
      } catch (eRestore) {}
    }}));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'restore main panel page fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.disposeMainPanelPaging"""
source, count = restore_pattern.subn(restore_replacement, source, count=1)
if count != 1:
    raise SystemExit("restore function replacement mismatch")

# 面板销毁时移除尚未执行的预绘制监听，避免旧 View 持有回调。
dispose_marker = """    if (panel && pageContext.panel !== panel) return false;
    this.cancelMainPanelPageSnap(pageContext);
    pageContext.finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
"""
dispose_insert = """    if (panel && pageContext.panel !== panel) return false;
    this.cancelMainPanelPageSnap(pageContext);
    try {
      var initialPageListener = pageContext.initialPageListener;
      var initialPageObserver = pageContext.scroll && pageContext.scroll.getViewTreeObserver
        ? pageContext.scroll.getViewTreeObserver()
        : null;
      if (initialPageListener && initialPageObserver && initialPageObserver.isAlive()) {
        initialPageObserver.removeOnPreDrawListener(initialPageListener);
      }
    } catch (eInitialDispose) {}
    pageContext.initialPageListener = null;
    pageContext.initialPageScheduled = false;
    pageContext.finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
"""
if source.count(dispose_marker) != 1:
    raise SystemExit("dispose insertion marker mismatch")
source = source.replace(dispose_marker, dispose_insert, 1)

MODULE.write_text(source, encoding="utf-8")

VERSION_FILES = (
    "scripts/verify_main_panel_paging.py",
    "scripts/verify_main_panel_adaptive_layout.py",
    "scripts/verify_main_panel_visual_tuning.py",
    "scripts/verify_legacy_main_panel_cleanup.py",
    "scripts/verify_main_panel_grid_sizing.py",
    "scripts/verify_main_panel_drag_sort.py",
    "scripts/verify_panel_layout_settings_cleanup.py",
    "scripts/verify_main_panel_close_lifecycle.py",
    "scripts/verify_main_panel_runtime_status.py",
)
for name in VERSION_FILES:
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    if "1.5.3" not in text:
        raise SystemExit("missing old version in %s" % name)
    path.write_text(text.replace("1.5.3", "1.5.4"), encoding="utf-8")

paging_path = ROOT / "scripts" / "verify_main_panel_paging.py"
paging = paging_path.read_text(encoding="utf-8")
paging_marker = '    ("self.restoreMainPanelPage(pageContext)", "attach restore"),\n'
paging_insert = paging_marker + (
    '    ("initialPage = this.clampMainPanelPageIndex(initialPage, pageCount)", "saved page determined during build"),\n'
    '    ("initialPageReady: initialPage === 0", "first-page ready state"),\n'
    '    ("new android.view.ViewTreeObserver.OnPreDrawListener", "pre-draw page restore"),\n'
    '    ("removeOnPreDrawListener(initialPageListener)", "one-shot pre-draw cleanup"),\n'
    '    ("\'initial_pre_draw\'", "pre-draw restore reason"),\n'
    '    ("return false", "wrong first frame cancellation"),\n'
    '    ("restore_fallback", "attach restore fallback"),\n'
    '    ("initialPageObserver.removeOnPreDrawListener(initialPageListener)", "detach pre-draw cleanup"),\n'
)
if paging.count(paging_marker) != 1:
    raise SystemExit("paging verifier marker mismatch")
paging = paging.replace(paging_marker, paging_insert, 1)
paging = paging.replace(
    '("\'restore\'", "page restore"),',
    '("\'restore_fallback\'", "page restore fallback"),',
    1,
)
paging_path.write_text(paging, encoding="utf-8")

visual_path = ROOT / "scripts" / "verify_main_panel_visual_tuning.py"
visual = visual_path.read_text(encoding="utf-8")
visual_marker = '    ("pageContext.dotTargets = dotTargets", "empty single-page target state"),\n'
visual_insert = visual_marker + (
    '    ("scroll.setBackgroundColor(this.withAlpha(panelBase, 1.0))", "opaque button viewport"),\n'
)
if visual.count(visual_marker) != 1:
    raise SystemExit("visual verifier marker mismatch")
visual = visual.replace(visual_marker, visual_insert, 1)
visual_path.write_text(visual, encoding="utf-8")

print("OK patched main panel first-frame restore and opaque viewport")
