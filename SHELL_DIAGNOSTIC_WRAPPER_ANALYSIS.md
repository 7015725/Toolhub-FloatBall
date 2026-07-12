# Shell 诊断包装链专项分析

## 结论

- `execShellSmart` 与 `execButtonAction` 的 `th_16_entry.js` 包装只增加诊断，不改变参数、核心执行路径或返回对象。
- 两条包装都可通过“诊断逻辑并回基础实现”收敛，不能直接删除诊断行为。
- `execButtonAction` 的诊断当前发生在 `guardClick()` 之前；并回 `th_11_action.js` 后必须保持相同顺序。
- `execShellSmart` 的结果诊断当前发生在旧实现返回之后、向调用者返回之前；并回 `th_10_shell.js` 后必须保持原样返回 `ret`。
- 两个诊断辅助方法仅由本组包装使用，可迁移到 `th_11_action.js`，无需保留 `th_16` 安装标记。
- 静态收敛门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_10_shell.js：execShellSmart 基础广播桥实现
  ↓
th_11_action.js：execButtonAction 基础按钮分派实现
  ↓
th_16_entry.js：Shell 诊断包装
  ↓
FloatBallAppWM 实例创建
```

- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 实例创建信号：`2`。
- `execShellSmart` 定义链：`th_10_shell.js → th_16_entry.js`。
- `execButtonAction` 定义链：`th_11_action.js → th_16_entry.js`。

## 当前调用分布

- `execShellSmart`：`{"th_11_action.js": 1}`。
- `execButtonAction`：`{"th_15_extra.js": 1}`。
- `getShellDiagPreviewText`：仅 `th_16_entry.js` 调用 1 次。
- `logShellButtonDiagnostics`：仅 `th_16_entry.js` 调用 1 次。

## 必须保持的行为

1. Shell 按钮诊断在点击防抖之前执行。
2. 命令预览继续清理换行、制表符并限制为 220 字符。
3. `SHARED-DA-` 与私有 `DA-` 提示级别保持不变。
4. `execShellSmart` 先完成广播发送，再记录 `ok/via/root/cmd_b64_len/ret`。
5. `BroadcastBridge` 只代表广播已发送的提示保持不变。
6. 诊断异常不得阻断按钮执行或 Shell 返回。
7. `execShellSmart` 返回对象身份和字段不变。

## 收敛方案

1. 将 `getShellDiagPreviewText` 与 `logShellButtonDiagnostics` 移到 `th_11_action.js`。
2. 在 `execButtonAction()` 开头、`guardClick()` 之前调用按钮诊断。
3. 将结果诊断移到 `th_10_shell.js` 的最终 `return ret;` 之前。
4. 删除 `th_16_entry.js` 的 Shell 诊断安装 IIFE 和安装标记。
5. 将 `execButtonAction` / `execShellSmart` 登记为基础模块单一所有者。
6. 更新受保护包装链报告、模块边界、manifest 和 RSA 签名。

## 使用方式

```bash
python3 scripts/verify_shell_diagnostic_wrappers.py --write SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md
python3 scripts/verify_shell_diagnostic_wrappers.py --check SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md
```
