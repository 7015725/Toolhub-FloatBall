#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER_VERIFY = ROOT / "scripts/verify_pointer_regressions.py"
SIGN_WORKFLOW = ROOT / ".github/workflows/sign-toolhub.yml"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


def main():
    pointer = POINTER_VERIFY.read_text(encoding="utf-8")
    pointer = replace_once(
        pointer,
        "def main():\n    required = [",
        '''def main():
    skip_manifest = False
    for arg in sys.argv[1:]:
        if arg == "--skip-manifest":
            skip_manifest = True
        else:
            print("FAIL unknown argument: " + str(arg))
            return 2

    required = [''',
        "pointer main argument parser",
    )
    pointer = replace_once(
        pointer,
        "    verify_pointer_draw_visibility(result, pointer)\n    verify_manifest(result)\n",
        '''    verify_pointer_draw_visibility(result, pointer)
    if skip_manifest:
        result.passed.append("shared / manifest verified by dedicated signed-bundle step")
    else:
        verify_manifest(result)
''',
        "pointer manifest phase",
    )
    POINTER_VERIFY.write_text(pointer, encoding="utf-8")

    workflow = SIGN_WORKFLOW.read_text(encoding="utf-8")
    workflow = replace_once(
        workflow,
        "          python3 scripts/verify_pointer_regressions.py\n",
        "          python3 scripts/verify_pointer_regressions.py --skip-manifest\n",
        "sign pointer command",
    )
    pattern = re.compile(
        r"\n      - name: Apply pointer manifest phase fix\n.*?(?=\n      - name: Verify changed module versions\n)",
        re.S,
    )
    workflow, count = pattern.subn("", workflow)
    if count != 1:
        raise SystemExit("temporary workflow hook count=%d" % count)
    SIGN_WORKFLOW.write_text(workflow, encoding="utf-8")

    Path(__file__).unlink()
    print("Applied pointer manifest phase fix")


if __name__ == "__main__":
    main()
