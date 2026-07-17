#!/usr/bin/env python3
"""Verify that ToolHub release metadata has one structured source of truth."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = (ROOT / "scripts" / "build_update_history.py").read_text(encoding="utf-8")
GENERATE = (ROOT / "scripts" / "generate_signed_manifest.py").read_text(encoding="utf-8")
VERIFY_HISTORY = (ROOT / "scripts" / "verify_update_history.py").read_text(encoding="utf-8")
VERIFY_MANIFEST = (ROOT / "scripts" / "verify_manifest.py").read_text(encoding="utf-8")
SIGN = (ROOT / ".github" / "workflows" / "sign-toolhub.yml").read_text(encoding="utf-8")
ROLLBACK = (ROOT / ".github" / "workflows" / "rollback-toolhub.yml").read_text(encoding="utf-8")
VERIFY_WORKFLOW = (ROOT / ".github" / "workflows" / "verify.yml").read_text(encoding="utf-8")
PUBLISH = (ROOT / ".github" / "workflows" / "publish-release.yml").read_text(encoding="utf-8")

checks = {
    "生成器不再自动创建更新记录": "create_auto_record" not in BUILD and "auto-%s" not in BUILD,
    "历史生成必须只有一条待签名记录": "exactly one pending update record is required" in BUILD,
    "待签名记录不得包含生成字段": "pending record contains generated fields" in BUILD,
    "签名脚本不接受标题兜底": 'add_argument("--title"' not in GENERATE and "fallback_title" not in GENERATE,
    "签名脚本不接受变更兜底": 'add_argument("--change"' not in GENERATE and "fallback_details" not in GENERATE,
    "manifest 发布标题来自结构化记录": 'release_title = str(record.get("title", "")).strip()' in GENERATE,
    "manifest 发布日期来自结构化记录": 'release_date = str(record.get("date", "")).strip()' in GENERATE,
    "manifest 更新内容来自结构化记录": 'record.get("details") or []' in GENERATE,
    "签名工作流不读取 PR 标题": "PR_TITLE" not in SIGN and "github.event.pull_request.title" not in SIGN,
    "签名工作流不接受发布标题输入": "INPUT_TITLE" not in SIGN and "发布标题" not in SIGN,
    "签名工作流不接受更新内容输入": "INPUT_CHANGE" not in SIGN and "更新记录，写入" not in SIGN,
    "签名前要求一条待签名记录": "verify_update_history.py --require-one-pending" in SIGN,
    "签名命令只读取结构化记录": "python3 scripts/generate_signed_manifest.py --yes" in SIGN,
    "签名完成统一验证 manifest": "python3 scripts/verify_manifest.py" in SIGN and "python3 scripts/verify_release_record_flow.py" not in SIGN,
    "回滚先创建结构化记录": "scripts/create_update_record.py" in ROLLBACK,
    "回滚签名不传标题和变更": "generate_signed_manifest.py --yes" in ROLLBACK and "generate_signed_manifest.py --yes --title" not in ROLLBACK,
    "回滚统一验证 manifest": "python3 scripts/verify_manifest.py" in ROLLBACK and "python3 scripts/verify_release_record_flow.py" not in ROLLBACK,
    "历史校验支持待签名记录模式": "--require-one-pending" in VERIFY_HISTORY,
    "manifest 校验发布日期": "manifest release date differs from current history record" in VERIFY_MANIFEST,
    "完整 CI 统一调用 manifest 校验": "python3 scripts/verify_manifest.py" in VERIFY_WORKFLOW and "python3 scripts/verify_release_record_flow.py" not in VERIFY_WORKFLOW,
    "Release 固定使用 manifest 版本标签": "tag = 'v%s' % version" in PUBLISH and "INPUT_TAG" not in PUBLISH,
    "Release 检出已验证提交": "github.event.workflow_run.head_sha || 'main'" in PUBLISH,
    "Release 发布前校验 manifest 和签名": "python3 scripts/verify_manifest.py" in PUBLISH and "verify_manifest_signature.py" in PUBLISH,
    "Release 不使用默认发布文案": "ToolHub 更新。" not in PUBLISH and "ToolHub ' + tag" not in PUBLISH,
    "Release 要求标题日期和内容": "manifest.release title, date, and changes are required" in PUBLISH,
    "Release 记录正式发布日期": "发布日期：" in PUBLISH,
    "Release 附带完整更新产物": "ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig update_history.json" in PUBLISH,
    "Release 拒绝复用错误目标标签": "points to $tagged, expected $target" in PUBLISH,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
if failed:
    raise SystemExit("release record flow verification failed: " + ", ".join(failed))
print("Release record source-of-truth verification passed.")
