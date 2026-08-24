#!/usr/bin/env python3
"""Idempotently normalize the Beta pickword screenshot layout to the reference design."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
OLD_VERSION = "// @version 1.0.21\n"
NEW_VERSION = "// @version 1.0.22\n"
PREVIOUS_VERSION = "// @version 1.0.23\n"
CURRENT_VERSION = "// @version 1.0.24\n"
LATEST_VERSION = "// @version 1.0.30\n"


def require(condition, message):
    if not condition:
        raise SystemExit("pickword layout integration failed: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    require(count == 1, "%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def already_applied(text):
    legacy_markers = (
        "function createPickwordImageActionGrid20(thumbRoot)",
        'createPickwordImageActionTile20("二维码", "qr"',
        'createPickwordImageActionTile20("贴图", "image"',
        "normalizePickwordThumbnailChrome20(thumb);",
        "var contentWidthDp20 = Number(windowWidth || dm.widthPixels || 0) / density20;",
    )
    current_markers = (
        "function createPickwordImageActionGrid20(thumbRoot)",
        "function resolvePickwordShortXActionDrawable20(kind)",
        'performPickwordQrAction20("decode")',
        'createPickwordImageActionTile20("重新识别", "reocr"',
        "normalizePickwordThumbnailChrome20(thumb);",
        "var contentWidthDp20 = Number(windowWidth || dm.widthPixels || 0) / density20;",
    )
    supported_version = text.startswith(NEW_VERSION) or text.startswith(PREVIOUS_VERSION) or text.startswith(CURRENT_VERSION) or text.startswith(LATEST_VERSION)
    return supported_version and (all(marker in text for marker in legacy_markers) or all(marker in text for marker in current_markers))


def patch():
    text = TARGET.read_text(encoding="utf-8")
    if already_applied(text):
        print("OK pickword reference layout already applied version=current")
        return

    require(text.startswith(OLD_VERSION), "expected th_20 version 1.0.21")
    text = text.replace(OLD_VERSION, NEW_VERSION, 1)

    text = replace_once(
        text,
        "    var pickwordImageTextOriginalIndex20 = -1;\n",
        "    var pickwordImageTextOriginalIndex20 = -1;\n"
        "    var pickwordQrTriggerView20 = null;\n",
        "qr trigger state",
    )
    text = replace_once(
        text,
        "        pickwordImageTextOriginalIndex20 = -1;\n",
        "        pickwordImageTextOriginalIndex20 = -1;\n"
        "        pickwordQrTriggerView20 = null;\n",
        "qr trigger cleanup",
    )

    helper_anchor = "    function addPickwordTextArea20(parent, view, originalLp) {\n"
    helpers = r'''    function findPickwordTextAction20(root, labels) {
        if (!root || !labels || labels.length === 0) return null;
        try {
            if (root.getText) {
                var value = String(root.getText() == null ? "" : root.getText());
                for (var iLabel = 0; iLabel < labels.length; iLabel++) {
                    if (value === String(labels[iLabel])) return root;
                }
            }
        } catch (eText) {}
        try {
            if (!root.getChildCount || !root.getChildAt) return null;
            var count = Number(root.getChildCount() || 0);
            for (var iChild = 0; iChild < count; iChild++) {
                var found = findPickwordTextAction20(root.getChildAt(iChild), labels);
                if (found) return found;
            }
        } catch (eChildren) {}
        return null;
    }

    function collapsePickwordAuxView20(viewObj) {
        if (!viewObj) return;
        try {
            var lp = viewObj.getLayoutParams ? viewObj.getLayoutParams() : null;
            if (lp) {
                lp.width = 0;
                lp.height = 0;
                viewObj.setLayoutParams(lp);
            }
        } catch (eLp) {}
        try { viewObj.setVisibility(View.GONE); } catch (eVisibility) {}
    }

    function normalizePickwordThumbnailChrome20(root) {
        pickwordQrTriggerView20 = null;
        function walk(node) {
            if (!node) return;
            var value = "";
            try { if (node.getText) value = String(node.getText() == null ? "" : node.getText()); } catch (eText) { value = ""; }
            if (value === "解析二维码" || value === "重新解析" || value === "重试解析" || value === "解析中…") {
                pickwordQrTriggerView20 = node;
                collapsePickwordAuxView20(node);
            } else if (value === "正在读取截图…" || value === "截图不可用" || value.indexOf("点击查看原图") >= 0) {
                collapsePickwordAuxView20(node);
            }
            try {
                var className = String(node.getClass().getName());
                if (className === "android.widget.ImageView") {
                    var imageLp = node.getLayoutParams ? node.getLayoutParams() : null;
                    if (imageLp && imageLp.bottomMargin !== undefined) {
                        imageLp.bottomMargin = 0;
                        node.setLayoutParams(imageLp);
                    }
                }
            } catch (eImage) {}
            try {
                if (!node.getChildCount || !node.getChildAt) return;
                var count = Number(node.getChildCount() || 0);
                for (var i = 0; i < count; i++) walk(node.getChildAt(i));
            } catch (eChildren) {}
        }
        walk(root);
        return root;
    }

    function performPickwordQrAction20(thumbRoot) {
        try {
            if (!pickwordQrTriggerView20) normalizePickwordThumbnailChrome20(thumbRoot);
            var trigger = pickwordQrTriggerView20;
            if (!trigger) {
                showToast("二维码入口暂不可用");
                return false;
            }
            try { trigger.setVisibility(View.VISIBLE); } catch (eVisible) {}
            var clicked = false;
            try { clicked = trigger.performClick() === true; } catch (eClick) { clicked = false; }
            collapsePickwordAuxView20(trigger);
            if (!clicked) {
                try { trigger.callOnClick(); clicked = true; } catch (eCall) {}
            }
            return clicked;
        } catch (eQr) {
            showToast("二维码操作失败");
        }
        return false;
    }

    function performPickwordImagePageAction20(labels, unavailableText) {
        try {
            var action = findPickwordTextAction20(pickwordImagePage20, labels || []);
            if (!action) {
                showToast(String(unavailableText || "图片操作暂不可用"));
                return false;
            }
            try { if (action.performClick() === true) return true; } catch (eClick) {}
            try { action.callOnClick(); return true; } catch (eCall) {}
        } catch (eAction) {}
        showToast(String(unavailableText || "图片操作失败"));
        return false;
    }

    function createPickwordImageActionTile20(labelText, iconKind, callback) {
        var tile = new LinearLayout(appContext);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setClickable(true);
        tile.setFocusable(true);
        tile.setPadding(uiDp(6, 8), uiDp(7, 9), uiDp(6, 8), uiDp(6, 8));
        tile.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 16 : 14, 1));

        var iconSize = isTablet ? 27 : 22;
        var icon = createReplicaIcon20(iconKind, "imageAction", iconSize);
        tile.addView(icon, new LinearLayout.LayoutParams(uiDp(iconSize, iconSize + 2), uiDp(iconSize, iconSize + 2)));

        var label = new TextView(appContext);
        label.setText(String(labelText || ""));
        label.setTextSize(uiTextSize(11, 14));
        label.setGravity(Gravity.CENTER);
        label.setSingleLine(true);
        safeTextColor(label, Colors.text);
        var labelLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        labelLp.topMargin = uiDp(3, 5);
        tile.addView(label, labelLp);
        tile.setContentDescription(String(labelText || ""));
        tile.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
            hapticFeedback(v);
            try { callback(); } catch (eCallback) { showToast("操作失败"); }
        } }));
        return tile;
    }

    function addPickwordImageActionTile20(row, tile, addLeftMargin) {
        var lp = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1);
        if (addLeftMargin === true) lp.leftMargin = uiDp(7, 9);
        row.addView(tile, lp);
    }

    function createPickwordImageActionGrid20(thumbRoot) {
        var grid = new LinearLayout(appContext);
        grid.setOrientation(LinearLayout.VERTICAL);
        grid.setGravity(Gravity.CENTER);

        var topRow = new LinearLayout(appContext);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        var bottomRow = new LinearLayout(appContext);
        bottomRow.setOrientation(LinearLayout.HORIZONTAL);

        addPickwordImageActionTile20(topRow,
            createPickwordImageActionTile20("分享", "share", function() {
                performPickwordImagePageAction20(["分享"], "截图分享暂不可用");
            }), false);
        addPickwordImageActionTile20(topRow,
            createPickwordImageActionTile20("二维码", "qr", function() {
                performPickwordQrAction20(thumbRoot);
            }), true);
        addPickwordImageActionTile20(bottomRow,
            createPickwordImageActionTile20("贴图", "image", function() {
                if (!openPickwordImagePage20()) showToast("截图查看暂不可用");
            }), false);
        addPickwordImageActionTile20(bottomRow,
            createPickwordImageActionTile20("保存", "save", function() {
                performPickwordImagePageAction20(["保存", "已保存"], "截图保存暂不可用");
            }), true);

        grid.addView(topRow, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1));
        var bottomLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1);
        bottomLp.topMargin = uiDp(7, 9);
        grid.addView(bottomRow, bottomLp);
        return grid;
    }

'''
    require(text.count(helper_anchor) == 1, "helper anchor")
    text = text.replace(helper_anchor, helpers + helper_anchor, 1)

    text = replace_once(
        text,
        '        if (styleKind === "pin") return replicaAccent20();\n',
        '        if (styleKind === "pin" || styleKind === "imageAction") return replicaAccent20();\n',
        "image action accent",
    )

    icon_anchor = '''                    } else if (kind === "pin") {
                        paint.setStyle(Paint.Style.FILL);
'''
    icon_insert = '''                    } else if (kind === "qr") {
                        var q = s * 0.28;
                        rect.set(left + s * 0.03, top + s * 0.03, left + s * 0.03 + q, top + s * 0.03 + q);
                        canvas.drawRect(rect, paint);
                        rect.set(right - s * 0.03 - q, top + s * 0.03, right - s * 0.03, top + s * 0.03 + q);
                        canvas.drawRect(rect, paint);
                        rect.set(left + s * 0.03, bottom - s * 0.03 - q, left + s * 0.03 + q, bottom - s * 0.03);
                        canvas.drawRect(rect, paint);
                        canvas.drawLine(cx + s * 0.05, cy + s * 0.05, right - s * 0.04, cy + s * 0.05, paint);
                        canvas.drawLine(cx + s * 0.05, cy + s * 0.05, cx + s * 0.05, bottom - s * 0.04, paint);
                        canvas.drawLine(cx + s * 0.24, cy + s * 0.22, right - s * 0.04, cy + s * 0.22, paint);
                    } else if (kind === "image") {
                        rect.set(left + s * 0.03, top + s * 0.08, right - s * 0.03, bottom - s * 0.08);
                        canvas.drawRoundRect(rect, s * 0.08, s * 0.08, paint);
                        canvas.drawCircle(right - s * 0.25, top + s * 0.28, s * 0.07, paint);
                        var pImage = new android.graphics.Path();
                        pImage.moveTo(left + s * 0.15, bottom - s * 0.20);
                        pImage.lineTo(cx - s * 0.08, cy + s * 0.02);
                        pImage.lineTo(cx + s * 0.08, cy + s * 0.18);
                        pImage.lineTo(right - s * 0.18, cy - s * 0.02);
                        pImage.lineTo(right - s * 0.08, bottom - s * 0.20);
                        canvas.drawPath(pImage, paint);
                    } else if (kind === "save") {
                        canvas.drawLine(cx, top + s * 0.02, cx, cy + s * 0.18, paint);
                        canvas.drawLine(cx, cy + s * 0.18, cx - s * 0.18, cy, paint);
                        canvas.drawLine(cx, cy + s * 0.18, cx + s * 0.18, cy, paint);
                        var pSave = new android.graphics.Path();
                        pSave.moveTo(left + s * 0.10, cy + s * 0.18);
                        pSave.lineTo(left + s * 0.10, bottom - s * 0.06);
                        pSave.lineTo(right - s * 0.10, bottom - s * 0.06);
                        pSave.lineTo(right - s * 0.10, cy + s * 0.18);
                        canvas.drawPath(pSave, paint);
                    } else if (kind === "pin") {
                        paint.setStyle(Paint.Style.FILL);
'''
    text = replace_once(text, icon_anchor, icon_insert, "image action icons")

    old_layout = r'''            var dm = appContext.getResources().getDisplayMetrics();
            var widthDp = Number(dm.widthPixels || 0) / Math.max(0.1, Number(dm.density || 1));
            var horizontal = widthDp >= 520;
            var host = new LinearLayout(appContext);
            pickwordContentHost20 = host;
            host.setOrientation(horizontal ? LinearLayout.HORIZONTAL : LinearLayout.VERTICAL);
            host.setGravity(Gravity.CENTER_VERTICAL);

            var textColumn = new LinearLayout(appContext);
            textColumn.setOrientation(LinearLayout.VERTICAL);
            var imageColumn = new LinearLayout(appContext);
            imageColumn.setOrientation(LinearLayout.VERTICAL);
            imageColumn.setGravity(Gravity.CENTER);
            var thumb = pickwordImageController20.createThumbnailView();

            var thumbHeight20 = Math.round(uiDp(108, 132));
            if (horizontal) {
                textColumn.addView(view, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                host.addView(textColumn, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 7));
                var imageLp = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 3);
                imageLp.leftMargin = uiDp(8, 10);
                host.addView(imageColumn, imageLp);
            } else {
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, thumbHeight20));
                host.addView(imageColumn, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, thumbHeight20));
                var compactTextHeight20 = Math.round(Math.min(textAreaHeight, uiDp(156, 220)));
                if (!(compactTextHeight20 > 0)) compactTextHeight20 = Math.round(uiDp(156, 220));
                var textLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, compactTextHeight20);
                textLp.topMargin = uiDp(6, 8);
                textColumn.addView(view, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                host.addView(textColumn, textLp);
            }

            var hostWidth20 = resolvedOriginalLp && resolvedOriginalLp.width !== undefined ? resolvedOriginalLp.width : LayoutParams.MATCH_PARENT;
            var hostLp = new LinearLayout.LayoutParams(hostWidth20, LayoutParams.WRAP_CONTENT);
            parent.addView(host, hostLp);
'''
    new_layout = r'''            var dm = appContext.getResources().getDisplayMetrics();
            var density20 = Math.max(0.1, Number(dm.density || 1));
            var contentWidthDp20 = Number(windowWidth || dm.widthPixels || 0) / density20;
            var horizontal = contentWidthDp20 >= 320;
            var host = new LinearLayout(appContext);
            pickwordContentHost20 = host;
            host.setOrientation(LinearLayout.VERTICAL);
            host.setGravity(Gravity.CENTER_VERTICAL);

            var textColumn = new LinearLayout(appContext);
            textColumn.setOrientation(LinearLayout.VERTICAL);
            var imageColumn = new LinearLayout(appContext);
            imageColumn.setOrientation(LinearLayout.VERTICAL);
            imageColumn.setGravity(Gravity.CENTER);
            var thumb = pickwordImageController20.createThumbnailView();
            normalizePickwordThumbnailChrome20(thumb);
            var actionGrid20 = createPickwordImageActionGrid20(thumb);

            var mediaHeight20 = Math.round(uiDp(150, 188));
            if (horizontal) {
                var mediaRow20 = new LinearLayout(appContext);
                mediaRow20.setOrientation(LinearLayout.HORIZONTAL);
                mediaRow20.setGravity(Gravity.CENTER_VERTICAL);
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                mediaRow20.addView(imageColumn, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1));
                var gridLp20 = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1);
                gridLp20.leftMargin = uiDp(9, 12);
                mediaRow20.addView(actionGrid20, gridLp20);
                host.addView(mediaRow20, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, mediaHeight20));
            } else {
                var thumbHeight20 = Math.round(uiDp(126, 154));
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, thumbHeight20));
                host.addView(imageColumn, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, thumbHeight20));
                var compactGridLp20 = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, Math.round(uiDp(126, 154)));
                compactGridLp20.topMargin = uiDp(8, 10);
                host.addView(actionGrid20, compactGridLp20);
            }

            var compactTextHeight20 = Math.round(Math.min(textAreaHeight, uiDp(164, 220)));
            if (!(compactTextHeight20 > 0)) compactTextHeight20 = Math.round(uiDp(164, 220));
            var textLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, compactTextHeight20);
            textLp.topMargin = uiDp(10, 12);
            textColumn.addView(view, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
            host.addView(textColumn, textLp);

            var hostWidth20 = resolvedOriginalLp && resolvedOriginalLp.width !== undefined ? resolvedOriginalLp.width : LayoutParams.MATCH_PARENT;
            var hostLp = new LinearLayout.LayoutParams(hostWidth20, LayoutParams.WRAP_CONTENT);
            parent.addView(host, hostLp);
'''
    text = replace_once(text, old_layout, new_layout, "image layout")

    preview_anchor = '            previewTextView.setContentDescription("选中文字预览；点击编辑，长按去空格");\n'
    preview_new = (
        preview_anchor
        + "            if (currentPickwordMeta20 && currentPickwordMeta20.available === true) previewTextView.setVisibility(View.GONE);\n"
    )
    text = replace_once(text, preview_anchor, preview_new, "screenshot preview row")

    require("var horizontal = widthDp >= 520;" not in text, "old image layout still present")
    require(already_applied(text), "required layout markers missing after patch")
    TARGET.write_text(text, encoding="utf-8")
    print("OK pickword reference layout applied version=1.0.22 actions=share,qr,image,save")


if __name__ == "__main__":
    patch()
