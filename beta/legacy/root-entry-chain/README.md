# Root entry chain archive

这里保存旧版根目录 `ToolHub-beta-*` 入口链的历史副本。

这些文件用于追溯 2026-08 的 Beta 分阶段引导链。当前稳定入口为仓库根目录 `ToolHub.js`，当前模块代码位于 `code/`，已验收的 ShortXUI 源链位于 `beta/phase*/` 和 `beta/final/`。

保留原因：
- 便于查旧版入口链和快照 SHA。
- 保持仓库一级目录只放当前入口、发布资产和总说明。
- 避免历史 Beta 引导文件继续堆在根目录。

注意：这些旧入口内部的 raw URL 指向当时的 commit-pinned 根路径。对应历史 commit 仍保留原路径，归档移动不影响旧快照回放。
