#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path.cwd()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL screenshot-public-followup: %s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


th22_path = ROOT / "code" / "th_22_image_viewer.js"
th22 = th22_path.read_text(encoding="utf-8")
th22 = replace_once(
    th22,
    "        var savedInfo = existingSave22(path);",
    "        var savedInfo = existingSave22(appObj, path);",
    "controller existing-save app context",
)
th22 = replace_once(
    th22,
    '''    if (!deleted && publicPath) {
      try {
        var file = new java.io.File(String(publicPath));
        deleted = !file.exists() || file.delete();
      } catch (e1) {}
    }
''',
    '''    if (!deleted && publicPath) {
      try {
        var file = normalizePublicFile22(publicPath);
        if (file.exists()) deleted = file.isFile() && file.delete();
      } catch (e1) {}
    }
''',
    "public delete Java visibility boundary",
)
th22_path.write_text(th22, encoding="utf-8")

viewer_test_path = ROOT / "scripts" / "verify_pickword_image_viewer.py"
viewer_test = viewer_test_path.read_text(encoding="utf-8")
anchor = '''require('已保存副本状态无法确认，请稍后重试' in th22, "uncertain saved copy must not be duplicated")
'''
viewer_test = replace_once(
    viewer_test,
    anchor,
    anchor + '''require('var savedInfo = existingSave22(appObj, path);' in th22, "image controller must pass app context to saved-copy probe")
''',
    "viewer controller app-context regression",
)
viewer_test_path.write_text(viewer_test, encoding="utf-8")

manager_test_path = ROOT / "scripts" / "verify_screenshot_manager.py"
manager_test = manager_test_path.read_text(encoding="utf-8")
anchor2 = '''require('公共副本存在 · 预览受限' in th23 and '公共副本状态待确认' in th23, 'saved state UI distinction missing')
'''
manager_test = replace_once(
    manager_test,
    anchor2,
    anchor2 + '''require('deleted = !file.exists() || file.delete();' not in th22, 'Java-invisible public file must not count as deleted')
require('if (file.exists()) deleted = file.isFile() && file.delete();' in th22 and 'rootDeletePublic22(appObj, publicPath)' in th22, 'public delete must fall through to Root when Java path is invisible')
''',
    "manager public-delete visibility regression",
)
manager_test_path.write_text(manager_test, encoding="utf-8")

record_path = ROOT / "updates" / "records" / "20260719-screenshot-public-availability.json"
record = json.loads(record_path.read_text(encoding="utf-8"))
detail = "公共副本删除不再把 system_server Java 路径不可见当作文件已删除；Java 无法确认时继续使用 Root 同时清理映射路径与实体路径。"
if detail not in record.get("details", []):
    record.setdefault("details", []).append(detail)
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK screenshot-public-availability follow-up patched")
