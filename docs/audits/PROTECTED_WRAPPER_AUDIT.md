# ToolHub-FloatBall 受保护包装链独立审查

## 结论

- 已登记受保护覆盖/包装链：`18`。
- 定义链、有效所有者、旧方法捕获变量和调用关系均与 `MODULE_BOUNDARIES.json` 一致。
- 下一轮专项审查：无。
- 继续保留：`18` 条；这些链承担指针/OCR、生命周期或页面状态职责。
- 本报告不自动修改运行时代码；剩余包装均承担明确功能或生命周期职责。

## 分类摘要

|类别|数量|结论|
|---|---:|---|
|指针与 OCR 扩展|6|继续保留，属于功能完成链|
|指针布局与生命周期|3|继续保留，属于资源和竞态保护|
|ToolApp 状态保持|1|继续保留，属于页面状态契约|
|Beta 实验扩展|4|继续保留，仅在 Beta 实验室路由生效|
|拾字二维码扩展|3|继续保留，仅扩展拾字截图显式 QR 解析与取消边界|
|ShortXUI 最终封装|1|继续保留，属于验收封装与失败回滚边界|

## 包装链明细

|类别|方法|定义链|最终所有者|类型|调用|属性读取|动态引用|旧方法捕获|结论|
|---|---|---|---|---|---:|---:|---:|---:|---|
|指针与 OCR 扩展|`createPointerFrameView`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`intentional_override`|1|4|0|1|继续保留|
|指针与 OCR 扩展|`execPointerAction`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|1|6|0|2|继续保留|
|指针与 OCR 扩展|`finishPointerAreaCapture`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|2|6|0|1|继续保留|
|指针与 OCR 扩展|`scheduleDraggingInspect`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|4|9|0|1|继续保留|
|指针与 OCR 扩展|`showPointerAreaFrame`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|14|18|0|1|继续保留|
|指针与 OCR 扩展|`startPointerTool`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|3|7|0|2|继续保留|
|指针布局与生命周期|`createPointerLayoutParams`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|2|6|0|3|继续保留|
|指针布局与生命周期|`removePointerCallbacks`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|1|5|0|1|继续保留|
|指针布局与生命周期|`resetPointerToolState`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|1|5|0|1|继续保留|
|ToolApp 状态保持|`popToolAppPage`|`th_15_extra.js → th_16_entry.js`|`th_16_entry.js`|`wrapper`|6|14|0|1|继续保留|
|Beta 实验扩展|`buildPanelView`|`th_15_extra.js → th_34_shortx_ui_lab.js`|`th_34_shortx_ui_lab.js`|`wrapper`|6|10|0|7|继续保留|
|Beta 实验扩展|`getSettingsHomeCategoryDefs`|`th_14_panels.js → th_34_shortx_ui_lab.js`|`th_34_shortx_ui_lab.js`|`wrapper`|1|4|0|2|继续保留|
|Beta 实验扩展|`getToolAppTitle`|`th_15_extra.js → th_34_shortx_ui_lab.js`|`th_34_shortx_ui_lab.js`|`wrapper`|3|6|0|1|继续保留|
|Beta 实验扩展|`isToolAppRoute`|`th_15_extra.js → th_34_shortx_ui_lab.js`|`th_34_shortx_ui_lab.js`|`wrapper`|11|15|0|7|继续保留|
|拾字二维码扩展|`createPickwordImageController`|`th_22_image_viewer.js → th_26_qr_runtime.js`|`th_26_qr_runtime.js`|`wrapper`|2|7|0|2|继续保留|
|拾字二维码扩展|`disposePickwordModule`|`th_20_pickword.js → th_26_qr_runtime.js`|`th_26_qr_runtime.js`|`wrapper`|1|5|0|1|继续保留|
|拾字二维码扩展|`hidePickwordWindow`|`th_20_pickword.js → th_26_qr_runtime.js`|`th_26_qr_runtime.js`|`wrapper`|2|7|0|1|继续保留|
|ShortXUI 最终封装|`startAsync`|`th_16_entry.js → th_25_shortx_ui_package.js`|`th_25_shortx_ui_package.js`|`wrapper`|0|4|0|1|继续保留|

## 判定说明

- **`createPointerFrameView` / 指针与 OCR 扩展**：OCR 模块提供完整边框视图覆盖，不是无行为的转发包装。 原登记原因：OCR 扩展统一补充文字、框选和处理状态边框绘制
- **`execPointerAction` / 指针与 OCR 扩展**：增加 area_ocr 动作模式并保留基础指针动作。 原登记原因：增加 area_ocr 指针动作模式
- **`finishPointerAreaCapture` / 指针与 OCR 扩展**：框选完成后异步衔接 OCR，属于功能完成链。 原登记原因：框选截图完成后异步衔接 OCR
- **`scheduleDraggingInspect` / 指针与 OCR 扩展**：限制拖动扫描频率，属于性能和竞态保护。 原登记原因：限制拖动期间无障碍扫描频率
- **`showPointerAreaFrame` / 指针与 OCR 扩展**：增加边框刷新节流和状态颜色。 原登记原因：增加指针边框刷新节流和状态颜色
- **`startPointerTool` / 指针与 OCR 扩展**：启动前取消旧 OCR 并扩展 area_ocr 模式。 原登记原因：启动新指针前取消旧 OCR 并支持 area_ocr 模式
- **`createPointerLayoutParams` / 指针布局与生命周期**：补充屏幕边缘和刘海布局参数。 原登记原因：补充屏幕边缘和刘海区域布局参数
- **`removePointerCallbacks` / 指针布局与生命周期**：关闭指针时取消语义调度，防止旧 Runnable 回写。 原登记原因：关闭指针时同步取消语义调度
- **`resetPointerToolState` / 指针布局与生命周期**：重置时重建语义会话和 token。 原登记原因：重置指针时同步重建语义调度会话
- **`popToolAppPage` / ToolApp 状态保持**：保存按钮后保留临时编辑状态，属于页面栈状态契约。 原登记原因：保存按钮后保留临时编辑状态
- **`buildPanelView` / Beta 实验扩展**：仅为 ShortX UI 实验室路由返回独立页面，其他面板完整委托原构建器。 原登记原因：Beta 实验室新增独立 ToolApp 页面路由，其他面板继续委托原实现
- **`getSettingsHomeCategoryDefs` / Beta 实验扩展**：只在原设置分类结果中追加 Beta 实验入口，不替换既有分类。 原登记原因：Beta 设置首页追加 ShortX UI 实验室入口，保留原分类生成结果
- **`getToolAppTitle` / Beta 实验扩展**：只补充实验室标题，其他 ToolApp 路由继续委托原实现。 原登记原因：为 ShortX UI 实验室提供标题，其他路由继续委托原实现
- **`isToolAppRoute` / Beta 实验扩展**：只登记实验室路由，其他路由识别继续委托原实现。 原登记原因：登记 ShortX UI 实验室为 Beta ToolApp 路由，其他路由继续委托原实现
- **`createPickwordImageController` / 拾字二维码扩展**：仅在既有截图控制器外叠加显式解析入口、结果卡和删除取消回调。 原登记原因：Beta 拾字截图控制器叠加显式二维码解析入口与结果卡，不修改截图查看器内部实现
- **`disposePickwordModule` / 拾字二维码扩展**：模块释放前只取消 QR 会话，再委托原拾字清理实现。 原登记原因：释放拾字模块前取消二维码解析会话，不改变原拾字清理顺序
- **`hidePickwordWindow` / 拾字二维码扩展**：关闭拾字窗口前只取消 QR worker、timeout 和迟到结果 token，再委托原关闭实现。 原登记原因：关闭拾字窗口前取消二维码 worker、timeout 与迟到结果 token
- **`startAsync` / ShortXUI 最终封装**：原启动成功后再安装已验收 R3 能力；封装失败会关闭实例并返回启动失败。 原登记原因：在悬浮球启动成功后安装经真机验收的 ShortXUI 最终 R3 封装，保持原测试时序并将失败回传为启动失败

## 下一轮顺序

1. 设置与类型包装已并回 `th_05_persistence.js`。
2. 当前剩余 18 条包装链全部继续保留，不进入批量收敛流程。
3. 指针/OCR 与 ToolApp 包装仅在明确回归证据下重新审查。

## 使用方式

```bash
python3 scripts/report_protected_wrapper_chains.py --write PROTECTED_WRAPPER_AUDIT.md
python3 scripts/report_protected_wrapper_chains.py --check PROTECTED_WRAPPER_AUDIT.md
```

报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。
