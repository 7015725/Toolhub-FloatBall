package com.toolhub.floatball;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Small dependency-free native UI toolkit for the first APK milestone. */
final class Ui {
    static final int BG = Color.rgb(12, 18, 30), CARD = Color.rgb(23, 33, 49);
    static final int TEXT = Color.rgb(234, 241, 250), MUTED = Color.rgb(152, 170, 193);
    static final int ACCENT = Color.rgb(103, 232, 195);
    static int dp(Context c, float v) { return Math.round(v * c.getResources().getDisplayMetrics().density); }
    static GradientDrawable shape(Context c, int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(c, radius));
        return d;
    }
    static TextView text(Context c, String text, int size, int color) {
        TextView t = new TextView(c); t.setText(text); t.setTextSize(size); t.setTextColor(color);
        t.setLineSpacing(dp(c, 3), 1); return t;
    }
    static TextView heading(Context c, String text, int size) {
        TextView t = text(c, text, size, TEXT); t.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return t;
    }
    static LinearLayout column(Context c) {
        LinearLayout l = new LinearLayout(c); l.setOrientation(LinearLayout.VERTICAL); return l;
    }
    static LinearLayout card(Context c) {
        LinearLayout l = column(c); l.setBackground(shape(c, CARD, 20));
        int p = dp(c, 18); l.setPadding(p, p, p, p);
        return l;
    }
    static void add(LinearLayout parent, View view, int marginTop) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = dp(parent.getContext(), marginTop); parent.addView(view, p);
    }
    static Button button(Context c, String label, boolean primary, View.OnClickListener click) {
        Button b = new Button(c); b.setText(label); b.setAllCaps(false); b.setTextSize(15);
        b.setTextColor(primary ? BG : TEXT); b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setBackground(shape(c, primary ? ACCENT : Color.rgb(42, 56, 77), 13));
        b.setPadding(dp(c, 12), dp(c, 10), dp(c, 12), dp(c, 10));
        b.setMinHeight(dp(c, 48)); b.setOnClickListener(click); return b;
    }
}
