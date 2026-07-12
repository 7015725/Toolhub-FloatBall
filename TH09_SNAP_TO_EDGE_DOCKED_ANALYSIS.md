# `th_09` 吸边候选分析

## 结论

- `th_09_animation.js` 的 `snapToEdgeDocked` 不会进入已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖该方法，没有模块捕获旧函数对象。
- 两个调用入口都通过实例属性动态分派：闲置吸边计时器和 `EDGE_VISIBLE_RATIO` 即时生效。
- `th_09` 旧实现根据当前像素位置猜测左右侧，并在非动画路径保存临时像素坐标，与固定位置配置模型冲突。
- `th_19` 最终实现统一委托 `applyConfiguredBallPosition()`，按配置侧边和百分比恢复位置，并复用受 token 保护的动画。
- 指针开始、指针结束、手势取消和屏幕重排直接调用配置位置恢复，不依赖旧吸边实现。
- 静态删除门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_09_animation.js：旧按当前坐标判断左右侧的通用吸边
  ↓ 被直接覆盖
th_19_position_state.js：固定侧边和百分比位置的最终实现
  ↓
FloatBallAppWM 实例创建
```

- 定义链：`th_09_animation.js → th_19_position_state.js`。
- `code/*.js` 中实例创建：`0`。
- 旧方法对象捕获：`0`。
- 动态字符串/方括号引用：`0`。

## 调用入口

|入口|模块|调用|运行时行为|
|---|---|---|---|
|闲置吸边计时器|`th_09_animation.js`|`self.snapToEdgeDocked(true)`|动态调用 `th_19`，按配置位置动画恢复|
|可见比例即时生效|`th_05_persistence.js`|`this.snapToEdgeDocked(false)`|动态调用 `th_19`，按配置位置立即恢复|

调用方没有传入 `forceSide`，旧实现的强制侧边参数没有外部使用者。

## 指针和屏幕变化链

- 指针启动：`applyConfiguredBallPosition(false, "pointer_start")`。
- 指针结束：`applyConfiguredBallPosition(true, "pointer_end")`。
- 非指针拖动取消：`applyConfiguredBallPosition(true, "gesture_cancel")`。
- 屏幕变化：`applyConfiguredBallPosition(false, "screen_reflow:...")`。

这些关键链路均直接使用最终配置位置状态机，不经过 `th_09.snapToEdgeDocked`。

## 旧实现风险

- 根据悬浮球当前中心点判断左右侧，可能偏离 `BALL_POSITION_SIDE`。
- 使用当前像素 `y`，不能保证恢复 `BALL_POSITION_PERCENT`。
- 非动画路径调用 `savePos()`，与固定位置模式不再持久化像素坐标的规则冲突。
- 自行管理 `docked`、`dockSide`、透明度和宽度，重复固定位置状态机职责。
- 动画开关只由调用参数控制，没有统一结合 `ENABLE_ANIMATIONS`。

## 最终实现保障

- `snapToEdgeDocked()` 只委托 `applyConfiguredBallPosition()`。
- 位置由 `getConfiguredBallPosition()` 根据侧边、百分比和当前屏幕尺寸计算。
- 应用前取消闲置计时器和旧布局动画。
- 动画仅在调用参数和 `ENABLE_ANIMATIONS` 同时允许时启用。
- 非动画路径直接更新同一组 `LayoutParams`，不保存临时像素坐标。
- 指针、旋转和设置变更共享同一个位置恢复入口。

## 处理门槛

后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JavaScript 语法、manifest 和 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th09_snap_to_edge_docked.py --write TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md
python3 scripts/verify_th09_snap_to_edge_docked.py --check TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md
```
