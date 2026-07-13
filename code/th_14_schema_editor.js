// @version 1.0.3
// ToolHub - 设置结构编辑器模块
// 依赖：th_14_panels.js 的设置页主题/基础 UI，th_05_persistence.js 的 ConfigManager。
// 加载顺序：th_14_panels.js 之后，th_15_extra.js 之前。

FloatBallAppWM.prototype.buildSchemaEditorPanelView = function() {
  var self = this;
  if (this.state.editingSchemaIndex === undefined) this.state.editingSchemaIndex = null;

  if (!this.state.keepSchemaEditorState || !this.state.tempSchema) {
    var current = ConfigManager.loadSchema();
    this.state.tempSchema = JSON.parse(JSON.stringify(current));
  }
  this.state.keepSchemaEditorState = false;

  var schema = this.state.tempSchema || [];
  var isEditing = (this.state.editingSchemaIndex !== null && this.state.editingSchemaIndex !== undefined);
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;

  var bgColor = T && T.background ? T.background : (isDark ? C.bgDark : C.bgLight);
  var cardColor = T && T.surface ? T.surface : (isDark ? C.cardDark : C.cardLight);
  var textColor = T && T.onSurface ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var subTextColor = T && T.onSurface2 ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var primaryColor = T && T.primary ? T.primary : C.primary;
  var primaryDeep = T && T.primary ? T.primary : C.primary;
  var primarySoft = T && T.primaryContainer ? T.primaryContainer : self.withAlpha(primaryColor, isDark ? 0.22 : 0.12);
  var strokeColor = T && T.outlineVariant ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var inputBgColor = isDark ? C.inputBgDark : C.inputBgLight;
  var dangerColor = C.danger || C.error || 0xffd32f2f;

  function lpFullWrap() {
    return new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  }

  function addWithMargins(parent, view, l, t, r, b) {
    var lp = lpFullWrap();
    lp.setMargins(self.dp(l || 0), self.dp(t || 0), self.dp(r || 0), self.dp(b || 0));
    parent.addView(view, lp);
  }

  function makeText(txt, sp, color, bold) {
    var tv = new android.widget.TextView(context);
    tv.setText(String(txt || ""));
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, sp || 13);
    tv.setTextColor(color || textColor);
    if (bold) tv.setTypeface(null, android.graphics.Typeface.BOLD);
    return tv;
  }

  function makeChip(txt, color, onClick) {
    var tv = new android.widget.TextView(context);
    tv.setText(String(txt || ""));
    tv.setTextColor(color || primaryDeep);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tv.setGravity(android.view.Gravity.CENTER);
    tv.setTypeface(null, android.graphics.Typeface.BOLD);
    try { tv.setMinHeight(self.dp(48)); tv.setMinimumHeight(self.dp(48)); } catch(eMinH) {}
    try { tv.setMinWidth(self.dp(48)); tv.setMinimumWidth(self.dp(48)); } catch(eMinW) {}
    try { tv.setIncludeFontPadding(false); } catch(eFontPad) {}
    try { tv.setContentDescription(String(txt || "")); } catch(eDesc) {}
    tv.setPadding(self.dp(10), 0, self.dp(10), 0);
    try { tv.setBackground(self.ui.createStrokeDrawable(self.withAlpha(color || primaryColor, isDark ? 0.16 : 0.08), self.withAlpha(color || primaryColor, isDark ? 0.45 : 0.28), self.dp(1), self.dp(16))); } catch(eBg) {}
    if (onClick) {
      tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
        try { self.touchActivity(); } catch(eTouch) {}
        try { onClick(v); } catch(eClick) { safeLog(null, 'e', "schema chip click err=" + String(eClick)); }
      }}));
    }
    return tv;
  }

  function showSchemaNotice(msg, kind) {
    try {
      self.state.schemaEditorNoticeMsg = String(msg || "");
      self.state.schemaEditorNoticeKind = String(kind || "info");
      self.state.schemaEditorNoticeAt = java.lang.System.currentTimeMillis();
      safeLog(self.L, kind === "error" ? "e" : "i", "schema notice: " + String(msg || ""));
    } catch(eNotice) {}
  }

  function refreshPanel() {
    self.state.keepSchemaEditorState = true;
    self.showPanelAvoidBall("schema_editor");
  }

  function clearDraft() {
    self.state.schemaEditingDraft = null;
    self.state.schemaEditingDraftIndex = null;
  }

  function normalizeItem(item) {
    var it = item || {};
    it.type = String(it.type || "bool");
    if (it.type !== "section") {
      it.key = String(it.key || "").trim();
    }
    it.name = String(it.name || it.key || "").trim();
    if (it.type === "section") {
      delete it.key; delete it.min; delete it.max; delete it.step; delete it.action;
    } else if (it.type === "bool" || it.type === "text") {
      delete it.min; delete it.max; delete it.step; delete it.action;
    } else if (it.type === "int" || it.type === "float") {
      delete it.action;
      if (it.min === "" || isNaN(Number(it.min))) delete it.min; else it.min = Number(it.min);
      if (it.max === "" || isNaN(Number(it.max))) delete it.max; else it.max = Number(it.max);
      if (it.step === "" || isNaN(Number(it.step))) delete it.step; else it.step = Number(it.step);
    } else if (it.type === "action") {
      delete it.min; delete it.max; delete it.step;
      it.action = String(it.action || "").trim();
    }
    return it;
  }

  function validateItem(item) {
    if (!item.name) return "请填写显示名字";
    if (item.type !== "section" && !item.key) return "请填写配置键";
    if (item.type === "action" && !item.action) return "请填写动作 ID";
    return "";
  }

  var panel = this.ui.createStyledPanel(this, 16);
  try { panel.setBackground(this.ui.createRoundDrawable(bgColor, this.dp(20))); } catch(ePanelBg) {}

  if (!isEditing) {
    var topCard = new android.widget.LinearLayout(context);
    topCard.setOrientation(android.widget.LinearLayout.VERTICAL);
    topCard.setPadding(self.dp(14), self.dp(12), self.dp(14), self.dp(12));
    try { topCard.setBackground(self.ui.createStrokeDrawable(cardColor, self.withAlpha(strokeColor, isDark ? 0.32 : 0.42), self.dp(1), self.dp(20))); } catch(eTopBg) {}

    var titleRow = new android.widget.LinearLayout(context);
    titleRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    titleRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var titleBox = new android.widget.LinearLayout(context);
    titleBox.setOrientation(android.widget.LinearLayout.VERTICAL);
    titleBox.addView(makeText("设置结构", 17, textColor, true));
    titleBox.addView(makeText("这里会改变设置页结构，建议只在需要整理入口时使用", 12, subTextColor, false));
    titleRow.addView(titleBox, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    titleRow.addView(makeChip("添加", primaryDeep, function() {
      self.state.editingSchemaIndex = -1;
      clearDraft();
      if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("schema_editor");
      else refreshPanel();
    }));
    topCard.addView(titleRow);

    var stat = makeText("共 " + schema.length + " 个结构项 · 保存后生效", 12, subTextColor, false);
    stat.setPadding(0, self.dp(8), 0, 0);
    topCard.addView(stat);
    addWithMargins(panel, topCard, 0, 0, 0, 8);

    function showListInlineNotice(msg, kind) {
      try {
        var k = String(kind || "info");
        var color = k === "error" ? dangerColor : (k === "ok" ? (C.success || primaryDeep) : primaryDeep);
        var tv = makeText(String(msg || ""), 12, color, false);
        tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
        try { tv.setBackground(self.ui.createStrokeDrawable(self.withAlpha(color, isDark ? 0.18 : 0.08), self.withAlpha(color, isDark ? 0.42 : 0.25), self.dp(1), self.dp(14))); } catch(eBg) {}
        addWithMargins(panel, tv, 0, 0, 0, 8);
      } catch(eListNotice) {}
    }
    try {
      var noticeMsg = String(self.state.schemaEditorNoticeMsg || "");
      if (noticeMsg) {
        var noticeAt = Number(self.state.schemaEditorNoticeAt || 0);
        var nowNotice = java.lang.System.currentTimeMillis();
        if (!noticeAt || nowNotice - noticeAt <= 8000) showListInlineNotice(noticeMsg, self.state.schemaEditorNoticeKind || "info");
        self.state.schemaEditorNoticeMsg = "";
        self.state.schemaEditorNoticeKind = "";
        self.state.schemaEditorNoticeAt = 0;
      }
    } catch(ePendingSchemaNotice) {}

    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false); scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch(eScroll) {}
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(2), 0, self.dp(10));

    if (!schema.length) {
      var empty = makeText("结构列表为空，可点上方“添加”创建新项。", 13, subTextColor, false);
      empty.setGravity(android.view.Gravity.CENTER);
      empty.setPadding(self.dp(12), self.dp(24), self.dp(12), self.dp(24));
      list.addView(empty, lpFullWrap());
    }

    for (var i = 0; i < schema.length; i++) {
      (function(idx) {
        var item = schema[idx] || {};
        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.VERTICAL);
        card.setPadding(self.dp(13), self.dp(11), self.dp(13), self.dp(10));
        try { card.setBackground(self.ui.createStrokeDrawable(cardColor, self.withAlpha(strokeColor, isDark ? 0.28 : 0.36), self.dp(1), self.dp(18))); card.setElevation(self.dp(1)); } catch(eCardBg) {}

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var badge = makeText(item.type === "section" ? "分组" : String(item.type || "项"), 11, primaryDeep, true);
        badge.setGravity(android.view.Gravity.CENTER);
        badge.setPadding(self.dp(8), self.dp(3), self.dp(8), self.dp(3));
        try { badge.setBackground(self.ui.createStrokeDrawable(primarySoft, self.withAlpha(primaryDeep, 0.25), self.dp(1), self.dp(12))); } catch(eBadge) {}
        row.addView(badge);

        var info = new android.widget.LinearLayout(context);
        info.setOrientation(android.widget.LinearLayout.VERTICAL);
        info.setPadding(self.dp(10), 0, 0, 0);
        var nameTv = makeText(String(item.name || item.key || "未命名结构项"), 14, textColor, true);
        info.addView(nameTv);
        var sub = item.type === "section" ? "分组标题" : ("配置键：" + String(item.key || "未填写"));
        info.addView(makeText(sub, 11, subTextColor, false));
        row.addView(info, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        card.addView(row);

        var actions = new android.widget.LinearLayout(context);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        actions.setGravity(android.view.Gravity.RIGHT | android.view.Gravity.CENTER_VERTICAL);
        actions.setPadding(0, self.dp(9), 0, 0);
        if (idx > 0) actions.addView(makeChip("上搬", subTextColor, function() { var tmp = schema[idx]; schema[idx] = schema[idx - 1]; schema[idx - 1] = tmp; refreshPanel(); }));
        if (idx < schema.length - 1) actions.addView(makeChip("下搬", subTextColor, function() { var tmp = schema[idx]; schema[idx] = schema[idx + 1]; schema[idx + 1] = tmp; refreshPanel(); }));
        actions.addView(makeChip("编辑", primaryDeep, function() {
          self.state.editingSchemaIndex = idx;
          clearDraft();
          if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("schema_editor");
          else refreshPanel();
        }));
        actions.addView(makeChip("移除", dangerColor, function() { schema.splice(idx, 1); refreshPanel(); }));
        card.addView(actions);
        addWithMargins(list, card, 2, 4, 2, 6);
      })(i);
    }

    scroll.addView(list);
    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

    var bottom = new android.widget.LinearLayout(context);
    bottom.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bottom.setGravity(android.view.Gravity.CENTER_VERTICAL);
    bottom.setPadding(0, self.dp(8), 0, 0);
    var resetBtn = makeChip("恢复默认结构", dangerColor, function() {
      ConfigManager.resetSchema();
      self.state.tempSchema = null;
      clearDraft();
      showSchemaNotice("已恢复默认结构", "ok");
      refreshPanel();
    });
    bottom.addView(resetBtn, new android.widget.LinearLayout.LayoutParams(0, self.dp(48), 1));
    var saveBtn = self.ui.createSolidButton(self, "保存结构", primaryColor, T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE, function() {
      ConfigManager.saveSchema(schema);
      self.state.tempSchema = null;
      clearDraft();
      showSchemaNotice("结构已保存", "ok");
      if (self.state.toolAppActive && self.popToolAppPage) {
        self.state.editingSchemaIndex = null;
        self.popToolAppPage("schema_save_all");
      } else {
        self.hideAllPanels();
        self.showPanelAvoidBall("settings");
      }
    });
    var saveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48), 1);
    saveLp.setMargins(self.dp(8), 0, 0, 0);
    bottom.addView(saveBtn, saveLp);
    panel.addView(bottom, lpFullWrap());
    return panel;
  }

  var editIdx = this.state.editingSchemaIndex;
  if (this.state.schemaEditingDraftIndex !== editIdx || !this.state.schemaEditingDraft) {
    var baseItem = (editIdx === -1) ? { type: "bool", name: "", key: "" } : (schema[editIdx] ? JSON.parse(JSON.stringify(schema[editIdx])) : { type: "bool", name: "", key: "" });
    this.state.schemaEditingDraft = baseItem;
    this.state.schemaEditingDraftIndex = editIdx;
  }
  var editItem = this.state.schemaEditingDraft;
  if (!editItem.type) editItem.type = "bool";

  var formCard = new android.widget.LinearLayout(context);
  formCard.setOrientation(android.widget.LinearLayout.VERTICAL);
  formCard.setPadding(self.dp(14), self.dp(12), self.dp(14), self.dp(12));
  try { formCard.setBackground(self.ui.createStrokeDrawable(cardColor, self.withAlpha(strokeColor, isDark ? 0.32 : 0.42), self.dp(1), self.dp(20))); } catch(eFormBg) {}

  var editTitle = makeText(editIdx === -1 ? "添加结构项" : "整理结构项", 17, textColor, true);
  formCard.addView(editTitle);
  var editHint = makeText("修改后先“暂存”，回到列表再统一保存结构。", 12, subTextColor, false);
  editHint.setPadding(0, self.dp(4), 0, self.dp(10));
  formCard.addView(editHint);

  var schemaInlineNotice = makeText("", 12, primaryDeep, false);
  schemaInlineNotice.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
  schemaInlineNotice.setVisibility(android.view.View.GONE);
  function updateSchemaInlineNotice(msg, kind) {
    try {
      var color = String(kind || "info") === "error" ? dangerColor : primaryDeep;
      schemaInlineNotice.setText(String(msg || ""));
      schemaInlineNotice.setTextColor(color);
      schemaInlineNotice.setBackground(self.ui.createStrokeDrawable(self.withAlpha(color, isDark ? 0.18 : 0.08), self.withAlpha(color, isDark ? 0.42 : 0.25), self.dp(1), self.dp(14)));
      schemaInlineNotice.setVisibility(android.view.View.VISIBLE);
    } catch(eNotice) {}
  }
  formCard.addView(schemaInlineNotice, lpFullWrap());

  var scroll2 = new android.widget.ScrollView(context);
  try { scroll2.setVerticalScrollBarEnabled(false); scroll2.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch(eScroll2) {}
  var form = new android.widget.LinearLayout(context);
  form.setOrientation(android.widget.LinearLayout.VERTICAL);
  scroll2.addView(form);

  function createInput(label, key, inputType, hint) {
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setPadding(0, 0, 0, self.dp(10));
    box.addView(makeText(label, 12, subTextColor, false));
    var et = new android.widget.EditText(context);
    et.setText(String(editItem[key] !== undefined && editItem[key] !== null ? editItem[key] : ""));
    et.setTextColor(textColor);
    et.setHint(String(hint || ""));
    et.setHintTextColor(self.withAlpha(subTextColor, 0.55));
    et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    et.setSingleLine(true);
    et.setBackground(self.ui.createStrokeDrawable(inputBgColor, self.withAlpha(strokeColor, 0.55), self.dp(1), self.dp(12)));
    et.setPadding(self.dp(12), self.dp(7), self.dp(12), self.dp(7));
    if (inputType) et.setInputType(inputType);
    box.addView(et, lpFullWrap());
    form.addView(box, lpFullWrap());
    return { input: et, getValue: function() { return String(et.getText()); } };
  }

  var inputName = null;
  var inputKey = null;
  var inputMin = null;
  var inputMax = null;
  var inputStep = null;
  var inputAction = null;

  function syncDraftFromInputs() {
    try {
      if (inputName) editItem.name = inputName.getValue();
      if (inputKey) editItem.key = inputKey.getValue();
      if (inputMin) editItem.min = inputMin.getValue();
      if (inputMax) editItem.max = inputMax.getValue();
      if (inputStep) editItem.step = inputStep.getValue();
      if (inputAction) editItem.action = inputAction.getValue();
      self.state.schemaEditingDraft = editItem;
      self.state.schemaEditingDraftIndex = editIdx;
    } catch(eSync) { safeLog(null, 'e', "schema draft sync err=" + String(eSync)); }
  }

  var typeRow = new android.widget.LinearLayout(context);
  typeRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  typeRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
  typeRow.setPadding(0, 0, 0, self.dp(10));
  typeRow.addView(makeText("项目类型", 12, subTextColor, false), new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
  var types = ["section", "bool", "int", "float", "text", "action"];
  var typeNames = { section: "分组标题", bool: "开关", int: "整数", float: "小数", text: "文本", action: "动作入口" };
  typeRow.addView(makeChip(typeNames[String(editItem.type)] || String(editItem.type), primaryDeep, function() {
    syncDraftFromInputs();
    var currIdx = types.indexOf(String(editItem.type || "bool"));
    if (currIdx < 0) currIdx = 1;
    editItem.type = types[(currIdx + 1) % types.length];
    self.state.schemaEditingDraft = editItem;
    self.state.schemaEditingDraftIndex = editIdx;
    refreshPanel();
  }));
  form.addView(typeRow, lpFullWrap());

  inputName = createInput("显示名字", "name", android.text.InputType.TYPE_CLASS_TEXT, "例如：悬浮球");
  if (editItem.type !== "section") {
    inputKey = createInput("配置键", "key", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS, "例如：BALL_SIZE_DP");
  }
  if (editItem.type === "int" || editItem.type === "float") {
    inputMin = createInput("最小值", "min", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED, "可留空");
    inputMax = createInput("最大值", "max", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED, "可留空");
    inputStep = createInput("步进", "step", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL, "可留空");
  }
  if (editItem.type === "action") {
    inputAction = createInput("动作 ID", "action", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS, "例如：open_btn_mgr");
  }

  formCard.addView(scroll2, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
  panel.addView(formCard, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

  var editBottom = new android.widget.LinearLayout(context);
  editBottom.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  editBottom.setGravity(android.view.Gravity.CENTER_VERTICAL);
  editBottom.setPadding(0, self.dp(8), 0, 0);
  editBottom.addView(makeChip("不改了", subTextColor, function() {
    clearDraft();
    self.state.editingSchemaIndex = null;
    if (self.state.toolAppActive && self.popToolAppPage) {
      self.state.keepSchemaEditorState = true;
      self.popToolAppPage("schema_edit_back");
    } else refreshPanel();
  }), new android.widget.LinearLayout.LayoutParams(0, self.dp(48), 1));

  var saveDraftBtn = self.ui.createSolidButton(self, "暂存结构项", primaryColor, T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE, function() {
    try {
      syncDraftFromInputs();
      normalizeItem(editItem);
      var err = validateItem(editItem);
      if (err) {
        updateSchemaInlineNotice(err, "error");
        try { scroll2.fullScroll(android.view.View.FOCUS_UP); } catch(eFocusUp) {}
        return;
      }
      if (editIdx === -1) schema.push(JSON.parse(JSON.stringify(editItem)));
      else schema[editIdx] = JSON.parse(JSON.stringify(editItem));
      clearDraft();
      self.state.editingSchemaIndex = null;
      if (self.state.toolAppActive && self.popToolAppPage) {
        self.state.keepSchemaEditorState = true;
        self.popToolAppPage("schema_edit_save");
      } else refreshPanel();
    } catch(eSave) {
      updateSchemaInlineNotice("暂存失败：" + String(eSave), "error");
      try { scroll2.fullScroll(android.view.View.FOCUS_UP); } catch(eFocusUp2) {}
    }
  });
  var saveDraftLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48), 1);
  saveDraftLp.setMargins(self.dp(8), 0, 0, 0);
  editBottom.addView(saveDraftBtn, saveDraftLp);
  panel.addView(editBottom, lpFullWrap());

  return panel;
};
