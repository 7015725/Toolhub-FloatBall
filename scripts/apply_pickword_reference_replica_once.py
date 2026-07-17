#!/usr/bin/env python3
# 一次性补丁：按参考图高保真复刻拾字主窗口 UI，仅改 th_20_pickword.js。

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
RECORD = ROOT / "updates" / "records" / "optimize-pickword-reference-replica.json"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_all_required(text, old, new, minimum, label):
    count = text.count(old)
    if count < minimum:
        raise SystemExit("%s: expected at least %d matches, found %d" % (label, minimum, count))
    return text.replace(old, new)


def sub_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("%s: expected one regex match, found %d" % (label, count))
    return out


text = TARGET.read_text(encoding="utf-8")
text = replace_once(text, "// @version 1.0.5", "// @version 1.0.6", "module version")
text = replace_once(
    text,
    "    var previewBoxView = null;",
    "    var previewBoxView = null;\n"
    "    var copyAllActionBtn = null;\n"
    "    var cleanupActionBtn = null;\n"
    "    var shareActionBtn = null;\n"
    "    var fontSizeSelectorView = null;\n"
    "    var titleAccentView = null;\n"
    "    var resultDividerView = null;\n"
    "    var closeActionView = null;\n"
    "    var textAreaMinHeight = 0;",
    "replica refs",
)

helper_pattern = r'''    function applyVisiblePickwordTheme20\(\) \{.*?\n    \}\n\n    // 钉屏与拾字根窗口均静态显示，避免透明 Overlay 属性动画。'''
helper_replacement = r'''    function alphaColor20(colorValue, alphaValue) {
        var c = toColorInt(colorValue);
        var a = Math.max(0, Math.min(255, Math.round(Number(alphaValue || 0))));
        return ((a << 24) | (c & 0x00FFFFFF));
    }

    function replicaAccent20() {
        return isDark ? Color.parseColor("#70C9C6") : Color.parseColor("#3DA6A4");
    }

    function replicaAccentEnd20() {
        return isDark ? Color.parseColor("#4BAEAB") : Color.parseColor("#79C6C3");
    }

    function replicaAccentPressed20() {
        return isDark ? Color.parseColor("#3C918F") : Color.parseColor("#2E8E8C");
    }

    function replicaOutline20() {
        return alphaColor20(Colors.outline, isDark ? 150 : 92);
    }

    function replicaSoftSurface20() {
        return isDark ? Color.parseColor("#202124") : Color.parseColor("#FFFFFF");
    }

    function createReplicaGradient20(startColor, endColor, radiusDp) {
        try {
            var gd = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, jintArray([startColor, endColor]));
            gd.setCornerRadius(dp(radiusDp));
            return gd;
        } catch (eGradient) {
            return createRoundRectDrawable(startColor, radiusDp);
        }
    }

    function createReplicaPrimaryBackground20(radiusDp) {
        try {
            var states = new android.graphics.drawable.StateListDrawable();
            states.addState(jintArray([android.R.attr.state_pressed]), createRoundRectDrawable(replicaAccentPressed20(), radiusDp));
            states.addState(jintArray([]), createReplicaGradient20(replicaAccent20(), replicaAccentEnd20(), radiusDp));
            return states;
        } catch (eState) {
            return createPressableDrawable(replicaAccent20(), replicaAccentPressed20(), radiusDp);
        }
    }

    function resolveReplicaIconColor20(styleKind) {
        if (styleKind === "primary") return Colors.onPrimary;
        if (styleKind === "pin") return replicaAccent20();
        return Colors.text;
    }

    function createReplicaIcon20(kind, styleKind, sizeDp) {
        var paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        var rect = new RectF();
        var iconView = new JavaAdapter(View, {
            onDraw: function(canvas) {
                try {
                    var w = this.getWidth();
                    var h = this.getHeight();
                    var s = Math.min(w, h) * 0.76;
                    var cx = w / 2;
                    var cy = h / 2;
                    var left = cx - s / 2;
                    var top = cy - s / 2;
                    var right = cx + s / 2;
                    var bottom = cy + s / 2;
                    var stroke = Math.max(dp(1.45), s * 0.075);
                    paint.setStrokeWidth(stroke);
                    paint.setStrokeCap(Paint.Cap.ROUND);
                    paint.setStrokeJoin(Paint.Join.ROUND);
                    paint.setStyle(Paint.Style.STROKE);
                    setPaintColor(paint, resolveReplicaIconColor20(styleKind), 255);

                    if (kind === "copy") {
                        rect.set(left + s * 0.08, top + s * 0.02, right - s * 0.20, bottom - s * 0.18);
                        canvas.drawRoundRect(rect, s * 0.10, s * 0.10, paint);
                        rect.set(left + s * 0.22, top + s * 0.18, right - s * 0.04, bottom - s * 0.02);
                        canvas.drawRoundRect(rect, s * 0.10, s * 0.10, paint);
                    } else if (kind === "cleanup") {
                        canvas.drawLine(left + s * 0.04, top + s * 0.20, left + s * 0.58, top + s * 0.20, paint);
                        canvas.drawLine(left + s * 0.04, cy, left + s * 0.50, cy, paint);
                        canvas.drawLine(left + s * 0.04, bottom - s * 0.20, left + s * 0.58, bottom - s * 0.20, paint);
                        var pClean = new android.graphics.Path();
                        pClean.moveTo(left + s * 0.58, top + s * 0.34);
                        pClean.lineTo(right - s * 0.05, top + s * 0.34);
                        pClean.quadTo(right - s * 0.01, top + s * 0.34, right - s * 0.01, top + s * 0.48);
                        pClean.lineTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.moveTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.lineTo(right - s * 0.18, bottom - s * 0.34);
                        pClean.moveTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.lineTo(right - s * 0.18, bottom - s * 0.02);
                        canvas.drawPath(pClean, paint);
                    } else if (kind === "share") {
                        var r = s * 0.10;
                        canvas.drawLine(left + s * 0.25, cy, right - s * 0.24, top + s * 0.24, paint);
                        canvas.drawLine(left + s * 0.25, cy, right - s * 0.24, bottom - s * 0.24, paint);
                        paint.setStyle(Paint.Style.FILL);
                        canvas.drawCircle(left + s * 0.18, cy, r, paint);
                        canvas.drawCircle(right - s * 0.16, top + s * 0.18, r, paint);
                        canvas.drawCircle(right - s * 0.16, bottom - s * 0.18, r, paint);
                    } else if (kind === "pin") {
                        paint.setStyle(Paint.Style.FILL);
                        var pPin = new android.graphics.Path();
                        pPin.moveTo(cx - s * 0.20, top + s * 0.06);
                        pPin.lineTo(cx + s * 0.20, top + s * 0.06);
                        pPin.lineTo(cx + s * 0.14, top + s * 0.34);
                        pPin.lineTo(cx + s * 0.30, cy + s * 0.05);
                        pPin.lineTo(cx - s * 0.30, cy + s * 0.05);
                        pPin.lineTo(cx - s * 0.14, top + s * 0.34);
                        pPin.close();
                        canvas.drawPath(pPin, paint);
                        paint.setStyle(Paint.Style.STROKE);
                        canvas.drawLine(cx, cy + s * 0.05, cx, bottom - s * 0.04, paint);
                    } else if (kind === "globe") {
                        canvas.drawCircle(cx, cy, s * 0.43, paint);
                        rect.set(cx - s * 0.18, top + s * 0.07, cx + s * 0.18, bottom - s * 0.07);
                        canvas.drawOval(rect, paint);
                        canvas.drawLine(left + s * 0.10, cy, right - s * 0.10, cy, paint);
                    } else if (kind === "select") {
                        var d = s * 0.27;
                        canvas.drawLine(left, top + d, left, top, paint);
                        canvas.drawLine(left, top, left + d, top, paint);
                        canvas.drawLine(right - d, top, right, top, paint);
                        canvas.drawLine(right, top, right, top + d, paint);
                        canvas.drawLine(left, bottom - d, left, bottom, paint);
                        canvas.drawLine(left, bottom, left + d, bottom, paint);
                        canvas.drawLine(right - d, bottom, right, bottom, paint);
                        canvas.drawLine(right, bottom - d, right, bottom, paint);
                    } else if (kind === "trash") {
                        rect.set(left + s * 0.20, top + s * 0.28, right - s * 0.20, bottom - s * 0.04);
                        canvas.drawRoundRect(rect, s * 0.06, s * 0.06, paint);
                        canvas.drawLine(left + s * 0.12, top + s * 0.22, right - s * 0.12, top + s * 0.22, paint);
                        canvas.drawLine(cx - s * 0.14, top + s * 0.10, cx + s * 0.14, top + s * 0.10, paint);
                        canvas.drawLine(cx - s * 0.12, top + s * 0.10, cx - s * 0.08, top + s * 0.22, paint);
                        canvas.drawLine(cx + s * 0.12, top + s * 0.10, cx + s * 0.08, top + s * 0.22, paint);
                        canvas.drawLine(cx - s * 0.10, top + s * 0.40, cx - s * 0.10, bottom - s * 0.16, paint);
                        canvas.drawLine(cx + s * 0.10, top + s * 0.40, cx + s * 0.10, bottom - s * 0.16, paint);
                    }
                } catch (eDrawIcon) {}
            }
        }, appContext);
        iconView.setMinimumWidth(uiDp(sizeDp, sizeDp + 2));
        iconView.setMinimumHeight(uiDp(sizeDp, sizeDp + 2));
        iconView.setClickable(false);
        return iconView;
    }

    function styleReplicaButton20(viewObj, styleKind) {
        if (!viewObj) return;
        try {
            var label = viewObj.getTag();
            if (styleKind === "primary") {
                viewObj.setBackground(createReplicaPrimaryBackground20(isTablet ? 16 : 14));
                if (label) safeTextColor(label, Colors.onPrimary);
            } else if (styleKind === "outline") {
                viewObj.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 16 : 14, 1));
                if (label) safeTextColor(label, Colors.text);
            } else if (styleKind === "pin") {
                viewObj.setBackground(createStrokeRoundRectDrawable(Color.TRANSPARENT, replicaAccent20(), isTablet ? 13 : 11, 1));
                if (label) safeTextColor(label, replicaAccent20());
            } else if (styleKind === "selector") {
                viewObj.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
                if (label) safeTextColor(label, Colors.text);
            } else {
                viewObj.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 46 : 28), isTablet ? 10 : 8));
                if (label) safeTextColor(label, Colors.text);
            }
            try {
                var childCount = viewObj.getChildCount ? viewObj.getChildCount() : 0;
                for (var iStyle = 0; iStyle < childCount; iStyle++) {
                    var childStyle = viewObj.getChildAt(iStyle);
                    if (childStyle) childStyle.invalidate();
                }
            } catch (eChildren) {}
        } catch (eStyle) {}
    }

    function createReplicaButton20(textValue, iconKind, styleKind, callback, longCallback) {
        var row = new LinearLayout(appContext);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setClickable(true);
        row.setFocusable(true);
        var iconSize = styleKind === "inline" || styleKind === "pin" ? 18 : 22;
        var icon = createReplicaIcon20(iconKind, styleKind, iconSize);
        var iconLp = new LinearLayout.LayoutParams(uiDp(iconSize, iconSize + 2), uiDp(iconSize, iconSize + 2));
        row.addView(icon, iconLp);
        var label = new TextView(appContext);
        label.setText(String(textValue));
        label.setTextSize(styleKind === "inline" || styleKind === "pin" ? uiTextSize(11, 12) : uiTextSize(14, 15));
        label.setSingleLine(true);
        label.setGravity(Gravity.CENTER_VERTICAL);
        label.setPadding(uiDp(7, 9), 0, 0, 0);
        row.addView(label);
        row.setTag(label);
        row.setContentDescription(String(textValue));
        row.setPadding(styleKind === "inline" || styleKind === "pin" ? uiDp(7, 9) : uiDp(12, 16), 0,
            styleKind === "inline" || styleKind === "pin" ? uiDp(7, 9) : uiDp(12, 16), 0);
        styleReplicaButton20(row, styleKind);
        row.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
            hapticFeedback(v);
            try { callback(); } catch (eCallback) { showToast("操作失败"); }
        } }));
        if (longCallback) {
            row.setOnLongClickListener(new View.OnLongClickListener({ onLongClick: function(v) {
                hapticFeedback(v);
                try { longCallback(); } catch (eLong) { showToast("操作失败"); }
                return true;
            } }));
        }
        applyButtonAnimation(row);
        return row;
    }

    function setReplicaButtonText20(viewObj, textValue) {
        if (!viewObj) return;
        try {
            var label = viewObj.getTag();
            if (label) label.setText(String(textValue));
            viewObj.setContentDescription(String(textValue));
        } catch (eLabel) {}
    }

    function createReplicaSeparator20(vertical) {
        var divider = new View(appContext);
        divider.setBackground(createRoundRectDrawable(alphaColor20(Colors.outline, isDark ? 92 : 52), 0));
        var lp = vertical
            ? new LinearLayout.LayoutParams(Math.max(1, Math.round(dp(1))), uiDp(28, 32))
            : new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, Math.max(1, Math.round(dp(1))));
        if (vertical) lp.setMargins(uiDp(4, 6), 0, uiDp(4, 6), 0);
        divider.setLayoutParams(lp);
        return divider;
    }

    function setCountLabel20(countValue) {
        if (!countLabelView) return;
        var countText = String(Math.max(0, Number(countValue || 0)));
        var full = countText + " 字";
        try {
            var styled = new android.text.SpannableString(new java.lang.String(full));
            styled.setSpan(new android.text.style.RelativeSizeSpan(2.15), 0, countText.length, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            styled.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, countText.length, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            countLabelView.setText(styled);
        } catch (eSpan) {
            countLabelView.setText(full);
        }
    }

    function getFontSizeLevel20() {
        if (currentFontSize <= 16) return "小";
        if (currentFontSize >= 26) return "大";
        return "中";
    }

    function updateFontSizeSelector20() {
        if (!fontSizeSelectorView) return;
        try { fontSizeSelectorView.setText("字号    " + getFontSizeLevel20() + " ⌄"); } catch (eSizeLabel) {}
    }

    function applyVisiblePickwordTheme20() {
        try {
            if (mainLayout) mainLayout.setBackground(createRoundRectDrawable(replicaSoftSurface20(), isTablet ? 28 : 24));
            if (scrollView) scrollView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 18 : 15, 1));
            if (previewBoxView) previewBoxView.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            if (titleAccentView) titleAccentView.setBackground(createRoundRectDrawable(replicaAccent20(), isTablet ? 5 : 4));
            if (fontSizeSelectorView) fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            if (closeActionView) safeTextColor(closeActionView, Colors.text);
            if (countLabelView) safeTextColor(countLabelView, Colors.text);
            if (previewTextView) safeTextColor(previewTextView, selectedIndices.length > 0 ? Colors.text : Colors.textSecondary);
            if (resultDividerView) resultDividerView.setBackground(createRoundRectDrawable(alphaColor20(Colors.outline, isDark ? 92 : 52), 0));
            styleReplicaButton20(copyAllActionBtn, "inline");
            styleReplicaButton20(cleanupActionBtn, "inline");
            styleReplicaButton20(shareActionBtn, "inline");
            styleReplicaButton20(pinActionBtn, "pin");
            styleReplicaButton20(copyActionBtn, "primary");
            styleReplicaButton20(translateActionBtn, "outline");
            styleReplicaButton20(selectAllActionBtn, "outline");
            styleReplicaButton20(clearActionBtn, "outline");
            if (fontSizeLabel) safeTextColor(fontSizeLabel, replicaAccent20());
            if (pinLayout) pinLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 16 : 14));
            if (pinTextView) safeTextColor(pinTextView, Colors.text);
            if (pinProgressView) safeTextColor(pinProgressView, Colors.textTertiary);
            if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate();
        } catch (eThemeApply) {}
    }

    // 钉屏与拾字根窗口均静态显示，避免透明 Overlay 属性动画。'''
text = sub_once(text, helper_pattern, helper_replacement, "replica helper suite", re.S)

window_pattern = r'''        createWindow: function\(\) \{.*?\n        \},\n\n        createTitleBar: function\(\) \{'''
window_replacement = r'''        createWindow: function() {
            detectScreenSize();
            applyPickwordColorScheme20(toolhubAppRef);
            windowManager = appContext.getSystemService(appContext.WINDOW_SERVICE);

            windowWidth = Math.round(screenWidth * (isTablet ? 0.92 : 0.94));
            var maxReplicaWidth = Math.round(uiDp(620, 980));
            if (windowWidth > maxReplicaWidth) windowWidth = maxReplicaWidth;
            if (windowWidth < Math.round(uiDp(300, 520))) windowWidth = Math.round(screenWidth * 0.96);
            textAreaHeight = Math.min(Math.round(screenHeight * (isTablet ? 0.34 : 0.30)), Math.round(uiDp(250, 330)));
            textAreaMinHeight = Math.min(textAreaHeight, Math.max(Math.round(uiDp(170, 230)), Math.round(screenHeight * 0.22)));

            layoutParams = new LayoutParams(
                windowWidth, LayoutParams.WRAP_CONTENT,
                LayoutParams.TYPE_APPLICATION_OVERLAY,
                LayoutParams.FLAG_NOT_FOCUSABLE | LayoutParams.FLAG_DIM_BEHIND,
                android.graphics.PixelFormat.TRANSLUCENT
            );
            layoutParams.gravity = Gravity.CENTER;
            layoutParams.x = 0;
            layoutParams.y = 0;
            layoutParams.dimAmount = 0.18;

            mainLayout = new LinearLayout(appContext);
            mainLayout.setOrientation(LinearLayout.VERTICAL);
            mainLayout.setBackground(createRoundRectDrawable(replicaSoftSurface20(), isTablet ? 28 : 24));
            mainLayout.setElevation(uiDp(8, 12));
            mainLayout.setPadding(uiDp(18, 28), uiDp(18, 24), uiDp(18, 28), uiDp(18, 24));

            var titleBar = this.createTitleBar();
            mainLayout.addView(titleBar);

            scrollView = new ScrollView(appContext);
            var scrollParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, textAreaMinHeight);
            scrollParams.setMargins(0, uiDp(18, 22), 0, uiDp(12, 16));
            scrollView.setLayoutParams(scrollParams);
            scrollView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 18 : 15, 1));
            try { scrollView.setFillViewport(false); } catch (eFill) {}
            try { scrollView.setClipToPadding(false); } catch (eClip) {}
            this.installCanvasScrollRefreshHooks();

            textCanvasControl = createCanvasTextControl();
            textView = textCanvasControl.view;
            textCanvasControl.setTextSize(currentFontSize);
            textView.setPadding(uiDp(16, 22), uiDp(16, 20), uiDp(16, 22), uiDp(16, 20));
            textView.setContentDescription("点击或长按文字进行选择");
            this.setupTextViewTouch();

            scrollView.addView(textView);
            mainLayout.addView(scrollView);

            var previewBox = this.createPreviewBox();
            mainLayout.addView(previewBox);

            var self = this;
            var actionBar = new LinearLayout(appContext);
            actionBar.setOrientation(LinearLayout.HORIZONTAL);
            actionBar.setGravity(Gravity.CENTER_VERTICAL);
            actionBar.setPadding(0, uiDp(14, 18), 0, 0);

            copyActionBtn = this.createPrimaryBtn("复制", function() { self.doCopy(); });
            translateActionBtn = this.createIconBtn("翻译", "globe", function() {
                if (lastTranslationState) { self.undoLastTranslation(); } else { self.doTranslate(); }
            });
            selectAllActionBtn = this.createIconBtn("全选", "select", function() { self.selectAll(); });
            clearActionBtn = this.createIconBtn("清空", "trash", function() { self.clear(); });

            var bottomButtons = [copyActionBtn, translateActionBtn, selectAllActionBtn, clearActionBtn];
            for (var iBottom = 0; iBottom < bottomButtons.length; iBottom++) {
                var bottomLp = new LinearLayout.LayoutParams(0, uiDp(52, 60), 1);
                if (iBottom > 0) bottomLp.setMargins(uiDp(7, 10), 0, 0, 0);
                bottomButtons[iBottom].setLayoutParams(bottomLp);
                actionBar.addView(bottomButtons[iBottom]);
            }
            mainLayout.addView(actionBar);
            this.updateActionButtons();

            this.scheduleInitialTextLoad();
            windowManager.addView(mainLayout, layoutParams);
        },

        createTitleBar: function() {'''
text = sub_once(text, window_pattern, window_replacement, "replica main window", re.S)

title_pattern = r'''        createTitleBar: function\(\) \{.*?\n        \},\n\n        toggleFontSizePanel: function\(\) \{'''
title_replacement = r'''        createTitleBar: function() {
            var titleBar = new LinearLayout(appContext);
            titleBar.setOrientation(LinearLayout.HORIZONTAL);
            titleBar.setGravity(Gravity.CENTER_VERTICAL);
            var self = this;

            var normalMode = new LinearLayout(appContext);
            normalMode.setOrientation(LinearLayout.HORIZONTAL);
            normalMode.setGravity(Gravity.CENTER_VERTICAL);
            normalMode.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            titleAccentView = new View(appContext);
            titleAccentView.setBackground(createRoundRectDrawable(replicaAccent20(), isTablet ? 5 : 4));
            var accentLp = new LinearLayout.LayoutParams(uiDp(6, 8), uiDp(28, 36));
            accentLp.setMargins(0, 0, uiDp(12, 16), 0);
            normalMode.addView(titleAccentView, accentLp);

            var titleText = new TextView(appContext);
            titleText.setText("拾字");
            safeTextColor(titleText, Colors.text);
            titleText.setTextSize(uiTextSize(22, 27));
            titleText.setTypeface(null, android.graphics.Typeface.BOLD);
            titleText.setGravity(Gravity.CENTER_VERTICAL);
            titleText.setContentDescription("拾字；点击复制博客链接");
            titleText.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                try { setClipboard("https://xin-blog.com"); showToast("链接已复制"); } catch (eLink) {}
            } }));
            titleText.setLayoutParams(new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
            normalMode.addView(titleText);

            fontSizeSelectorView = new TextView(appContext);
            updateFontSizeSelector20();
            safeTextColor(fontSizeSelectorView, Colors.text);
            fontSizeSelectorView.setTextSize(uiTextSize(12, 14));
            fontSizeSelectorView.setGravity(Gravity.CENTER);
            fontSizeSelectorView.setSingleLine(true);
            fontSizeSelectorView.setPadding(uiDp(14, 18), 0, uiDp(14, 18), 0);
            fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            fontSizeSelectorView.setContentDescription("字号设置，当前" + getFontSizeLevel20());
            var selectorLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(42, 50));
            selectorLp.setMargins(uiDp(8, 12), 0, uiDp(10, 14), 0);
            normalMode.addView(fontSizeSelectorView, selectorLp);
            fontSizeSelectorView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.toggleFontSizePanel(); } }));
            applyButtonAnimation(fontSizeSelectorView);

            closeActionView = new TextView(appContext);
            closeActionView.setText("×");
            safeTextColor(closeActionView, Colors.text);
            closeActionView.setTextSize(uiTextSize(28, 34));
            closeActionView.setGravity(Gravity.CENTER);
            closeActionView.setContentDescription("关闭拾字");
            closeActionView.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 60 : 34), isTablet ? 14 : 12));
            var closeLp = new LinearLayout.LayoutParams(uiDp(42, 50), uiDp(42, 50));
            normalMode.addView(closeActionView, closeLp);
            closeActionView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.hide(); } }));
            applyButtonAnimation(closeActionView);

            var settingMode = new LinearLayout(appContext);
            settingMode.setOrientation(LinearLayout.HORIZONTAL);
            settingMode.setGravity(Gravity.CENTER_VERTICAL);
            settingMode.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
            settingMode.setVisibility(View.GONE);

            var settingTitle = new TextView(appContext);
            settingTitle.setText("字号");
            settingTitle.setTextSize(uiTextSize(13, 15));
            settingTitle.setTypeface(null, android.graphics.Typeface.BOLD);
            safeTextColor(settingTitle, Colors.text);
            settingTitle.setPadding(0, 0, uiDp(10, 14), 0);
            settingMode.addView(settingTitle);

            seekBar = createFontSizeCanvasSlider(self);
            seekBar.setProgress(currentFontSize - MIN_FONT_SIZE);
            var sliderLp = new LinearLayout.LayoutParams(0, uiDp(36, 42), 1);
            seekBar.view.setLayoutParams(sliderLp);
            settingMode.addView(seekBar.view);

            fontSizeLabel = new TextView(appContext);
            fontSizeLabel.setText(currentFontSize + "sp");
            safeTextColor(fontSizeLabel, replicaAccent20());
            fontSizeLabel.setTextSize(uiTextSize(11, 12));
            fontSizeLabel.setTypeface(null, android.graphics.Typeface.BOLD);
            fontSizeLabel.setGravity(Gravity.CENTER);
            fontSizeLabel.setPadding(uiDp(8, 10), 0, uiDp(8, 10), 0);
            var labelLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            labelLp.setMargins(uiDp(8, 10), 0, uiDp(4, 6), 0);
            settingMode.addView(fontSizeLabel, labelLp);

            loadedRemoveSpaceBtn = self.createSettingChipBtn("去空格", function() { self.removeLoadedSpaces(); });
            loadedRemoveNewlineBtn = self.createSettingChipBtn("去换行", function() { self.removeLoadedNewlines(); });
            settingMode.addView(loadedRemoveSpaceBtn);
            settingMode.addView(loadedRemoveNewlineBtn);

            var confirmBtn = new TextView(appContext);
            confirmBtn.setText("完成");
            safeTextColor(confirmBtn, replicaAccent20());
            confirmBtn.setTextSize(uiTextSize(11, 12));
            confirmBtn.setGravity(Gravity.CENTER);
            confirmBtn.setPadding(uiDp(9, 12), 0, uiDp(6, 8), 0);
            confirmBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(replicaAccent20(), 32), isTablet ? 10 : 8));
            var confirmLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            settingMode.addView(confirmBtn, confirmLp);
            confirmBtn.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                hapticFeedback(v);
                if (seekBar) saveFontSize(MIN_FONT_SIZE + seekBar.getProgress());
                updateFontSizeSelector20();
                self.toggleFontSizePanel();
            } }));
            applyButtonAnimation(confirmBtn);

            titleBar.addView(normalMode);
            titleBar.addView(settingMode);
            titleBarRefs.normalMode = normalMode;
            titleBarRefs.settingMode = settingMode;

            var touchStartX = 0, touchStartY = 0, layoutStartX = 0, layoutStartY = 0, isDraggingWindow = false;
            titleBar.setOnTouchListener(new View.OnTouchListener({ onTouch: function(v, event) {
                var action = event.getAction();
                if (action === MotionEvent.ACTION_DOWN) {
                    touchStartX = event.getRawX(); touchStartY = event.getRawY();
                    layoutStartX = layoutParams.x; layoutStartY = layoutParams.y;
                    isDraggingWindow = true; return true;
                } else if (action === MotionEvent.ACTION_MOVE && isDraggingWindow) {
                    layoutParams.x = layoutStartX + (event.getRawX() - touchStartX);
                    layoutParams.y = layoutStartY + (event.getRawY() - touchStartY);
                    windowManager.updateViewLayout(mainLayout, layoutParams); return true;
                } else if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                    isDraggingWindow = false; return true;
                }
                return false;
            } }));
            return titleBar;
        },

        toggleFontSizePanel: function() {'''
text = sub_once(text, title_pattern, title_replacement, "replica title bar", re.S)

text = replace_once(
    text,
    "        updateFontSize: function(size, skipAdjust) {\n"
    "            currentFontSize = size;\n"
    "            if (fontSizeLabel) fontSizeLabel.setText(size + \"sp\");\n"
    "            if (textCanvasControl) {\n"
    "                textCanvasControl.setTextSize(size);\n"
    "                if (!skipAdjust) this.adjustScrollViewHeight();\n"
    "            }\n"
    "        },",
    "        updateFontSize: function(size, skipAdjust) {\n"
    "            currentFontSize = size;\n"
    "            if (fontSizeLabel) fontSizeLabel.setText(size + \"sp\");\n"
    "            updateFontSizeSelector20();\n"
    "            if (textCanvasControl) {\n"
    "                textCanvasControl.setTextSize(size);\n"
    "                if (!skipAdjust) this.adjustScrollViewHeight();\n"
    "            }\n"
    "        },",
    "font selector synchronization",
)

height_pattern = r'''        applyScrollViewHeightNow: function\(\) \{.*?\n        \},\n\n        adjustScrollViewHeight: function\(\) \{'''
height_replacement = r'''        applyScrollViewHeightNow: function() {
            if (!scrollView || !textCanvasControl) return 0;
            try {
                var contentHeight = textCanvasControl.getContentHeight();
                var desired = contentHeight + uiDp(10, 12);
                var newHeight = Math.max(textAreaMinHeight, Math.min(desired, textAreaHeight));
                var params = scrollView.getLayoutParams();
                if (params.height !== newHeight) {
                    params.height = newHeight;
                    scrollView.setLayoutParams(params);
                }
                return newHeight;
            } catch (e) {}
            return 0;
        },

        adjustScrollViewHeight: function() {'''
text = sub_once(text, height_pattern, height_replacement, "replica text area height", re.S)

preview_pattern = r'''        createPreviewBox: function\(\) \{.*?\n        createFingerPreview: function\(\) \{'''
preview_replacement = r'''        createPreviewBox: function() {
            var self = this;
            var previewBox = new LinearLayout(appContext);
            previewBoxView = previewBox;
            previewBox.setOrientation(LinearLayout.VERTICAL);
            previewBox.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            previewBox.setPadding(0, 0, 0, 0);
            previewBox.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            var metaRow = new LinearLayout(appContext);
            metaRow.setOrientation(LinearLayout.HORIZONTAL);
            metaRow.setGravity(Gravity.CENTER_VERTICAL);

            countLabelView = new TextView(appContext);
            countLabelView.setTextSize(uiTextSize(12, 13));
            safeTextColor(countLabelView, Colors.text);
            countLabelView.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
            setCountLabel20(0);
            var countLp = new LinearLayout.LayoutParams(0, uiDp(44, 50), 1);
            metaRow.addView(countLabelView, countLp);

            var inlineActions = new LinearLayout(appContext);
            inlineActions.setOrientation(LinearLayout.HORIZONTAL);
            inlineActions.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);

            copyAllActionBtn = createReplicaButton20("复制全部", "copy", "inline", function() { self.copyAllText(); }, null);
            cleanupActionBtn = createReplicaButton20("去重换行", "cleanup", "inline", function() { self.cleanReplicaNewlines(); }, function() { self.cleanReplicaSpaces(); });
            shareActionBtn = createReplicaButton20("分享", "share", "inline", function() { self.sharePickwordText(); }, null);
            pinActionBtn = createReplicaButton20("钉屏", "pin", "pin", function() { self.pinSelectedText(); }, null);

            inlineActions.addView(copyAllActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(cleanupActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(shareActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(pinActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(40, 46)));
            metaRow.addView(inlineActions);
            previewBox.addView(metaRow);

            previewTextView = new TextView(appContext);
            previewTextView.setText("点击文字选择");
            safeTextColor(previewTextView, Colors.textSecondary);
            previewTextView.setTextSize(uiTextSize(12, 13));
            previewTextView.setLineSpacing(uiDp(1, 2), 1);
            previewTextView.setPadding(0, uiDp(8, 10), 0, uiDp(12, 14));
            previewTextView.setMaxLines(2);
            try { previewTextView.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch (eEllipsize) {}
            previewTextView.setContentDescription("选中文字预览；点击编辑，长按去空格");
            previewTextView.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                if (selectedIndices.length > 0) { hapticFeedback(v); self.editPreviewText(); }
            } }));
            previewTextView.setOnLongClickListener(new View.OnLongClickListener({ onLongClick: function(v) {
                if (selectedIndices.length > 0) { hapticFeedback(v); self.removeSelectedSpaces(); return true; }
                return false;
            } }));
            previewBox.addView(previewTextView, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            resultDividerView = createReplicaSeparator20(false);
            previewBox.addView(resultDividerView);
            return previewBox;
        },

        createPrimaryBtn: function(textValue, callback) {
            return createReplicaButton20(textValue, "copy", "primary", callback, null);
        },

        createIconBtn: function(textValue, iconKind, callback) {
            return createReplicaButton20(textValue, iconKind, "outline", callback, null);
        },

        createMiniHeaderBtn: function(textValue, callback) {
            return createReplicaButton20(textValue, "cleanup", "inline", callback, null);
        },

        createSettingChipBtn: function(textValue, callback) {
            var btn = new TextView(appContext);
            btn.setText(textValue);
            safeTextColor(btn, Colors.textSecondary);
            btn.setTextSize(uiTextSize(10, 11));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(7, 9), 0, uiDp(7, 9), 0);
            btn.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 46 : 28), isTablet ? 9 : 7));
            var params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            params.setMargins(uiDp(3, 4), 0, 0, 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },

        createFingerPreview: function() {'''
text = sub_once(text, preview_pattern, preview_replacement, "replica result and action areas", re.S)

update_action_pattern = r'''        updateActionButtons: function\(\) \{.*?\n        \},\n\n        applyReplacementsToText: function\(sourceText, replacements\) \{'''
update_action_replacement = r'''        updateActionButtons: function() {
            var hasSelection = (isDragging ? dragSelectionCount : selectedIndices.length) > 0;
            var hasText = !!(fullText && fullText.length > 0);
            var hasUndo = !!lastTranslationState;
            setReplicaButtonText20(translateActionBtn, hasUndo ? "撤销翻译" : "翻译");
            this.setActionEnabled(copyActionBtn, hasSelection);
            this.setActionEnabled(translateActionBtn, hasSelection || hasUndo);
            this.setActionEnabled(selectAllActionBtn, hasText);
            this.setActionEnabled(clearActionBtn, hasSelection);
            this.setActionEnabled(copyAllActionBtn, hasText);
            this.setActionEnabled(cleanupActionBtn, hasText);
            this.setActionEnabled(shareActionBtn, hasSelection || hasText);
            this.setActionEnabled(pinActionBtn, hasSelection);
            this.updateCleanButtons();
        },

        applyReplacementsToText: function(sourceText, replacements) {'''
text = sub_once(text, update_action_pattern, update_action_replacement, "replica action states", re.S)

preview_update_pattern = r'''        updatePreviewDuringDrag: function\(\) \{.*?\n        editPreviewText: function\(\) \{'''
preview_update_replacement = r'''        updatePreviewDuringDrag: function() {
            var count = isDragging ? dragSelectionCount : selectedIndices.length;
            setCountLabel20(count);
            this.updateActionButtons();
            try {
                if (previewTextView) {
                    if (count > 0) {
                        previewTextView.setText("正在拖选…已选 " + count + " 字，松手后显示预览");
                        safeTextColor(previewTextView, Colors.textSecondary);
                    } else {
                        previewTextView.setText("点击文字选择");
                        safeTextColor(previewTextView, Colors.textSecondary);
                    }
                }
            } catch (e) {}
        },

        updatePreview: function() {
            var count = selectedIndices.length;
            setCountLabel20(count);
            this.updateActionButtons();
            if (count === 0) {
                previewTextOverride = null;
                previewSelectionSignature = "";
                this.clearCleanUndoStack("preview");
                this.updateCleanButtons();
                if (isPartialTextLoaded) previewTextView.setText("长文本自动加载中，先显示前" + fullText.length + "字…");
                else previewTextView.setText("点击文字选择");
                safeTextColor(previewTextView, Colors.textSecondary);
                return;
            }

            var sig = this.getPreviewSelectionSignature();
            if (previewTextOverride !== null && sig === previewSelectionSignature) {
                previewTextView.setText(String(previewTextOverride));
                safeTextColor(previewTextView, Colors.text);
                return;
            }
            previewTextOverride = null;
            previewSelectionSignature = sig;
            this.clearCleanUndoStack("preview");
            previewTextView.setText(this.getSelectedTextRaw());
            safeTextColor(previewTextView, Colors.text);
        },

        editPreviewText: function() {'''
text = sub_once(text, preview_update_pattern, preview_update_replacement, "replica preview updates", re.S)

new_methods = r'''        copyAllText: function() {
            var textValue = String(originalFullText || fullText || "");
            if (!textValue) { showToast("没有可复制的文字"); return; }
            if (setClipboard(textValue)) showToast("已复制全部文字");
        },

        cleanReplicaNewlines: function() {
            if (selectedIndices.length > 0) this.removeSelectedNewlines();
            else this.removeLoadedNewlines();
        },

        cleanReplicaSpaces: function() {
            if (selectedIndices.length > 0) this.removeSelectedSpaces();
            else this.removeLoadedSpaces();
        },

        sharePickwordText: function() {
            var textValue = selectedIndices.length > 0 ? this.getSelectedText() : String(originalFullText || fullText || "");
            if (!textValue) { showToast("没有可分享的文字"); return; }
            try {
                var sendIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(android.content.Intent.EXTRA_TEXT, String(textValue));
                var chooser = android.content.Intent.createChooser(sendIntent, "分享文字");
                chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                appContext.startActivity(chooser);
            } catch (eShare) {
                showToast("分享失败: " + eShare.message);
            }
        },

'''
text = replace_once(text, "        doTranslate: function() {", new_methods + "        doTranslate: function() {", "replica utility actions")

text = replace_all_required(
    text,
    "                        if (fontSizeLabel) fontSizeLabel.setText(currentFontSize + \"sp\");",
    "                        if (fontSizeLabel) fontSizeLabel.setText(currentFontSize + \"sp\");\n                        updateFontSizeSelector20();",
    1,
    "show selector sync",
)

text = replace_all_required(
    text,
    "                        previewBoxView = null;\n                        titleBarRefs = { normalMode: null, settingMode: null };",
    "                        previewBoxView = null;\n                        copyAllActionBtn = null;\n                        cleanupActionBtn = null;\n                        shareActionBtn = null;\n                        fontSizeSelectorView = null;\n                        titleAccentView = null;\n                        resultDividerView = null;\n                        closeActionView = null;\n                        titleBarRefs = { normalMode: null, settingMode: null };",
    1,
    "hide replica refs",
)
text = replace_once(
    text,
    "                    previewBoxView = null;\n                    titleBarRefs = { normalMode: null, settingMode: null };",
    "                    previewBoxView = null;\n                    copyAllActionBtn = null;\n                    cleanupActionBtn = null;\n                    shareActionBtn = null;\n                    fontSizeSelectorView = null;\n                    titleAccentView = null;\n                    resultDividerView = null;\n                    closeActionView = null;\n                    titleBarRefs = { normalMode: null, settingMode: null };",
    "dispose replica refs",
)

required_markers = [
    "// @version 1.0.6",
    "字号    " + '" + getFontSizeLevel20() + "' + " ⌄",
    "复制全部",
    "去重换行",
    "分享",
    "function createReplicaIcon20",
    "copyAllText: function()",
    "sharePickwordText: function()",
    "textAreaMinHeight",
    "setCountLabel20(count)",
]
for marker in required_markers:
    if marker not in text:
        raise SystemExit("missing replica marker: %s" % marker)

TARGET.write_text(text, encoding="utf-8")
record = {
    "schema": 1,
    "id": "optimize-pickword-reference-replica",
    "type": "optimize",
    "title": "高保真复刻拾字参考界面",
    "details": [
        "拾字主窗口按参考图重排为标题栏、描边原文区、统计操作区、分隔线和四枚底部主按钮",
        "加入青绿色标题标记、字号中档选择器、线性 Canvas 图标、复制全部、分享和描边钉屏入口",
        "选中计数使用大数字层级，预览文字支持点击编辑与长按去空格，原有清理功能完整保留",
        "主文本区保持 Canvas 选择、长按、滚动和放大镜逻辑，仅调整窗口尺寸、留白、圆角和边框",
        "不修改指针、框选 OCR、截图、顶部结果预览、公共主题与模块加载顺序"
    ],
    "manifestVersion": 0
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("OK applied pickword reference replica")
print("module=th_20_pickword.js version=1.0.6")
