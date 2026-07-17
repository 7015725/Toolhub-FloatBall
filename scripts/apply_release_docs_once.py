#!/usr/bin/env python3
"""Apply the final release-pipeline documentation migration once."""
from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count == 0 and new in text:
        return text
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(
    readme,
    """修改 `code/*.js` 或 `ToolHub.js` 时：

1. 保持 Rhino ES5 语法。
2. 提升修改模块顶部 `@version`。
3. 使用 `fix/*` 分支。
4. 创建中文标题和描述的非草稿 PR。
5. 由 `sign-toolhub` 自动更新 `manifest.json`、`manifest.sig` 和 `ToolHub.js.sha256`。
6. 等待 `verify` 与 `sign-toolhub` 通过。
7. 合并到 `main` 并确认手机端能正常检测更新。
""",
    """正式更新流程：

1. 运行 `python3 scripts/create_update_record.py` 创建且仅创建一条待签名记录。
2. 修改 `code/*.js` 或 `ToolHub.js`；保持 Rhino ES5，并提升发生变化的模块或入口版本。
3. 使用 `fix/*` 分支创建中文标题和描述的非草稿 PR。
4. `sign-toolhub` 校验唯一待签名记录，补全发布日期、manifest 版本、模块差异和入口差异。
5. 签名流程生成 `manifest.json`、`manifest.sig`、`ToolHub.js.sha256`、`update_history.json` 并完成 RSA 校验。
6. 等待 `verify` 与 `sign-toolhub` 全部通过后合并到 `main`。
7. `main` 的 `verify` 通过后，`publish-release` 固定发布 `v<manifest.version>`，目标锁定该次已验证提交。

PR 标题、手动工作流输入和默认文案都不会参与正式发布信息生成；标题、日期和更新内容只来自结构化更新记录。
""",
    "README release steps",
)
readme = replace_once(
    readme,
    "    └── toolhub.db\n",
    """    ├── cache/
    │   ├── update_history.json
    │   └── update_history.meta.json
    └── toolhub.db
""",
    "README cache tree",
)
readme = replace_once(
    readme,
    "GitHub Actions 会补全日期、manifest 版本、模块版本差异和入口版本差异，并生成受签名清单保护的 `update_history.json`。\n",
    """GitHub Actions 会补全日期、manifest 版本、模块版本差异和入口版本差异，并生成受签名清单保护的 `update_history.json`。缺少记录或存在多条待签名记录时，签名会直接失败，不会生成 `auto-*` 记录。

每个正式版本发布为 `v<manifest.version>`，Release 标题、发布日期和正文与最新历史记录一致。Release 附件固定包含：

```text
ToolHub.js
ToolHub.js.sha256
manifest.json
manifest.sig
update_history.json
```
""",
    "README release assets",
)
readme_path.write_text(readme, encoding="utf-8")

structure_path = Path("STRUCTURE.md")
structure = structure_path.read_text(encoding="utf-8")
structure = replace_once(
    structure,
    "   └─ modules[] / manifest.files 一致性\n",
    """   ├─ ToolHub.js 模块列表 / manifest.files 一致性
   ├─ assets.updateHistory 哈希、大小和版本一致性
   └─ release 标题、日期和 changes 与最新结构化记录一致
""",
    "STRUCTURE security checks",
)
structure = replace_once(
    structure,
    """schema: 3
version: 以当前 manifest.json 为准
alg: SHA256withRSA
keyId: toolhub-targets-20260703-rsa3072
files: 27 个模块
""",
    """schema: 4
version: 以当前 manifest.json 为准
alg: SHA256withRSA
keyId: toolhub-targets-20260703-rsa3072
entry: ToolHub.js 入口版本、哈希、大小和手动更新标记
files: 27 个模块
assets.updateHistory: 更新历史名称、schema、版本、哈希和大小
release: 结构化记录生成的标题、日期和 changes
""",
    "STRUCTURE manifest schema",
)
structure = replace_once(
    structure,
    """修改 `code/*.js` 或 `ToolHub.js` 后，需要重新生成签名清单：

```bash
python3 scripts/generate_signed_manifest.py --yes
```

会更新：

```text
manifest.json
manifest.sig
ToolHub.js.sha256
```
""",
    """修改 `code/*.js` 或 `ToolHub.js` 后，必须先创建一条待签名更新记录，再生成签名产物：

```bash
python3 scripts/create_update_record.py
python3 scripts/verify_update_history.py --require-one-pending
python3 scripts/generate_signed_manifest.py --yes
python3 scripts/verify_manifest.py
python3 .github/scripts/verify_manifest_signature.py
```

会更新：

```text
updates/records/<id>.json
update_history.json
manifest.json
manifest.sig
ToolHub.js.sha256
```

签名不读取 PR 标题或默认更新文案。`publish-release` 只发布 `v<manifest.version>`，并将 Release 锁定到通过 `main` 校验的提交。
""",
    "STRUCTURE release maintenance",
)
structure = replace_once(
    structure,
    "仓库中的 `updates/records/*.json` 是更新记录源数据，`update_history.json` 是自动聚合产物。运行设备将已校验历史缓存到 `ToolHub/cache/`；缓存损坏或网络失败不会影响子模块启动和事务更新。\n",
    """仓库中的 `updates/records/*.json` 是更新记录唯一源数据，`update_history.json` 是自动聚合产物。每次正式签名要求且仅允许一条 `manifestVersion=0` 的记录；签名完成后自动补充日期、模块差异和入口差异。运行设备将已校验历史缓存到 `ToolHub/cache/`；缓存损坏或网络失败不会影响子模块启动和事务更新。

GitHub Release 固定附带 `ToolHub.js`、入口哈希、manifest、RSA 签名和 `update_history.json`。已存在但指向其他提交的同版本 tag 会使发布失败，不会被静默覆盖。
""",
    "STRUCTURE update records",
)
structure_path.write_text(structure, encoding="utf-8")
print("Release documentation migration applied.")
