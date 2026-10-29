package com.toolhub.floatball;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Future;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

/** No Android dependencies: exercised by tools/ShellExecutorTest.java on the JVM. */
public final class ShellExecutor {
    public static final class Result {
        public final int code;
        public final String out, err;
        public final boolean timedOut;
        Result(int code, String out, String err, boolean timedOut) {
            this.code = code; this.out = out; this.err = err; this.timedOut = timedOut;
        }
        public boolean isRoot() { return code == 0 && !timedOut && out.trim().equals("0"); }
        public String display() {
            return "退出码: " + code + (timedOut ? " · 超时（子进程未保证终止）" : "")
                + "\n\n" + out + (err.isEmpty() ? "" : "\n[stderr]\n" + err);
        }
    }
    private static String drain(InputStream in) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192]; boolean truncated = false;
        try (InputStream stream = in) {
            int n;
            while ((n = stream.read(buffer)) != -1) {
                int count = Math.min(n, Math.max(0, 65536 - bytes.size()));
                if (count > 0) bytes.write(buffer, 0, count);
                truncated |= count < n; // Continue draining to avoid pipe deadlock.
            }
        }
        return bytes.toString(StandardCharsets.UTF_8.name()) + (truncated ? "\n[输出已截断至 64 KiB]" : "");
    }
    private static String collect(Future<String> future) {
        try { return future.get(800, TimeUnit.MILLISECONDS); }
        catch (Exception e) { future.cancel(true); return "[输出读取未完成]"; }
    }
    /** Blocking call, never invoke on the Android main thread. Root authorization is explicit. */
    public static Result run(String command, boolean root, long timeoutMs) {
        if (command == null || command.indexOf('\0') >= 0 || timeoutMs < 1 || timeoutMs > 300000)
            throw new IllegalArgumentException("Invalid command or timeout");
        ExecutorService readers = Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "toolhub-pipe"); t.setDaemon(true); return t;
        });
        Process process = null;
        try {
            process = new ProcessBuilder(root ? new String[]{"su", "-c", command} : new String[]{"sh", "-c", command}).start();
            final Process child = process;
            process.getOutputStream().close();
            Future<String> out = readers.submit(() -> drain(child.getInputStream()));
            Future<String> err = readers.submit(() -> drain(child.getErrorStream()));
            boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) process.destroyForcibly();
            return new Result(finished ? process.exitValue() : -1, collect(out), collect(err), !finished);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Result(-1, "", "执行被中断", false);
        } catch (Exception e) {
            return new Result(-1, "", e.getClass().getSimpleName() + ": " + e.getMessage(), false);
        } finally {
            if (process != null) {
                process.destroy();
                try { process.getInputStream().close(); } catch (Exception ignored) {}
                try { process.getErrorStream().close(); } catch (Exception ignored) {}
            }
            readers.shutdownNow();
        }
    }
    private ShellExecutor() {}
}