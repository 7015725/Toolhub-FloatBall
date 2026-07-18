#!/usr/bin/env python3
import json
import os
import subprocess
from pathlib import Path

BRANCH = "fix/pickword-emoji-perf-clean-20260718"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("patch anchor %s count=%d" % (label, count))
    return text.replace(old, new, 1)


def run_git(root, args, capture=False):
    return subprocess.run(
        ["git"] + list(args),
        cwd=str(root),
        check=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def run_bootstrap():
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    if os.environ.get("TARGET_BRANCH") != BRANCH:
        return

    root = Path(__file__).resolve().parents[1]
    source_path = root / "code" / "th_20_pickword.js"
    source = source_path.read_text(encoding="utf-8")

    source = replace_once(
        source,
        '            units: [],\n            unitStarts: [],\n',
        '            units: [],\n',
        "remove-unit-starts-state",
    )
    source = replace_once(
        source,
        '''        function rebuildTextUnits20(source) {
            state.units = segmentPickwordGraphemes20(source);
            state.unitStarts = [];
            for (var i = 0; i < state.units.length; i++) state.unitStarts.push(state.units[i].start);
        }
''',
        '''        function rebuildTextUnits20(source) {
            state.units = segmentPickwordGraphemes20(source);
        }
''',
        "remove-unit-starts-build",
    )

    old_count_block = '''        function countSelectedUnits20(setObj) {
            if (!setObj || !state.units) return 0;
            var count = 0;
            for (var i = 0; i < state.units.length; i++) {
                var unit = state.units[i];
                if (!unit || unit.newline) continue;
                if (isUnitSelectedWithResolver20(unit, function(indexValue) { return setObj[indexValue] === true; })) count++;
            }
            return count;
        }

        function countDragSelectionUnits20(snapshotSet, minIndex, maxIndex, removeRange) {
            if (!state.units) return 0;
            if (minIndex > maxIndex) { var temp = minIndex; minIndex = maxIndex; maxIndex = temp; }
            var count = 0;
            for (var i = 0; i < state.units.length; i++) {
                var unit = state.units[i];
                if (!unit || unit.newline) continue;
                var selected = isUnitSelectedWithResolver20(unit, function(indexValue) { return snapshotSet && snapshotSet[indexValue] === true; });
                if (unit.end - 1 >= minIndex && unit.start <= maxIndex) selected = removeRange !== true;
                if (selected) count++;
            }
            return count;
        }
'''
    new_count_block = '''        function isUnitSelectedInSet20(unit, setObj) {
            if (!unit || unit.newline || !setObj) return false;
            for (var index = unit.start; index < unit.end; index++) {
                if (setObj[index] === true) return true;
            }
            return false;
        }

        function countSelectedUnits20(setObj) {
            if (!setObj || !state.units) return 0;
            var count = 0;
            for (var i = 0; i < state.units.length; i++) {
                var unit = state.units[i];
                if (!unit || unit.newline) continue;
                if (isUnitSelectedInSet20(unit, setObj)) count++;
            }
            return count;
        }

        function countDragSelectionUnits20(snapshotSet, minIndex, maxIndex, removeRange) {
            if (!state.units || state.units.length === 0 || minIndex < 0 || maxIndex < 0) return dragSnapshotCount;
            if (minIndex > maxIndex) { var temp = minIndex; minIndex = maxIndex; maxIndex = temp; }
            var startUnitIndex = findPickwordUnitIndex20(state.units, minIndex);
            var endUnitIndex = findPickwordUnitIndex20(state.units, maxIndex);
            if (startUnitIndex < 0 || endUnitIndex < 0) return dragSnapshotCount;
            if (startUnitIndex > endUnitIndex) { var unitTemp = startUnitIndex; startUnitIndex = endUnitIndex; endUnitIndex = unitTemp; }
            var rangeUnitCount = 0;
            var selectedInRange = 0;
            for (var i = startUnitIndex; i <= endUnitIndex; i++) {
                var unit = state.units[i];
                if (!unit || unit.newline) continue;
                rangeUnitCount++;
                if (isUnitSelectedInSet20(unit, snapshotSet)) selectedInRange++;
            }
            if (removeRange === true) return Math.max(0, dragSnapshotCount - selectedInRange);
            return Math.max(0, dragSnapshotCount + rangeUnitCount - selectedInRange);
        }
'''
    source = replace_once(source, old_count_block, new_count_block, "range-only-drag-count")
    source_path.write_text(source, encoding="utf-8")

    verify_path = root / "scripts" / "verify_pickword_emoji_grapheme.py"
    verify = verify_path.read_text(encoding="utf-8")
    verify = replace_once(
        verify,
        'require("getCharAdvance(ch)" not in text, "legacy UTF-16 advance path remains")\n',
        'require("getCharAdvance(ch)" not in text, "legacy UTF-16 advance path remains")\n'
        'require("unitStarts" not in text, "unused grapheme-start cache remains")\n'
        'require("isUnitSelectedInSet20" in text, "direct grapheme selection helper missing")\n'
        'require("var startUnitIndex = findPickwordUnitIndex20(state.units, minIndex);" in text, "drag count does not use range lookup")\n'
        'require("dragSnapshotCount + rangeUnitCount - selectedInRange" in text, "drag add-count formula missing")\n'
        'require("dragSnapshotCount - selectedInRange" in text, "drag remove-count formula missing")\n'
        'require("function(indexValue) { return setObj[indexValue] === true; }" not in text, "selection count allocates per-unit closures")\n'
        'require("function(indexValue) { return snapshotSet && snapshotSet[indexValue] === true; }" not in text, "drag count allocates per-unit closures")\n',
        "extend-emoji-verifier",
    )
    verify_path.write_text(verify, encoding="utf-8")

    record_path = root / "updates" / "records" / "fix-pickword-emoji-grapheme.json"
    current = json.loads(record_path.read_text(encoding="utf-8"))
    pending = {
        "schema": 1,
        "id": "fix-pickword-emoji-grapheme",
        "type": "fix",
        "title": "修复拾字 Emoji 字素绘制与完整选区",
        "details": list(current.get("details") or []),
        "manifestVersion": 0,
    }
    record_path.write_text(json.dumps(pending, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    verifier_path = root / "scripts" / "verify_changed_module_versions.py"
    base_verifier = run_git(root, ["show", "origin/main:scripts/verify_changed_module_versions.py"], capture=True).stdout
    verifier_path.write_bytes(base_verifier)
    Path(__file__).unlink(missing_ok=True)

    subprocess.run(["python3", str(verify_path)], cwd=str(root), check=True)
    subprocess.run(["python3", str(root / "scripts" / "verify_update_history.py"), "--require-one-pending"], cwd=str(root), check=True)
    run_git(root, ["diff", "--check"])

    run_git(root, ["config", "user.name", "github-actions[bot]"])
    run_git(root, ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run_git(root, ["add", "-A"])
    run_git(root, ["commit", "-m", "优化拾字 Emoji 拖选计数热路径"])
