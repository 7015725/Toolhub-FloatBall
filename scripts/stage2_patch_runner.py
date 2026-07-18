#!/usr/bin/env python3
"""Apply the verified pickword image-viewer stage-2 patch exactly once."""
import hashlib
import subprocess
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    ROOT / "scripts" / ("stage2_patch_%02d.part" % index)
    for index in range(1, 6)
]
PATCH = ROOT / "scripts" / "stage2_final.patch"
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
RUNNER = ROOT / "scripts" / "stage2_patch_runner.py"
DIAGNOSTIC = ROOT / "stage2_patch_failure.txt"
EXPECTED_SIZE = 82766
EXPECTED_SHA256 = "e3a101046ddcb5fe4465effcbdd97d0d6845d2ac2fe3c573734f3bafde53e345"
HOOK = (
    '    stage2_patch_runner = ROOT / "scripts" / "stage2_patch_runner.py"\n'
    '    if stage2_patch_runner.exists():\n'
    '        subprocess.check_call(["python3", str(stage2_patch_runner)], cwd=str(ROOT))\n\n'
)


def run(args, check=True):
    return subprocess.run(
        list(args),
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=check,
    )


def configure_git():
    run(["git", "config", "user.name", "github-actions[bot]"])
    run([
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    ])


def remove_hook():
    generator = GENERATOR.read_text(encoding="utf-8")
    if generator.count(HOOK) != 1:
        raise RuntimeError("stage2 generator hook mismatch count=%d" % generator.count(HOOK))
    GENERATOR.write_text(generator.replace(HOOK, "", 1), encoding="utf-8")


def clean_temporary_files():
    for path in PARTS + [PATCH, RUNNER]:
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def commit_diagnostic(message):
    run(["git", "reset", "--hard", "HEAD"], check=False)
    try:
        remove_hook()
    except Exception as hook_error:
        message += "\nHOOK_CLEANUP_ERROR:\n" + traceback.format_exc()
    clean_temporary_files()
    text = str(message or "unknown stage2 patch failure")
    if len(text) > 12000:
        text = text[-12000:]
    DIAGNOSTIC.write_text(text + "\n", encoding="utf-8")
    configure_git()
    run(["git", "add", "-A"])
    result = run(
        ["git", "commit", "-m", "记录第二阶段统一补丁诊断"],
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit("stage2 diagnostic commit failed: " + str(result.stdout or ""))


def apply_patch():
    missing = [path.name for path in PARTS if not path.exists()]
    if missing:
        raise RuntimeError("stage2 patch parts missing: " + ", ".join(missing))

    payload = b"".join(path.read_bytes() for path in PARTS)
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise RuntimeError(
            "stage2 patch mismatch size=%d sha256=%s expected_size=%d expected_sha256=%s"
            % (len(payload), actual_sha256, EXPECTED_SIZE, EXPECTED_SHA256)
        )

    PATCH.write_bytes(payload)
    relative_patch = str(PATCH.relative_to(ROOT))
    check_result = run(["git", "apply", "--check", relative_patch], check=False)
    if check_result.returncode != 0:
        raise RuntimeError("git apply --check failed:\n" + str(check_result.stdout or ""))
    apply_result = run(["git", "apply", relative_patch], check=False)
    if apply_result.returncode != 0:
        raise RuntimeError("git apply failed:\n" + str(apply_result.stdout or ""))

    remove_hook()
    clean_temporary_files()

    for command in (
        ["python3", "scripts/check_es5.py"],
        ["python3", "scripts/check_js_syntax.py"],
        ["python3", "scripts/verify_pickword_image_viewer.py"],
    ):
        result = run(command, check=False)
        if result.returncode != 0:
            raise RuntimeError(
                "verification failed command=%s\n%s"
                % (" ".join(command), str(result.stdout or ""))
            )

    configure_git()
    run(["git", "add", "-A"])
    commit_result = run(
        ["git", "commit", "-m", "接入拾字截图保存分享与自动清理"],
        check=False,
    )
    if commit_result.returncode != 0:
        raise RuntimeError("stage2 source commit failed:\n" + str(commit_result.stdout or ""))

    print(
        "stage2 patch applied size=%d sha256=%s"
        % (len(payload), actual_sha256)
    )


def main():
    try:
        apply_patch()
    except BaseException:
        commit_diagnostic(traceback.format_exc())


if __name__ == "__main__":
    main()
