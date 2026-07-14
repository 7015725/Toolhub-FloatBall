#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message):
    raise RuntimeError("REMOTE CORE PATCH: " + message)


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    path = ROOT / rel
    path.write_text(text.rstrip() + "\n", encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected 1 anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def apply():
    base = read("code/th_01_base.js")
    base = replace_once(
        base,
        "// @version 1.1.7",
        "// @version 1.1.8",
        "base version",
    )
    base = replace_once(
        base,
        '    PANEL_BG_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.85 },',
        '    PANEL_BG_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.92 },\n'
        '    PANEL_VISUAL_TUNING_VERSION: { type: "int", min: 0, max: 9999, default: 1 },',
        "panel alpha validator",
    )
    base = replace_once(
        base,
        '        PANEL_BG_ALPHA: 0.85,\n'
        '        BALL_PANEL_GAP_DP: 10,',
        '        PANEL_BG_ALPHA: 0.92,\n'
        '        PANEL_VISUAL_TUNING_VERSION: 1,\n'
        '        BALL_PANEL_GAP_DP: 10,',
        "panel alpha defaults",
    )
    base = replace_once(
        base,
        '''        if (txt) {
            try {
                var user = JSON.parse(txt);
                // 合并用户设置（允许新增键值）
                for (var k in user) {
                    merged[k] = user[k];
                }
                loaded = true;
            } catch (e) {}
        }


        // 旧自由坐标或高/低预设一次性迁移为“左/右 + 单一高度百分比”。''',
        '''        if (txt) {
            try {
                var user = JSON.parse(txt);
                // 合并用户设置（允许新增键值）
                for (var k in user) {
                    merged[k] = user[k];
                }
                loaded = true;
            } catch (e) {}
        }

        // 主面板视觉微调迁移：
        // 1. 仅把未迁移且仍等于旧默认值 0.85 的背景透明度提升为 0.92；
        // 2. 用户主动设置的其他透明度保持不变；
        // 3. 迁移标记是内部设置，不展示在 Schema 页面。
        var panelVisualTuningDirty = false;
        try {
            var panelVisualTuningVersion = 0;
            if (user && typeof user.PANEL_VISUAL_TUNING_VERSION !== "undefined") {
                panelVisualTuningVersion = Number(user.PANEL_VISUAL_TUNING_VERSION);
                if (isNaN(panelVisualTuningVersion)) panelVisualTuningVersion = 0;
            }

            if (!loaded) {
                merged.PANEL_VISUAL_TUNING_VERSION = 1;
            } else if (panelVisualTuningVersion < 1) {
                var legacyPanelAlpha = Number(merged.PANEL_BG_ALPHA);
                if (!isNaN(legacyPanelAlpha) &&
                    Math.abs(legacyPanelAlpha - 0.85) < 0.000001) {
                    merged.PANEL_BG_ALPHA = 0.92;
                }
                merged.PANEL_VISUAL_TUNING_VERSION = 1;
                panelVisualTuningDirty = true;
            }
        } catch (ePanelVisualMigration) {}

        // 旧自由坐标或高/低预设一次性迁移为“左/右 + 单一高度百分比”。''',
        "visual migration insertion",
    )
    base = replace_once(
        base,
        '''        if (loaded && positionMigrationDirty) {
            try {
                FileIO.writeTextAtomic(PATH_SETTINGS, JSON.stringify(merged, null, 2));
            } catch (ePositionMigrationWrite) {}
        }

        // # 仅当文件不存在时才写入默认值，避免因读取失败导致用户配置被覆盖
        if (!loaded) {
             try {
                 var f = new java.io.File(PATH_SETTINGS);
                 if (!f.exists()) {
                     // # 原子写：避免 settings.json 写一半导致配置损坏
                     FileIO.writeTextAtomic(PATH_SETTINGS, JSON.stringify(merged, null, 2));
                 }
             } catch(e) {}
        }

        this._settingsCache = ConfigValidator.sanitizeConfig(merged);
        return this._settingsCache;''',
        '''        // 先统一规范化，再决定是否回写。这样旧 SQLite 中的 5dp 内边距等
        // 越界值不会继续在设置页显示为旧值、运行时却按下限生效。
        var sanitizedSettings = ConfigValidator.sanitizeConfig(merged);
        var settingsSanitizedDirty = false;
        try {
            settingsSanitizedDirty =
                JSON.stringify(sanitizedSettings) !== JSON.stringify(merged);
        } catch (eSanitizedCompare) {
            settingsSanitizedDirty = false;
        }

        if (loaded && (
            positionMigrationDirty ||
            panelVisualTuningDirty ||
            settingsSanitizedDirty
        )) {
            try {
                FileIO.writeTextAtomic(
                    PATH_SETTINGS,
                    JSON.stringify(sanitizedSettings, null, 2)
                );
            } catch (eSettingsNormalizeWrite) {}
        }

        // # 仅当文件不存在时才写入默认值，避免因读取失败导致用户配置被覆盖
        if (!loaded) {
             try {
                 var f = new java.io.File(PATH_SETTINGS);
                 if (!f.exists()) {
                     // # 原子写：避免 settings.json 写一半导致配置损坏
                     FileIO.writeTextAtomic(
                         PATH_SETTINGS,
                         JSON.stringify(sanitizedSettings, null, 2)
                     );
                 }
             } catch(e) {}
        }

        this._settingsCache = sanitizedSettings;
        return this._settingsCache;''',
        "normalized settings writeback",
    )
    write("code/th_01_base.js", base)

    main = read("code/th_15_main_panel.js")
    main = replace_once(
        main,
        "// @version 1.4.0",
        "// @version 1.4.1",
        "main version",
    )
    main = replace_once(
        main,
        "// ToolHub - 主按钮面板第五阶段：可配置自适应网格与即时布局参数",
        "// ToolHub - 主按钮面板第五阶段微调：配置规范化、单页底部与背景可读性",
        "main title",
    )

    old_footer = '''  var footer = new android.widget.LinearLayout(context);
  footer.setOrientation(android.widget.LinearLayout.VERTICAL);
  footer.setGravity(android.view.Gravity.CENTER);
  panel.addView(footer, new android.widget.LinearLayout.LayoutParams(-1, spec.footerHeight));
  var dots = new android.widget.LinearLayout(context);
  dots.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  dots.setGravity(android.view.Gravity.CENTER);
  footer.addView(dots, new android.widget.LinearLayout.LayoutParams(-1, this.dp(14)));
  var dotViews = [];
  var dotTargets = [];
  for (var p = 0; p < pageCount; p++) {
    var dotTarget = new android.widget.FrameLayout(context);
    dotTarget.setClickable(pageCount > 1);
    dotTarget.setFocusable(pageCount > 1);
    var targetLp = new android.widget.LinearLayout.LayoutParams(this.dp(24), this.dp(14));
    dots.addView(dotTarget, targetLp);

    var pageDot = new android.view.View(context);
    var pdLp = new android.widget.FrameLayout.LayoutParams(this.dp(5), this.dp(5), android.view.Gravity.CENTER);
    dotTarget.addView(pageDot, pdLp);
    dotViews.push(pageDot);
    dotTargets.push(dotTarget);

    (function(pageIndex, targetView) {
      targetView.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
        self.touchActivity();
        self.guardClick('main_page_dot_' + String(pageIndex), 180, function() {
          self.scrollMainPanelToPage(pageContext, pageIndex, true, 'dot_click');
        });
      }}));
    })(p, dotTarget);
  }
  pageContext.dotViews = dotViews;
  pageContext.dotTargets = dotTargets;
  this.updateMainPanelPageDots(dotViews, 0, dotTargets, pageCount);

  var handle = new android.view.View(context);
  handle.setBackground(this.ui.createRoundDrawable(this.withAlpha(secondaryText, 0.38), this.dp(2)));
  var handleLp = new android.widget.LinearLayout.LayoutParams(this.dp(24), this.dp(3));
  handleLp.topMargin = this.dp(2);
  footer.addView(handle, handleLp);'''

    new_footer = '''  // 单页没有分页语义，不创建绿色圆点；只保留 8dp 底部呼吸空间。
  // 多页才显示可点击圆点。旧灰色“把手”没有拖动行为，移除以免产生错误暗示。
  var footerHeight = pageCount > 1 ? spec.footerHeight : this.dp(8);
  var footer = new android.widget.LinearLayout(context);
  footer.setOrientation(android.widget.LinearLayout.VERTICAL);
  footer.setGravity(android.view.Gravity.CENTER);
  panel.addView(
    footer,
    new android.widget.LinearLayout.LayoutParams(-1, footerHeight)
  );

  var dotViews = [];
  var dotTargets = [];
  if (pageCount > 1) {
    var dots = new android.widget.LinearLayout(context);
    dots.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    dots.setGravity(android.view.Gravity.CENTER);
    footer.addView(
      dots,
      new android.widget.LinearLayout.LayoutParams(-1, this.dp(14))
    );

    for (var p = 0; p < pageCount; p++) {
      var dotTarget = new android.widget.FrameLayout(context);
      dotTarget.setClickable(pageCount > 1);
      dotTarget.setFocusable(pageCount > 1);
      var targetLp = new android.widget.LinearLayout.LayoutParams(
        this.dp(24),
        this.dp(14)
      );
      dots.addView(dotTarget, targetLp);

      var pageDot = new android.view.View(context);
      var pdLp = new android.widget.FrameLayout.LayoutParams(
        this.dp(5),
        this.dp(5),
        android.view.Gravity.CENTER
      );
      dotTarget.addView(pageDot, pdLp);
      dotViews.push(pageDot);
      dotTargets.push(dotTarget);

      (function(pageIndex, targetView) {
        targetView.setOnClickListener(
          new android.view.View.OnClickListener({ onClick: function() {
            self.touchActivity();
            self.guardClick(
              'main_page_dot_' + String(pageIndex),
              180,
              function() {
                self.scrollMainPanelToPage(
                  pageContext,
                  pageIndex,
                  true,
                  'dot_click'
                );
              }
            );
          }})
        );
      })(p, dotTarget);
    }
    this.updateMainPanelPageDots(
      dotViews,
      0,
      dotTargets,
      pageCount
    );
  }
  pageContext.dotViews = dotViews;
  pageContext.dotTargets = dotTargets;'''

    main = replace_once(
        main,
        old_footer,
        new_footer,
        "single-page footer",
    )
    write("code/th_15_main_panel.js", main)

    for rel in (
        "scripts/verify_main_panel_runtime_status.py",
        "scripts/verify_main_panel_drag_sort.py",
        "scripts/verify_main_panel_paging.py",
        "scripts/verify_main_panel_close_lifecycle.py",
    ):
        text = read(rel)
        if "1.4.0" not in text:
            fail("missing 1.4.0 in " + rel)
        write(rel, text.replace("1.4.0", "1.4.1"))

    adaptive = read("scripts/verify_main_panel_adaptive_layout.py")
    adaptive = replace_once(
        adaptive,
        'module_version(BASE, "1.1.7", "th_01_base.js")',
        'module_version(BASE, "1.1.8", "th_01_base.js")',
        "adaptive base version",
    )
    if "1.4.0" not in adaptive:
        fail("missing adaptive main version")
    write(
        "scripts/verify_main_panel_adaptive_layout.py",
        adaptive.replace("1.4.0", "1.4.1"),
    )
