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
EXPECTED_PART_SIZES = [19451, 17543, 17116, 17365, 11291]
EXPECTED_PART_SHA256 = [
    "50acd0045a1481baf4f6a40461b826a6cb5b7776a6ae8b0ec66d0b26ec01630b",
    "53d2d432ee83c0c4596d074478485b516c4e594f198895019e0f9ca231a36384",
    "b0c6e0ad27e8ab85850cfd5261837c6f9f11d28d39d2a2e02bcb045b15c32307",
    "3f7ce8bf02365f66038d67387c3fbf4512d7e34a05e27e651c897f33bac13126",
    "7abccd912de196908cc351180ae7f144161f05ab3d132ddd4a3faa017fd2ca97",
]
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


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


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
    except Exception:
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


def normalize_part(index, part):
    expected_size = EXPECTED_PART_SIZES[index]
    expected_sha256 = EXPECTED_PART_SHA256[index]
    if len(part) == expected_size and sha256_bytes(part) == expected_sha256:
        return part, "exact"

    if len(part) == expected_size + 1:
        for offset in range(len(part)):
            candidate = part[:offset] + part[offset + 1:]
            if sha256_bytes(candidate) == expected_sha256:
                return candidate, "drop_byte_%d_value_%d" % (offset, part[offset])

    raise RuntimeError(
        "stage2 part mismatch part=%02d size=%d sha256=%s expected_size=%d expected_sha256=%s"
        % (
            index + 1,
            len(part),
            sha256_bytes(part),
            expected_size,
            expected_sha256,
        )
    )


def load_verified_payload():
    normalized_parts = []
    normalizations = []
    for index, path in enumerate(PARTS):
        normalized, note = normalize_part(index, path.read_bytes())
        normalized_parts.append(normalized)
        normalizations.append("%02d:%s" % (index + 1, note))

    payload = b"".join(normalized_parts)
    actual_sha256 = sha256_bytes(payload)
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise RuntimeError(
            "stage2 normalized patch mismatch size=%d sha256=%s expected_size=%d expected_sha256=%s notes=%s"
            % (
                len(payload),
                actual_sha256,
                EXPECTED_SIZE,
                EXPECTED_SHA256,
                ",".join(normalizations),
            )
        )
    return payload, ",".join(normalizations)


def apply_patch():
    missing = [path.name for path in PARTS if not path.exists()]
    if missing:
        raise RuntimeError("stage2 patch parts missing: " + ", ".join(missing))

    payload, normalization = load_verified_payload()
    actual_sha256 = sha256_bytes(payload)

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
        ["python3", ".github/scripts/es5_scan.py"],
        ["python3", "scripts/verify_js_syntax.py"],
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
        "stage2 patch applied size=%d sha256=%s normalization=%s"
        % (len(payload), actual_sha256, normalization)
    )


def main():
    try:
        apply_patch()
    except BaseException:
        commit_diagnostic(traceback.format_exc())


if __name__ == "__main__":
    main()
