# `th_09_animation.js` 独立审查报告

## 结论

- 本报告只审查 `th_09_animation.js`，不自动删除运行时代码。
- 模块边界、定义链和最终所有者一致，未发现未登记重复定义。
- 当前后续覆盖候选：`animateBallLayout`、`snapToEdgeDocked`。
- `th_09` 含动画监听、显示监听、延迟 Runnable 和触摸回调；候选必须逐组完成调用链与真机验证。
- 唯一实现和受保护覆盖链默认保留，不能仅凭调用次数低删除。

## 文件概况

- 版本：`1.0.3`
- 行数：`994`
- 字节数：`38070`
- ToolHub 加载模块：`24`
- `th_09` 原型方法定义：`28`
- `th_09` 唯一原型方法：`28`
- 模块内重复定义方法：`0`
- 后续覆盖候选：`2`
- 受保护覆盖/包装链：`0`
- 唯一实现：`26`

## 异步与生命周期信号

|信号|数量|风险含义|
|---|---:|---|
|`Runnable`|6|可能持有实例并延迟调用最终原型方法|
|`postDelayed`|1|需要排除旧回调对象和竞态|
|`DisplayListener`|1|屏幕旋转和尺寸变化入口|
|`AnimatorListener`|1|动画结束/取消回调|
|`AnimatorUpdateListener`|1|逐帧 WindowManager 更新|
|`OnTouchListener`|1|触摸和吸边状态入口|

## 后续覆盖候选

|方法|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|
|---|---|---|---|---:|---:|---:|---:|---|
|`animateBallLayout`|`th_09_animation.js → th_19_position_state.js`|`th_19_position_state.js`|`temporary_override`|5|5|0|2|单独审查动画 token、取消、结束回调、动画开关和尺寸变化|
|`snapToEdgeDocked`|`th_09_animation.js → th_19_position_state.js`|`th_19_position_state.js`|`temporary_override`|2|2|0|2|最后审查吸边计时、面板状态、指针开始/结束和动画开关|

## 受保护覆盖与包装链

无。

## `th_09` 最终实现

无

## `th_09` 唯一实现

`_clearHeavyCachesIfAllHidden`、`applyPanelPredictiveBackProgress`、`armDockTimer`、`attachPanelSystemKeyHandler`、`cancelDockTimer`、`clearHeavyCaches`、`guardClick`、`handlePanelBack`、`handleSystemUiDismiss`、`hideAllPanels`、`hideMainPanel`、`hideMask`、`hidePanelPredictiveBackIndicator`、`hideSettingsPanel`、`hideViewerPanel`、`playBounce`、`registerPanelPredictiveBack`、`resetPanelPredictiveBackVisual`、`safeRemoveView`、`setupDisplayMonitor`、`showMask`、`showPanelPredictiveBackIndicator`、`stopDisplayMonitor`、`touchActivity`、`undockToFull`、`unregisterPanelPredictiveBack`

唯一实现可能由 Android 回调、WindowManager 生命周期或内部状态机间接触发，默认保留。

## 推荐处理顺序

1. `onScreenChangedReflow` 与 `scheduleScreenReflow`：作为同一屏幕变化链完成静态分析与旋转/尺寸变化真机验证。
2. `animateBallLayout`：单独验证动画开启、关闭、取消、结束回调、尺寸变化和 token 失效。
3. `snapToEdgeDocked`：最后验证闲置吸边、面板状态、指针开始/结束、左右侧和动画开关。

## 后续处理门槛

1. 定位全部定义、调用、旧方法捕获、动态引用和回调注册。
2. 证明模块加载完成前后不存在调用旧函数对象的运行窗口。
3. 建立专项静态验证，并完成相应真机旋转、尺寸变化、动画和吸边测试。
4. 只删除已证明不可达的旧定义，随后更新边界、报告、manifest 和 RSA 签名。

## 使用方式

```bash
python3 scripts/report_th09_animation_symbols.py --write TH09_ANIMATION_AUDIT.md
python3 scripts/report_th09_animation_symbols.py --check TH09_ANIMATION_AUDIT.md
```

本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。
