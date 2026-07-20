# ToolHub 模块符号与覆盖链审查

## 审查边界

- 本报告合并原 `th_09` 与 `th_15` 独立报告，统一复用同一套定义链与引用信号分析。
- 报告只提供静态证据，不自动删除运行时代码。
- 模块边界、异步回调和旧函数对象引用仍是删除前必须保留的验证边界。

## `th_09_animation.js` 动画模块

### 结论

- 模块边界、定义链和最终所有者一致，未发现未登记重复定义。
- 当前后续覆盖候选：无。
- 唯一实现和受保护覆盖链默认保留，不能仅凭调用次数低删除。

### 文件概况

- 版本：`1.0.12`
- 行数：`1134`
- 字节数：`42862`
- ToolHub 加载模块：`29`
- 原型方法定义：`27`
- 唯一原型方法：`27`
- 模块内重复定义方法：`0`
- 后续覆盖候选：`0`
- 受保护覆盖/包装链：`0`
- 唯一实现：`27`

### 异步与生命周期信号

|信号|数量|风险含义|
|---|---:|---|
|`Runnable`|6|可能持有实例并延迟调用最终原型方法|
|`postDelayed`|1|需要排除旧回调对象和竞态|
|`DisplayListener`|1|屏幕旋转和尺寸变化入口|
|`AnimatorListener`|0|动画结束/取消回调|
|`AnimatorUpdateListener`|0|逐帧 WindowManager 更新|
|`OnTouchListener`|1|触摸和吸边状态入口|

### 后续覆盖候选

|方法|模块内定义数|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|
|---|---:|---|---|---|---:|---:|---:|---:|---|
|—|—|—|—|—|—|—|—|—|当前无候选|

### 受保护覆盖与包装链

|方法|分类|定义链|最终所有者|边界类型|处理结论|
|---|---|---|---|---|---|
|—|—|—|—|—|无|

### `th_09` 最终实现

无

### `th_09` 唯一实现

`_clearHeavyCachesIfAllHidden`、`applyPanelPredictiveBackProgress`、`armDockTimer`、`attachPanelSystemKeyHandler`、`cancelDockTimer`、`clearHeavyCaches`、`guardClick`、`handlePanelBack`、`handleSystemUiDismiss`、`hideAllPanels`、`hideMainPanel`、`hideMask`、`hideMaskIfNoPanelVisible`、`hidePanelPredictiveBackIndicator`、`hideSettingsPanel`、`hideViewerPanel`、`playBounce`、`registerPanelPredictiveBack`、`resetPanelPredictiveBackVisual`、`safeRemoveView`、`setupDisplayMonitor`、`showMask`、`showPanelPredictiveBackIndicator`、`stopDisplayMonitor`、`touchActivity`、`undockToFull`、`unregisterPanelPredictiveBack`

### 模块内重复定义

无。

### 后续处理门槛

1. 定位全部定义、调用、属性读取、动态字符串引用和旧方法捕获。
2. 分析模块加载顺序、实例创建时机、回调注册与异步延迟引用。
3. 用专项验证锁定保留行为，并运行模块边界、ES5、JS 语法和相关功能回归。
4. 只删除已证明不可达的旧定义，随后更新边界、报告、manifest 和 RSA 签名。

## `th_15_extra.js` 扩展模块

### 结论

- 模块边界、定义链和最终所有者一致，未发现未登记重复定义。
- 当前后续覆盖候选：无。
- 唯一实现和受保护覆盖链默认保留，不能仅凭调用次数低删除。

### 文件概况

- 版本：`1.1.22`
- 行数：`2641`
- 字节数：`119268`
- ToolHub 加载模块：`29`
- 原型方法定义：`57`
- 唯一原型方法：`57`
- 模块内重复定义方法：`0`
- 后续覆盖候选：`0`
- 受保护覆盖/包装链：`1`
- 唯一实现：`56`

### 后续覆盖候选

|方法|模块内定义数|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|
|---|---:|---|---|---|---:|---:|---:|---:|---|
|—|—|—|—|—|—|—|—|—|当前无候选|

### 受保护覆盖与包装链

|方法|分类|定义链|最终所有者|边界类型|处理结论|
|---|---|---|---|---|---|
|`popToolAppPage`|前置基础实现|`th_15_extra.js → th_16_entry.js`|`th_16_entry.js`|`wrapper`|保留；后续模块通过包装或扩展依赖该实现|

### `th_15` 最终实现

无

### `th_15` 唯一实现

`addPanel`、`applyToolAppBackPreviewProgress`、`applyToolAppPageSnapshot`、`attachDragResizeListeners`、`buildBallContentView`、`buildBallPreviewView`、`buildPanelView`、`buildToolAppPreviewBody`、`buildToolAppShell`、`buildViewerPanelView`、`bumpToolAppStackVersion`、`calculateToolAppLayout`、`cancelLongPressTimer`、`captureToolAppCurrentScrollY`、`captureToolAppPageSnapshot`、`clearToolAppBackPreview`、`cloneToolAppPageSnapshot`、`cloneToolAppSnapshotValue`、`closeToolApp`、`createBallPreviewContent`、`createBallViews`、`ensureToolAppShell`、`findToolAppFirstScrollView`、`findToolAppTouchedChild`、`finishToolAppBackPreview`、`getBestPanelPosition`、`getToolAppBackEdgeWidthPx`、`getToolAppBackGestureMode`、`getToolAppBackSurfaceSlopPx`、`getToolAppPreviousStackEntry`、`getToolAppResponsiveSpec`、`getToolAppSnapshotKey`、`getToolAppStackVersion`、`getToolAppTitle`、`hasToolAppBackTarget`、`hasToolAppPaneBackTarget`、`isToolAppBackBlockedAt`、`isToolAppBackInteractiveView`、`isToolAppRoute`、`makeToolAppStackEntry`、`openToolHubManual`、`prepareToolAppBackPreview`、`pushToolAppPage`、`pushToolAppSettingsGroup`、`refreshBallPreviewInSettings`、`replaceToolAppPage`、`resetLongPressState`、`restoreToolAppScrollLater`、`saveToolAppCurrentStackScroll`、`setToolAppContent`、`showPanelAvoidBall`、`showToolApp`、`showViewerPanel`、`updateToolAppShellChrome`、`withPendingBallConfig`、`wrapDraggablePanel`

### 模块内重复定义

无。

### 后续处理门槛

1. 定位全部定义、调用、属性读取、动态字符串引用和旧方法捕获。
2. 分析模块加载顺序、实例创建时机、回调注册与异步延迟引用。
3. 用专项验证锁定保留行为，并运行模块边界、ES5、JS 语法和相关功能回归。
4. 只删除已证明不可达的旧定义，随后更新边界、报告、manifest 和 RSA 签名。

## 使用方式

```bash
python3 scripts/report_module_symbol_audits.py --write MODULE_SYMBOL_AUDIT.md
python3 scripts/report_module_symbol_audits.py --check MODULE_SYMBOL_AUDIT.md
```

本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。
