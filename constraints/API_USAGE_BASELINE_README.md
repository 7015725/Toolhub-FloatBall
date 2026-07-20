# API 使用基线

正式 JSON 基线由 `scripts/report_api_usage.py` 根据 `ToolHub.js` 与 `code/*.js` 确定性生成。扫描器只覆盖高置信度静态信号；复杂动态调用继续由专项验证器处理。
