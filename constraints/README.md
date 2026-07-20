# ToolHub 代码约束

本目录统一登记语法、Android/Rhino API、线程、生命周期和例外规则。方法归属继续由仓库根目录的 `MODULE_BOUNDARIES.json` 维护。

第一阶段只建立统一注册与执行入口，不改变现有专项校验的判定逻辑，也不合并发布、签名、版本和回滚安全校验。

## 文件

- `registry.json`：统一注册表、运行环境和验证器清单。
- `syntax.json`：Rhino ES5 语法契约。
- `api.json`：Android、Java、ShortX 与反射 API 的分类规则。
- `threading.json`：线程归属契约及对应专项验证器。
- `lifecycle.json`：回调、监听器、动画和窗口生命周期契约。
- `exceptions.json`：精确例外；禁止使用覆盖整个 `code/*.js` 的宽泛例外。

## 新增 API 流程

1. 判断来源：Android、Java、ShortX、反射、Shell 或 Binder。
2. 登记为 `safe`、`guarded`、`wrapped`、`plugin_validated` 或 `forbidden`。
3. 填写适用范围、风险、原因和负责模块。
4. 需要版本保护、线程切换、包装器或降级路径时必须明确声明。
5. 动态类名和动态方法名默认按高风险处理。
6. 后续 API 使用基线启用后，未分类的新 API 将直接使 CI 失败。

统一入口：

```bash
python3 scripts/verify_constraint_registry.py
python3 scripts/verify_code_constraints.py
```
