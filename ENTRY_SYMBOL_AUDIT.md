# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`1893`
- 子模块文件：`24`
- 普通函数定义：`94`
- 顶层变量：`29`
- 跨模块引用函数：`4`
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
|`closeQuietly`|60|3|入口内使用|10|10|0|0|0|
|`disconnectQuietly`|64|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|68|7|入口内使用|2|2|0|0|0|
|`canWriteDirPath`|78|14|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|93|22|入口内使用|1|1|0|0|0|
|`getToolHubRootDir`|116|18|入口内使用|3|3|0|0|0|
|`getLogPath`|140|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|141|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|142|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|143|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|144|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|145|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|146|1|入口内使用|4|4|0|0|0|
|`writeLog`|148|27|入口内使用|48|48|0|0|0|
|`runShell`|176|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|184|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|191|16|入口内使用|8|8|0|0|0|
|`readTextFile`|208|16|入口内使用|6|6|0|0|0|
|`writeTextFile`|225|20|入口内使用|7|7|0|0|0|
|`readFirstLine`|246|6|入口内使用|3|3|0|0|0|
|`sha256File`|253|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|277|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|278|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|279|5|入口内使用|3|3|0|0|0|
|`saveTrustedVersion`|284|1|入口内使用|1|1|0|0|0|
|`getEmptyInstalledManifest`|286|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|290|21|入口内使用|1|1|0|0|0|
|`getInstalledFileInfo`|312|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|320|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|326|29|入口内使用|2|2|0|0|0|
|`downloadText`|356|32|入口内使用|2|2|0|0|0|
|`downloadFile`|389|53|入口内使用|4|4|0|0|0|
|`base64Decode`|443|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|447|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|453|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|471|41|入口内使用|4|4|0|0|0|
|`recoverAtomicReplacement`|513|13|入口内使用|6|6|0|0|0|
|`replaceFile`|527|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|560|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|565|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|584|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|588|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|597|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|603|7|入口内使用|2|2|0|0|0|
|`buildToolHubSecurityText`|611|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|618|34|入口内使用|3|3|0|0|0|
|`hashesEqual`|653|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|658|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|669|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|679|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|692|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|702|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|709|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|726|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|743|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|754|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|785|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|806|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|836|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|847|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|851|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|855|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|861|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|876|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|896|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|912|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|928|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|968|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|985|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|995|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1007|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1038|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1073|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1096|33|入口内使用|2|2|0|0|0|
|`executeStagedModuleTransaction`|1130|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1182|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1274|78|跨模块引用|0|0|2|4|0|
|`checkModuleManifestConsistency`|1354|51|入口内使用|2|2|0|0|0|
|`verifyLocalModuleBeforeEval`|1406|21|入口内使用|1|1|0|0|0|
|`loadScript`|1428|29|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1487|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1511|16|入口内使用|2|2|0|0|0|
|`unregisterToolHubAppInstance`|1528|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1544|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1554|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1579|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1638|29|入口内使用|2|2|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1668|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1698|44|跨模块引用|0|0|2|4|0|
|`summarizeModuleUpdates`|1753|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|1767|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|1777|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|1787|40|入口内使用|1|1|0|0|0|
