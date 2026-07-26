#!/usr/bin/env python3
"""Register ShortXUI beta module boundaries and exact API usage constraints."""
from pathlib import Path
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "code" / "th_24_shortx_ui_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
API_RULES = ROOT / "constraints" / "api.json"
API_BASELINE = ROOT / "constraints" / "API_USAGE_BASELINE.json"
SCANNER = ROOT / "scripts" / "report_api_usage.py"
PHASE_FILES = {
    "code/th_24_shortx_ui_runtime.js",
    "code/th_34_shortx_ui_lab.js",
}


def write_json(path, value):
    text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def patch_runtime_scanner_aliases():
    text = RUNTIME.read_text(encoding="utf-8")
    original = text
    text = re.sub(r"(?m)^// @version 0\.1\.2$", "// @version 0.1.3", text, count=1)
    text = text.replace('VERSION: "0.1.2"', 'VERSION: "0.1.3"', 1)
    replacements = {
        "      var metrics = new DisplayMetrics();":
            "      var platformMetrics = new DisplayMetrics();",
        "wm.getDefaultDisplay().getRealMetrics(metrics)":
            "wm.getDefaultDisplay().getRealMetrics(platformMetrics)",
        "else metrics = ctx.getResources().getDisplayMetrics();":
            "else platformMetrics = ctx.getResources().getDisplayMetrics();",
        "} catch (ignoredReal) { metrics = ctx.getResources().getDisplayMetrics(); }":
            "} catch (ignoredReal) { platformMetrics = ctx.getResources().getDisplayMetrics(); }",
        "Number(metrics.widthPixels || 0)":
            "Number(platformMetrics.widthPixels || 0)",
        "Number(metrics.heightPixels || 0)":
            "Number(platformMetrics.heightPixels || 0)",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)

    shape_pattern = re.compile(
        r"  SXUI\.Shape = \{.*?\n  \};\n\n(?=  SXUI\.Diagnostics = \{)",
        re.S,
    )
    shape_replacement = '''  SXUI.Shape = {
    roundRect: function (fillColor, radiusPx) {
      var gradient = new GradientDrawable();
      gradient.setShape(GradientDrawable.RECTANGLE);
      sxuiSafeSetGradientColor(gradient, fillColor);
      gradient.setCornerRadius(Math.max(0, sxuiNumber(radiusPx, 0)));
      return gradient;
    },
    strokeRect: function (fillColor, strokeColor, strokeWidthPx, radiusPx) {
      var gradient = SXUI.Shape.roundRect(fillColor, radiusPx);
      sxuiSafeSetGradientStroke(gradient, strokeWidthPx, strokeColor);
      return gradient;
    },
    pressed: function (normalColor, pressedColor, radiusPx) {
      var stateDrawable = new StateListDrawable();
      stateDrawable.addState(
        sxuiJintArray([Packages.android.R.attr.state_pressed]),
        SXUI.Shape.roundRect(pressedColor, radiusPx)
      );
      stateDrawable.addState(
        sxuiJintArray([]),
        SXUI.Shape.roundRect(normalColor, radiusPx)
      );
      return stateDrawable;
    },
    transparentPressed: function (pressedColor, radiusPx) {
      return SXUI.Shape.pressed(Color.TRANSPARENT, pressedColor, radiusPx);
    }
  };

'''
    text, count = shape_pattern.subn(shape_replacement, text, count=1)
    if count != 1:
        raise SystemExit("ShortXUI Shape scanner-alias patch failed")
    if "var metrics = new DisplayMetrics()" in text:
        raise SystemExit("ambiguous DisplayMetrics alias remains")
    if "// @version 0.1.3" not in text or 'VERSION: "0.1.3"' not in text:
        raise SystemExit("ShortXUI runtime 0.1.3 version patch incomplete")
    if text == original:
        return False
    RUNTIME.write_text(text, encoding="utf-8")
    return True


def wrapper_record(method, old_variable, reason):
    return {
        "method": method,
        "definitions": ["th_15_extra.js" if method != "getSettingsHomeCategoryDefs" else "th_14_panels.js", "th_34_shortx_ui_lab.js"],
        "effectiveOwner": "th_34_shortx_ui_lab.js",
        "type": "wrapper",
        "reason": reason,
        "wrappers": [
            {
                "module": "th_34_shortx_ui_lab.js",
                "owner": "th_15_extra.js" if method != "getSettingsHomeCategoryDefs" else "th_14_panels.js",
                "oldVariable": old_variable,
            }
        ],
    }


def patch_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    additions = {
        "buildPanelView": wrapper_record(
            "buildPanelView", "oldBuildPanelView",
            "Beta 实验室新增独立 ToolApp 页面路由，其他面板继续委托原实现",
        ),
        "getSettingsHomeCategoryDefs": wrapper_record(
            "getSettingsHomeCategoryDefs", "oldGetSettingsHomeCategoryDefs",
            "Beta 设置首页追加 ShortX UI 实验室入口，保留原分类生成结果",
        ),
        "getToolAppTitle": wrapper_record(
            "getToolAppTitle", "oldGetToolAppTitle",
            "为 ShortX UI 实验室提供标题，其他路由继续委托原实现",
        ),
        "isToolAppRoute": wrapper_record(
            "isToolAppRoute", "oldIsToolAppRoute",
            "登记 ShortX UI 实验室为 Beta ToolApp 路由，其他路由继续委托原实现",
        ),
    }
    records = data.get("duplicateDefinitions") or []
    kept = [item for item in records if item.get("method") not in additions]
    kept.extend(additions[key] for key in sorted(additions))
    data["duplicateDefinitions"] = kept
    return write_json(BOUNDARIES, data)


def load_scanner():
    spec = importlib.util.spec_from_file_location("toolhub_api_scanner", SCANNER)
    if spec is None or spec.loader is None:
        raise SystemExit("cannot load API scanner")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def patch_api_constraints():
    scanner = load_scanner()
    files, entries = scanner.scan_repository(ROOT)
    phase_entries = [
        item for item in entries
        if PHASE_FILES.intersection(set(item.get("files") or []))
    ]
    if not phase_entries:
        raise SystemExit("ShortXUI API usage was not detected")
    usage_keys = sorted(item["key"] for item in phase_entries)
    scope = sorted({
        file_name
        for item in phase_entries
        for file_name in (item.get("files") or [])
    })

    api_doc = json.loads(API_RULES.read_text(encoding="utf-8"))
    rule_id = "api-shortx-ui-beta-phase1"
    rules = [item for item in (api_doc.get("rules") or []) if item.get("id") != rule_id]
    rules.append({
        "id": rule_id,
        "usageKeys": usage_keys,
        "source": "android/java",
        "classOrObject": "ShortXUI phase-1 dependency set",
        "method": "mixed",
        "classification": "guarded",
        "scope": scope,
        "allowScopeExpansion": True,
        "minApi": 33,
        "guard": "WindowMetrics and WindowInsets calls are guarded by Build.VERSION.SDK_INT >= 30; ToolHub runtime minimum API is 33",
        "owner": "ShortXUI Beta runtime and ToolHub adapter",
        "threadContract": "Android View creation remains on ToolApp main; Handler dispatch targets the supplied owner Looper; synchronous waits have finite timeouts",
        "fallback": "WindowMetrics falls back to DisplayMetrics; color operations require the injected ToolHub safe bridge; failed diagnostics do not replace production UI",
        "reason": "登记 Beta 第一阶段基础运行时和实验室实际使用的精确 Android/Java API 及既有 API 范围扩张",
    })
    api_doc["rules"] = rules
    api_changed = write_json(API_RULES, api_doc)
    baseline_changed = write_json(
        API_BASELINE,
        scanner.baseline_document(files, entries),
    )
    return api_changed or baseline_changed


def main():
    runtime_changed = patch_runtime_scanner_aliases()
    boundaries_changed = patch_boundaries()
    api_changed = patch_api_constraints()
    print(
        "ShortXUI constraints prepared runtime=%s boundaries=%s api=%s"
        % (runtime_changed, boundaries_changed, api_changed)
    )


if __name__ == "__main__":
    main()
