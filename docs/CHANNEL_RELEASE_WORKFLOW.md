# Stable / Beta 通道发布流程

更新时间：2026-07-21

## 1. 分支职责

- `main`：Stable 正式通道。
- `beta`：Beta 测试通道。
- 两个分支允许提交历史不同，但共享代码和维护文件应保持内容一致。
- 通道差异只保留在签名发布产物和通道更新记录中。

## 2. 运行目录

```text
Stable: shortx.getShortXDir()/ToolHub
Beta:   shortx.getShortXDir()/ToolHub-Beta
```

以下内容按通道隔离：

- 子模块；
- SQLite 数据库；
- 更新缓存；
- 日志；
- 内部截图；
- diagnostics；
- 通道私有状态。

公开相册仍是共享用户资源，不属于通道私有目录。

## 3. 允许的仓库差异

以下文件由 Stable 和 Beta 分别签名生成，允许不同：

```text
manifest.json
manifest.sig
update_history.json
updates/records/**
```

除上述范围外，仓库内容应保持一致，包括：

- `ToolHub.js`；
- `code/**`；
- `constraints/**`；
- `scripts/**`；
- `.github/scripts/**`；
- 公共工作流；
- 技术文档与审计报告。

## 4. 推荐发布顺序

### 第一步：Stable 开发与验证

1. 从最新 `main` 创建功能分支。
2. 只修改本次需求范围内的文件。
3. 提升发生变化的运行模块版本。
4. 创建 Stable 待发布记录。
5. 通过完整 `verify`、签名和审计检查。
6. squash 合并到 `main`。

### 第二步：同步 Beta

1. 从最新 `beta` 创建同步分支。
2. 从最新 `main` 精确复制本次共享文件。
3. 不复制 Stable 的以下产物：

```text
manifest.json
manifest.sig
update_history.json
updates/records/<Stable 记录>
```

4. 创建 Beta 专属待发布记录。
5. 由 Beta 签名流程生成自己的 Manifest、签名和更新历史。
6. 通过完整 `verify` 后 squash 合并到 `beta`。

### 第三步：一致性确认

手动运行 GitHub Actions：

```text
channel-parity
```

结果应满足：

```text
非预期漂移：0
```

## 5. 为什么不直接合并 main 到 beta

`main` 和 `beta` 各自拥有独立的 Manifest、RSA 签名、更新历史和发布记录。直接进行整分支合并容易把 Stable 生成物带入 Beta，造成：

- `branch` 或 `channel` 字段错误；
- Beta 使用 Stable Manifest；
- 更新历史串通道；
- 签名内容与分支文件不一致。

因此使用“共享文件精确同步 + Beta 独立签名”的方式。

## 6. 防漂移工作流

仓库包含：

```text
scripts/verify_channel_branch_parity.py
.github/workflows/channel-parity.yml
```

检查方式：

- 每日自动执行一次；
- 支持手动执行；
- 修改防漂移规则本身时，在 PR 中生成只读报告；
- PR 报告不作为阻断检查，避免 Stable 刚合并、Beta 尚未同步时产生临时阻断；
- 每日或手动检查发现非预期漂移时，工作流失败并上传 Markdown/JSON 报告。

## 7. 漂移处理

发现漂移后按以下顺序判断：

1. 是否属于 Manifest、签名、更新历史或通道发布记录；
2. 是否为 Stable 已合并但 Beta 尚未同步的短暂状态；
3. 是否遗漏了运行模块、验证器、约束或文档同步；
4. 是否误把 Beta 独立修改直接提交到长期 `beta`。

修复时以已完成完整验证的通道为来源，精确同步缺失文件。不要直接覆盖另一通道的 Manifest、签名和更新历史。

## 8. 实机验收

每次涉及通道系统的更新至少验证：

- Stable 与 Beta 能分别启动；
- 根目录与 SQLite 路径正确；
- 切换后更新检查正常；
- 通道健康自检为 `healthy` 或只有明确可解释的 `warning`；
- Stable/Beta 用户配置不串用；
- 不需要更换入口时，`ToolHub.js` 保持相同。
