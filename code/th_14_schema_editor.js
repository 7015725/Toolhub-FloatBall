// ToolHub - Schema 编辑器模块
// 依赖：th_14_panels.js 中的设置页基础 UI / showPanelAvoidBall，th_05_persistence.js 的 ConfigManager。
// 注意：加载顺序必须位于 th_14_panels.js 之后、th_15_extra.js 之前。

// =======================【Schema 编辑面板】======================
FloatBallAppWM.prototype.buildSchemaEditorPanelView = function() {
  var self = this;
  if (this.state.editingSchemaIndex === undefined) {
    this.state.editingSchemaIndex = null;
  }

  if (!this.state.keepSchemaEditorState || !this.state.tempSchema) {
      var current = ConfigManager.loadSchema();
      this.state.tempSchema = JSON.parse(JSON.stringify(current));
  }
  this.state.keepSchemaEditorState = false;

  var schema = this.state.tempSchema;
  var isEditing = (this.state.editingSchemaIndex !== null);
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;

  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var subTextColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;
  var inputBgColor = isDark ? C.inputBgDark : C.inputBgLight;

  var panel = this.ui.createStyledPanel(this, 16);

  // --- Header ---
  var header = this.ui.createStyledHeader(this, 12);

  // Title removed to avoid redundancy with Wrapper Title
  // var titleTv = new android.widget.TextView(context);
  // titleTv.setText(isEditing ? (this.state.editingSchemaIndex === -1 ? "新增项" : "编辑项") : "设置布局管理");
  // ...
  // header.addView(titleTv);

  // Placeholder to push buttons to right
  header.addView(this.ui.createSpacer(this));

  function refreshPanel() {
    self.state.keepSchemaEditorState = true;
    self.showPanelAvoidBall("schema_editor");
  }

  if (!isEditing) {
    // List Mode
    header.addView(self.ui.createFlatButton(self, "重置", C.danger, function() {
        ConfigManager.resetSchema();
        self.state.tempSchema = null;
        self.toast("已重置为默认布局");
        refreshPanel();
    }));

    header.addView(self.ui.createFlatButton(self, "新增", C.primary, function() {
        self.state.editingSchemaIndex = -1;
        if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("schema_editor");
        else refreshPanel();
    }));

    var btnClose = self.ui.createFlatButton(self, "✕", C.textSecLight, function() {
        self.state.tempSchema = null;
        self.hideAllPanels();
    });
    header.addView(btnClose);
    panel.addView(header);
    panel.setTag(header); // 暴露 Header

    // Save Button
    var btnSaveAll = self.ui.createSolidButton(self, "保存生效", C.primary, android.graphics.Color.WHITE, function() {
         ConfigManager.saveSchema(schema);
         self.state.tempSchema = null;
         self.toast("布局已保存");
         if (self.state.toolAppActive && self.popToolAppPage) {
             self.state.editingSchemaIndex = null;
             self.popToolAppPage("schema_save_all");
         } else {
             self.hideAllPanels();
             self.showPanelAvoidBall("settings");
         }
    });
    var saveLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    saveLp.setMargins(0, 0, 0, self.dp(8));
    btnSaveAll.setLayoutParams(saveLp);
    panel.addView(btnSaveAll);

    // List
    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(4), 0, self.dp(4));

    for (var i = 0; i < schema.length; i++) {
      (function(idx) {
        var item = schema[idx];

        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        card.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(8)));
        try { card.setElevation(self.dp(2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

        var cardLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.setMargins(self.dp(2), self.dp(4), self.dp(2), self.dp(4));
        card.setLayoutParams(cardLp);
        card.setPadding(self.dp(12), self.dp(12), self.dp(8), self.dp(12));

        // Info
        var infoBox = new android.widget.LinearLayout(context);
        infoBox.setOrientation(android.widget.LinearLayout.VERTICAL);
        var infoLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        infoLp.weight = 1;
        infoBox.setLayoutParams(infoLp);

        var nameTv = new android.widget.TextView(context);
        nameTv.setText(String(item.name || item.key || "未命名"));
        nameTv.setTextColor(textColor);
        nameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        if (item.type === "section") nameTv.setTypeface(null, android.graphics.Typeface.BOLD);
        infoBox.addView(nameTv);

        var typeTv = new android.widget.TextView(context);
        var typeTxt = item.type;
        if (item.type !== "section") typeTxt += " (" + (item.key || "?") + ")";
        typeTv.setText(String(typeTxt));
        typeTv.setTextColor(subTextColor);
        typeTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        infoBox.addView(typeTv);

        card.addView(infoBox);

        // Actions
        var actions = new android.widget.LinearLayout(context);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);

        if (idx > 0) {
            actions.addView(self.ui.createFlatButton(self, "↑", subTextColor, function() {
                var temp = schema[idx];
                schema[idx] = schema[idx - 1];
                schema[idx - 1] = temp;
                refreshPanel();
            }));
        }
        if (idx < schema.length - 1) {
             actions.addView(self.ui.createFlatButton(self, "↓", subTextColor, function() {
                var temp = schema[idx];
                schema[idx] = schema[idx + 1];
                schema[idx + 1] = temp;
                refreshPanel();
            }));
        }
        actions.addView(self.ui.createFlatButton(self, "✎", C.primary, function() {
            self.state.editingSchemaIndex = idx;
            if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("schema_editor");
            else refreshPanel();
        }));
        actions.addView(self.ui.createFlatButton(self, "✕", C.danger, function() {
            schema.splice(idx, 1);
            refreshPanel();
        }));

        card.addView(actions);
        list.addView(card);
      })(i);
    }
    scroll.addView(list);
    panel.addView(scroll);

  } else {
    // Edit Mode
    var editIdx = this.state.editingSchemaIndex;
    var editItem = (editIdx === -1) ? { type: "bool", name: "", key: "" } : JSON.parse(JSON.stringify(schema[editIdx]));

    var btnBack = self.ui.createFlatButton(self, "返回", C.textSecLight, function() {
        self.state.editingSchemaIndex = null;
        if (self.state.toolAppActive && self.popToolAppPage) {
            self.state.keepSchemaEditorState = true;
            self.popToolAppPage("schema_edit_back");
        } else refreshPanel();
    });
    header.addView(btnBack);
    panel.addView(header);
    panel.setTag(header); // 暴露 Header

    var schemaInlineNotice = new android.widget.TextView(context);
    schemaInlineNotice.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    schemaInlineNotice.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
    schemaInlineNotice.setGravity(android.view.Gravity.CENTER_VERTICAL);
    schemaInlineNotice.setVisibility(android.view.View.GONE);
    function updateSchemaInlineNotice(msg, kind) {
        try {
            var k = String(kind || "info");
            var color = (k === "error") ? C.error : C.primary;
            var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(C.primary, isDark ? 0.18 : 0.10);
            var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(C.primary, isDark ? 0.34 : 0.22);
            schemaInlineNotice.setText(String(msg || ""));
            schemaInlineNotice.setTextColor(color);
            schemaInlineNotice.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
            schemaInlineNotice.setVisibility(android.view.View.VISIBLE);
        } catch(eSIN) { safeLog(null, 'e', "catch " + String(eSIN)); }
    }

    var scroll = new android.widget.ScrollView(context);
    var form = new android.widget.LinearLayout(context);
    form.setOrientation(android.widget.LinearLayout.VERTICAL);
    form.addView(schemaInlineNotice, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));
    scroll.addView(form);

    function createInput(label, key, inputType, hint) {
        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(0, 0, 0, self.dp(12));

        var lb = new android.widget.TextView(context);
        lb.setText(label);
        lb.setTextColor(subTextColor);
        lb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        box.addView(lb);

        var et = new android.widget.EditText(context);
        et.setText(String(editItem[key] !== undefined ? editItem[key] : ""));
        et.setTextColor(textColor);
        et.setHint(hint || "");
        et.setHintTextColor(self.withAlpha(subTextColor, 0.5));
        et.setBackground(self.ui.createRoundDrawable(inputBgColor, self.dp(8)));
        et.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
        if (inputType) et.setInputType(inputType);
        box.addView(et);

        form.addView(box);
        return {
            getValue: function() { return String(et.getText()); },
            getView: function() { return box; }
        };
    }

    // Type Selector
    var typeBox = new android.widget.LinearLayout(context);
    typeBox.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    typeBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
    typeBox.setPadding(0, 0, 0, self.dp(12));
    var typeLb = new android.widget.TextView(context);
    typeLb.setText("类型: ");
    typeLb.setTextColor(textColor);
    typeBox.addView(typeLb);

    var types = ["section", "bool", "int", "float", "text", "action"];
    var typeBtn = self.ui.createSolidButton(self, editItem.type, C.accent, android.graphics.Color.WHITE, function(v) {
        var currIdx = types.indexOf(editItem.type);
        var nextIdx = (currIdx + 1) % types.length;
        editItem.type = types[nextIdx];
        refreshPanel();
    });
    typeBox.addView(typeBtn);
    form.addView(typeBox);

    var inputName = createInput("显示名称 (Name)", "name", android.text.InputType.TYPE_CLASS_TEXT, "例如：悬浮球大小");

    var inputKey = null;
    var inputMin = null;
    var inputMax = null;
    var inputStep = null;
    var inputAction = null;

    if (editItem.type !== "section") {
        inputKey = createInput("配置键名 (Key)", "key", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS, "例如：BALL_SIZE_DP");
    }

    if (editItem.type === "int" || editItem.type === "float") {
        inputMin = createInput("最小值 (Min)", "min", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
        inputMax = createInput("最大值 (Max)", "max", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
        inputStep = createInput("步进 (Step)", "step", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
    }

    if (editItem.type === "action") {
        inputAction = createInput("动作ID (Action)", "action", android.text.InputType.TYPE_CLASS_TEXT, "例如：open_btn_mgr");
    }

    panel.addView(scroll);

    // Save Button
    var btnSave = self.ui.createSolidButton(self, "暂存", C.primary, android.graphics.Color.WHITE, function() {
        try {
            editItem.name = inputName.getValue();
            if (inputKey) editItem.key = inputKey.getValue();

            if (inputMin) editItem.min = Number(inputMin.getValue());
            if (inputMax) editItem.max = Number(inputMax.getValue());
            if (inputStep) editItem.step = Number(inputStep.getValue());
            if (inputAction) editItem.action = inputAction.getValue();

            // Clean up properties based on type
            if (editItem.type === "section") { delete editItem.key; delete editItem.min; delete editItem.max; delete editItem.step; delete editItem.action; }
            else if (editItem.type === "bool") { delete editItem.min; delete editItem.max; delete editItem.step; delete editItem.action; }
            else if (editItem.type === "int" || editItem.type === "float") { delete editItem.action; }
            else if (editItem.type === "action") { delete editItem.min; delete editItem.max; delete editItem.step; }

            if (editIdx === -1) {
                schema.push(editItem);
            } else {
                schema[editIdx] = editItem;
            }

            self.state.editingSchemaIndex = null;
            if (self.state.toolAppActive && self.popToolAppPage) {
                self.state.keepSchemaEditorState = true;
                self.popToolAppPage("schema_edit_save");
            } else refreshPanel();
        } catch (e) {
            updateSchemaInlineNotice("暂存失败: " + e, "error");
            try { scroll.post(new java.lang.Runnable({ run: function() { try { scroll.fullScroll(android.view.View.FOCUS_UP); } catch(eScrollSchema) {} } })); } catch(ePostSchema) {}
        }
    });

    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.VERTICAL);
    bottomBar.setPadding(0, self.dp(8), 0, 0);
    bottomBar.addView(btnSave);
    panel.addView(bottomBar);
  }

  return panel;
};
