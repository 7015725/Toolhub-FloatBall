# `th_09` 屏幕重排链分析

## 结论

- `th_09_animation.js` 的 `onScreenChangedReflow` 与 `scheduleScreenReflow` 不会进入已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖两者，且没有模块捕获旧函数对象。
- DisplayListener、配置变化广播、即时重排和延迟重排均通过实例属性动态分派，运行时指向 `th_19`。
- `th_19` 已完整承担稳定尺寸判断、延迟任务去重、指针重排、语义任务取消和固定位置恢复。
- 静态删除门槛通过；本阶段仍不修改运行时代码。

## 定义链

```text
th_09_animation.js：旧比例坐标和简单延迟重排
  ↓ 被直接覆盖
th_19_position_state.js：最终固定位置、指针重排和 token 调度
  ↓
FloatBallAppWM 实例创建并注册 DisplayListener
```

- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 中实例创建信号：`2`。
- 模块顺序：`th_09` 位于 `th_19` 之前，`th_19` 是关键模块。

## 调用与回调

|入口|所在模块|分派方式|结论|
|---|---|---|---|
|DisplayListener|`th_09_animation.js`|`self.scheduleScreenReflow(...)`|动态调用最终原型|
|配置变化广播|`th_16_entry.js`|`self.scheduleScreenReflow(...)`|动态调用最终原型|
|即时重排|`th_09` / `th_19` 调度器|`this.onScreenChangedReflow(...)`|动态调用最终原型|
|延迟重排|Runnable|`self.onScreenChangedReflow(...)`|不捕获旧方法对象|
|旧方法变量捕获|全部模块|`0`|不存在绕过覆盖的旧函数对象|
|动态字符串/方括号引用|全部模块|`0`|不存在动态旁路入口|

## 最终实现覆盖范围

`th_19_position_state.js` 当前保证：

- 过滤旋转方向与宽高暂时不一致的中间状态；
- 使用 `screenReflowToken` 和可移除 Runnable 去重延迟任务；
- 更新统一的 `state.screen`；
- 取消旧指针语义坐标任务；
- 调用 `onPointerScreenChangedReflow` 更新指针窗口；
- 按设置恢复悬浮球边缘和高度；
- 不再使用比例坐标、临时像素位置或 `savePos()`。

## 处理门槛

后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JS 语法、manifest 与 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th09_screen_reflow_pair.py --write TH09_SCREEN_REFLOW_ANALYSIS.md
python3 scripts/verify_th09_screen_reflow_pair.py --check TH09_SCREEN_REFLOW_ANALYSIS.md
```
