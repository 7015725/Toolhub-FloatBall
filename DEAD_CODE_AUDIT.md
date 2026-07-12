# ToolHub-FloatBall 残余覆盖链与死代码审查

## 审查约束

- 本报告只提供静态证据和清理优先级，不自动删除运行时代码。
- ‘最终覆盖’不等于‘可安全删除’；仍需排除模块加载期调用、延迟回调、动态属性访问和设备行为差异。
- 直接调用数量统计的是最终原型方法的调用信号，不能证明调用到旧实现。
- 有效包装链、OCR 扩展、指针完成链和更新包装默认受保护。

## 扫描摘要

- 加载模块：`24`
- 原型方法定义：`381`
- 唯一原型方法：`360`
- 已登记重复方法：`19`
- 最终覆盖型候选节点：`5`
- 受保护覆盖/包装链：`15`
- 第一批清理候选：`0`

## 候选节点

|级别|方法|旧定义模块|定义次数|最终所有者|直接调用|属性读取|动态引用|旧方法捕获|建议|
|---|---|---|---:|---|---:|---:|---:|---:|---|
|C|`animateBallLayout`|`th_09_animation.js`|1|`th_19_position_state.js`|5|5|0|2|设备验证后再定|
|C|`onScreenChangedReflow`|`th_09_animation.js`|1|`th_19_position_state.js`|7|9|0|5|暂缓删除|
|C|`scheduleScreenReflow`|`th_09_animation.js`|1|`th_19_position_state.js`|2|2|0|2|设备验证后再定|
|C|`snapToEdgeDocked`|`th_09_animation.js`|1|`th_19_position_state.js`|2|2|0|2|设备验证后再定|
|C|`onScreenChangedReflow`|`th_15_extra.js`|1|`th_19_position_state.js`|7|9|0|5|暂缓删除|

### 判定说明

- **C / `animateBallLayout` / `th_09_animation.js`**：动画、旋转和吸边基础能力耦合，静态最终覆盖不足以单独证明可删除。 最终所有者 `th_19_position_state.js` 位于其后；动态引用风险为 **低**。
- **C / `onScreenChangedReflow` / `th_09_animation.js`**：存在 th_09 基础实现与 th_15 包装链；需先证明屏幕变化监听没有加载期或延迟引用。 最终所有者 `th_19_position_state.js` 位于其后；动态引用风险为 **低**。
- **C / `scheduleScreenReflow` / `th_09_animation.js`**：动画、旋转和吸边基础能力耦合，静态最终覆盖不足以单独证明可删除。 最终所有者 `th_19_position_state.js` 位于其后；动态引用风险为 **低**。
- **C / `snapToEdgeDocked` / `th_09_animation.js`**：动画、旋转和吸边基础能力耦合，静态最终覆盖不足以单独证明可删除。 最终所有者 `th_19_position_state.js` 位于其后；动态引用风险为 **低**。
- **C / `onScreenChangedReflow` / `th_15_extra.js`**：存在 th_09 基础实现与 th_15 包装链；需先证明屏幕变化监听没有加载期或延迟引用。 最终所有者 `th_19_position_state.js` 位于其后；动态引用风险为 **低**。

## 受保护覆盖与包装链

|方法|类型|最终所有者|原因|
|---|---|---|---|
|`applyImmediateEffectsForKey`|`wrapper_chain`|`th_15_extra.js`|设置即时生效经过类型修正和固定位置设置扩展|
|`createPointerFrameView`|`intentional_override`|`th_18_pointer_ocr.js`|OCR 扩展统一补充文字、框选和处理状态边框绘制|
|`createPointerLayoutParams`|`wrapper`|`th_19_position_state.js`|补充屏幕边缘和刘海区域布局参数|
|`execButtonAction`|`wrapper`|`th_16_entry.js`|增加 Shell 按钮执行前诊断|
|`execPointerAction`|`wrapper`|`th_18_pointer_ocr.js`|增加 area_ocr 指针动作模式|
|`execShellSmart`|`wrapper`|`th_16_entry.js`|增加 Shell 桥执行结果诊断|
|`finishPointerAreaCapture`|`wrapper`|`th_18_pointer_ocr.js`|框选截图完成后异步衔接 OCR|
|`popToolAppPage`|`wrapper`|`th_16_entry.js`|保存按钮后保留临时编辑状态|
|`removePointerCallbacks`|`wrapper`|`th_19_position_state.js`|关闭指针时同步取消语义调度|
|`resetPointerToolState`|`wrapper`|`th_19_position_state.js`|重置指针时同步重建语义调度会话|
|`scheduleDraggingInspect`|`wrapper`|`th_18_pointer_ocr.js`|限制拖动期间无障碍扫描频率|
|`setPendingValue`|`wrapper`|`th_12_rebuild.js`|保存前恢复枚举值原始类型|
|`showPointerAreaFrame`|`wrapper`|`th_18_pointer_ocr.js`|增加指针边框刷新节流和状态颜色|
|`startPointerTool`|`wrapper`|`th_18_pointer_ocr.js`|启动新指针前取消旧 OCR 并支持 area_ocr 模式|
|`startToolHubModuleUpdateFromSettings`|`deferred_wrapper`|`th_03_icon.js`|th_03 在后台等待设置模块加载后安装自动重启包装|

## 建议顺序

1. 对 `th_15_extra.js` 的固定位置过渡方法做一次模块加载期调用审查和真机位置基线，再按一组清理。
2. 将 `armLongPress` 与长按辅助状态作为独立交互审查，不与位置方法混删。
3. 最后处理 `th_09_animation.js` 的旧动画、吸边和屏幕重排实现，必须包含旋转、尺寸变化和动画开关真机测试。

## 使用方式

```bash
python3 scripts/report_dead_module_symbols.py --write DEAD_CODE_AUDIT.md
python3 scripts/report_dead_module_symbols.py --check DEAD_CODE_AUDIT.md
```

报告由 `scripts/report_dead_module_symbols.py` 根据 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和 `code/*.js` 确定性生成。
