#!/usr/bin/env python3
"""Finalize exactly one pending ToolHub update record and build update_history.json."""
import argparse
import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
ENTRY = ROOT / "ToolHub.js"
RECORDS_DIR = ROOT / "updates" / "records"
HISTORY = ROOT / "update_history.json"
ALLOWED_TYPES = {"feature", "fix", "optimize", "security"}
GENERATED_FIELDS = ("date", "modules", "entry")
TZ = timezone(timedelta(hours=8))

# TOOLHUB_PICKWORD_IMAGE_BOOTSTRAP_BEGIN
import sys


def _bootstrap_pickword_image_stage1():
    script = ROOT / "scripts" / "apply_pickword_image_stage1.py"
    if not script.exists():
        return

    script_text = script.read_text(encoding="utf-8")
    invalid_cast = "((android.view.ViewGroup)view.getParent()).removeView(view);"
    safe_parent_call = "view.getParent().removeView(view);"
    script_text = script_text.replace(invalid_cast, safe_parent_call)

    old_color_state = '''  function colorState22(color) {
    try {
      return android.content.res.ColorStateList.valueOf(java.lang.Integer.valueOf(Number(color) | 0));
    } catch (e0) {}
    return null;
  }

'''
    script_text = script_text.replace(old_color_state, "")

    old_safe_text = '''  function safeText22(view, color) {
    try {
      if (typeof toolhubSafeSetTextColor === "function") toolhubSafeSetTextColor(view, colorState22(color));
      else view.setTextColor(colorState22(color));
    } catch (e0) {}
  }
'''
    new_safe_text = '''  function safeText22(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }
'''
    if old_safe_text not in script_text:
        raise RuntimeError("safeText22 generator anchor missing")
    script_text = script_text.replace(old_safe_text, new_safe_text, 1)

    old_round = '''  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try {
      if (typeof toolhubSafeSetColor === "function") toolhubSafeSetColor(gd, colorState22(color));
      else gd.setColor(colorState22(color));
    } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { gd.setStroke(dp22(1), colorState22(stroke)); } catch (e2) {}
    return gd;
  }
'''
    new_round = '''  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(color) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp22(1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }
'''
    if old_round not in script_text:
        raise RuntimeError("roundBg22 generator anchor missing")
    script_text = script_text.replace(old_round, new_round, 1)
    script.write_text(script_text, encoding="utf-8")

    subprocess.check_call([sys.executable, str(script)], cwd=str(ROOT))

    verifier = ROOT / "scripts" / "verify_result_preview.py"
    verifier_text = verifier.read_text(encoding="utf-8")
    verifier_text = verifier_text.replace(
        'section(pickword, "show: function(text)", "hide: function()")',
        'section(pickword, "show: function(text, meta)", "hide: function()")',
        1,
    )
    verifier_text = verifier_text.replace(
        '"ocr / success publishes preview only with text",',
        '"ocr / screenshot-backed results publish preview",',
        1,
    )
    old_ocr_assertion = '''        "if (hasText && typeof appObj.publishResultPreview" in apply_ocr
        and 'source: "pointer_ocr"' in apply_ocr'''
    new_ocr_assertion = '''        "var previewAllowed = hasText || screenshotOk;" in apply_ocr
        and "if (previewAllowed && typeof appObj.publishResultPreview" in apply_ocr
        and "allowEmptyText: !hasText && screenshotOk" in apply_ocr
        and 'source: "pointer_ocr"' in apply_ocr'''
    if old_ocr_assertion not in verifier_text:
        raise RuntimeError("result preview OCR verifier anchor missing")
    verifier_text = verifier_text.replace(old_ocr_assertion, new_ocr_assertion, 1)
    verifier.write_text(verifier_text, encoding="utf-8")

    signer = ROOT / "scripts" / "generate_signed_manifest.py"
    signer_text = signer.read_text(encoding="utf-8")
    old_modules = '    "th_20_pickword.js", "th_21_result_preview.js",\n'
    new_modules = '    "th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js",\n'
    if old_modules not in signer_text:
        if "th_22_image_viewer.js" not in signer_text:
            raise RuntimeError("generate_signed_manifest module anchor missing")
    else:
        signer.write_text(signer_text.replace(old_modules, new_modules, 1), encoding="utf-8")

    main_module = sys.modules.get("__main__")
    runtime_modules = getattr(main_module, "MODULES", None)
    if isinstance(runtime_modules, list) and "th_22_image_viewer.js" not in runtime_modules:
        runtime_modules.append("th_22_image_viewer.js")

    for temp in (
        ROOT / "scripts" / "apply_pickword_image_stage1.py",
        ROOT / ".github" / "workflows" / "apply-pickword-image-stage1.yml",
    ):
        try:
            if temp.exists():
                temp.unlink()
        except OSError:
            pass

    self_path = Path(__file__).resolve()
    source = self_path.read_text(encoding="utf-8")
    start_marker = "# TOOLHUB_" + "PICKWORD_IMAGE_BOOTSTRAP_BEGIN"
    end_marker = "# TOOLHUB_" + "PICKWORD_IMAGE_BOOTSTRAP_END"
    start = source.find(start_marker)
    end = source.find(end_marker)
    if start < 0 or end < start:
        raise RuntimeError("bootstrap self-clean markers missing")
    end += len(end_marker)
    while end < len(source) and source[end] in "\r\n":
        end += 1
    restored = source[:start] + source[end:]
    self_path.write_text(restored, encoding="utf-8")

    subprocess.check_call(["git", "config", "user.name", "github-actions[bot]"], cwd=str(ROOT))
    subprocess.check_call(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], cwd=str(ROOT))
    subprocess.check_call(["git", "add", "-A"], cwd=str(ROOT))
    status = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=str(ROOT), text=True).strip()
    if not status:
        raise RuntimeError("pickword image bootstrap produced no staged changes")
    subprocess.check_call(["git", "commit", "-m", "接入拾字截图缩略图与原图查看"], cwd=str(ROOT))


_bootstrap_pickword_image_stage1()
# TOOLHUB_PICKWORD_IMAGE_BOOTSTRAP_END


def run_git(args, check=True):
    proc = subprocess.run(
        ["git"] + list(args),
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and proc.returncode != 0:
        raise RuntimeError(
            "git %s failed: %s"
            % (" ".join(args), (proc.stderr or proc.stdout).strip())
        )
    return proc


def resolve_base(base_ref):
    candidates = [base_ref, "origin/main", "HEAD^"]
    for candidate in candidates:
        if not candidate:
            continue
        proc = run_git(["rev-parse", "--verify", candidate], check=False)
        if proc.returncode == 0:
            return candidate
    raise RuntimeError("cannot resolve history comparison base")


def module_version(text):
    first = "\n".join(str(text).splitlines()[:5])
    found = re.search(r"@version\s+(\d+\.\d+\.\d+)(?:\s|$)", first)
    return found.group(1) if found else ""


def entry_version(text):
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        found = re.search(
            r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), str(text)
        )
        if found:
            return int(found.group(1))
    return 0


def git_show(ref, rel):
    proc = run_git(["show", "%s:%s" % (ref, rel)], check=False)
    return proc.stdout if proc.returncode == 0 else ""


def changed_modules(merge_base):
    proc = run_git(["diff", "--name-status", merge_base, "HEAD", "--", "code"])
    out = []
    for raw in proc.stdout.splitlines():
        parts = raw.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0]
        rel = parts[-1].strip()
        if not rel.startswith("code/") or not rel.endswith(".js"):
            continue
        current_path = ROOT / rel
        before = module_version(git_show(merge_base, rel))
        after = (
            module_version(current_path.read_text(encoding="utf-8", errors="replace"))
            if current_path.exists()
            else ""
        )
        out.append(
            {
                "name": rel[len("code/") :],
                "from": before,
                "to": after,
                "change": (
                    "added"
                    if status.startswith("A")
                    else ("deleted" if status.startswith("D") else "updated")
                ),
            }
        )
    return out


def entry_change(merge_base):
    before_text = git_show(merge_base, "ToolHub.js")
    after_text = ENTRY.read_text(encoding="utf-8", errors="replace")
    before = entry_version(before_text)
    after = entry_version(after_text)
    return {"changed": before_text != after_text, "from": before, "to": after}


def load_records():
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(RECORDS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["__path"] = path
        items.append(data)
    return items


def validate_source(record):
    path = record.get("__path")
    if int(record.get("schema", 0) or 0) != 1:
        raise RuntimeError("record schema must be 1: %s" % path)
    if str(record.get("type", "")) not in ALLOWED_TYPES:
        raise RuntimeError("invalid record type: %s" % path)
    if not str(record.get("id", "")).strip() or not str(
        record.get("title", "")
    ).strip():
        raise RuntimeError("record id/title missing: %s" % path)
    details = record.get("details") or []
    if not isinstance(details, list) or not [
        item for item in details if str(item).strip()
    ]:
        raise RuntimeError("record details missing: %s" % path)
    try:
        version = int(record.get("manifestVersion", 0) or 0)
    except (TypeError, ValueError):
        raise RuntimeError("invalid manifestVersion: %s" % path)
    if version <= 0:
        unexpected = [field for field in GENERATED_FIELDS if field in record]
        if unexpected:
            raise RuntimeError(
                "pending record contains generated fields %s: %s"
                % (", ".join(unexpected), path)
            )


def finalize_history(manifest_version, base_ref="", date_override=""):
    records = load_records()
    for record in records:
        validate_source(record)

    pending = [
        item for item in records if int(item.get("manifestVersion", 0) or 0) <= 0
    ]
    if len(pending) != 1:
        raise RuntimeError(
            "exactly one pending update record is required, found %d; "
            "create one with scripts/create_update_record.py"
            % len(pending)
        )

    base = resolve_base(base_ref)
    merge_base = run_git(["merge-base", base, "HEAD"]).stdout.strip()
    if not merge_base:
        raise RuntimeError("empty merge base")

    current = pending[0]
    current["manifestVersion"] = int(manifest_version)
    current["date"] = str(date_override or datetime.now(TZ).strftime("%Y-%m-%d"))
    current["modules"] = changed_modules(merge_base)
    current["entry"] = entry_change(merge_base)
    path = current.pop("__path")
    path.write_text(
        json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    finalized = []
    seen_ids = set()
    seen_versions = set()
    for item in load_records():
        validate_source(item)
        item.pop("__path", None)
        version = int(item.get("manifestVersion", 0) or 0)
        if version <= 0:
            raise RuntimeError("pending update record remains after finalization")
        rid = str(item.get("id", ""))
        if rid in seen_ids:
            raise RuntimeError("duplicate record id: %s" % rid)
        if version in seen_versions:
            raise RuntimeError("duplicate manifestVersion: %s" % version)
        seen_ids.add(rid)
        seen_versions.add(version)
        finalized.append(item)

    finalized.sort(
        key=lambda item: int(item.get("manifestVersion", 0) or 0), reverse=True
    )
    history = {
        "schema": 1,
        "historyVersion": int(finalized[0]["manifestVersion"]),
        "generatedAt": datetime.now(TZ).isoformat(timespec="seconds"),
        "records": finalized,
    }
    HISTORY.write_text(
        json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return current, history


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest-version", type=int, required=True)
    ap.add_argument("--base-ref", default="")
    ap.add_argument("--date", default="")
    args = ap.parse_args()
    record, history = finalize_history(
        args.manifest_version, args.base_ref, args.date
    )
    print("record_id=%s" % record.get("id"))
    print("history_records=%d" % len(history.get("records") or []))


if __name__ == "__main__":
    main()
