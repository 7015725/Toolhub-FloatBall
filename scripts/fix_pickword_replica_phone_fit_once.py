#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "code" / "th_20_pickword.js"
text = path.read_text(encoding="utf-8")

old = '''        var iconSize = styleKind === "inline" || styleKind === "pin" ? 18 : 22;
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
            styleKind === "inline" || styleKind === "pin" ? uiDp(7, 9) : uiDp(12, 16), 0);'''
new = '''        var compactInline = styleKind === "inline";
        var compactPin = styleKind === "pin";
        var iconSize = compactInline ? (isTablet ? 18 : 14) : (compactPin ? (isTablet ? 18 : 15) : (isTablet ? 24 : 17));
        var icon = createReplicaIcon20(iconKind, styleKind, iconSize);
        var iconLp = new LinearLayout.LayoutParams(uiDp(iconSize, iconSize + 2), uiDp(iconSize, iconSize + 2));
        row.addView(icon, iconLp);
        var label = new TextView(appContext);
        label.setText(String(textValue));
        label.setTextSize(compactInline ? uiTextSize(9, 12) : (compactPin ? uiTextSize(10, 12) : uiTextSize(12, 15)));
        label.setSingleLine(true);
        label.setGravity(Gravity.CENTER_VERTICAL);
        label.setPadding(compactInline ? uiDp(3, 7) : (compactPin ? uiDp(4, 7) : uiDp(4, 9)), 0, 0, 0);
        row.addView(label);
        row.setTag(label);
        row.setContentDescription(String(textValue));
        var horizontalPad = compactInline ? uiDp(3, 7) : (compactPin ? uiDp(4, 7) : uiDp(4, 16));
        row.setPadding(horizontalPad, 0, horizontalPad, 0);'''
if text.count(old) != 1:
    raise SystemExit("replica button sizing marker mismatch")
text = text.replace(old, new, 1)

old_sep = '        if (vertical) lp.setMargins(uiDp(4, 6), 0, uiDp(4, 6), 0);'
new_sep = '        if (vertical) lp.setMargins(uiDp(2, 6), 0, uiDp(2, 6), 0);'
if text.count(old_sep) != 1:
    raise SystemExit("replica separator marker mismatch")
text = text.replace(old_sep, new_sep, 1)

path.write_text(text, encoding="utf-8")
print("OK pickword replica phone width fit")
