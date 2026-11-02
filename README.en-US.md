# ShortX ToolHub

ShortX ToolHub is a modular Android floating tool framework designed for **ShortX / Rhino ES5 JavaScript**.

`ToolHub.js` is responsible for secure updates, module verification, and startup. Capabilities such as the floating ball, tool panel, settings page, button management, themes, structured SQLite, icon and color pickers, screen word picking, and area OCR are maintained as separate modules in `code/th_*.js`.

## Repository

```text
GitHub: https://github.com/7015725/Toolhub-FloatBall
```

Related Documentation:

```text
docs/docs/docs/STRUCTURE.md
docs/docs/docs/ARCHITECTURE.md
docs/docs/docs/SQLITE_STORAGE.md
docs/README.md
scripts/README.md
docs/features/button-types.md
docs/security/security-config-clean.md
docs/audits/docs/audits/docs/audits/MODULE_SYMBOL_AUDIT.md
```

---

## Core Capabilities

- Modular loading: The entry point handles downloading, verification, and sequential loading of sub-modules.
- Security by default: Manifest RSA signature verification, keyId, anti-rollback, SHA-256, and file size checks are enabled.
- Offline resilience: If network or remote manifest anomalies occur, the system can continue using previously verified local modules.
- Structured Storage: Settings, buttons, and Schemas use fully structured SQLite storage.
- No JSON Blobs: Full JSON documents are not saved in the database, and no JSON configuration files are created.
- Atomic Settings: Settings are saved row-by-row based on key and actual data type.
- Recursive Buttons: Buttons are saved using a main table and a recursive parameter node table.
- Recursive Schema: Schemas use recursive relationship nodes to store arrays, objects, and options.
- Clean Migration: Old JSON document tables and configuration files are deleted upon successful migration.
- Responsive UI: The ToolApp settings page supports phone, landscape, and tablet wide-screen layouts.
- Adaptive Grid: The main button panel uses a configurable adaptive grid; width percentage only determines the column budget, while the grid is calculated based on card size, precise spacing, and visible row count. The panel uses the same precise width/height as the WindowManager to avoid extra white space on the right.
- Advanced Panel Features: Supports real-time running status, drag-to-sort, pagination snapping, direct save for adding/editing buttons, hidden pagination dots on single pages, and flicker-free closing; default background opacity is 0.92.
- Button Management: Supports searching, filtering, enabling/disabling, sorting, and editing.
- Interactive Pointer: Supports floating ball dragging to invoke a screen pointer, hovering to pick text, small-box rollback, and area selection OCR.
- Screenshot Management: Supports viewing, saving, sharing, deleting, auto-cleaning, and managing screenshots captured during word picking.
- Navigation Support: Supports Android back button, predictive back, and horizontal swipe-to-back in ToolApp.
- Error Logging: Startup, update, storage, and runtime exceptions are written to `ToolHub/logs/`.

---

## Quick Deployment

### 1. Install Entry Point

Copy `ToolHub.js` from the repository and paste it into a ShortX JavaScript task to run.

> `ToolHub.js` is the root of trust, containing the built-in RSA public key and minimum trusted manifest version. When the entry point itself changes, the code in the ShortX task must be replaced manually.

After reading the verified manifest, the entry point compares the local version with `manifest.entry.version`. If the remote entry is newer, a notification for manual replacement will be shown; it will not automatically download, overwrite, or restart `ToolHub.js`.

### 2. First Launch

The entry point will automatically:

1. Create `shortx.getShortXDir()/ToolHub/code/`.
2. Download or read `manifest.json`.
3. Verify `manifest.sig` in full mode.
4. Check keyId, manifest version, and anti-rollback status.
5. Download or reuse local sub-modules.
6. Verify module SHA-256 and file size.
7. Load modules.
8. Create or open `toolhub.db`.
9. Migrate old configurations to structured tables.
10. Delete old JSON document tables and configuration files.
11. Start the floating ball.

---

## Entry Configuration

> The update source is fixed to GitHub; source-switching configuration is no longer provided.

```javascript
var UPDATE_SECURITY_MODE = 2;   // 0: Normal, 1: Manifest verification, 2: Full signature verification
```

| Mode | Description |
|---|---|
| `0` | Normal update, strict signature verification disabled |
| `1` | Verify module SHA-256 and file size via manifest |
| `2` | Verify signature, keyId, version, anti-rollback, SHA-256, and file size |

Only explicitly setting this to `0` enables normal update mode. Invalid configurations (null, illegal characters, compound strings, out-of-bounds values) will force a fallback to `2` to prevent silent disabling of signature verification due to config errors.

---

## Device Directory Structure

```text
shortx.getShortXDir()/
└── ToolHub/
    ├── code/
    │   ├── th_01_base.js
    │   ├── th_02_core.js
    │   ├── th_03_icon.js
    │   ├── th_04_theme.js
    │   ├── th_05_persistence.js
    │   ├── th_06_icon_parser.js
    │   ├── th_08_content.js
    │   ├── th_09_animation.js
    │   ├── th_10_shell.js
    │   ├── th_11_action.js
    │   ├── th_12_rebuild.js
    │   ├── th_13_panel_ui.js
    │   ├── th_14_panels.js
    │   ├── th_14_button_shortcut.js
    │   ├── th_14_button_icon_editor.js
    │   ├── th_14_button_editor.js
    │   ├── th_14_color_picker.js
    │   ├── th_14_icon_picker.js
    │   ├── th_14_schema_editor.js
    │   ├── th_15_extra.js
    │   ├── th_15_main_panel.js
    │   ├── th_16_entry.js
    │   ├── th_17_pointer.js
    │   ├── th_18_pointer_ocr.js
    │   ├── th_19_position_state.js
    │   ├── th_20_pickword.js
    │   ├── th_21_result_preview.js
    │   ├── th_22_image_viewer.js
    │   └── th_23_screenshot_manager.js
    ├── logs/
    │   ├── init.log
    │   └── ShortX_ToolHub_yyyyMMdd.log
    ├── cache/
    │   ├── update_history.json
    │   └── update_history.meta.json
    └── toolhub.db
```

The following are no longer kept in the configuration directory:

```text
settings.json
buttons.json
schema.json
.sqlite_pending_*.json
```

SQLite may generate `toolhub.db-journal`. This is a transaction helper file created and cleaned up automatically by SQLite.

---

## Fully Structured SQLite

### Database Location

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

Current storage format:

```text
storageFormat = structured
storageFormatVersion = 2
```

### Tables

```text
toolhub.db
├── toolhub_meta
├── toolhub_settings
├── toolhub_buttons
├── toolhub_button_values
├── toolhub_schema_values
├── toolhub_button_icons
├── toolhub_pickword_images
└── toolhub_pickword_image_exports
```

### Settings

`toolhub_settings` saves one setting per row:

```text
setting_key
value_type
value_integer
value_real
value_text
updated_at
```

Example:

```text
BALL_SIZE_DP          integer  45
PANEL_BG_ALPHA        real     0.92
PANEL_WIDTH_PERCENT   integer  90
BALL_PANEL_GAP_DP     integer  10
ENABLE_ANIMATIONS     boolean  1
BALL_POSITION_SIDE    text     right
```

### Buttons

`toolhub_buttons` saves:

```text
Button ID
Sort Order
Title
Action Type
Enabled Status
Updated Time
```

`toolhub_button_values` saves other parameters and nested structures, such as:

```text
Icons
Package Name
User ID
Shell Commands
Broadcast Actions
Shortcut Intent / Execution Mode / Legacy compatibility code
Array and Object parameters
```

### Schema

`toolhub_schema_values` saves using parent-child node relationships:

```text
section
key
name
type
min / max / step
options
children
items
```

Every value is saved as `boolean`, `integer`, `real`, `text`, `null`, `object`, or `array`. There is no JSON payload column.

---

## Legacy Configuration Migration

When upgrading to the structured version for the first time, the migration source priority is:

```text
Old pending recovery JSON
        ↓
Old toolhub_documents table
        ↓
Old settings.json / buttons.json / schema.json
        ↓
Built-in default values
```

Old data is read only once.

After successful migration:

1. Settings are written to `toolhub_settings`.
2. Buttons are written to `toolhub_buttons` and `toolhub_button_values`.
3. Schema is written to `toolhub_schema_values`.
4. `storage_format_version=2` is written.
5. `toolhub_documents` is deleted.
6. `VACUUM` is executed to clean up old document data pages.
7. Old JSON configs, backups, and pending recovery files are deleted.

If migration fails, old data will not be deleted, and the database will not be overwritten with default values.

---

## Saving and Fail-safe

Saving uses SQLite transactions:

```text
beginTransaction
        ↓
Replace structured rows for corresponding config domain
        ↓
setTransactionSuccessful
        ↓
endTransaction
```

Saving is reported as successful only after the transaction is finally committed.

If database write fails:

- No JSON fallback files are generated.
- Pending write tasks are kept in memory.
- Returning failure occurs upon flushing before closing.
- Already committed data remains unchanged.
- Specific database errors are recorded in logs.

If database read fails:

```text
activeBackend = sqlite-read-only
```

The current session starts temporarily using default settings or rescue buttons and prohibits writing back to avoid overwriting the original database.

---

## Configuration Call Chain

Existing interfaces remain unchanged:

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

Call Chain:

```text
ConfigManager
        │
        ▼
Config Verification & Compatibility Upgrade
        │
        ▼
Structured SQLite Adapter
        │
        ├── settings → typed rows
        ├── buttons  → main rows + value tree
        └── schema   → value tree
```

Temporary JSON strings may be generated in memory during adaptation to maintain compatibility with existing `ConfigManager` interfaces; these strings are not written to the database or files.

---

## Viewing Storage Status

```javascript
var info = ConfigManager.getStorageInfo();
```

Main fields:

```text
engine
storageFormat
storageFormatVersion
activeBackend
databasePath
databaseExists
databaseHealthy
pendingWrites
blockedWrites
rowCounts
migrationSource
legacyConfigFileCount
legacyFilesRemoved
jsonConfigEnabled
lastDbError
lastError
```

Normal log output:

```text
storage engine=sqlite format=structured backend=sqlite-structured path=... exists=true healthy=true pending=0 error=
```

For detailed descriptions, see [`docs/docs/docs/SQLITE_STORAGE.md`](docs/docs/docs/SQLITE_STORAGE.md), which contains unified rules for button icon BLOBs, deduplication, migration, and cleanup.

---

## Floating Ball and Pointer

```text
Single click ball       Open / Close main panel
Long press ball         Open settings page
Press and drag          Invoke screen pointer
Release over text       Copy text after hover duration is met
Continue hover & drag   Enter area selection OCR
Release outside area    Capture screenshot OCR and copy
Small box mis-touch     Roll back to copy original text
```

---

## Main Panel Layout and Edge Snapping

### Layout Calculation

The main panel uses a "Grid determines panel dimensions" size chain:

```text
Safe area and width percentage
        ↓
Calculate available width budget and actual column count
        ↓
Calculate card width, precise spacing, and grid dimensions
        ↓
Reverse engineer panel width/height from grid
        ↓
WindowManager uses the same precise dimensions
```

The width percentage only determines the available budget and does not directly stretch the panel to that screen width. If the last row of buttons is incomplete, only normal empty grid slots are kept; the right side of the panel is not expanded. The old fixed-grid fallback builder has been removed; a module error is explicitly reported if `th_15_main_panel.js` is not loaded, instead of silently showing the old panel version.

| Setting | Valid Range | Default | Description |
|---|---:|---:|---|
| Panel Width % | 35%～100% | 90% | Width budget used to calculate column count |
| Auto Max Columns | 1～10 | 6 | Actual columns still limited by safe width and button width |
| Min Button Width | 48～200dp | 92dp | Reference min width used for auto-columning |
| Button Height | 48～160dp | 78dp | Fixed card height |
| Visible Rows | 1～10 | 4 | Scroll by page if exceeded |
| Button Spacing | 4～24dp | 8dp | Odd pixels are split into precise front/back spacing |
| Panel Inner Padding | 8～32dp | 12dp | Included in final panel width calculation |
| Ball-to-Panel Gap | 0～50dp | 10dp | `0dp` is a valid configuration and won't fallback |

### Edge Snapping Settings

- `Dock Edge` and `Height Position (%)` determine the fixed position of the floating ball.
- `Edge Exposure Ratio` determines the proportion of the ball that remains on screen when snapped.
- `Enable Idle Auto-Snap` only controls the timer for automatic snapping during idle states.
- `Snap Delay (No Panel)` only takes effect when no panel is visible.
- `Snap Delay (Panel Visible)` only controls the ball snapping back and will not automatically close the main panel.
- The main panel automatically selects the expansion direction based on the dock edge and is finally clipped within the safe area.

The following old settings have been removed from the settings page and runtime semantics; old SQLite and Schema data will be cleaned during normalization:

```text
Default Panel Position
Manual Vertical Offset
Position Save Throttle
Old Fixed Columns (`PANEL_COLS`)
Old Fixed Button Size (`PANEL_ITEM_SIZE_DP`)
```

The settings page preview and the official main panel share the same precise width/height and position calculations. After saving layout parameters, the main panel is rebuilt according to current configurations.

---

## Button Actions

| type | Behavior |
|---|---|
| `open_settings` | Open settings page |
| `open_viewer` | Open log viewer |
| `toast` | Show Toast |
| `app` | Launch App, optional user specification |
| `shell` | Execute command via Shell broadcast bridge |
| `broadcast` | Send broadcast |
| `shortcut` | Launches `intentUri` by default; only executes legacy code if `legacy_js` is explicitly set |
| `content` | Access ContentProvider via read/write whitelist |
| `pointer` | Launch word picking and area OCR |

---

## Module Responsibilities

| File | Responsibility |
|---|---|
| `th_01_base.js` | Paths, File IO, config verification, default settings, and Schema |
| `th_02_core.js` | Fully structured SQLite, legacy migration, core state |
| `th_03_icon.js` | Icon and Bitmap processing |
| `th_04_theme.js` | Screen, theme, colors, Toast, and vibration |
| `th_05_persistence.js` | Position and settings saving, edit cache, and preview refresh |
| `th_06_icon_parser.js` | ShortX icon parsing |
| `th_08_content.js` | Controlled ContentProvider reading and whitelist-based writing |
| `th_09_animation.js` | Animations, edge snapping, panel and back-button adaptation |
| `th_10_shell.js` | Shell broadcast bridge |
| `th_11_action.js` | Button action dispatching |
| `th_12_rebuild.js` | Rebuilding after config changes |
| `th_13_panel_ui.js` | Base UI for settings items |
| `th_14_*` | Settings page, button editor, icon/color/schema editors |
| `th_15_extra.js` | ToolApp Shell, page stack, panel display, and precise WindowManager dimensions |
| `th_15_main_panel.js` | Main button panel, adaptive grid, pagination, drag-sort, and running status |
| `th_16_entry.js` | Startup, broadcasts, shutdown, and resource release |
| `th_17_pointer.js` | Pointer, word picking, area selection, and status colors |
| `th_18_pointer_ocr.js` | Screenshot OCR and overlay processing |
| `th_19_position_state.js` | Fixed ball position, pointer layout, and size rebuild transaction rollback |
| `th_20_pickword.js` | Word picking selection, copying, translation, pinning, and magnifying glass |
| `th_21_result_preview.js` | Custom drawn top-two-line preview for word picking and OCR |
| `th_22_image_viewer.js` | Thumbnail view, original image view, zoom/pan, save/share/delete, and auto-clean |
| `th_23_screenshot_manager.js` | Screenshot manager list, Internal/Saved categories, thumbnail cache, and external opening |

---

## Logs

```text
Startup Log: ToolHub/logs/init.log
Runtime Log: ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log
```

Standard runtime logs still use text files to facilitate troubleshooting if the database itself cannot be opened.

---

## Maintenance and Release

Official Update Process:

1. Run `python3 scripts/create_update_record.py` to create exactly one pending signature record.
2. Modify `code/*.js` or `ToolHub.js`; maintain Rhino ES5 and increment versions of changed modules or entry point.
3. Create a non-draft PR on `fix/*` branches with Chinese titles and descriptions.
4. `sign-toolhub` verifies the unique pending record and completes the release date, manifest version, module diffs, and entry diffs.
5. The signing process generates `manifest.json`, `manifest.sig`, `ToolHub.js.sha256`, `update_history.json` and completes RSA verification.
6. Merge into `main` after `verify` and `sign-toolhub` both pass.
7. Once `verify` passes on `main`, `publish-release` releases `v<manifest.version>`, locking to the verified commit.

PR titles, manual workflow inputs, and default text are not used to generate formal release information; titles, dates, and updates come solely from structured update records.

Key Verifications:

```bash
python3 .github/scripts/es5_scan.py
python3 scripts/verify_sqlite_storage.py
python3 scripts/verify_manifest.py
python3 .github/scripts/verify_manifest_signature.py
```

---

## Update History

### 2026-07-14

**Improved Main Panel Adaptive Layout and Edge Snapping**

- Main panel dimensions and WindowManager size are now reverse-engineered from actual grid width/height to fix extra white space on the right.
- Main panel width budget expanded to 35%～100%, and auto max columns expanded to 1～10.
- Reference width for button columns expanded to 48～200dp; button height expanded to 48～160dp.
- Support for `0dp` configuration for the Ball-to-Panel gap.
- Settings page preview and official main panel now share the same size and position calculations.
- Removed old fixed column, fixed square button, and space-filling fallback builders; main panel is now solely implemented by `th_15_main_panel.js`.
- Cleaned up three invalid settings: "Default Panel Position", "Manual Vertical Offset", and "Position Save Throttle".
- Adjusted edge snapping setting names to align with actual runtime behavior.

### 2026-07-13

**Improved ToolHub Entry File Update Notifications**

- Added `entry` metadata to the signed manifest to record the version, SHA-256, and file size of `ToolHub.js`.
- Local and remote entry versions are compared during startup and manual update checks.
- Users are prompted to manually replace `ToolHub.js` in the ShortX task if the entry version is outdated.
- Active prompts for the same remote entry version occur only once.
- Entry files are not included in the sub-module update list and do not participate in auto-download, transaction replacement, or auto-restart.
- CI verification fails if `ToolHub.js` is modified without incrementing the entry version.

### 2026-07-11

**Configuration migrated to fully structured SQLite**

- Settings are saved row-by-row with actual types.
- Buttons are split into a main table and recursive parameter nodes.
- Schema is split into recursive relationship nodes.
- Removed JSON payload document storage.
- Old document tables and external JSON configs are deleted after successful migration.
- `VACUUM` executed to clean old document data pages.
- Database anomalies now trigger read-only rescue mode instead of falling back to JSON.

---

## Compatibility Constraints

- Runtime Environment: ShortX JS / Rhino ES5.
- Use `var` and standard functions exclusively.
- Forbidden: `let/const`, arrow functions, template strings, `class`, optional chaining, nullish coalescing, and spread syntax.
- Android UI preference: WindowManager, FrameLayout, Canvas, and native Views.
- No dependency on WebView.
- Do not use `return` at the top level of the entry point.
- Do not commit signing private keys.
- root and Shell capabilities must be triggered by explicit configuration or user action.

## Updates and Versioning

The settings home page provides an "Updates & Version" entry. Upon entering, it checks GitHub for a signed manifest; a red dot appears if sub-modules or entry files need updating. The update page supports viewing all pending modules, confirming transactional updates, manual entry replacement prompts, and a history log of 10 entries per page.

History cache directory:

```text
shortx.getShortXDir()/ToolHub/cache/
├── update_history.json
└── update_history.meta.json
```

To maintain update records, run:

```bash
python3 scripts/create_update_record.py
```

GitHub Actions will fill in the date, manifest version, module version diffs, and entry version diffs, generating an `update_history.json` protected by the signed manifest. If records are missing or multiple pending records exist, signing will fail immediately and no `auto-*` records will be generated.

Each official version is released as `v<manifest.version>`, with the Release title, date, and body matching the latest history record. Release attachments always include:

```text
ToolHub.js
ToolHub.js.sha256
manifest.json
manifest.sig
update_history.json
```

## Word Picking Screenshot Phase 2

- The original image page now supports saving to public directories, system sharing via content URI, and permanent deletion of ToolHub internal screenshots.
- The default public directory is `/storage/emulated/0/Pictures/ToolHub`, which can be modified and tested for writability in "Settings → Word Picking".
- Internal screenshots are kept for 7 days by default; temporary share copies are kept for 24 hours. Publicly saved copies are not subject to auto-cleanup.
- Image states are recorded in a separate relationship table in `toolhub.db`; deleting a screenshot preserves the picked text and current selection state.

## Screenshot Manager

The main panel provides a "Screenshot Management" entry with "Internal" and "Saved" tabs. Internal screenshots support viewing, saving, sharing, and deleting. The "Saved" tab manages copies in the system gallery or public directories; deleting a public copy prompts an additional permanent deletion warning. Public copies are not automatically cleaned by the internal screenshot retention policy.
