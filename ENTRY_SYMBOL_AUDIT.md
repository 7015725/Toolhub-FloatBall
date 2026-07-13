# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`1888`
- 子模块文件：`26`
- 普通函数定义：`94`
- 顶层变量：`29`
- 跨模块引用函数：`8`
- 动态引用待确认函数：`0`
- 高置信度零引用函数候选：`0`
- 高置信度零引用变量候选：`0`
- 常量返回包装函数：`0`
- 完全相同函数体组：`0`

## 高置信度零引用函数候选

|函数|定义行|函数行数|入口标识符引用|子模块引用|动态引用|建议|
|---|---:|---:|---:|---:|---:|---|
|—|—|—|—|—|—|当前无候选|

## 高置信度零引用顶层变量候选

|变量|定义行|入口标识符引用|子模块引用|动态引用|建议|
|---|---:|---:|---:|---:|---|
|—|—|—|—|—|当前无候选|

## 常量返回包装函数

|函数|定义行|返回值|状态|入口引用|子模块引用|
|---|---:|---|---|---:|---:|
|—|—|—|—|—|—|

## 完全相同函数体

|函数体摘要|函数|说明|
|---|---|---|
|—|—|没有完全相同函数体|

## 全部入口函数引用矩阵

|函数|定义行|行数|状态|入口调用|入口标识符|子模块调用|子模块标识符|动态引用|
|---|---:|---:|---|---:|---:|---:|---:|---:|
|`buildNoCacheUrl`|55|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|60|3|入口内使用|11|11|0|0|0|
|`disconnectQuietly`|64|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|68|7|入口内使用|2|2|0|0|0|
|`canWriteDirPath`|78|8|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|87|23|入口内使用|2|2|0|0|0|
|`getToolHubRootDir`|111|18|跨模块引用|3|3|1|2|0|
|`getLogPath`|135|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|136|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|137|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|138|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|139|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|140|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|141|1|入口内使用|4|4|0|0|0|
|`writeLog`|143|27|跨模块引用|48|48|2|2|0|
|`runShell`|171|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|179|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|186|16|入口内使用|8|8|0|0|0|
|`readTextFile`|203|16|入口内使用|6|6|0|0|0|
|`writeTextFile`|220|20|跨模块引用|7|7|1|2|0|
|`readFirstLine`|241|6|跨模块引用|3|3|1|2|0|
|`sha256File`|248|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|272|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|273|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|274|5|入口内使用|3|3|0|0|0|
|`saveTrustedVersion`|279|1|入口内使用|1|1|0|0|0|
|`getEmptyInstalledManifest`|281|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|285|21|入口内使用|1|1|0|0|0|
|`getInstalledFileInfo`|307|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|315|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|321|29|入口内使用|2|2|0|0|0|
|`downloadText`|351|32|入口内使用|2|2|0|0|0|
|`downloadFile`|384|53|入口内使用|4|4|0|0|0|
|`base64Decode`|438|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|442|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|448|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|466|41|入口内使用|4|4|0|0|0|
|`recoverAtomicReplacement`|508|13|入口内使用|6|6|0|0|0|
|`replaceFile`|522|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|555|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|560|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|579|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|583|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|592|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|598|7|入口内使用|2|2|0|0|0|
|`buildToolHubSecurityText`|606|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|613|34|入口内使用|3|3|0|0|0|
|`hashesEqual`|648|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|653|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|664|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|674|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|687|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|697|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|704|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|721|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|738|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|749|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|780|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|801|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|831|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|842|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|846|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|850|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|856|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|871|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|891|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|907|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|923|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|963|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|980|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|990|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1002|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1033|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1068|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1091|33|入口内使用|2|2|0|0|0|
|`executeStagedModuleTransaction`|1125|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1177|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1269|78|跨模块引用|0|0|2|8|0|
|`checkModuleManifestConsistency`|1349|51|入口内使用|2|2|0|0|0|
|`verifyLocalModuleBeforeEval`|1401|21|入口内使用|1|1|0|0|0|
|`loadScript`|1423|29|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1482|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1506|16|入口内使用|2|2|0|0|0|
|`unregisterToolHubAppInstance`|1523|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1539|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1549|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1574|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1633|29|入口内使用|2|2|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1663|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1693|44|跨模块引用|0|0|2|4|0|
|`summarizeModuleUpdates`|1748|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|1762|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|1772|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|1782|40|入口内使用|1|1|0|0|0|
