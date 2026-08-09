# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`2430`
- 子模块文件：`32`
- 普通函数定义：`120`
- 顶层变量：`40`
- 跨模块引用函数：`18`
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
|`assertWritableDirPath`|220|23|入口内使用|2|2|0|0|0|
|`getToolHubRootDir`|244|18|跨模块引用|6|6|4|7|0|
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
|`writeLog`|349|27|跨模块引用|55|55|5|5|0|
|`runShell`|377|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|385|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|392|16|入口内使用|10|10|0|0|0|
|`readTextFile`|409|16|入口内使用|7|7|0|0|0|
|`writeTextFile`|426|20|跨模块引用|7|7|2|4|0|
|`readFirstLine`|447|6|跨模块引用|3|3|1|2|0|
|`sha256File`|454|23|入口内使用|18|18|0|0|0|
|`saveTrustedSha`|478|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|479|1|入口内使用|5|5|0|0|0|
|`getTrustedVersion`|480|5|跨模块引用|3|3|1|2|0|
|`saveTrustedVersion`|485|1|入口内使用|2|2|0|0|0|
|`getEmptyInstalledManifest`|487|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|491|21|跨模块引用|1|1|1|2|0|
|`getInstalledFileInfo`|513|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|521|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|527|29|入口内使用|3|3|0|0|0|
|`downloadText`|557|32|跨模块引用|2|2|1|3|0|
|`downloadFile`|590|53|入口内使用|4|4|0|0|0|
|`base64Decode`|644|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|648|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|654|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|672|49|入口内使用|6|6|0|0|0|
|`recoverAtomicReplacement`|722|13|入口内使用|6|6|0|0|0|
|`replaceFile`|736|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|769|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|774|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|793|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|797|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|806|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|812|7|跨模块引用|2|2|1|2|0|
|`buildToolHubSecurityText`|820|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|827|38|入口内使用|3|3|0|0|0|
|`hashesEqual`|866|4|入口内使用|15|15|0|0|0|
|`parseModuleVersionText`|871|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|882|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|892|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|905|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|915|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|922|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|939|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|956|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|967|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|998|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|1019|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|1049|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|1060|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|1064|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|1068|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|1074|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|1089|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|1109|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|1125|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|1141|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|1181|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|1198|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|1208|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1220|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1251|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1286|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1309|33|入口内使用|3|3|0|0|0|
|`executeStagedModuleTransaction`|1343|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1395|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1487|78|跨模块引用|0|0|3|9|0|
|`checkLocalTrustedModuleSet`|1567|38|入口内使用|1|1|0|0|0|
|`checkModuleManifestConsistency`|1606|58|入口内使用|4|4|0|0|0|
|`verifyLocalModuleBeforeEval`|1665|21|入口内使用|2|2|0|0|0|
|`loadScript`|1687|29|入口内使用|3|3|0|0|0|
|`copyToolHubModuleList`|1728|5|入口内使用|2|2|0|0|0|
|`refreshToolHubChannelModuleSet`|1736|8|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1770|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1795|16|入口内使用|3|3|0|0|0|
|`unregisterToolHubAppInstance`|1812|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1828|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1838|24|入口内使用|1|1|0|0|0|
|`appendToolHubWindowSnapshot`|1863|9|入口内使用|1|1|0|0|0|
|`snapshotToolHubAppWindows`|1873|20|入口内使用|1|1|0|0|0|
|`isToolHubWindowAttached`|1894|8|入口内使用|1|1|0|0|0|
|`waitForToolHubWindowsDetached`|1903|22|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1926|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1985|45|入口内使用|5|5|0|0|0|
|`reloadLocalToolHubModulesForRestart`|2031|25|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|2057|44|跨模块引用|0|0|1|2|0|
|`showToolHubChannelSwitchToast`|2104|8|跨模块引用|4|4|2|2|0|
|`flushToolHubStateBeforeChannelSwitch`|2113|9|入口内使用|1|1|0|0|0|
|`loadTargetToolHubChannelModules`|2123|13|入口内使用|1|1|0|0|0|
|`reloadKnownGoodToolHubChannelModules`|2137|16|入口内使用|1|1|0|0|0|
|`startToolHubAppAfterChannelLoad`|2154|19|入口内使用|2|2|0|0|0|
|`switchToolHubUpdateChannel`|2174|89|跨模块引用|0|0|1|1|0|
|`summarizeModuleUpdates`|2274|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|2288|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|2298|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|2308|47|入口内使用|1|1|0|0|0|
