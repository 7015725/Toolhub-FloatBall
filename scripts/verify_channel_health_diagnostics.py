#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH08 = (ROOT / "code" / "th_08_content.js").read_text(encoding="utf-8")
VERIFY = (ROOT / ".github" / "workflows" / "verify.yml").read_text(encoding="utf-8")

checks = {
    "模块版本已提升": "// @version 1.0.9" in TH08,
    "健康报告构建器存在": "buildToolHubChannelHealthReport" in TH08,
    "健康自检入口存在": "runToolHubChannelHealthCheck" in TH08,
    "诊断复制入口存在": "copyToolHubChannelHealthReport" in TH08,
    "报告按活动根目录保存": 'rootText + "/diagnostics/channel-health-last.txt"' in TH08,
    "报告不固定 Stable 路径": 'ToolHub/diagnostics/channel-health-last.txt' not in TH08,
    "检查通道分支根目录": all(marker in TH08 for marker in ['"branch"', '"root"', '"app_root"', '"state_active"', '"state_pending"']),
    "检查更新与签名状态": all(marker in TH08 for marker in ['"update_channel"', '"manifest"', '"installed"', '"post_switch_check"']),
    "检查 SQLite 通道路径": '"database_path"' in TH08 and 'dbPath.indexOf(rootDir + "/") === 0' in TH08,
    "结构化健康日志存在": "TH_CHANNEL event=HEALTH_CHECK_DONE" in TH08,
    "运行记录 UI 存在": "通道健康自检" in TH08 and "复制通道诊断报告" in TH08,
    "敏感信息排除说明存在": "报告不包含翻译密钥、按钮内容或其他敏感配置" in TH08,
    "验证工作流已接入": "python3 scripts/verify_channel_health_diagnostics.py" in VERIFY,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
if failed:
    raise SystemExit("channel health diagnostics verification failed: " + ", ".join(failed))
print("Channel health diagnostics verification passed.")
