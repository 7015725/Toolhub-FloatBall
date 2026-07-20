# ToolHub 代码约束

本目录统一登记语法、Android/Rhino API、线程、生命周期和例外规则。方法归属由同目录的 `MODULE_BOUNDARIES.json` 维护。

第二阶段已经启用高置信度 API 使用基线。新增外部 API、已有 API 扩大到新文件，或者基线与代码不一致时，统一约束会阻断 CI。

## 文件

- `registry.json`：统一注册表、运行环境和验证器清单。
- `syntax.json`：Rhino ES5 语法契约。
- `methods.json`：方法约束注册入口。
- `MODULE_BOUNDARIES.json`：方法直接所有者、覆盖链和最终有效实现的真实约束源。
- `api.json`：Android、Java、ShortX 与反射 API 的分类规则。
- `API_USAGE_BASELINE.json`：当前高置信度 API 键及实际使用文件，由脚本确定性生成。
- `API_USAGE_LEGACY.json`：第二阶段启用时的初始使用范围；后续不得刷新。
- `threading.json`：线程归属契约及对应专项验证器。
- `lifecycle.json`：回调、监听器、动画和窗口生命周期契约。
- `exceptions.json`：精确例外；禁止使用覆盖整个 `code/*.js` 的宽泛例外。

## API 扫描覆盖

当前扫描器覆盖：

- Android、Java、Javax 的完整限定构造器和静态调用；
- 类别名及直接构造实例的方法调用；
- `shortx` 直接调用；
- 固定类名、固定方法名和动态反射信号。

基线保存稳定的“API 键 + 使用文件”，不保存行号。复杂动态分派、线程归属和生命周期仍由专项验证器处理。

## 新增 API 流程

1. 运行 `python3 scripts/report_api_usage.py --diff`，确认新增键或使用范围变化。
2. 判断来源：Android、Java、ShortX、反射、Shell 或 Binder。
3. 在 `api.json` 增加精确 `usageKeys` 或 `usageKeyPrefixes` 规则。
4. 登记为 `safe`、`guarded`、`wrapped`、`plugin_validated` 或 `forbidden`。
5. 填写 `source`、`classOrObject`、`method`、`scope`、`reason` 和 `owner`。
6. 需要版本保护、线程切换、包装器或降级路径时必须明确声明。
7. 运行 `python3 scripts/generate_api_usage_baseline.py` 更新当前基线。
8. 不得更新 `API_USAGE_LEGACY.json`；它只描述第二阶段启用时的初始范围。
9. 运行统一代码约束和相关专项回归。

仅更新当前基线、但没有显式 API 分类规则时，新增 API 仍会失败。已有 API 出现在初始范围之外的新文件中，也必须通过显式规则批准范围扩张。

## 命令

```bash
python3 scripts/verify_constraint_registry.py
python3 scripts/verify_code_constraints.py
python3 scripts/verify_api_usage_scanner.py
python3 scripts/verify_api_usage_policy.py
python3 scripts/report_api_usage.py --check constraints/API_USAGE_BASELINE.json
```

发布、Manifest、签名、版本和回滚校验继续保持独立安全边界。
