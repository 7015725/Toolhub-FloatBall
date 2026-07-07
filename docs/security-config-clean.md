# Security Config Clean Branch

This branch applies PR1 as a real runtime code change in `code/th_12_rebuild.js`.

The injected config defaults are compatibility-only:

- `SHELL_BRIDGE_MODE = compat`
- `SHORTCUT_EXEC_MODE = compat`
- `CONTENT_SECURITY_MODE = audit`
- `TOOLAPP_BACK_SURFACE_DOMINANCE = 1.08`

No action execution logic is changed in this PR.
