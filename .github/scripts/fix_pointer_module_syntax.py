#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH17 = ROOT / "code" / "th_17_pointer.js"
VERIFY_YML = ROOT / ".github" / "workflows" / "verify.yml"
VERIFY_RELEASE = ROOT / "scripts" / "verify_pointer_text_release.py"
VERIFY_POSITION = ROOT / "scripts" / "verify_ball_position_state.py"
VERIFY_SYNTAX = ROOT / "scripts" / "verify_js_syntax.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one occurrence, got %s" % (label, count))
    return text.replace(old, new, 1)


th17 = TH17.read_text(encoding="utf-8")
th17 = replace_once(th17, "// @version 1.1.32", "// @version 1.1.33", "th17 version")
th17 = replace_once(
    th17,
    '''      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r: r, g: g, b: b };
    } catch(e0) {}
  return { r: fallbackR, g: fallbackG, b: fallbackB };
}''',
    '''      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r: r, g: g, b: b };
    }
  } catch(e0) {}
  return { r: fallbackR, g: fallbackG, b: fallbackB };
}''',
    "th17PointerColorRgb braces",
)
th17 = replace_once(
    th17,
    '''  var now = th17Now();
  }
  pointerState.lastValidPickText = String(pointerState.currentText);''',
    '''  var now = th17Now();
  pointerState.lastValidPickText = String(pointerState.currentText);''',
    "rememberPointerValidPick stray brace",
)
TH17.write_text(th17, encoding="utf-8")

syntax_script = '''#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
if not NODE:
    print("FAIL: node executable not found; cannot parse JavaScript modules")
    sys.exit(1)

files = sorted((ROOT / "code").glob("*.js"))
if not files:
    print("FAIL: no JavaScript modules found under code/")
    sys.exit(1)

failed = []
for path in files:
    result = subprocess.run(
        [NODE, "--check", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        failed.append((path.relative_to(ROOT), result.stdout.strip()))

if failed:
    for path, output in failed:
        print("FAIL: JavaScript syntax invalid: %s" % path)
        if output:
            print(output)
    sys.exit(1)

print("OK: JavaScript syntax valid for %d modules" % len(files))
'''
VERIFY_SYNTAX.write_text(syntax_script, encoding="utf-8")

verify_yml = VERIFY_YML.read_text(encoding="utf-8")
verify_yml = replace_once(
    verify_yml,
    "          python3 .github/scripts/es5_scan.py\n",
    "          python3 .github/scripts/es5_scan.py\n          python3 scripts/verify_js_syntax.py\n",
    "verify workflow syntax check",
)
VERIFY_YML.write_text(verify_yml, encoding="utf-8")

release = VERIFY_RELEASE.read_text(encoding="utf-8")
release = replace_once(release, '    "// @version 1.1.32",', '    "// @version 1.1.33",', "release verifier version")
structure_anchor = 'if "FloatBallAppWM.prototype.rememberPointerValidPick = function(st)" not in p17:\n    fail("clean recent candidate signature missing")\n'
if structure_anchor in release:
    release = replace_once(
        release,
        structure_anchor,
        structure_anchor + 'if "var now = th17Now();\\n  }\\n  pointerState.lastValidPickText" in p17:\n    fail("rememberPointerValidPick contains a stray closing brace")\n',
        "release verifier stray brace guard",
    )
else:
    release += '\nif "var now = th17Now();\\n  }\\n  pointerState.lastValidPickText" in p17:\n    fail("rememberPointerValidPick contains a stray closing brace")\n'
VERIFY_RELEASE.write_text(release, encoding="utf-8")

position = VERIFY_POSITION.read_text(encoding="utf-8")
position = replace_once(position, '        "// @version 1.1.32",', '        "// @version 1.1.33",', "position verifier version")
VERIFY_POSITION.write_text(position, encoding="utf-8")

print("pointer module syntax hotfix applied")
