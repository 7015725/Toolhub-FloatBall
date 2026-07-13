#!/usr/bin/env python3
"""一次性移除 Gitea 更新源并同步入口与文档。"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("patch anchor count %s=%d" % (label, count))
    return text.replace(old, new, 1)


entry = read("ToolHub.js")
old_entry_head = '''// 安全更新机制：入口内置 RSA 公钥，先验证 manifest.json/manifest.sig，再按 SHA256 下载子模块。
// Gitea 只负责分发；未通过签名/哈希/防回滚校验时，不覆盖本地模块。

var UPDATE_SOURCE = 1; // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2; // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新

var UPDATE_ROOTS = [
    "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/",
    "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/"
];

if (UPDATE_SOURCE !== 1) UPDATE_SOURCE = 0;
'''
new_entry_head = '''// 安全更新机制：入口内置 RSA 公钥，先验证 manifest.json/manifest.sig，再按 SHA256 下载子模块。
// 更新源固定为 GitHub；未通过签名/哈希/防回滚校验时，不覆盖本地模块。

var UPDATE_SECURITY_MODE = 2; // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
var GIT_ROOT = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/";
'''
entry = replace_once(entry, old_entry_head, new_entry_head, "entry source block")
entry = replace_once(
    entry,
    'var GIT_ROOT = UPDATE_ROOTS[UPDATE_SOURCE];\nvar GIT_BASE = GIT_ROOT + "code/";',
    'var GIT_BASE = GIT_ROOT + "code/";',
    "entry root selection",
)

source_exprs = (
    ('UPDATE_SOURCE === 1 ? "GitHub" : "Gitea"', '"GitHub"'),
    ("UPDATE_SOURCE === 1 ? 'GitHub' : 'Gitea'", "'GitHub'"),
    ('UPDATE_SOURCE === 1 ? "github" : "gitea"', '"github"'),
    ("UPDATE_SOURCE === 1 ? 'github' : 'gitea'", "'github'"),
)
for old, new in source_exprs:
    entry = entry.replace(old, new)

for forbidden in ("UPDATE_SOURCE", "UPDATE_ROOTS", "git.xin-blog.com", "Gitea"):
    if forbidden in entry:
        raise SystemExit("entry still contains legacy source marker: " + forbidden)
write("ToolHub.js", entry)


def strip_legacy_source_lines(text):
    result = []
    for line in text.splitlines():
        if any(marker in line for marker in ("Gitea", "git.xin-blog.com", "UPDATE_SOURCE", "UPDATE_ROOTS")):
            continue
        result.append(line)
    return "\n".join(result).rstrip() + "\n"


readme = strip_legacy_source_lines(read("README.md"))
readme = replace_once(
    readme,
    "## 入口配置\n\n```javascript\nvar UPDATE_SECURITY_MODE = 2;",
    "## 入口配置\n\n> 更新源固定为 GitHub，不再提供来源切换配置。\n\n```javascript\nvar UPDATE_SECURITY_MODE = 2;",
    "README fixed source note",
)
write("README.md", readme)

arch = strip_legacy_source_lines(read("ARCHITECTURE.md"))
anchor = "## 4. 启动机制\n"
if anchor not in arch:
    raise SystemExit("missing architecture startup anchor")
arch = arch.replace(
    anchor,
    anchor + "\n更新源固定为 GitHub，不再保留 Gitea 或运行时来源切换。\n",
    1,
)
# 上面的说明写入后移除其中的旧源名称，只保留无歧义描述。
arch = arch.replace("不再保留 Gitea 或运行时来源切换", "不再保留其他镜像源或运行时来源切换")
write("ARCHITECTURE.md", arch)

structure = strip_legacy_source_lines(read("STRUCTURE.md"))
anchor = "## 5. 启动链路\n"
if anchor not in structure:
    raise SystemExit("missing structure startup anchor")
structure = structure.replace(
    anchor,
    anchor + "\n更新源固定为 GitHub，不再提供来源选择或镜像源回退。\n",
    1,
)
write("STRUCTURE.md", structure)

for path in ("README.md", "ARCHITECTURE.md", "STRUCTURE.md"):
    text = read(path)
    for forbidden in ("Gitea", "git.xin-blog.com", "UPDATE_SOURCE", "UPDATE_ROOTS"):
        if forbidden in text:
            raise SystemExit("%s still contains %s" % (path, forbidden))

print("Gitea source removal patch applied")
