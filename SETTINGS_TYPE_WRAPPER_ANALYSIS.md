# 设置与类型包装链专项分析

## 结论

- `setPendingValue` 与 `applyImmediateEffectsForKey` 的包装职责均有效，不能直接删除行为。
- 两条链可以通过“完整逻辑并回 `th_05_persistence.js`”收敛，避免运行时连续覆盖原型方法。
- `th_12_rebuild.js` 应只保留兼容 Schema/default 与 `ConfigValidator.validate` 枚举类型修正。
- `th_15_extra.js` 的固定位置即时生效分支可并入 `th_05` 最终设置分派。
- 全部 `code/*.js` 在模块加载期不创建实例；设置交互发生在 `th_19` 加载完成之后。
- 静态收敛门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_05_persistence.js：基础 pending 与即时生效
  ↓
th_12_rebuild.js：枚举类型、主题/面板/指针刷新包装
  ↓
th_15_extra.js：固定位置设置包装
  ↓
th_19_position_state.js：固定位置最终状态机
  ↓
FloatBallAppWM 实例创建
```

- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 实例创建信号：`2`。
- `setPendingValue` 定义链：`th_05_persistence.js → th_12_rebuild.js`。
- `applyImmediateEffectsForKey` 定义链：`th_05_persistence.js → th_12_rebuild.js → th_15_extra.js`。

## 当前调用信号

|方法|直接调用|属性读取|动态引用|旧方法捕获|
|---|---|---|---:|---:|
|`setPendingValue`|`th_13_panel_ui.js`×9|`th_05_persistence.js`×1、`th_12_rebuild.js`×3、`th_13_panel_ui.js`×9|0|1|
|`applyImmediateEffectsForKey`|`th_05_persistence.js`×2|`th_05_persistence.js`×3、`th_12_rebuild.js`×3、`th_15_extra.js`×3|0|2|

## 必须保持的行为

1. `single_choice` 即使传入字符串，也必须按 Schema 恢复数字、布尔或字符串枚举原始类型。
2. `ConfigValidator.validate` 保存路径继续执行同一套枚举类型修正。
3. pending 值写入、dirty 标记、主题重建、悬浮球预览和 previewMode 刷新顺序不变。
4. 日志开关、日志保留天数和基础悬浮球视觉设置继续即时生效。
5. `BALL_IDLE_ALPHA` 继续触发悬浮球重建。
6. 主题和面板设置继续通过单次 posted refresh 刷新可见页面。
7. 指针设置继续只刷新活动指针窗口，不重建无关面板。
8. `BALL_POSITION_SIDE` / `BALL_POSITION_PERCENT` 继续调度配置位置恢复，不进入旧吸边路径。
9. 设置诊断异常不得阻断保存、预览或即时生效。

## 收敛方案

1. 将枚举 normalizer 提升为 `th_05_persistence.js` 的共享函数，基础 `setPendingValue()` 直接调用。
2. `th_12` 的 `ConfigValidator.validate` 包装复用同一 normalizer，删除 `setPendingValue` 原型包装和安装标记。
3. 将 7 个设置效果辅助方法迁入 `th_05_persistence.js`。
4. 将主题、面板、指针、悬浮球视觉和固定位置分派合并为 `th_05` 唯一 `applyImmediateEffectsForKey()`。
5. 删除 `th_12` 的 settings effect 原型安装器、重试线程和 `th_15` 固定位置包装。
6. 将两个方法登记为 `th_05_persistence.js` 单一所有者，受保护包装链预计 `13 → 11`。
7. 更新专项报告、模块边界、manifest 和 RSA 签名，并运行完整 CI。

## 使用方式

```bash
python3 scripts/verify_settings_type_wrappers.py --write SETTINGS_TYPE_WRAPPER_ANALYSIS.md
python3 scripts/verify_settings_type_wrappers.py --check SETTINGS_TYPE_WRAPPER_ANALYSIS.md
```
