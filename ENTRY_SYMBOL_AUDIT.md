# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`1914`
- 子模块文件：`24`
- 普通函数定义：`96`
- 顶层变量：`29`
- 跨模块引用函数：`4`
- 动态引用待确认函数：`0`
- 高置信度零引用函数候选：`1`
- 高置信度零引用变量候选：`0`
- 常量返回包装函数：`1`
- 完全相同函数体组：`0`

## 高置信度零引用函数候选

|函数|定义行|函数行数|入口标识符引用|子模块引用|动态引用|建议|
|---|---:|---:|---:|---:|---:|---|
|`getAndroidContext`|78|12|0|0|0|删除前增加定向回归并检查 ShortX 动态调用|

## 高置信度零引用顶层变量候选

|变量|定义行|入口标识符引用|子模块引用|动态引用|建议|
|---|---:|---:|---:|---:|---|
|—|—|—|—|—|当前无候选|

## 常量返回包装函数

|函数|定义行|返回值|状态|入口引用|子模块引用|
|---|---:|---|---|---:|---:|
|`getUpdateSourceText`|610|`"GitHub"`|入口内使用|2|0|

## 完全相同函数体

|函数体摘要|函数|说明|
|---|---|---|
|—|—|没有完全相同函数体|

## 全部入口函数引用矩阵

|函数|定义行|行数|状态|入口调用|入口标识符|子模块调用|子模块标识符|动态引用|
|---|---:|---:|---|---:|---:|---:|---:|---:|
|`buildNoCacheUrl`|55|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|60|3|入口内使用|10|10|0|0|0|
|`disconnectQuietly`|64|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|68|7|入口内使用|2|2|0|0|0|
|`getAndroidContext`|78|12|高置信度零引用候选|0|0|0|0|0|
|`canWriteDirPath`|91|14|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|106|22|入口内使用|1|1|0|0|0|
|`getToolHubRootDir`|129|18|入口内使用|3|3|0|0|0|
|`getLogPath`|153|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|154|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|155|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|156|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|157|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|158|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|159|1|入口内使用|4|4|0|0|0|
|`writeLog`|161|27|入口内使用|48|48|0|0|0|
|`runShell`|189|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|197|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|204|16|入口内使用|8|8|0|0|0|
|`readTextFile`|221|16|入口内使用|6|6|0|0|0|
|`writeTextFile`|238|20|入口内使用|7|7|0|0|0|
|`readFirstLine`|259|6|入口内使用|3|3|0|0|0|
|`sha256File`|266|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|290|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|291|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|292|5|入口内使用|3|3|0|0|0|
|`saveTrustedVersion`|297|1|入口内使用|1|1|0|0|0|
|`getEmptyInstalledManifest`|299|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|303|21|入口内使用|1|1|0|0|0|
|`getInstalledFileInfo`|325|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|333|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|339|29|入口内使用|2|2|0|0|0|
|`downloadText`|369|32|入口内使用|2|2|0|0|0|
|`downloadFile`|402|53|入口内使用|4|4|0|0|0|
|`base64Decode`|456|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|460|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|466|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|484|41|入口内使用|4|4|0|0|0|
|`recoverAtomicReplacement`|526|13|入口内使用|6|6|0|0|0|
|`replaceFile`|540|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|573|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|578|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|597|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|601|8|入口内使用|6|6|0|0|0|
|`getUpdateSourceText`|610|3|入口内使用|2|2|0|0|0|
|`getUpdateModeText`|614|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|620|7|入口内使用|1|1|0|0|0|
|`buildToolHubSecurityText`|628|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|635|34|入口内使用|3|3|0|0|0|
|`hashesEqual`|670|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|675|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|686|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|696|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|709|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|719|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|726|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|743|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|760|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|771|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|802|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|823|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|853|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|864|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|868|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|872|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|878|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|893|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|913|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|929|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|945|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|985|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|1002|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|1012|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1024|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1055|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1090|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1113|33|入口内使用|2|2|0|0|0|
|`executeStagedModuleTransaction`|1147|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1199|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1291|78|跨模块引用|0|0|2|4|0|
|`checkModuleManifestConsistency`|1371|51|入口内使用|2|2|0|0|0|
|`verifyLocalModuleBeforeEval`|1423|21|入口内使用|1|1|0|0|0|
|`loadScript`|1445|29|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1504|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1528|16|入口内使用|2|2|0|0|0|
|`unregisterToolHubAppInstance`|1545|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1561|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1571|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1596|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1655|29|入口内使用|2|2|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1685|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1715|44|跨模块引用|0|0|2|4|0|
|`summarizeModuleUpdates`|1770|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|1784|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|1794|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|1804|44|入口内使用|1|1|0|0|0|

