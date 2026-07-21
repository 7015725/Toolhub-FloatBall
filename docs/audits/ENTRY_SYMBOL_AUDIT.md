# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`2255`
- 子模块文件：`29`
- 普通函数定义：`113`
- 顶层变量：`37`
- 跨模块引用函数：`14`
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
|`normalizeToolHubUpdateChannel`|14|5|跨模块引用|14|14|7|7|0|
|`getToolHubChannelSpec`|20|3|跨模块引用|3|3|3|3|0|
|`getToolHubShortXBaseDirForChannel`|24|7|入口内使用|1|1|0|0|0|
|`getToolHubChannelStatePath`|32|3|入口内使用|2|2|0|0|0|
|`toolHubChannelCloseQuietly`|36|3|入口内使用|3|3|0|0|0|
|`defaultToolHubChannelState`|40|10|入口内使用|1|1|0|0|0|
|`readToolHubChannelState`|51|25|入口内使用|4|4|0|0|0|
|`writeToolHubChannelStateAtomic`|77|42|入口内使用|4|4|0|0|0|
|`buildNoCacheUrl`|188|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|193|3|入口内使用|11|11|0|0|0|
|`disconnectQuietly`|197|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|201|7|入口内使用|3|3|0|0|0|
|`canWriteDirPath`|211|8|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|220|23|入口内使用|2|2|0|0|0|
|`getToolHubRootDir`|244|18|跨模块引用|6|6|2|4|0|
|`getLogPath`|268|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|269|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|270|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|271|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|272|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|273|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|274|1|入口内使用|4|4|0|0|0|
|`resetToolHubChannelRuntimeCaches`|278|9|入口内使用|1|1|0|0|0|
|`applyToolHubChannelRuntime`|288|23|入口内使用|2|2|0|0|0|
|`beginToolHubChannelSwitch`|312|11|入口内使用|1|1|0|0|0|
|`commitToolHubActiveChannel`|324|11|入口内使用|1|1|0|0|0|
|`cancelToolHubPendingChannel`|336|11|入口内使用|2|2|0|0|0|
|`writeLog`|348|27|跨模块引用|54|54|2|2|0|
|`runShell`|376|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|384|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|391|16|入口内使用|9|9|0|0|0|
|`readTextFile`|408|16|入口内使用|7|7|0|0|0|
|`writeTextFile`|425|20|跨模块引用|7|7|1|2|0|
|`readFirstLine`|446|6|跨模块引用|3|3|1|2|0|
|`sha256File`|453|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|477|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|478|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|479|5|跨模块引用|3|3|1|2|0|
|`saveTrustedVersion`|484|1|入口内使用|2|2|0|0|0|
|`getEmptyInstalledManifest`|486|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|490|21|入口内使用|1|1|0|0|0|
|`getInstalledFileInfo`|512|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|520|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|526|29|入口内使用|3|3|0|0|0|
|`downloadText`|556|32|跨模块引用|2|2|1|3|0|
|`downloadFile`|589|53|入口内使用|4|4|0|0|0|
|`base64Decode`|643|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|647|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|653|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|671|49|入口内使用|6|6|0|0|0|
|`recoverAtomicReplacement`|721|13|入口内使用|6|6|0|0|0|
|`replaceFile`|735|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|768|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|773|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|792|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|796|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|805|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|811|7|入口内使用|2|2|0|0|0|
|`buildToolHubSecurityText`|819|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|826|38|入口内使用|3|3|0|0|0|
|`hashesEqual`|865|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|870|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|881|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|891|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|904|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|914|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|921|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|938|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|955|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|966|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|997|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|1018|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|1048|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|1059|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|1063|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|1067|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|1073|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|1088|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|1108|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|1124|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|1140|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|1180|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|1197|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|1207|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1219|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1250|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1285|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1308|33|入口内使用|3|3|0|0|0|
|`executeStagedModuleTransaction`|1342|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1394|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1486|78|跨模块引用|0|0|3|9|0|
|`checkModuleManifestConsistency`|1566|51|入口内使用|3|3|0|0|0|
|`verifyLocalModuleBeforeEval`|1618|21|入口内使用|2|2|0|0|0|
|`loadScript`|1640|29|入口内使用|3|3|0|0|0|
|`notifyToolHubModulesLoaded`|1699|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1723|16|入口内使用|3|3|0|0|0|
|`unregisterToolHubAppInstance`|1740|15|跨模块引用|4|4|2|4|0|
|`getToolHubCloseActionForRestart`|1756|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1766|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1791|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1850|29|入口内使用|4|4|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1880|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1910|44|跨模块引用|0|0|1|2|0|
|`showToolHubChannelSwitchToast`|1957|8|跨模块引用|3|3|2|2|0|
|`flushToolHubStateBeforeChannelSwitch`|1966|9|入口内使用|1|1|0|0|0|
|`loadTargetToolHubChannelModules`|1976|16|入口内使用|1|1|0|0|0|
|`reloadKnownGoodToolHubChannelModules`|1993|14|入口内使用|1|1|0|0|0|
|`startToolHubAppAfterChannelLoad`|2008|16|入口内使用|2|2|0|0|0|
|`switchToolHubUpdateChannel`|2025|71|跨模块引用|0|0|1|1|0|
|`summarizeModuleUpdates`|2107|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|2121|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|2131|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|2141|47|入口内使用|1|1|0|0|0|
