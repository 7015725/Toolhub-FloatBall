# ToolHub Python 维护脚本索引

Python 脚本继续平铺在 `scripts/` 下，原因是 GitHub Actions 直接按路径调用，多个报告脚本也依赖同目录导入。此处采用逻辑分类而不是大规模移动文件，避免破坏 CI、命令行用法和导入路径。

## 命名规则

- `report_*`：生成确定性审计或资产清单，可使用 `--write`、`--check` 或 `--output`。
- `verify_*`：执行静态或流程回归，退出码非零表示校验失败。
- `build_*` / `create_*` / `generate_*`：构建发布数据或签名产物。
- `.github/scripts/`：仅供 GitHub Actions 使用的辅助脚本。

## 统一代码约束

- `verify_constraint_registry.py`：校验 `constraints/registry.json`、领域文件、验证器引用、精确例外和独立发布安全边界。
- `verify_code_constraints.py`：按语法、方法、API、线程和生命周期领域执行注册验证器，输出统一文本与 JSON 报告。
- `report_api_usage.py`：扫描高置信度 Android、Java、Javax、ShortX 与反射 API，并检查新增键、基线偏差和范围扩张。
- `generate_api_usage_baseline.py`：生成紧凑的当前 API 使用基线；`--refresh-legacy` 仅允许在初始化阶段使用。
- `verify_api_usage_scanner.py`：用固定样本验证注释、字符串、别名、反射、新增 API 和范围扩张检测。
- `verify_api_usage_policy.py`：校验当前基线、初始遗留范围、摘要和新增 API 显式分类规则。
- 方法归属由 `constraints/MODULE_BOUNDARIES.json` 提供真实约束；其他领域入口见 `constraints/README.md`。

## 构建与发布

- `build_update_history.py`
- `create_update_record.py`
- `generate_signed_manifest.py`

## 资产与审计报告

自动生成 Markdown 报告统一保存到 `docs/audits/`。

- `report_api_usage.py`
- `report_ci_python_execution.py`
- `report_dead_module_symbols.py`
- `report_entry_symbols.py`
- `report_module_symbol_audits.py`
- `report_protected_wrapper_chains.py`
- `report_python_script_inventory.py`

## CI 性能与引用维护

- `generate_api_usage_baseline.py`
- `profile_ci_python_checks.py`
- `verify_workflow_script_references.py`
- `verify_repository_layout.py`：约束根目录只保留项目入口、发布资产和总说明，防止文档、审计报告与方法基线回流。

## 发布安全校验

- `verify_atomic_update.py`
- `verify_changed_module_versions.py`
- `verify_manifest.py`
- `verify_module_versions.py`
- `verify_release_record_flow.py`
- `verify_release_transaction.py`
- `verify_update_history.py`
- `verify_update_security_mode.py`
- `verify_update_version_page.py`

## 运行时与功能回归

- `verify_animation_callback_safety.py`
- `verify_api_usage_policy.py`
- `verify_api_usage_scanner.py`
- `verify_ball_position_state.py`
- `verify_ball_rebuild_rollback.py`
- `verify_button_editor_direct_save.py`
- `verify_button_editor_layout.py`
- `verify_button_shortcut_thread_affinity.py`
- `verify_coloros_rhino_color_safety.py`
- `verify_content_security.py`
- `verify_documentation_consistency.py`
- `verify_entry_lifecycle.py`
- `verify_entry_redundancy_cleanup.py`
- `verify_entry_writable_probe.py`
- `verify_github_only_source.py`
- `verify_js_syntax.py`
- `verify_legacy_main_panel_cleanup.py`
- `verify_legacy_theme_cleanup.py`
- `verify_main_panel_adaptive_layout.py`
- `verify_main_panel_close_lifecycle.py`
- `verify_main_panel_drag_sort.py`
- `verify_main_panel_grid_sizing.py`
- `verify_main_panel_more_menu.py`
- `verify_main_panel_paging.py`
- `verify_main_panel_runtime_status.py`
- `verify_main_panel_visual_tuning.py`
- `verify_major_event_logging.py`
- `verify_module_boundaries.py`
- `verify_panel_layout_settings_cleanup.py`
- `verify_pickword_emoji_grapheme.py`
- `verify_pickword_image_meta_handoff.py`
- `verify_pickword_image_viewer.py`
- `verify_pickword_long_click_api34.py`
- `verify_pickword_share_close_cleanup.py`
- `verify_pickword_translate_settings.py`
- `verify_pickword_unified_cleanup.py`
- `verify_pointer_regressions.py`
- `verify_result_preview.py`
- `verify_rhino_color_api_safety.py`
- `verify_schema_validator.py`
- `verify_screenshot_manager.py`
- `verify_settings_color_roles.py`
- `verify_settings_color_scheme.py`
- `verify_shell_bridge_security.py`
- `verify_shell_log_redaction.py`
- `verify_shortcut_security.py`
- `verify_sqlite_debounce_race.py`
- `verify_sqlite_storage.py`
- `verify_startup_status.py`
- `verify_toolapp_layout.py`
- `verify_toolapp_main_thread_affinity.py`

## 合并边界

- 发布、Manifest、签名、回滚和版本校验保持独立安全边界。
- 只因存在同名 `require()` / `forbid()` 模板，不代表两个专项校验职责相同。
- 高度同构且读取同一数据源的报告脚本应参数化合并；`th_09` 与 `th_15` 报告已统一到 `report_module_symbol_audits.py`。
