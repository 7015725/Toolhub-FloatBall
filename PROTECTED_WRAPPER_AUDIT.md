# ToolHub-FloatBall 受保护包装链独立审查

## 结论

- 已登记受保护覆盖/包装链：`11`。
- 定义链、有效所有者、旧方法捕获变量和调用关系均与 `MODULE_BOUNDARIES.json` 一致。
- 下一轮专项审查：无。
- 继续保留：`11` 条；这些链承担指针/OCR、生命周期、页面状态或延迟加载职责。
- 本报告不自动修改运行时代码；剩余包装均承担明确功能或生命周期职责。

## 分类摘要

|类别|数量|结论|
|---|---:|---|
|指针与 OCR 扩展|6|继续保留，属于功能完成链|
|指针布局与生命周期|3|继续保留，属于资源和竞态保护|
|ToolApp 状态保持|1|继续保留，属于页面状态契约|
|延迟更新包装|1|继续保留，依赖模块加载顺序|

## 包装链明细

|类别|方法|定义链|最终所有者|类型|调用|属性读取|动态引用|旧方法捕获|结论|
|---|---|---|---|---|---:|---:|---:|---:|---|
|指针与 OCR 扩展|`createPointerFrameView`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`intentional_override`|1|4|0|1|继续保留|
|指针与 OCR 扩展|`execPointerAction`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|1|6|0|2|继续保留|
|指针与 OCR 扩展|`finishPointerAreaCapture`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|2|6|0|1|继续保留|
|指针与 OCR 扩展|`scheduleDraggingInspect`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|4|9|0|1|继续保留|
|指针与 OCR 扩展|`showPointerAreaFrame`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|14|18|0|1|继续保留|
|指针与 OCR 扩展|`startPointerTool`|`th_17_pointer.js → th_18_pointer_ocr.js`|`th_18_pointer_ocr.js`|`wrapper`|3|7|0|2|继续保留|
|指针布局与生命周期|`createPointerLayoutParams`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|1|5|0|2|继续保留|
|指针布局与生命周期|`removePointerCallbacks`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|1|5|0|1|继续保留|
|指针布局与生命周期|`resetPointerToolState`|`th_17_pointer.js → th_19_position_state.js`|`th_19_position_state.js`|`wrapper`|1|5|0|1|继续保留|
|ToolApp 状态保持|`popToolAppPage`|`th_15_extra.js → th_16_entry.js`|`th_16_entry.js`|`wrapper`|8|18|0|1|继续保留|
|延迟更新包装|`startToolHubModuleUpdateFromSettings`|`th_03_icon.js → th_14_panels.js`|`th_03_icon.js`|`deferred_wrapper`|1|5|0|1|继续保留|

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
- **`startToolHubModuleUpdateFromSettings` / 延迟更新包装**：早期模块等待设置模块加载后安装包装，依赖 deferred_retry 生命周期。 原登记原因：th_03 在后台等待设置模块加载后安装自动重启包装

## 下一轮顺序

1. 设置与类型包装已并回 `th_05_persistence.js`。
2. 当前剩余 11 条包装链全部继续保留，不进入批量收敛流程。
3. 指针/OCR、ToolApp 和 deferred wrapper 仅在明确回归证据下重新审查。

## 使用方式

```bash
python3 scripts/report_protected_wrapper_chains.py --write PROTECTED_WRAPPER_AUDIT.md
python3 scripts/report_protected_wrapper_chains.py --check PROTECTED_WRAPPER_AUDIT.md
```

报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。
