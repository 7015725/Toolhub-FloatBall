# ToolHub-FloatBall 固定位置过渡实现加载期审查

## 结论

- **静态加载期证明：通过。** `th_15_extra.js` 的 B 级固定位置过渡实现会在 `th_19_position_state.js` 加载前短暂存在，但该窗口内不会创建 `FloatBallAppWM` 实例。
- **首次启动：通过。** 24 个模块同步加载完成后，入口才创建实例并调用 `startAsync()`。
- **设置重启：通过。** 重启流程先重新执行全部模块，再创建新实例。
- **真机位置基线：待完成。** 在真机基线完成前，不删除 B 级过渡实现。

## 加载顺序证据

```text
th_15_extra.js
  ↓
th_16_entry.js
  ↓
th_17_pointer.js
  ↓
th_18_pointer_ocr.js
  ↓
th_19_position_state.js
  ↓
new FloatBallAppWM(logger)
  ↓
app.startAsync(...)
```

- 模块总数：`24`
- 已验证实例创建点：`2`（首次启动、设置重启）
- `code/*.js` 内实例创建点：`0`
- `th_16`、`th_17`、`th_18` 对候选原型的加载期直接调用：`0`

## B 级候选基线

|方法|th_15 定义数|th_19 定义数|当前定义链|加载期结论|
|---|---:|---:|---|---|
|`applyConfiguredBallPosition`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`cancelConfiguredBallPositionApply`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`createBallLayoutParams`|2|1|`th_15_extra.js → th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`getConfiguredBallPosition`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`isBallPositionEffectKey`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`loadSavedPos`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`scheduleConfiguredBallPositionApply`|1|1|`th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|
|`snapToEdgeDocked`|1|1|`th_09_animation.js → th_15_extra.js → th_19_position_state.js`|实例创建前由 th_19 覆盖|

`snapToEdgeDocked` 还包含 `th_09_animation.js` 基础实现；本轮只证明 `th_15` 过渡定义在实例创建前被覆盖，不处理 `th_09`。

## 真机位置基线清单

整组删除 B 级实现前，需在当前 `main` 记录以下结果：

- [ ] 冷启动：左侧 / 右侧固定位置均正确。
- [ ] 高度：`0%`、`22%`、`50%`、`100%` 均正确且不越界。
- [ ] 屏幕旋转或配置变化后，悬浮球回到配置位置。
- [ ] 修改悬浮球尺寸后，位置、可见宽度和半隐藏状态正确。
- [ ] 动画开启和关闭时，位置结果一致。
- [ ] 单击打开/关闭主面板后，悬浮球位置不漂移。
- [ ] 向内拖动启动指针，松手后回到配置位置。
- [ ] 设置内重启 ToolHub 后，位置与冷启动一致。

建议保存每项的 `apply configured ball position` 日志以及最终 `ball x/y` 日志，作为删除前后对照。

## CI 约束

以下变化会使验证失败：

- `th_15` 到 `th_19` 的模块顺序改变。
- 模块加载完成前新增实例创建。
- 设置重启在模块重载前创建实例。
- `code/*.js` 新增 `FloatBallAppWM` 实例创建。
- B 级候选的定义数量、定义链或最终所有者改变。
- `th_16`、`th_17`、`th_18` 新增加载期原型直接调用风险。

## 使用方式

```bash
python3 scripts/verify_position_transition_load_order.py --write POSITION_TRANSITION_AUDIT.md
python3 scripts/verify_position_transition_load_order.py --check POSITION_TRANSITION_AUDIT.md
```

本报告由脚本根据 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和 `code/*.js` 确定性生成。
