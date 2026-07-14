#!/usr/bin/env python3
from pathlib import Path

from rhino_color_migration_lib import bump_version, rewrite_module, sync_version_contracts

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
SCRIPTS = ROOT / "scripts"
THEME_PATH = CODE / "th_04_theme.js"
HELPERS_PATH = SCRIPTS / "rhino_color_safe_helpers.inc"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
SIGN_WORKFLOW = ROOT / ".github" / "workflows" / "sign-toolhub.yml"
DIAG_WORKFLOW = ROOT / ".github" / "workflows" / "diagnose-rhino-color-migration.yml"
SETTINGS_ROLES_VERIFY = SCRIPTS / "verify_settings_color_roles.py"
SELF_PATH = Path(__file__).resolve()

BRIDGE_BEGIN = "// =======================【Rhino / ColorOS 安全颜色桥】======================="
BRIDGE_END = "// =======================【工具：UI样式辅助】======================"
DRAFT_EXCEPTION = """        (
          github.event.pull_request.draft == false ||
          github.event.pull_request.head.ref == 'fix/complete-rhino-color-api-migration-20260714'
        ) &&
"""
STANDARD_DRAFT = "        github.event.pull_request.draft == false &&\n"
TEMP_STEP = """      - name: Apply full Rhino color API migration
        shell: bash
        run: python3 scripts/apply_rhino_color_api_full_migration.py

"""
TEMP_CLEANUP = """      - name: Remove temporary color migration files
        shell: bash
        run: |
          rm -f scripts/apply_rhino_color_api_full_migration.py
          rm -f scripts/rhino_color_migration_lib.py
          rm -f scripts/rhino_color_safe_helpers.inc
          rm -f .github/workflows/diagnose-rhino-color-migration.yml

"""


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text.rstrip("\n") + "\n", encoding="utf-8")


def install_helpers():
    theme = read(THEME_PATH)
    if "function toolhubSafeColorStateListFromStates(" in theme:
        return
    marker = "function toolhubColorLuminance(colorValue) {"
    if marker not in theme:
        raise SystemExit("FAIL full-color-migration: helper marker missing")
    helpers = read(HELPERS_PATH).strip("\n")
    write(THEME_PATH, theme.replace(marker, helpers + "\n\n" + marker, 1))


def update_validator_contracts():
    text = read(SETTINGS_ROLES_VERIFY)
    old_home = 'if "tv.setTextColor(T.onSurface);" not in home_header:'
    new_home = 'if "toolhubSafeSetTextColor(tv, T.onSurface);" not in home_header:'
    old_master = 'if "title.setTextColor(T.onSurface);" not in master:'
    new_master = 'if "toolhubSafeSetTextColor(title, T.onSurface);" not in master:'
    if old_home not in text and new_home not in text:
        raise SystemExit("FAIL full-color-migration: settings home color contract missing")
    if old_master not in text and new_master not in text:
        raise SystemExit("FAIL full-color-migration: settings master color contract missing")
    text = text.replace(old_home, new_home, 1)
    text = text.replace(old_master, new_master, 1)
    write(SETTINGS_ROLES_VERIFY, text)


def update_workflows():
    old_line = "          python3 scripts/verify_coloros_rhino_color_safety.py\n"
    new_line = "          python3 scripts/verify_rhino_color_api_safety.py\n"

    verify = read(VERIFY_WORKFLOW)
    if new_line not in verify:
        verify = verify.replace(old_line, old_line + new_line, 1)
    write(VERIFY_WORKFLOW, verify)

    sign = read(SIGN_WORKFLOW)
    sign = sign.replace(DRAFT_EXCEPTION, STANDARD_DRAFT, 1)
    sign = sign.replace(TEMP_STEP, "", 1)
    sign = sign.replace(TEMP_CLEANUP, "", 1)
    sign = sign.replace(
        "4189825+github-actions[bot]@users.noreply.github.com",
        "41898282+github-actions[bot]@users.noreply.github.com",
        1,
    )
    sign = sign.replace(
        "          git add -A\n",
        "          git add manifest.json manifest.sig ToolHub.js.sha256\n",
        1,
    )
    if new_line not in sign:
        sign = sign.replace(old_line, old_line + new_line, 1)
    write(SIGN_WORKFLOW, sign)

    if DIAG_WORKFLOW.exists():
        DIAG_WORKFLOW.unlink()


def main():
    install_helpers()
    changes = []

    for path in sorted(CODE.glob("*.js")):
        original = read(path)
        migrated = rewrite_module(
            path, original, THEME_PATH, BRIDGE_BEGIN, BRIDGE_END
        )
        if migrated == original:
            continue
        migrated, old_version, new_version = bump_version(migrated, path.name)
        write(path, migrated)
        changes.append((path.name, old_version, new_version))
        print("MIGRATED %s %s->%s" % (path.name, old_version, new_version))

    if not changes:
        raise SystemExit("FAIL full-color-migration: no modules changed")

    sync_version_contracts(SCRIPTS, SELF_PATH, changes)
    update_validator_contracts()
    update_workflows()
    print("MIGRATION modules=%d" % len(changes))


if __name__ == "__main__":
    main()
