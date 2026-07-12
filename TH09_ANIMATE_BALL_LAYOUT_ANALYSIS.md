# `th_09` 动画布局候选分析

## 结论

- `th_09_animation.js` 的 `animateBallLayout` 不会进入已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖该方法，没有模块捕获旧函数对象。
- 5 次调用全部通过实例属性动态分派，运行时指向 `th_19`。
- `th_09` 旧实现没有动画 token 和 animator 身份保护，取消后仍可能进入结束回调并写回旧坐标，同时保存临时像素位置。
- `th_19` 已完整承担动画替换、取消、token 失效、逐帧身份校验、结束回调保护和失败回退。
- 静态删除门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_09_animation.js：旧 ValueAnimator 实现
  ↓ 被直接覆盖
th_19_position_state.js：固定位置状态机最终动画实现
  ↓
FloatBallAppWM 实例创建
```

- 定义链：`th_09_animation.js → th_19_position_state.js`。
- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 实例创建信号：`2`。
- 旧方法对象捕获：`0`。
- 动态字符串/方括号引用：`0`。

## 调用分布

|模块|调用次数|分派方式|
|---|---:|---|
|`th_09_animation.js`|4|`this.animateBallLayout(...)`，用于旧吸边与展开调用点|
|`th_19_position_state.js`|1|`this.animateBallLayout(...)`，用于配置位置动画|

全部调用在实例运行期读取当前原型方法，没有保存旧函数对象。

## 旧实现风险

- `onAnimationCancel()` 只清空 `ballAnimator`，没有标记取消状态。
- `onAnimationEnd()` 不校验 token、animator 身份或取消状态。
- 被替换或取消的动画仍可能写回旧 `toX/toY/toW`。
- 动画结束和异常回退都会调用 `savePos()`，与固定位置模式冲突。
- 没有统一取消上一动画，连续动画可能竞争更新 WindowManager。

## 最终实现保障

- 调用前执行 `cancelBallLayoutAnimation("replace")`。
- 每次动画生成新的 `ballAnimationToken`。
- 更新回调同时校验取消状态、token 和 animator 身份。
- 结束回调在写入最终坐标和调用 `endCb` 前重复校验。
- 取消操作先使 token 失效，再取消旧 animator。
- 不持久化临时像素坐标。
- 创建动画失败时只在当前 token 仍有效时执行同步回退。

## 处理门槛

后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JavaScript 语法、manifest 和 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th09_animate_ball_layout.py --write TH09_ANIMATE_BALL_LAYOUT_ANALYSIS.md
python3 scripts/verify_th09_animate_ball_layout.py --check TH09_ANIMATE_BALL_LAYOUT_ANALYSIS.md
```
