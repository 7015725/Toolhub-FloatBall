# `th_15_extra.js` 独立审查报告

## 结论

- 本报告仅审查 `th_15_extra.js`，不据此自动删除运行时代码。
- 模块边界登记、定义链和最终所有者均一致，未发现未登记重复定义。
- 当前没有可直接进入后续处理的覆盖候选。
- 唯一实现和受保护包装链默认保留，不以调用次数低作为删除依据。

## 文件概况

- 版本：`1.1.11`
- 行数：`2765`
- 字节数：`122247`
- ToolHub 加载模块：`26`
- `th_15` 原型方法定义：`59`
- `th_15` 唯一原型方法：`59`
- 模块内重复定义方法：`0`
- 后续覆盖候选：`0`
- 受保护覆盖/包装链：`1`
- 唯一实现：`58`

## 优先定位候选

无。

## 受保护覆盖与包装链

|方法|分类|定义链|最终所有者|边界类型|处理结论|
|---|---|---|---|---|---|
|`popToolAppPage`|前置基础实现|`th_15_extra.js → th_16_entry.js`|`th_16_entry.js`|`wrapper`|保留；后续模块通过包装或扩展依赖该实现|

## `th_15` 最终实现

无

这些方法在重复定义链中由 `th_15_extra.js` 提供最终有效实现。

## `th_15` 唯一实现

`addPanel`、`applyToolAppBackPreviewProgress`、`applyToolAppPageSnapshot`、`attachDragResizeListeners`、`buildBallContentView`、`buildBallPreviewView`、`buildPanelView`、`buildToolAppPreviewBody`、`buildToolAppShell`、`buildViewerPanelView`、`bumpToolAppStackVersion`、`calculateToolAppLayout`、`cancelLongPressTimer`、`captureToolAppCurrentScrollY`、`captureToolAppPageSnapshot`、`clearToolAppBackPreview`、`cloneToolAppPageSnapshot`、`cloneToolAppSnapshotValue`、`closeToolApp`、`computePanelX`、`createBallPreviewContent`、`createBallViews`、`ensureToolAppShell`、`findToolAppFirstScrollView`、`findToolAppTouchedChild`、`finishToolAppBackPreview`、`getBestPanelPosition`、`getToolAppBackEdgeWidthPx`、`getToolAppBackGestureMode`、`getToolAppBackSurfaceSlopPx`、`getToolAppPreviousStackEntry`、`getToolAppResponsiveSpec`、`getToolAppSnapshotKey`、`getToolAppStackVersion`、`getToolAppTitle`、`hasToolAppBackTarget`、`hasToolAppPaneBackTarget`、`isToolAppBackBlockedAt`、`isToolAppBackInteractiveView`、`isToolAppRoute`、`makeToolAppStackEntry`、`openToolHubManual`、`prepareToolAppBackPreview`、`pushToolAppPage`、`pushToolAppSettingsGroup`、`refreshBallPreviewInSettings`、`replaceToolAppPage`、`resetLongPressState`、`restoreToolAppScrollLater`、`saveToolAppCurrentStackScroll`、`setToolAppContent`、`showPanelAvoidBall`、`showToolApp`、`showViewerPanel`、`tryAdjustPanelY`、`updateToolAppShellChrome`、`withPendingBallConfig`、`wrapDraggablePanel`

唯一实现不能仅凭全仓库直接调用次数较低删除；WindowManager 回调、反射式入口和界面生命周期仍需逐项审查。

## 模块内重复定义

无。

## 后续处理门槛

对任何候选执行删除前，必须按以下顺序完成：

1. 定位全部定义、调用、属性读取、动态字符串引用和旧方法捕获。
2. 分析模块加载顺序、实例创建时机、回调注册与异步延迟引用。
3. 用专项验证锁定保留行为，并运行模块边界、ES5、JS 语法和相关功能回归。
4. 只删除已证明不可达的旧定义，更新边界、报告、manifest 和 RSA 签名。

## 使用方式

```bash
python3 scripts/report_th15_extra_symbols.py --write TH15_EXTRA_AUDIT.md
python3 scripts/report_th15_extra_symbols.py --check TH15_EXTRA_AUDIT.md
```

本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。
