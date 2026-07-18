#!/usr/bin/env python3
"""Apply the verified pickword image-viewer stage-2 patch exactly once."""
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    ROOT / "scripts" / ("stage2_patch_%02d.part" % index)
    for index in range(1, 6)
]
PATCH = ROOT / "scripts" / "stage2_final.patch"
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
RUNNER = ROOT / "scripts" / "stage2_patch_runner.py"
EXPECTED_SIZE = 82766
EXPECTED_SHA256 = "e3a101046ddcb5fe4465effcbdd97d0d6845d2ac2fe3c573734f3bafde53e345"
HOOK = (
    '    stage2_patch_runner = ROOT / "scripts" / "stage2_patch_runner.py"\n'
    '    if stage2_patch_runner.exists():\n'
    '        subprocess.check_call(["python3", str(stage2_patch_runner)], cwd=str(ROOT))\n\n'
)


def run(args):
    subprocess.check_call(list(args), cwd=str(ROOT))


def main():
    missing = [path.name for path in PARTS if not path.exists()]
    if missing:
        raise SystemExit("stage2 patch parts missing: " + ", ".join(missing))

    payload = b"".join(path.read_bytes() for path in PARTS)
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise SystemExit(
            "stage2 patch mismatch size=%d sha256=%s"
            % (len(payload), actual_sha256)
        )

    PATCH.write_bytes(payload)
    relative_patch = str(PATCH.relative_to(ROOT))
    run(["git", "apply", "--check", relative_patch])
    run(["git", "apply", relative_patch])

    generator = GENERATOR.read_text(encoding="utf-8")
    if generator.count(HOOK) != 1:
        raise SystemExit("stage2 generator hook mismatch")
    GENERATOR.write_text(generator.replace(HOOK, "", 1), encoding="utf-8")

    for path in PARTS + [PATCH, RUNNER]:
        try:
            path.unlink()
        except FileNotFoundError:
            pass

    run(["python3", "scripts/check_es5.py"])
    run(["python3", "scripts/check_js_syntax.py"])
    run(["python3", "scripts/verify_pickword_image_viewer.py"])

    run(["git", "config", "user.name", "github-actions[bot]"])
    run([
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    ])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "接入拾字截图保存分享与自动清理"])

    print(
        "stage2 patch applied size=%d sha256=%s"
        % (len(payload), actual_sha256)
    )


if __name__ == "__main__":
    main()
