# ToolHub.js 入口符号与冗余审计

## 审查约束

- 本报告只提供静态证据，不自动删除入口代码。
- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。
- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。
- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。

## 扫描摘要

- 入口行数：`1889`
- 子模块文件：`29`
- 普通函数定义：`94`
- 顶层变量：`30`
- 跨模块引用函数：`10`
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
|`buildNoCacheUrl`|56|4|入口内使用|2|2|0|0|0|
|`closeQuietly`|61|3|入口内使用|11|11|0|0|0|
|`disconnectQuietly`|65|3|入口内使用|2|2|0|0|0|
|`syncFileOutput`|69|7|入口内使用|2|2|0|0|0|
|`canWriteDirPath`|79|8|入口内使用|1|1|0|0|0|
|`assertWritableDirPath`|88|23|入口内使用|2|2|0|0|0|
|`getToolHubRootDir`|112|18|跨模块引用|3|3|2|4|0|
|`getLogPath`|136|1|入口内使用|1|1|0|0|0|
|`getCodeDirPath`|137|1|入口内使用|8|8|0|0|0|
|`getTrustedShaPath`|138|1|入口内使用|3|3|0|0|0|
|`getTrustedVersionPath`|139|1|入口内使用|4|4|0|0|0|
|`getInstalledManifestPath`|140|1|入口内使用|3|3|0|0|0|
|`getModuleTxnMarkerPath`|141|1|入口内使用|4|4|0|0|0|
|`getModuleTxnCommitPath`|142|1|入口内使用|4|4|0|0|0|
|`writeLog`|144|27|跨模块引用|48|48|2|2|0|
|`runShell`|172|7|入口内使用|1|1|0|0|0|
|`setDirPerms`|180|6|入口内使用|2|2|0|0|0|
|`ensureCodeDir`|187|16|入口内使用|8|8|0|0|0|
|`readTextFile`|204|16|入口内使用|6|6|0|0|0|
|`writeTextFile`|221|20|跨模块引用|7|7|1|2|0|
|`readFirstLine`|242|6|跨模块引用|3|3|1|2|0|
|`sha256File`|249|23|入口内使用|17|17|0|0|0|
|`saveTrustedSha`|273|1|入口内使用|7|7|0|0|0|
|`getTrustedSha`|274|1|入口内使用|4|4|0|0|0|
|`getTrustedVersion`|275|5|跨模块引用|3|3|1|2|0|
|`saveTrustedVersion`|280|1|入口内使用|1|1|0|0|0|
|`getEmptyInstalledManifest`|282|3|入口内使用|3|3|0|0|0|
|`readInstalledManifest`|286|21|入口内使用|1|1|0|0|0|
|`getInstalledFileInfo`|308|7|入口内使用|1|1|0|0|0|
|`getInstalledSha`|316|5|入口内使用|3|3|0|0|0|
|`saveInstalledManifestFromLocal`|322|29|入口内使用|2|2|0|0|0|
|`downloadText`|352|32|跨模块引用|2|2|1|3|0|
|`downloadFile`|385|53|入口内使用|4|4|0|0|0|
|`base64Decode`|439|3|入口内使用|2|2|0|0|0|
|`getTrustedPublicKeyB64`|443|5|入口内使用|2|2|0|0|0|
|`verifyManifestSignature`|449|17|入口内使用|1|1|0|0|0|
|`fetchTrustedManifest`|467|41|入口内使用|4|4|0|0|0|
|`recoverAtomicReplacement`|509|13|入口内使用|6|6|0|0|0|
|`replaceFile`|523|32|入口内使用|2|2|0|0|0|
|`getManifestInfo`|556|4|入口内使用|6|6|0|0|0|
|`getManifestRelease`|561|17|入口内使用|3|3|0|0|0|
|`runtimeOptString`|580|3|入口内使用|17|17|0|0|0|
|`copyRuntimeStringList`|584|8|入口内使用|6|6|0|0|0|
|`getUpdateModeText`|593|5|入口内使用|2|2|0|0|0|
|`getTrustedManifestVersionNumber`|599|7|入口内使用|2|2|0|0|0|
|`buildToolHubSecurityText`|607|6|入口内使用|2|2|0|0|0|
|`applyRuntimeUpdateState`|614|34|入口内使用|3|3|0|0|0|
|`hashesEqual`|649|4|入口内使用|14|14|0|0|0|
|`parseModuleVersionText`|654|10|入口内使用|2|2|0|0|0|
|`compareModuleVersion`|665|9|入口内使用|1|1|0|0|0|
|`readModuleVersionFromText`|675|12|入口内使用|1|1|0|0|0|
|`readModuleVersionFromFile`|688|9|入口内使用|1|1|0|0|0|
|`getManifestModuleVersion`|698|6|入口内使用|1|1|0|0|0|
|`copyRuntimeDetailList`|705|16|入口内使用|3|3|0|0|0|
|`addPendingModuleUpdate`|722|16|入口内使用|5|5|0|0|0|
|`ensurePlainBootModule`|739|10|入口内使用|1|1|0|0|0|
|`ensureBootVerifiedModule`|750|30|入口内使用|1|1|0|0|0|
|`ensurePlainRemoteModule`|781|20|入口内使用|1|1|0|0|0|
|`ensureVerifiedModule`|802|29|入口内使用|1|1|0|0|0|
|`ensureLocalTrustedModule`|832|10|入口内使用|1|1|0|0|0|
|`getTxnStageFile`|843|3|入口内使用|4|4|0|0|0|
|`getTxnBackupFile`|847|3|入口内使用|1|1|0|0|0|
|`deleteFileStrict`|851|5|入口内使用|13|13|0|0|0|
|`makeTransactionEntry`|857|14|入口内使用|3|3|0|0|0|
|`stageVerifiedModuleEntry`|872|19|入口内使用|1|1|0|0|0|
|`stagePlainModuleEntry`|892|15|入口内使用|1|1|0|0|0|
|`stageTextTransactionEntry`|908|15|入口内使用|3|3|0|0|0|
|`buildInstalledManifestForTransaction`|924|39|入口内使用|1|1|0|0|0|
|`appendTransactionMetadataEntries`|964|16|入口内使用|1|1|0|0|0|
|`cleanupStagedTransactionEntries`|981|9|入口内使用|3|3|0|0|0|
|`transactionEntryMatches`|991|11|入口内使用|2|2|0|0|0|
|`rollbackModuleTransaction`|1003|30|入口内使用|2|2|0|0|0|
|`finalizeCommittedModuleTransaction`|1034|34|入口内使用|2|2|0|0|0|
|`recoverOrphanTransactionFiles`|1069|22|入口内使用|2|2|0|0|0|
|`recoverPendingModuleTransaction`|1092|33|入口内使用|2|2|0|0|0|
|`executeStagedModuleTransaction`|1126|50|入口内使用|1|1|0|0|0|
|`installPendingModuleUpdates`|1178|90|跨模块引用|0|0|1|2|0|
|`checkToolHubModuleUpdatesNow`|1270|78|跨模块引用|0|0|1|6|0|
|`checkModuleManifestConsistency`|1350|51|入口内使用|2|2|0|0|0|
|`verifyLocalModuleBeforeEval`|1402|21|入口内使用|1|1|0|0|0|
|`loadScript`|1424|29|入口内使用|2|2|0|0|0|
|`notifyToolHubModulesLoaded`|1483|15|入口内使用|1|1|0|0|0|
|`registerToolHubAppInstance`|1507|16|入口内使用|2|2|0|0|0|
|`unregisterToolHubAppInstance`|1524|15|跨模块引用|3|3|2|4|0|
|`getToolHubCloseActionForRestart`|1540|9|入口内使用|1|1|0|0|0|
|`sendToolHubCloseBroadcastForRestart`|1550|24|入口内使用|1|1|0|0|0|
|`closeToolHubAppForRestart`|1575|58|入口内使用|1|1|0|0|0|
|`closeToolHubAppsForRestart`|1634|29|入口内使用|2|2|0|0|0|
|`reloadLocalToolHubModulesForRestart`|1664|29|入口内使用|1|1|0|0|0|
|`restartToolHubFromSettings`|1694|44|跨模块引用|0|0|1|2|0|
|`summarizeModuleUpdates`|1749|14|入口内使用|1|1|0|0|0|
|`summarizePendingModuleUpdates`|1763|10|入口内使用|1|1|0|0|0|
|`summarizeLoadErrors`|1773|10|入口内使用|1|1|0|0|0|
|`buildToolHubUpdateState`|1783|40|入口内使用|1|1|0|0|0|
