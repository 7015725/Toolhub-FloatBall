// ToolHub Beta emergency entry wrapper.
// Loads the immutable signed beta entry, verifies SHA-256, then isolates the
// legacy WM-thread mask before Android-main ToolApp pages are opened.
// Rhino ES5 / ShortX.
(function () {
    var BASE_ENTRY_URL = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/a2746f3d37436fcfac2e19504bbe6bbcfd13a07c/ToolHub.js";
    var BASE_ENTRY_SHA256 = "7c20204c63e7ac6699f8067a7710c8c05a2147c3d7cbe313e887ee44857bd981";
    var HOTFIX_ENTRY_VERSION = 20260728003000;

    function closeQuietly(resource) {
        try { if (resource) resource.close(); } catch (eClose) {}
    }

    function toHex(bytes) {
        var out = "";
        for (var i = 0; i < bytes.length; i++) {
            var value = Number(bytes[i]);
            if (value < 0) value += 256;
            var part = value.toString(16);
            if (part.length < 2) part = "0" + part;
            out += part;
        }
        return out;
    }

    function downloadVerifiedEntry() {
        var conn = null;
        var input = null;
        var output = null;
        try {
            conn = new java.net.URL(BASE_ENTRY_URL).openConnection();
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(20000);
            conn.setUseCaches(false);
            conn.setRequestProperty("Accept", "text/plain");
            conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Hotfix");
            input = conn.getInputStream();
            output = new java.io.ByteArrayOutputStream();
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
            var total = 0;
            var count;
            while ((count = input.read(buffer)) !== -1) {
                if (count <= 0) continue;
                total += count;
                if (total > 2 * 1024 * 1024) throw "base entry exceeds 2 MiB";
                output.write(buffer, 0, count);
                digest.update(buffer, 0, count);
            }
            var actual = toHex(digest.digest());
            if (actual !== BASE_ENTRY_SHA256) {
                throw "base entry SHA-256 mismatch: " + actual;
            }
            return String(new java.lang.String(output.toByteArray(), "UTF-8"));
        } finally {
            closeQuietly(input);
            closeQuietly(output);
            try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
        }
    }

    function installToolAppMaskIsolationHotfix() {
        try {
            if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
            var proto = FloatBallAppWM.prototype;
            if (proto.__toolHubToolAppMaskIsolationHotfixInstalled === true) return true;
            if (typeof proto.prepareToolAppHostOnWm !== "function") return false;

            proto.prepareToolAppHostOnWm = function () {
                if (!this.state || this.state.closing || this.state.closed) return false;
                if (this.isToolHubWmThread && !this.isToolHubWmThread()) {
                    try {
                        safeLog(this.L, "e", "prepare toolapp host blocked wrong thread " +
                            (this.toolAppThreadInfo ? this.toolAppThreadInfo() : ""));
                    } catch (eWrongLog) {}
                    return false;
                }

                var oldMask = this.state.mask || null;
                var oldMaskGeneration = Number(this.state.maskGeneration || 0);
                try { this.touchActivity(); } catch (eTouch) {}
                try { if (this.state.addedPanel) this.hideMainPanel(true); } catch (eMainPanel) {}
                try { if (this.state.addedSettings) this.hideSettingsPanel(); } catch (eSettings) {}

                if (oldMask) {
                    var removed = false;
                    try {
                        removed = this.hideMask(
                            "toolapp_host_prepare",
                            oldMask,
                            oldMaskGeneration
                        ) === true;
                    } catch (eMask) {
                        try { safeLog(this.L, "w", "toolapp host mask remove fail: " + String(eMask)); } catch (eMaskLog) {}
                    }
                    try {
                        safeLog(this.L, removed ? "i" : "w",
                            "TOOLAPP_MASK_ISOLATED generation=" + String(oldMaskGeneration) +
                            " removed=" + String(removed));
                    } catch (eResultLog) {}
                }
                return true;
            };

            proto.__toolHubToolAppMaskIsolationHotfixInstalled = true;
            try { writeLog("ToolApp mask isolation emergency entry hotfix installed"); } catch (eInstallLog) {}
            return true;
        } catch (eInstall) {
            try { writeLog("ToolApp mask isolation emergency entry hotfix failed: " + String(eInstall)); } catch (eLog) {}
        }
        return false;
    }

    var entryText = downloadVerifiedEntry();
    var oldVersionMarker = "var TOOLHUB_ENTRY_VERSION = 20260728000100;";
    var newVersionMarker = "var TOOLHUB_ENTRY_VERSION = " + String(HOTFIX_ENTRY_VERSION) + ";";
    if (entryText.indexOf(oldVersionMarker) < 0) throw "base entry version marker missing";
    entryText = entryText.replace(oldVersionMarker, newVersionMarker);

    var globalEval = eval;
    var baseResult = globalEval(String(entryText));
    installToolAppMaskIsolationHotfix();
    return baseResult;
})();
