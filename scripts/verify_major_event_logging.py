#!/usr/bin/env python3
import re
import sys
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("code/th_08_content.js")
text = path.read_text(encoding="utf-8")
errors = []

match = re.search(r"^//\s*@version\s+(\d+)\.(\d+)\.(\d+)", text)
if not match or tuple(map(int, match.groups())) < (1, 0, 5):
    errors.append("th_08_content.js version below major-event severity baseline 1.0.5")

required = (
    "TH_MAJOR ",
    "ToolHubLogger.prototype.major = function",
    "ToolHubLogger.prototype.checkpoint = function",
    "ToolHubLogger.prototype.incident = function",
    "ToolHubLogger.prototype.beginSession = function",
    "ToolHubLogger.prototype.endSession = function",
    "ToolHubLogger.prototype.recoverPreviousSession = function",
    "ToolHubLogger.prototype.getRecentMajorEvents = function",
    "RECOVERED_INTERRUPTION",
    "suspected_system_server_restart",
    "FileIO.appendText = function(path, content, forceSync)",
    "fos.getFD().sync()",
    "TOOLHUB_ACTIVE_LOGGER",
    "TOOLHUB_CRASH_BRIDGE",
    "TOOLHUB_BASE_LOGGER_CONSTRUCTOR",
    "__toolHubMajorLoggerWrapper",
    "OutOfMemoryError",
    "function patchRuntime()",
    "function wrapTest(proto, methodName, testName, defaultLoops)",
    'this.L.major("TEST_BEGIN"',
    'this.L.major("TEST_PROGRESS"',
    'this.L.major("TEST_END"',
    'this.major("TEST_INTERRUPTED"',
    'wrapTest(p, "runColorSafetyRuntimeSelfTest", "color_safety", 160)',
    'wrapTest(p, "runSettingsInteractionStressTest", "settings_interaction", 120)',
    "getRecentMajorEventSummary",
    "copyRecentMajorEventSummary",
    "最近重大事件",
    "复制最近重大事件",
    "majorSeverityOf",
    "isMajorAbnormalEvent",
    "getRecentAbnormalEventSummary",
    "getRecentMajorEventDetailSummary",
    "copyCurrentMajorEventSummary",
    "__toolHubMajorSeverityPatch",
    "最近异常事件",
    "查看全部事件",
    "只看异常",
    "复制当前摘要",
    'wrap(p, "createColorSafetyRuntimeDiagnosticCard"',
    '"WM_ADD_BEGIN"',
    '"WM_ADD_DONE"',
    '"WM_ADD_FAIL"',
    '"WM_REMOVE_BEGIN"',
    '"WM_REMOVE_DONE"',
    '"SESSION_READY"',
    '"SESSION_CLOSE_BEGIN"',
    "ShortX_ToolHub",
    "java.io.RandomAccessFile",
)
for token in required:
    if token not in text:
        errors.append("major-event logging contract missing: %s" % token)

for method in (
    "parseSettingsUri", "settingsGetStringByTable", "settingsPutStringByTable",
    "getContentSecurityMode", "getContentUriAllowlist",
    "getContentWriteUriAllowlist", "matchesContentUriAllowlist",
    "isContentUriAllowlisted", "isContentWriteUriAllowlisted",
    "checkContentUriSecurity", "contentQueryToText", "execContentAction",
):
    token = "FloatBallAppWM.prototype.%s = function" % method
    if token not in text:
        errors.append("existing Content API missing: %s" % method)

for forbidden in (
    "ToolHub/diagnostics/incident", "incident-last.json", "session-active.json",
    "incident-history.jsonl", "ShortX_ToolHub_session.json",
):
    if forbidden in text:
        errors.append("major-event logging creates forbidden side storage: %s" % forbidden)

for pattern, label in (
    (r"\blet\s+[A-Za-z_$]", "let"),
    (r"\bconst\s+[A-Za-z_$]", "const"),
    (r"=>", "arrow"),
    (r"\?\.[A-Za-z_$]", "optional-chain"),
    (r"\?\?\s*[A-Za-z_$0-9(]", "nullish"),
    (r"`", "template-literal"),
):
    if re.search(pattern, text):
        errors.append("Rhino ES5 forbidden syntax present: %s" % label)

if text.count("java.lang.Thread.setDefaultUncaughtExceptionHandler") != 1:
    errors.append("crash handler install point must remain singleton in major-event patch")
if text.count("ToolHubLogger = function(procInfo)") != 1:
    errors.append("ToolHubLogger wrapper count must be exactly one")
for method in ("addPanel", "safeRemoveView", "startAsync", "close"):
    if text.count('wrap(p, "%s"' % method) != 1:
        errors.append("%s major checkpoint wrapper count must be exactly one" % method)
for method in ("runColorSafetyRuntimeSelfTest", "runSettingsInteractionStressTest"):
    if text.count('wrapTest(p, "%s"' % method) != 1:
        errors.append("%s test lifecycle wrapper count must be exactly one" % method)
if text.count('wrap(p, "createColorSafetyRuntimeDiagnosticCard"') != 1:
    errors.append("runtime records card wrapper count must be exactly one")

major = re.search(r"ToolHubLogger\.prototype\.major = function\(event, fields, sync\) \{.*?\n  \};", text, re.S)
if not major:
    errors.append("major method block missing")
elif "this._writeRaw" not in major.group(0):
    errors.append("major events do not write through existing daily logger")

recover = re.search(r"ToolHubLogger\.prototype\.recoverPreviousSession = function\(\) \{.*?\n  \};", text, re.S)
if not recover:
    errors.append("session recovery block missing")
else:
    for token in ("TEST_BEGIN", "TEST_PROGRESS", "TEST_END", "TEST_INTERRUPTED"):
        if token not in recover.group(0):
            errors.append("session recovery does not cover %s" % token)

if errors:
    print("MAJOR_EVENT_LOGGING_ERRORS %d" % len(errors))
    for error in errors:
        print("ERROR", error)
    raise SystemExit(1)
print("OK major_event_logging daily_log_only=1 test_lifecycle=1 test_interruption=1 runtime_records=1 severity_filter=1 details_toggle=1 crash_handler_singleton=1 wm_checkpoints=1 content_api_preserved=1")
