# ToolHub 独立 APK：Agent 接手说明

## 目标与边界
用户要求将 7015725/Toolhub-FloatBall 完整迁移为不依赖 ShortX 的独立 Android APK，Android 14+，Root 优先，声明并引导必要权限。参考 ven-coder/assists 的前台服务实现。当前仅完成原生 Alpha，禁止称为完整迁移。

## 最新已验证状态
- 包名 com.toolhub.floatball；版本 0.1.0-alpha；minSdk 34，target/compileSdk 35。
- 最新构建：build-repair.log，BUILD SUCCESSFUL in 51s，32 tasks，4 executed。
- 最新 APK：app/build/outputs/apk/debug/app-debug.apk。
- 已通过 pm install -r -t 覆盖安装，输出 Success，未清除用户数据。
- 最新执行：am instrument -w -e root true com.toolhub.floatball/.SmokeInstrumentation。
- 输出 PASS 8 Android smoke checks，shell 工具 exitCode=0。
- 注意：Root 分支只是记录 Root 结果，没有断言授权；此次输出未显示 root Bundle，不能将该次测试宣传为 Root 验证通过。此前应用运行日志曾记录 uid=0。
- 最新安装后的冷启动、悬浮服务启停和长时间后台存活还需复验。此前旧包已冷启动成功，悬浮服务和 Root 动作有实际日志证据。

## 已有实现
主源码 app/src/main/native/com/toolhub/floatball/：
- MainActivity.java：权限入口、Root 检测、按钮管理、Shell、日志。
- FloatService.java：specialUse 前台服务、通知停止入口、悬浮球和工具面板、START_STICKY。不承诺永不被杀。
- ShellExecutor.java：sh/su -c，超时，stdout/stderr 并行读取与各 64 KiB 限额。
- ActionStore.java：私有 SQLite 数据库 toolhub-native-alpha.db；按钮 CRUD 和启用过滤。
- Actions.java：shell/app/intent/broadcast/toast 分发，runtime.log。
- 最新修复：Shell 日志添加 stderrChars；失败时最多记录 512 字符 stderr 摘要，不记录命令或 stdout。摘要仍可能包含敏感信息，后续应增加脱敏和日志导出确认。

## 尚未迁移
原版 JS UI、Rhino JavaAdapter 宿主、取字、框选 OCR、截图/图片管理、二维码、原版结构化 SQLite 导入、验签更新、完整按钮类型及设置/主题/图标。详见根目录 MIGRATION.md。

## 源码参考与路线风险
upstream/Toolhub-FloatBall 固定 bce8713afa7be75913c510d2c87cb0cf7148fe93。
upstream/assists 固定 2ae91d108070088dde0ab57b505c67bfc6495413。
ShortX 依赖包含 shortx.executeAction/getUiAutomation/getShortXDir、protobuf OCR 动作及 Rhino JavaAdapter。不可仅复制 JS assets 当成完整迁移。上游目录保持参考用途，不改变其签名清单后再宣称验签有效。
当前采取原生 Java Alpha 路线，完整迁移需继续明确原生重写与脚本宿主支持的边界。

## 构建环境
Gradle 8.13，AGP 8.9.2。SDK /root/Android/sdk；本地 Maven /root/Android/maven。
ARM64 AAPT2：tools/aapt2/aapt2，gradle.properties 使用绝对路径 override，换机器必须调整。
local.properties 不应提交。旧 Kotlin/Compose 模板未参与 main 源集；不要误将旧模板当应用入口。
构建：./gradlew --offline --no-daemon :app:assembleDebug。
长任务使用 terminal background=true，随后 terminal_wait 或独立轮询；把日志和真实退出码落盘。此前失败是客户端断连取消 Gradle，不是已证实的 DEX 错误。
最新任务命令：./gradlew --offline --no-daemon :app:assembleDebug > build-repair.log 2>&1; echo $? > build-repair.exit。
离线 Maven 与 SDK 不随源码交付，其他 agent 需自行准备或改成联网构建。

## 测试与排障
JVM tools/ShellExecutorTest.java 此前 PASS 8 checks。
Android debug instrumentation 位于 app/src/debug/java/com/toolhub/floatball/SmokeInstrumentation.java；覆盖 SQLite 种子、插入、读取、更新、启用筛选、删除、Shell 输出/退出码、普通 UID。
该测试假定数据库至少存在一个按钮；用户删空按钮时可能假失败，应改用隔离测试数据库。
Root 测试应在后续增加明确断言或结构化输出校验。
曾出现 USER REQUESTED / FORCE STOP 退出记录，不应当作应用 crash。
uiautomator dump 曾因已有 UiAutomation 服务占用而崩溃，属于系统测试命令，不是 App；避免并行抢占 UiAutomation。

## 接手优先事项
1. 最新包冷启动及悬浮球/服务启停实机复验，保留现有配置。
2. 验证 Root 结果、拒绝授权、命令超时、失败 stderr 日志；加强日志脱敏。
3. 签名校验、SHA-256、APK 导出，明确仅 Debug Alpha。
4. 建立功能映射表，逐项完成完整迁移；自动测试及真实手机验收后再发版本。
5. 将当前绝对路径与离线环境依赖改为可移植构建配置，增加 CI。

## GitHub 与接手状态
当前工作区根目录不是 Git 仓库；尚未推送，不得宣称已同步。
建议目标 7015725/Toolhub-FloatBall 新目录 android-native-alpha/，待用户确认。推送前检查远端最新状态，使用独立分支，不覆盖原项目。
不提交 .gradle、build、SDK、缓存、local.properties、密钥、PAT 或设备原始私有日志。APK 推荐作为 Release 附件而非源码目录内容。
当前工具没有直接切换 agent 的能力；用户需将该目录交给其他 agent 或指定可调用执行通道。
