# `th_15` 屏幕重排候选分析

## 结论

- `th_15_extra.js` 的 `onScreenChangedReflow` 包装不会进入任何已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖该方法，且不捕获或调用 `th_15` 包装。
- 屏幕变化调用通过 `this.onScreenChangedReflow(...)` 动态分派，运行时最终指向 `th_19`。
- `th_19` 已完整承担屏幕尺寸稳定性、指针重排、旧语义任务取消和固定位置恢复。
- 静态删除门槛通过；本报告阶段仍不修改运行时代码。

## 定义链

```text
th_09_animation.js：旧比例坐标重排
  ↓ 被 th_15 捕获并包装
th_15_extra.js：调用旧实现后尝试恢复固定位置
  ↓ 被 th_19 直接覆盖，不再捕获
th_19_position_state.js：最终固定位置与指针重排实现
  ↓
new FloatBallAppWM(logger)
```

- 实例创建点：`2`，均位于完整模块加载之后。
- `th_15` 到 `th_19` 之间没有实例创建。

## 调用与捕获

|类型|模块|数量/名称|结论|
|---|---|---|---|
|直接调用|`th_09_animation.js`|`4`|均通过实例属性动态分派|
|直接调用|`th_19_position_state.js`|`3`|均通过实例属性动态分派|
|旧方法捕获|`th_15_extra.js`|`oldOnScreenChangedReflow`|仅用于构造随后被覆盖的包装|
|动态字符串/方括号引用|全部模块|`0`|不存在绕过原型覆盖的动态入口|

## 最终实现覆盖范围

`th_19_position_state.js` 当前最终实现同时保证：

- 关闭中或悬浮球未加入时不执行重排；
- 过滤旋转方向与屏幕宽高暂时不一致的中间状态；
- 更新统一的 `state.screen`；
- 取消旧指针语义坐标任务；
- 调用 `onPointerScreenChangedReflow` 更新指针窗口；
- 通过 `applyConfiguredBallPosition` 恢复设置中的边缘和高度；
- 不再使用比例坐标、临时像素位置或 `savePos()`。

## 删除前验证条件

后续处理 PR 必须继续通过：

1. `verify_module_boundaries.py`；
2. `report_dead_module_symbols.py`；
3. `report_th15_extra_symbols.py`；
4. `verify_ball_position_state.py`；
5. Rhino ES5、JavaScript 语法、manifest 与 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th15_screen_reflow_candidate.py --write TH15_SCREEN_REFLOW_ANALYSIS.md
python3 scripts/verify_th15_screen_reflow_candidate.py --check TH15_SCREEN_REFLOW_ANALYSIS.md
```
