# ToolHub 独立 APK 迁移记录

## 已确认需求
- 完全脱离 ShortX，完整迁移，不以简化悬浮球冒充完整版本。
- 最低 Android 14（API 34），Root 优先，明确声明权限并提供授权界面。
- 验收完成前不发布版本、不提交上游。

## 固定源码
- Toolhub-FloatBall: bce8713afa7be75913c510d2c87cb0cf7148fe93（main）
- assists: 2ae91d108070088dde0ab57b505c67bfc6495413
- 本地目录：upstream/Toolhub-FloatBall、upstream/assists。保持上游原样，用于对照，不直接改其签名模块。

## 初步源码取证
| 功能 | 源码 | 迁移要求 |
| --- | --- | --- |
| UI/悬浮球 | code/th_*.js | 大量 JavaAdapter，含继承 View/FrameLayout/ClickableSpan；须验证 Android DEX 适配器，不可仅引入桌面 Rhino |
| Context/文件目录 | th_01_base.js / ToolHub.js | 用独立宿主提供 Context 和私有数据目录，移除 ShortX 混淆 Context 回退 |
| Shell | th_10_shell.js | 替换 ShortX ShellCommand protobuf；su -c，保留退出码/stdout/stderr/超时 |
| 取字/截图 | th_17_pointer.js | 替换 shortx.getUiAutomation，评估 Root 独立进程与无障碍服务；须真实屏幕验证 |
| OCR | th_18_pointer_ocr.js | 替换 ShortX OcrDetect protobuf；需要独立中文 OCR 与截图坐标映射 |
| SQLite | th_01_base.js / th_02_core.js | 尽量复用结构化表与事务；迁移须通过导出/导入，不能假定可读 ShortX 私有目录 |
| 更新 | ToolHub.js / manifest.json | 独立宿主适配与原签名模块分离；禁止修改模块后假称仍通过上游 SHA256 |
| 保活参考 | assists/simple/.../ForegroundService.kt | specialUse 前台服务；onStartCommand 调用父实现，并非 Root 守护 |
| 录屏参考 | assists-mp/.../MPService.kt | 授权前不能以 mediaProjection 类型启动前台服务；不得盲目 STICKY 导致崩溃重启循环 |

## 权限设计（待实现/核验，不代表已授权）
- INTERNET：更新、资源下载。
- SYSTEM_ALERT_WINDOW：悬浮球与面板，设置页显式授权。
- POST_NOTIFICATIONS：Android 13+ 运行时请求。
- FOREGROUND_SERVICE + FOREGROUND_SERVICE_SPECIAL_USE：持续悬浮工具；服务注明 specialUse subtype。
- RECEIVE_BOOT_COMPLETED：仅用户启用自启动后处理，按系统版本核验启动限制。
- REQUEST_IGNORE_BATTERY_OPTIMIZATIONS：用户主动触发，不静默修改设置。
- BIND_ACCESSIBILITY_SERVICE：仅用于服务声明的绑定保护，不作为可运行时请求的 uses-permission。
- Root 不是 Manifest 权限，由 su/KernelSU 授权并检查 uid=0。
- 不默认加入所有文件访问、通讯录、定位等无关权限。截图分享优先使用私有目录与 FileProvider。

## 实施阶段 / 完成门槛
1. [x] 拉取固定上游并初步盘点宿主依赖。
2. [ ] Android 运行时验证：执行 JS、接口回调、继承 Android 类、多线程回调及资源释放。
3. [ ] 权限主页 + 前台服务 + Root 会话 + 原悬浮球和设置 UI。
4. [ ] 按钮所有动作类型、SQLite、图标、主题、布局、日志迁移。
5. [ ] 屏幕节点取字、Root 截图、框选 OCR、图片管理、二维码完整链路。
6. [ ] 签名更新、渠道切换、回滚和离线启动。
7. [ ] 自动化回归、APK 编译、真实 Android 14+ Root 手机验收。

## 当前实现状态
- 新增 runtime/RootShell.kt：阻塞式工作线程 API，显式 su 授权、双管道并发读取、输出上限、超时返回。
- 此文件尚未接入 UI，也未编译或实机验证。进程超时不等于清理所有 Root 后代进程，需要独立会话进程组方案与测试。
- 当前模板 local.properties 指向 Windows SDK 路径，当前 Ubuntu 未检测到 Android SDK；构建环境需先初始化。
- 尚无迁移完成的 APK，不能把模板构建结果交付为 ToolHub。
