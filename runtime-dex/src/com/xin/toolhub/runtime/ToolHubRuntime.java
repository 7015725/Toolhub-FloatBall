package com.xin.toolhub.runtime;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * ToolHub Android DEX runtime entry.
 *
 * <p>The DEX/JAR does not bundle Rhino classes. It delegates to the Rhino
 * runtime already used by ShortX through the parent class loader.</p>
 */
public final class ToolHubRuntime {
    public static final String VERSION = "0.9.2-beta-dex-2";
    public static final int API_VERSION = 1;

    private static final Object LOCK = new Object();
    private static final String RUNTIME_RESOURCE = "toolhub-runtime.js";
    private static final String RUNTIME_SHA_RESOURCE = "toolhub-runtime.js.sha256";
    private static final String API_RESOURCE = "toolhub-dex-api.js";

    private static Scriptable scope;
    private static boolean started;
    private static String startupResult = "";
    private static String runtimeSha256 = "";
    private static long startedAt;

    private ToolHubRuntime() {
    }

    public static String version() {
        return VERSION;
    }

    public static int apiVersion() {
        return API_VERSION;
    }

    public static String start(
            Object androidContext,
            Object shortx,
            Context rhinoContext,
            Scriptable globalScope) {
        synchronized (LOCK) {
            try {
                requireRhino(rhinoContext, globalScope);
                if (started && scope == globalScope) {
                    return invokeLocked(rhinoContext, "status", "{}");
                }
                if (started && scope != globalScope) {
                    return error("RUNTIME_SCOPE_CONFLICT", "ToolHubRuntime already belongs to another Rhino scope");
                }

                scope = globalScope;
                ScriptableObject.putProperty(
                        scope,
                        "context",
                        Context.javaToJS(androidContext, scope));
                ScriptableObject.putProperty(
                        scope,
                        "shortx",
                        Context.javaToJS(shortx, scope));

                String runtimeSource = readUtf8Resource(RUNTIME_RESOURCE);
                String expectedSha = readUtf8Resource(RUNTIME_SHA_RESOURCE).trim().split("\\s+")[0];
                String actualSha = sha256(runtimeSource.getBytes(StandardCharsets.UTF_8));
                if (!actualSha.equalsIgnoreCase(expectedSha)) {
                    scope = null;
                    return error(
                            "RUNTIME_SHA256_MISMATCH",
                            "expected=" + expectedSha + ", actual=" + actualSha);
                }

                Object result = rhinoContext.evaluateString(
                        scope,
                        runtimeSource,
                        "ToolHubRuntime.bundle",
                        1,
                        null);
                rhinoContext.evaluateString(
                        scope,
                        readUtf8Resource(API_RESOURCE),
                        "ToolHubRuntime.api",
                        1,
                        null);

                runtimeSha256 = actualSha;
                startupResult = Context.toString(result);
                startedAt = System.currentTimeMillis();
                started = true;
                return invokeLocked(rhinoContext, "status", "{}");
            } catch (Throwable error) {
                started = false;
                scope = null;
                startupResult = "";
                runtimeSha256 = "";
                startedAt = 0L;
                return error("START_FAILED", describe(error));
            }
        }
    }

    public static String invoke(Context rhinoContext, String command, String jsonArgs) {
        synchronized (LOCK) {
            try {
                if (!started || scope == null) {
                    return error("NOT_STARTED", "ToolHubRuntime.start must be called first");
                }
                requireRhino(rhinoContext, scope);
                return invokeLocked(rhinoContext, command, jsonArgs);
            } catch (Throwable error) {
                return error("INVOKE_FAILED", describe(error));
            }
        }
    }

    public static String show(Context rhinoContext) {
        return invoke(rhinoContext, "show", "{}");
    }

    public static String hide(Context rhinoContext) {
        return invoke(rhinoContext, "hide", "{}");
    }

    public static String toggle(Context rhinoContext) {
        return invoke(rhinoContext, "toggle", "{}");
    }

    public static String status(Context rhinoContext) {
        return invoke(rhinoContext, "status", "{}");
    }

    public static String stop(Context rhinoContext) {
        String result = invoke(rhinoContext, "stop", "{}");
        synchronized (LOCK) {
            started = false;
            scope = null;
            startupResult = "";
            runtimeSha256 = "";
            startedAt = 0L;
        }
        return result;
    }

    private static String invokeLocked(Context rhinoContext, String command, String jsonArgs) {
        String safeCommand = command == null ? "" : command.trim();
        String safeArgs = jsonArgs == null || jsonArgs.trim().isEmpty() ? "{}" : jsonArgs;
        ScriptableObject.putProperty(scope, "__toolHubDexCommand", safeCommand);
        ScriptableObject.putProperty(scope, "__toolHubDexArgs", safeArgs);
        ScriptableObject.putProperty(scope, "__toolHubDexRuntimeVersion", VERSION);
        ScriptableObject.putProperty(scope, "__toolHubDexRuntimeSha256", runtimeSha256);
        ScriptableObject.putProperty(scope, "__toolHubDexStartedAt", Long.valueOf(startedAt));
        ScriptableObject.putProperty(scope, "__toolHubDexStartupResult", startupResult);
        try {
            Object value = rhinoContext.evaluateString(
                    scope,
                    "(function(){" +
                            "if(typeof ToolHubDexApi==='undefined'||!ToolHubDexApi||typeof ToolHubDexApi.invoke!=='function')" +
                            "throw 'ToolHubDexApi missing';" +
                            "return JSON.stringify(ToolHubDexApi.invoke(String(__toolHubDexCommand||''),String(__toolHubDexArgs||'{}')));" +
                            "})()",
                    "ToolHubRuntime.invoke",
                    1,
                    null);
            return Context.toString(value);
        } finally {
            ScriptableObject.deleteProperty(scope, "__toolHubDexCommand");
            ScriptableObject.deleteProperty(scope, "__toolHubDexArgs");
        }
    }

    private static void requireRhino(Context rhinoContext, Scriptable globalScope) {
        if (rhinoContext == null) {
            throw new IllegalStateException("Rhino Context is null");
        }
        if (globalScope == null) {
            throw new IllegalStateException("Rhino Scriptable scope is null");
        }
        Context current = Context.getCurrentContext();
        if (current == null) {
            throw new IllegalStateException("No Rhino Context is entered on the calling thread");
        }
        if (current != rhinoContext) {
            throw new IllegalStateException("Rhino Context does not belong to the calling thread");
        }
    }

    private static String readUtf8Resource(String name) throws Exception {
        ClassLoader loader = ToolHubRuntime.class.getClassLoader();
        InputStream input = loader == null ? null : loader.getResourceAsStream(name);
        if (input == null) {
            input = ToolHubRuntime.class.getResourceAsStream("/" + name);
        }
        if (input == null) {
            throw new IllegalStateException("Missing DEX resource: " + name);
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (count > 0) {
                    output.write(buffer, 0, count);
                }
            }
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        } finally {
            try {
                input.close();
            } catch (Throwable ignored) {
            }
            try {
                output.close();
            } catch (Throwable ignored) {
            }
        }
    }

    private static String sha256(byte[] bytes) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] value = digest.digest(bytes);
        StringBuilder result = new StringBuilder(value.length * 2);
        for (byte one : value) {
            int number = one & 0xff;
            if (number < 16) {
                result.append('0');
            }
            result.append(Integer.toHexString(number));
        }
        return result.toString();
    }

    private static String describe(Throwable error) {
        if (error == null) {
            return "unknown";
        }
        Throwable cause = error;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        String message = cause.getMessage();
        return cause.getClass().getName() + (message == null || message.isEmpty() ? "" : ": " + message);
    }

    private static String error(String code, String message) {
        return "{\"ok\":false,\"code\":\"" + jsonEscape(code) +
                "\",\"error\":\"" + jsonEscape(message) + "\"}";
    }

    private static String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder result = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '\\':
                    result.append("\\\\");
                    break;
                case '"':
                    result.append("\\\"");
                    break;
                case '\n':
                    result.append("\\n");
                    break;
                case '\r':
                    result.append("\\r");
                    break;
                case '\t':
                    result.append("\\t");
                    break;
                default:
                    if (ch < 0x20) {
                        String hex = Integer.toHexString(ch);
                        result.append("\\u");
                        for (int pad = hex.length(); pad < 4; pad++) {
                            result.append('0');
                        }
                        result.append(hex);
                    } else {
                        result.append(ch);
                    }
            }
        }
        return result.toString();
    }
}
