#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'code/th_17_pointer.js'
V = ROOT / 'scripts/verify_pointer_regressions.py'
VV = ROOT / 'scripts/verify_changed_module_versions.py'
SELF = Path(__file__).resolve()
INJECT = '''PATCH_SCRIPT = ROOT / "scripts" / "apply_pointer_media_projection_fix.py"\nif PATCH_SCRIPT.exists():\n    subprocess.check_call([sys.executable, str(PATCH_SCRIPT)], cwd=str(ROOT))\n\n'''

WMS = r'''function th17JavaClass(v) {
  try { return String(v.getClass().getName()); } catch (e0) {}
  return "";
}
function th17ObjectArray(values) {
  var c = java.lang.Class.forName("java.lang.Object");
  var a = java.lang.reflect.Array.newInstance(c, values.length);
  for (var i = 0; i < values.length; i++) java.lang.reflect.Array.set(a, i, values[i]);
  return a;
}
function th17FindMethod(clazz, name, count) {
  var groups = [];
  try { groups.push(clazz.getMethods()); } catch (e0) {}
  try { groups.push(clazz.getDeclaredMethods()); } catch (e1) {}
  for (var g = 0; g < groups.length; g++) {
    var ms = groups[g];
    for (var i = 0; ms && i < ms.length; i++) {
      try {
        if (String(ms[i].getName()) !== name || ms[i].getParameterTypes().length !== count) continue;
        try { ms[i].setAccessible(true); } catch (e2) {}
        return ms[i];
      } catch (e3) {}
    }
  }
  return null;
}
function th17Invoke(method, target, values) {
  if (!method) throw new Error("Java 方法不存在");
  return method.invoke(target, th17ObjectArray(values || []));
}
function th17PairValue(pair, fieldName) {
  if (!pair) return null;
  try { return pair.getClass().getField(fieldName).get(pair); } catch (e0) {}
  try {
    var f = pair.getClass().getDeclaredField(fieldName);
    f.setAccessible(true);
    return f.get(pair);
  } catch (e1) {}
  return null;
}

FloatBallAppWM.prototype.getPointerCaptureDisplayId = function() {
  try {
    if (typeof context !== "undefined" && context && context.getDisplay) return Math.max(0, th17Int(context.getDisplay().getDisplayId()));
  } catch (e0) {}
  return 0;
};

FloatBallAppWM.prototype.capturePointerBitmapByWindowManager = function(cropRect) {
  var identity = 0;
  var cleared = false;
  var captureBuffer = null;
  try {
    safeLog(this.L, 'd', "pointer capture attempt method=wm_capture_display_reflect rect=" + th17RectKey(cropRect));
    var builder = new android.window.ScreenCapture.CaptureArgs.Builder();
    builder.setSourceCrop(cropRect);
    try { builder.setPixelFormat(android.graphics.PixelFormat.RGBA_8888); } catch (ePixel) {}
    try { builder.setCaptureSecureLayers(false); } catch (eSecure) {}
    try { builder.setAllowProtected(false); } catch (eProtected) {}
    var pair = android.window.ScreenCapture.createSyncCaptureListener();
    var listener = th17PairValue(pair, "first");
    var waiter = th17PairValue(pair, "second");
    if (!listener || !waiter) throw new Error("同步截图 Pair 字段解析失败 class=" + th17JavaClass(pair));
    var wm = android.view.WindowManagerGlobal.getWindowManagerService();
    var method = th17FindMethod(wm.getClass(), "captureDisplay", 3);
    if (!method) throw new Error("找不到 captureDisplay 三参数方法");
    safeLog(this.L, 'd', "pointer capture wm capability listener=" + th17JavaClass(listener) + " waiter=" + th17JavaClass(waiter) + " method=" + String(method));
    identity = android.os.Binder.clearCallingIdentity();
    cleared = true;
    th17Invoke(method, wm, [java.lang.Integer.valueOf(this.getPointerCaptureDisplayId()), builder.build(), listener]);
    captureBuffer = th17Invoke(th17FindMethod(waiter.getClass(), "get", 0), waiter, []);
    var bitmap = this.pointerBitmapFromCaptureBuffer(captureBuffer);
    if (!bitmap) throw new Error("WindowManager 截图返回空 Bitmap");
    safeLog(this.L, 'i', "pointer capture success method=wm_capture_display_reflect rect=" + th17RectKey(cropRect));
    return { bitmap: bitmap, buffer: captureBuffer, method: "wm_capture_display_reflect" };
  } catch (e0) {
    try { this.releasePointerCaptureBuffer(captureBuffer); } catch (eRelease) {}
    safeLog(this.L, 'w', "pointer capture failed method=wm_capture_display_reflect err=" + th17LogSingleLine(e0, 420));
    throw new Error("wm_capture_display_reflect: " + String(e0));
  } finally {
    if (cleared) try { android.os.Binder.restoreCallingIdentity(identity); } catch (eRestore) {}
  }
};

FloatBallAppWM.prototype.capturePointerBitmapByMediaProjection = function(cropRect) {
  var mp = null, callback = null, ht = null, h = null, reader = null, vd = null, image = null;
  var padded = null, full = null, result = null;
  try {
    safeLog(this.L, 'd', "pointer capture attempt method=shortx_media_projection rect=" + th17RectKey(cropRect));
    var ctx = null;
    try { if (typeof context !== "undefined" && context) ctx = context; } catch (eCtx) {}
    if (!ctx) try { ctx = android.app.ActivityThread.currentApplication(); } catch (eApp) {}
    if (!ctx) throw new Error("截图 Context 不可用");
    try { if (ctx.getApplicationContext()) ctx = ctx.getApplicationContext(); } catch (eAppCtx) {}
    var w = Math.max(1, th17Int(this.state && this.state.screen ? this.state.screen.w : 0));
    var hh = Math.max(1, th17Int(this.state && this.state.screen ? this.state.screen.h : 0));
    var dm = ctx.getResources().getDisplayMetrics();
    if (w <= 1) w = Math.max(1, th17Int(dm.widthPixels));
    if (hh <= 1) hh = Math.max(1, th17Int(dm.heightPixels));
    var dpi = Math.max(1, th17Int(dm.densityDpi || 420));
    try { if (ctx.getResources().getConfiguration().densityDpi > 0) dpi = th17Int(ctx.getResources().getConfiguration().densityDpi); } catch (eDpi) {}
    var uid = th17Int(android.os.Process.myUid());
    var pkg = "";
    try { pkg = String(ctx.getOpPackageName() || ""); } catch (eOp) {}
    if (!pkg) try { pkg = String(ctx.getPackageName() || ""); } catch (ePkg) {}
    try {
      var ps = ctx.getPackageManager().getPackagesForUid(uid);
      var found = false, fallback = "";
      for (var pi = 0; ps && pi < ps.length; pi++) {
        var pn = String(ps[pi] || "");
        if (pn === pkg) found = true;
        if (!fallback || pn === "android") fallback = pn;
      }
      if (!found && fallback) pkg = fallback;
    } catch (ePackages) {}
    if (!pkg) throw new Error("截图 packageName 为空");
    var service = android.os.ServiceManager.getService("media_projection");
    if (!service) throw new Error("media_projection 服务不可用");
    var stub = java.lang.Class.forName("android.media.projection.IMediaProjectionManager$Stub");
    var manager = th17Invoke(th17FindMethod(stub, "asInterface", 1), null, [service]);
    if (!manager) throw new Error("IMediaProjectionManager 不可用");
    var create = th17FindMethod(manager.getClass(), "createProjection", 4);
    var projection = null;
    if (create) projection = th17Invoke(create, manager, [java.lang.Integer.valueOf(uid), pkg, java.lang.Integer.valueOf(0), java.lang.Boolean.valueOf(false)]);
    if (!projection) {
      create = th17FindMethod(manager.getClass(), "createProjection", 5);
      if (create) projection = th17Invoke(create, manager, [java.lang.Integer.valueOf(uid), pkg, java.lang.Integer.valueOf(0), java.lang.Boolean.valueOf(false), java.lang.Integer.valueOf(0)]);
    }
    if (!projection) throw new Error("createProjection 返回空对象");
    var mpClass = java.lang.Class.forName("android.media.projection.MediaProjection");
    var ctor = null, ctors = mpClass.getDeclaredConstructors();
    for (var ci = 0; ci < ctors.length; ci++) if (ctors[ci].getParameterTypes().length === 2) { ctor = ctors[ci]; break; }
    if (!ctor) throw new Error("MediaProjection 构造器不可用");
    try { ctor.setAccessible(true); } catch (eCtor) {}
    mp = ctor.newInstance(th17ObjectArray([ctx, projection]));
    ht = new android.os.HandlerThread("toolhub_media_projection");
    ht.start();
    h = new android.os.Handler(ht.getLooper());
    callback = new JavaAdapter(android.media.projection.MediaProjection.Callback, { onStop: function() {} });
    mp.registerCallback(callback, h);
    reader = android.media.ImageReader.newInstance(w, hh, android.graphics.PixelFormat.RGBA_8888, 2);
    vd = mp.createVirtualDisplay("ToolHub-ScreenCap", w, hh, dpi, 16, reader.getSurface(), null, h);
    if (!vd) throw new Error("VirtualDisplay 创建失败");
    var start = th17Now();
    while (!image && th17Now() - start < 2000) {
      image = reader.acquireLatestImage();
      if (!image) java.lang.Thread.sleep(20);
    }
    if (!image) throw new Error("ScreenCap timeout");
    var plane = image.getPlanes()[0], buffer = plane.getBuffer();
    var pixelStride = Number(plane.getPixelStride()), rowStride = Number(plane.getRowStride());
    var iw = Number(image.getWidth()), ih = Number(image.getHeight());
    var padding = Math.max(0, rowStride - pixelStride * iw);
    var pw = iw + Math.ceil(padding / pixelStride);
    try { buffer.rewind(); } catch (eRewind) {}
    padded = android.graphics.Bitmap.createBitmap(th17Int(pw), th17Int(ih), android.graphics.Bitmap.Config.ARGB_8888);
    padded.copyPixelsFromBuffer(buffer);
    full = pw === iw ? padded : android.graphics.Bitmap.createBitmap(padded, 0, 0, th17Int(iw), th17Int(ih));
    var l = Math.max(0, Math.min(th17Int(cropRect.left), th17Int(iw) - 1));
    var t = Math.max(0, Math.min(th17Int(cropRect.top), th17Int(ih) - 1));
    var r = Math.max(l + 1, Math.min(th17Int(cropRect.right), th17Int(iw)));
    var b = Math.max(t + 1, Math.min(th17Int(cropRect.bottom), th17Int(ih)));
    result = android.graphics.Bitmap.createBitmap(full, l, t, r - l, b - t);
    if (!result) throw new Error("区域裁剪失败");
    safeLog(this.L, 'i', "pointer capture success method=shortx_media_projection rect=" + th17RectKey(cropRect) + " display=" + w + "x" + hh + " rowStride=" + rowStride + " pixelStride=" + pixelStride + " package=" + th17LogSingleLine(pkg, 100));
    return { bitmap: result, buffer: null, method: "shortx_media_projection" };
  } catch (e0) {
    safeLog(this.L, 'w', "pointer capture failed method=shortx_media_projection err=" + th17LogSingleLine(e0, 500));
    throw new Error("shortx_media_projection: " + String(e0));
  } finally {
    try { if (image) image.close(); } catch (eImage) {}
    try { if (vd) vd.release(); } catch (eVd) {}
    try { if (reader) reader.close(); } catch (eReader) {}
    try { if (mp && callback) mp.unregisterCallback(callback); } catch (eCb) {}
    try { if (mp) mp.stop(); } catch (eStop) {}
    try { if (h) h.removeCallbacksAndMessages(null); } catch (eHandler) {}
    try { if (ht) { if (ht.quitSafely) ht.quitSafely(); else ht.quit(); } } catch (eThread) {}
    if (full && full !== result && full !== padded) try { this.recyclePointerBitmap(full); } catch (eFull) {}
    if (padded && padded !== result) try { this.recyclePointerBitmap(padded); } catch (ePadded) {}
  }
};

'''


def section_replace(text, start, end, repl):
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + repl + text[b:]

s = P.read_text(encoding='utf-8')
if '// @version 1.2.12' not in s:
    raise SystemExit('unexpected th_17 version')
s = s.replace('// @version 1.2.12', '// @version 1.2.13', 1)
s = section_replace(s,
    'FloatBallAppWM.prototype.getPointerCaptureDisplayId = function() {',
    'FloatBallAppWM.prototype.capturePointerBitmapByUiAutomation = function(cropRect) {',
    WMS + 'FloatBallAppWM.prototype.capturePointerBitmapByUiAutomation = function(cropRect) {')
old_order = '''  try { return this.capturePointerBitmapByUiAutomation(cropRect); }\n  catch (eUiAutomation) { errors.push(String(eUiAutomation)); }\n'''
new_order = '''  try { return this.capturePointerBitmapByMediaProjection(cropRect); }\n  catch (eMediaProjection) { errors.push(String(eMediaProjection)); }\n\n  try { return this.capturePointerBitmapByUiAutomation(cropRect); }\n  catch (eUiAutomation) { errors.push(String(eUiAutomation)); }\n'''
if old_order not in s:
    raise SystemExit('capture order marker missing')
s = s.replace(old_order, new_order, 1)
P.write_text(s, encoding='utf-8')

v = V.read_text(encoding='utf-8')
start = '    result.require(\n        group,\n        "N10 Android 14 capture uses WMS without raw SurfaceFlinger transact",'
end = '\n\n    area_finish = section('
check = '''    result.require(\n        group,\n        "N10 Android 14 capture uses reflected WMS and MediaProjection fallback",\n        "th17PairValue(pair, \\\"first\\\")" in pointer\n        and "th17PairValue(pair, \\\"second\\\")" in pointer\n        and "th17FindMethod(wm.getClass(), \\\"captureDisplay\\\", 3)" in pointer\n        and "Binder.clearCallingIdentity()" in pointer\n        and "Binder.restoreCallingIdentity(identity)" in pointer\n        and "capturePointerBitmapByMediaProjection" in pointer\n        and 'ServiceManager.getService("media_projection")' in pointer\n        and 'IMediaProjectionManager$Stub' in pointer\n        and 'ImageReader.newInstance' in pointer\n        and 'createVirtualDisplay' in pointer\n        and 'acquireLatestImage' in pointer\n        and 'getPixelStride' in pointer\n        and 'getRowStride' in pointer\n        and 'copyPixelsFromBuffer' in pointer\n        and 'vd.release()' in pointer\n        and 'reader.close()' in pointer\n        and 'mp.stop()' in pointer\n        and 'syncCapture.first' not in pointer\n        and 'syncCapture.second' not in pointer\n        and 'SurfaceFlingerAIDL' not in pointer\n        and 'FIRST_CALL_TRANSACTION' not in pointer,\n        "Android 14 capture must reflect WMS Pair fields and provide a released MediaProjection fallback",\n    )'''
v = section_replace(v, start, end, check)
V.write_text(v, encoding='utf-8')
subprocess.check_call(['python3', 'scripts/report_dead_module_symbols.py', '--write', 'DEAD_CODE_AUDIT.md'], cwd=str(ROOT))
vv = VV.read_text(encoding='utf-8')
if INJECT not in vv:
    raise SystemExit('temporary injection missing')
VV.write_text(vv.replace(INJECT, '', 1), encoding='utf-8')
SELF.unlink()
print('OK pointer screenshot WMS reflection and MediaProjection fallback applied')
