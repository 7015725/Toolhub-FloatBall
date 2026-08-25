# ToolHubRuntime 单 JAR

最终设备侧只部署一个文件：

```text
ToolHubRuntime.jar
```

固定位置：

```text
shortx.getShortXDir()/ToolHub-Beta/runtime/ToolHubRuntime.jar
```

JAR 内部包含 Android `classes.dex` 与 ToolHub 运行资源。外部 ShortX/Rhino ES5 脚本通过 `DexClassLoader` 加载入口类：

```text
com.xin.toolhub.runtime.ToolHubRuntime
```

公开静态接口：

```text
version()
apiVersion()
start(Object context, Object shortx, Context rhinoContext, Scriptable globalScope)
status(Context rhinoContext)
show(Context rhinoContext)
hide(Context rhinoContext)
toggle(Context rhinoContext)
stop(Context rhinoContext)
invoke(Context rhinoContext, String command, String jsonArgs)
```

`ToolHubRuntimeLoader.js` 与 `ToolHubRuntimeCall.js` 仅作为仓库内示例，不属于设备侧运行库产物，也不随构建附件交付。每个 ShortX 任务可直接内联相同的 DEX 加载与接口调用代码。
