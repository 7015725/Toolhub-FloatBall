# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`2292`
- 子模块文件：`29`
- 普通函数定义：`116`
- 顶层变量：`40`
- 跨模块引用函数：`17`
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
|`normalizeToolHubUpdateChannel`|16|5|跨模块引用|13|13|8|8|0|
|`getToolHubChannelSpec`|22|3|跨模块引用|3|3|4|4|0|
|`getToolHubEntryUpdateChannel`|26|6|入口内使用|2|2|0|0|0|
|`getToolHubEntryUpdateSourceRef`|33|9|入口内使用|2|2|0|0|0|
|`isToolHubEntryUpdateSourceLocked`|43|4|入口内使用|5|5|0|0|0|
|`getToolHubShortXBaseDirForChannel`|48|7|入口内使用|1|1|0|0|0|
|`getToolHubChannelStatePath`|56|3|入口内使用|2|2|0|0|0|
|`toolHubChannelCloseQuietly`|60|3|入口内使用|3|3|0|0|0|
|`defaultToolHubChannelState`|64|10|入口内使用|1|1|0|0|0|
|`readToolHubChannelState`|75|25|跨模块引用|4|4|1|2|0|
|`writeToolHubChannelStateAtomic`|101|42|入口内使用|4|4|0|0|0|
|`buildNoCacheUrl`|215|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|220|3|入口内使用|11|11|0|0|0|
|`disconnectQuietly`|224|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|228|7|入口内使用|3|3|0|0|0|
|`canWriteDirPath`|238|8|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|247|23|入口内使用|2|2|0|0|0|
|`getToolHubRootDir`|271|18|跨模块引用|6|6|3|5|0|
|`getLogPath`|295|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|296|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|297|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|298|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|299|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|300|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|301|1|入口内使用|4|4|0|0|0|
|`resetToolHubChannelRuntimeCaches`|305|9|入口内使用|1|1|0|0|0|
|`applyToolHubChannelRuntime`|315|26|入口内使用|2|2|0|0|0|
|`beginToolHubChannelSwitch`|342|11|入口内使用|1|1|0|0|0|
|`commitToolHubActiveChannel`|354|11|入口内使用|1|1|0|0|0|
|`cancelToolHubPendingChannel`|366|11|入口内使用|2|2|0|0|0|
|`writeLog`|378|27|跨模块引用|54|54|2|2|0|
|`runShell`|406|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|414|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|421|16|入口内使用|9|9|0|0|0|
|`readTextFile`|438|16|入口内使用|7|7|0|0|0|
|`writeTextFile`|455|20|跨模块引用|7|7|2|4|0|
|`readFirstLine`|476|6|跨模块引用|3|3|1|2|0|
|`sha256File`|483|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|507|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|508|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|509|5|跨模块引用|3|3|1|2|0|
|`saveTrustedVersion`|514|1|入口内使用|2|2|0|0|0|
|`getEmptyInstalledManifest`|516|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|520|21|跨模块引用|1|1|1|2|0|
|`getInstalledFileInfo`|542|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|550|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|556|29|入口内使用|3|3|0|0|0|
|`downloadText`|586|32|跨模块引用|2|2|1|3|0|
|`downloadFile`|619|53|入口内使用|4|4|0|0|0|
|`base64Decode`|673|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|677|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|683|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|701|49|入口内使用|6|6|0|0|0|
|`recoverAtomicReplacement`|751|13|入口内使用|6|6|0|0|0|
|`replaceFile`|765|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|798|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|803|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|822|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|826|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|835|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|841|7|跨模块引用|2|2|1|2|0|
|`buildToolHubSecurityText`|849|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|856|40|入口内使用|3|3|0|0|0|
|`hashesEqual`|897|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|902|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|913|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|923|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|936|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|946|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|953|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|970|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|987|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|998|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|1029|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|1050|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|1080|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|1091|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|1095|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|1099|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|1105|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|1120|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|1140|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|1156|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|1172|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|1212|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|1229|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|1239|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1251|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1282|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1317|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1340|33|入口内使用|3|3|0|0|0|
|`executeStagedModuleTransaction`|1374|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1426|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1518|78|跨模块引用|0|0|3|9|0|
|`checkModuleManifestConsistency`|1598|51|入口内使用|3|3|0|0|0|
|`verifyLocalModuleBeforeEval`|1650|21|入口内使用|2|2|0|0|0|
|`loadScript`|1672|29|入口内使用|3|3|0|0|0|
|`notifyToolHubModulesLoaded`|1731|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1755|16|入口内使用|3|3|0|0|0|
|`unregisterToolHubAppInstance`|1772|15|跨模块引用|4|4|2|4|0|
|`getToolHubCloseActionForRestart`|1788|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1798|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1823|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1882|29|入口内使用|4|4|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1912|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1942|44|跨模块引用|0|0|1|2|0|
|`showToolHubChannelSwitchToast`|1989|8|跨模块引用|3|3|2|2|0|
|`flushToolHubStateBeforeChannelSwitch`|1998|9|入口内使用|1|1|0|0|0|
|`loadTargetToolHubChannelModules`|2008|16|入口内使用|1|1|0|0|0|
|`reloadKnownGoodToolHubChannelModules`|2025|14|入口内使用|1|1|0|0|0|
|`startToolHubAppAfterChannelLoad`|2040|16|入口内使用|2|2|0|0|0|
|`switchToolHubUpdateChannel`|2057|74|跨模块引用|0|0|1|1|0|
|`summarizeModuleUpdates`|2142|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|2156|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|2166|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|2176|47|入口内使用|1|1|0|0|0|
