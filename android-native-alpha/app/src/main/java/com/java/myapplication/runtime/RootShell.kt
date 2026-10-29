package com.java.myapplication.runtime

import java.io.InputStream
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Blocking API: invoke only from a worker thread. No commands are run implicitly at startup. */
object RootShell {
    data class Result(
        val code: Int?, val stdout: String, val stderr: String,
        val timedOut: Boolean, val truncated: Boolean
    ) {
        val success: Boolean get() = !timedOut && code == 0
    }

    private data class Output(val text: String, val truncated: Boolean)

    // Keep draining after the limit to prevent a full pipe from deadlocking the child.
    private fun drain(stream: InputStream): Output {
        val buffer = ByteArray(8192)
        val output = java.io.ByteArrayOutputStream()
        var truncated = false
        stream.use {
            while (true) {
                val size = it.read(buffer)
                if (size < 0) break
                val keep = minOf(size, (1024 * 1024 - output.size()).coerceAtLeast(0))
                if (keep > 0) output.write(buffer, 0, keep)
                if (keep < size) truncated = true
            }
        }
        return Output(output.toString("UTF-8"), truncated)
    }

    fun execute(command: String, root: Boolean = true, timeoutMs: Long = 30_000): Result {
        require(timeoutMs in 1..300_000) { "Timeout must be 1..300000 ms" }
        require(!command.contains('\u0000')) { "NUL is not allowed in shell commands" }
        val process = try {
            // KernelSU: request root directly; never attempt `su <app uid>`.
            ProcessBuilder(if (root) listOf("su", "-c", command) else listOf("sh", "-c", command)).start()
        } catch (e: Exception) {
            return Result(null, "", "${e.javaClass.simpleName}: ${e.message}", false, false)
        }
        val workers = Executors.newFixedThreadPool(2) { task ->
            Thread(task, "toolhub-shell-output").apply { isDaemon = true }
        }
        val out = workers.submit(Callable { drain(process.inputStream) })
        val err = workers.submit(Callable { drain(process.errorStream) })
        try {
            process.outputStream.close()
            val finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS)
            if (!finished) process.destroyForcibly()
            // Descendants may retain pipes: output collection must also be bounded.
            fun collect(future: java.util.concurrent.Future<Output>): Output = try {
                future.get(1000, TimeUnit.MILLISECONDS)
            } catch (_: Exception) {
                future.cancel(true)
                Output("[output unavailable or pipe remained open]", true)
            }
            val stdout = collect(out)
            val stderr = collect(err)
            return Result(if (finished) process.exitValue() else null,
                stdout.text, stderr.text, !finished, stdout.truncated || stderr.truncated)
        } finally {
            process.destroy()
            runCatching { process.inputStream.close() }
            runCatching { process.errorStream.close() }
            workers.shutdownNow()
        }
    }

    /** Must be explicitly triggered by the user; causes the root manager authorization prompt. */
    fun probe(): Result = execute("id -u", timeoutMs = 15_000)
}
