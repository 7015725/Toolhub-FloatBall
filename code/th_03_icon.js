// @version 1.0.2
FloatBallAppWM.prototype._iconCache = {
  map: {},
  keys: [],
  max: 80,  // 减少缓存数量，降低内存压力

  get: function(key) {
    var k = String(key || "");
    if (!k) return null;
    var item = this.map[k];
    if (!item) return null;
    // 移动到末尾（最近使用）
    var idx = this.keys.indexOf(k);
    if (idx > -1) {
      this.keys.splice(idx, 1);
      this.keys.push(k);
    }
    return item.dr;
  },

  put: function(key, drawable) {
    var k = String(key || "");
    if (!k || drawable == null) return;

    // 清理旧的缓存引用，不主动 recycle Drawable。
    // 快捷方式图标可能同时被 ImageView、file| 缓存 key、sc| 缓存 key 复用；主动 recycle 会导致图标空白。
    if (this.map[k]) {
      this._remove(k);
      var idxOld = this.keys.indexOf(k);
      if (idxOld > -1) this.keys.splice(idxOld, 1);
    }

    // 空间检查：超过 80% 时批量清理 20%
    if (this.keys.length >= this.max * 0.8) {
      var removeCount = Math.floor(this.max * 0.2);
      for (var i = 0; i < removeCount && this.keys.length > 0; i++) {
        var oldKey = this.keys.shift();
        this._remove(oldKey);
      }
    }

    this.keys.push(k);
    this.map[k] = {dr: drawable, ts: (new Date()).getTime()};
  },

  _remove: function(key) {
    var k = String(key || "");
    if (!k) return;
    // 这里只删除缓存引用，不 recycle BitmapDrawable。
    // WindowManager / ImageView 仍可能持有同一个 Drawable，回收底层 Bitmap 会造成快捷方式图标消失。
    try { delete this.map[k]; } catch(eDel) { safeLog(null, 'e', "catch " + String(eDel)); }
  },

  clear: function() {
    var oldKeys = [];
    for (var i = 0; i < this.keys.length; i++) oldKeys.push(this.keys[i]);
    for (var j = 0; j < oldKeys.length; j++) this._remove(oldKeys[j]);
    this.keys = [];
    this.map = {};
  }
};

// 兼容性封装（保持原有调用方式不变）
// 这段代码的主要内容/用途：旧代码仍调用 _iconLru*，但真实缓存已经迁移到 _iconCache。
// 修复点：不再访问旧的 this._iconLru.order / this._iconLru.map，避免 put 失败和重复解码。
FloatBallAppWM.prototype._iconLruEnsure = function(max) {
  try {
    if (!this._iconCache) return;
    if (max !== undefined && max !== null) {
      var n = Math.floor(Number(max || 80));
      if (isNaN(n)) n = 80;
      this._iconCache.max = Math.max(20, n);
    }
  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype._iconLruGet = function(key) {
  try {
    if (!this._iconCache) return null;
    return this._iconCache.get(String(key || ""));
  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  return null;
};

FloatBallAppWM.prototype._iconLruPut = function(key, val) {
  try {
    if (!this._iconCache) return;
    this._iconLruEnsure(120);
    var k = String(key || "");
    if (!k || val == null) return;
    this._iconCache.put(k, val);
  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype._iconLruClear = function() {
  try {
    if (this._iconCache && this._iconCache.clear) this._iconCache.clear();
  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};


// =======================【工具：悬浮球图标（PNG 文件）】======================
// # 这段代码的主要内容/用途：从指定路径加载透明 PNG 作为悬浮球图标；带"文件大小/像素上限"保护；按目标尺寸采样解码，避免 system_server OOM。
FloatBallAppWM.prototype.loadBallIconDrawableFromFile = function(path, targetPx, maxBytes, maxPx) {
  try {
    var p = String(path || "");
    if (!p) return null;

    // # 统一 LRU 缓存：文件图标（按 path + targetPx + mtime + size 复用 Drawable，避免反复解码）
    var f = new java.io.File(p);
    if (!f.exists() || !f.isFile()) return null;

    var ckLru = null;
    try {
      ckLru = "file|" + p + "@" + String(targetPx == null ? "" : targetPx) + "@" + String(f.lastModified()) + "@" + String(f.length());
      var hitLru = this._iconLruGet(ckLru);
      if (hitLru) return hitLru;
     } catch(eLruF0) { safeLog(null, 'e', "catch " + String(eLruF0)); }

    // # 文件大小限制（字节）
    var limitBytes = Math.max(0, Math.floor(Number(maxBytes || 0)));
    if (limitBytes > 0) {
      try {
        var sz = Number(f.length());
        if (sz > limitBytes) return null;
      } catch (eSz) { return null; }
    }

    // # 先只读尺寸（不解码）
    var opt = new android.graphics.BitmapFactory.Options();
    opt.inJustDecodeBounds = true;
    try { android.graphics.BitmapFactory.decodeFile(p, opt); } catch (eB0) { return null; }

    var w = Number(opt.outWidth || 0);
    var h = Number(opt.outHeight || 0);
    if (w <= 0 || h <= 0) return null;

    // # 像素边长上限（宽/高任意一边超限则拒绝）
    var limitPx = Math.max(0, Math.floor(Number(maxPx || 0)));
    if (limitPx > 0) {
      if (w > limitPx || h > limitPx) return null;
    }

    // # 计算采样倍率：按目标尺寸（一般为 iconSizePx）采样
    var tp = Math.max(1, Math.floor(Number(targetPx || 1)));
    // # 允许解码到目标的 2 倍以内，减少锯齿又不浪费内存
    var desired = Math.max(tp * 2, tp);

    var sample = 1;
    while ((w / sample) > desired || (h / sample) > desired) sample = sample * 2;
    if (sample < 1) sample = 1;

    var opt2 = new android.graphics.BitmapFactory.Options();
    opt2.inJustDecodeBounds = false;
    opt2.inSampleSize = sample;
    opt2.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;

    var bmp = null;
    try { bmp = android.graphics.BitmapFactory.decodeFile(p, opt2); } catch (eB1) { bmp = null; }
    if (bmp == null) return null;

    var d = new android.graphics.drawable.BitmapDrawable(context.getResources(), bmp);

    // # 写入统一 LRU 缓存
    try {
      if (ckLru) this._iconLruPut(ckLru, d);
     } catch(eLruF1) { safeLog(null, 'e', "catch " + String(eLruF1)); }
    return d;
  } catch (e0) {
    return null;
  }
};