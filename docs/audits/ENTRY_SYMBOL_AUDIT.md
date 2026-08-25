# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`2427`
- 子模块文件：`33`
- 普通函数定义：`119`
- 顶层变量：`40`
- 跨模块引用函数：`21`
- 动态引用待确认函数：`0`
- 高置信度零引用函数候选：`0`
- 高置信度零引用变量候选：`0`
- 常量返回包装函数：`0`
- 完全相同函数体组：`1`

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
|`9ed03413b2c1`|`toolHubChannelCloseQuietly`、`closeQuietly`|仅表示归一化函数体完全一致，仍需核对语义和作用域|

## 全部入口函数引用矩阵

|函数|定义行|行数|状态|入口调用|入口标识符|子模块调用|子模块标识符|动态引用|
|---|---:|---:|---|---:|---:|---:|---:|---:|
|`normalizeToolHubUpdateChannel`|14|5|跨模块引用|15|15|8|8|0|
|`getToolHubChannelSpec`|20|3|跨模块引用|3|3|4|4|0|
|`getToolHubShortXBaseDirForChannel`|24|7|入口内使用|1|1|0|0|0|
|`getToolHubChannelStatePath`|32|3|入口内使用|2|2|0|0|0|
|`toolHubChannelCloseQuietly`|36|3|入口内使用|3|3|0|0|0|
|`defaultToolHubChannelState`|40|10|入口内使用|1|1|0|0|0|
|`readToolHubChannelState`|51|25|跨模块引用|4|4|1|2|0|
|`writeToolHubChannelStateAtomic`|77|42|入口内使用|4|4|0|0|0|
|`buildNoCacheUrl`|188|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|193|3|跨模块引用|11|11|4|5|0|
|`disconnectQuietly`|197|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|201|7|入口内使用|3|3|0|0|0|
|`canWriteDirPath`|211|8|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|220|23|跨模块引用|2|2|2|4|0|
|`getToolHubRootDir`|244|18|跨模块引用|6|6|6|10|0|
|`getLogPath`|268|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|269|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|270|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|271|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|272|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|273|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|274|1|入口内使用|4|4|0|0|0|
|`resetToolHubChannelRuntimeCaches`|278|9|入口内使用|1|1|0|0|0|
|`applyToolHubChannelRuntime`|288|24|入口内使用|2|2|0|0|0|
|`beginToolHubChannelSwitch`|313|11|入口内使用|1|1|0|0|0|
|`commitToolHubActiveChannel`|325|11|入口内使用|1|1|0|0|0|
|`cancelToolHubPendingChannel`|337|11|入口内使用|3|3|0|0|0|
|`writeLog`|349|27|跨模块引用|55|55|6|7|0|
|`setDirPerms`|377|11|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|389|16|入口内使用|10|10|0|0|0|
|`readTextFile`|406|16|入口内使用|7|7|0|0|0|
|`writeTextFile`|423|20|跨模块引用|7|7|2|4|0|
|`readFirstLine`|444|6|跨模块引用|3|3|1|2|0|
|`sha256File`|451|23|跨模块引用|18|18|1|2|0|
|`saveTrustedSha`|475|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|476|1|入口内使用|5|5|0|0|0|
|`getTrustedVersion`|477|5|跨模块引用|3|3|1|2|0|
|`saveTrustedVersion`|482|1|入口内使用|2|2|0|0|0|
|`getEmptyInstalledManifest`|484|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|488|21|跨模块引用|1|1|1|2|0|
|`getInstalledFileInfo`|510|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|518|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|524|29|入口内使用|3|3|0|0|0|
|`downloadText`|554|32|跨模块引用|2|2|1|3|0|
|`downloadFile`|587|53|入口内使用|4|4|0|0|0|
|`base64Decode`|641|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|645|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|651|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|669|49|跨模块引用|6|6|1|2|0|
|`recoverAtomicReplacement`|719|13|入口内使用|6|6|0|0|0|
|`replaceFile`|733|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|766|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|771|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|790|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|794|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|803|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|809|7|跨模块引用|2|2|1|2|0|
|`buildToolHubSecurityText`|817|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|824|38|入口内使用|3|3|0|0|0|
|`hashesEqual`|863|4|入口内使用|15|15|0|0|0|
|`parseModuleVersionText`|868|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|879|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|889|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|902|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|912|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|919|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|936|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|953|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|964|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|995|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|1016|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|1046|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|1057|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|1061|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|1065|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|1071|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|1086|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|1106|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|1122|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|1138|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|1178|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|1195|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|1205|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1217|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1248|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1283|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1306|33|入口内使用|3|3|0|0|0|
|`executeStagedModuleTransaction`|1340|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1392|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1484|78|跨模块引用|0|0|3|9|0|
|`checkLocalTrustedModuleSet`|1564|38|入口内使用|1|1|0|0|0|
|`checkModuleManifestConsistency`|1603|58|入口内使用|4|4|0|0|0|
|`verifyLocalModuleBeforeEval`|1662|21|入口内使用|2|2|0|0|0|
|`loadScript`|1684|29|入口内使用|3|3|0|0|0|
|`copyToolHubModuleList`|1725|5|入口内使用|2|2|0|0|0|
|`refreshToolHubChannelModuleSet`|1733|8|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1767|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1792|16|入口内使用|3|3|0|0|0|
|`unregisterToolHubAppInstance`|1809|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1825|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1835|24|入口内使用|1|1|0|0|0|
|`appendToolHubWindowSnapshot`|1860|9|入口内使用|1|1|0|0|0|
|`snapshotToolHubAppWindows`|1870|20|入口内使用|1|1|0|0|0|
|`isToolHubWindowAttached`|1891|8|入口内使用|1|1|0|0|0|
|`waitForToolHubWindowsDetached`|1900|22|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1923|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1982|45|入口内使用|5|5|0|0|0|
|`reloadLocalToolHubModulesForRestart`|2028|25|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|2054|44|跨模块引用|0|0|1|2|0|
|`showToolHubChannelSwitchToast`|2101|8|跨模块引用|4|4|2|2|0|
|`flushToolHubStateBeforeChannelSwitch`|2110|9|入口内使用|1|1|0|0|0|
|`loadTargetToolHubChannelModules`|2120|13|入口内使用|1|1|0|0|0|
|`reloadKnownGoodToolHubChannelModules`|2134|16|入口内使用|1|1|0|0|0|
|`startToolHubAppAfterChannelLoad`|2151|19|入口内使用|2|2|0|0|0|
|`switchToolHubUpdateChannel`|2171|89|跨模块引用|0|0|1|1|0|
|`summarizeModuleUpdates`|2271|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|2285|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|2295|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|2305|47|入口内使用|1|1|0|0|0|
