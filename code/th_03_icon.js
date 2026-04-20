// @version 1.0.0
FloatBallAppWM.prototype._iconCache = {
  map: {},
  keys: [],
  max: 80,  // 减少缓存数量，降低内存压力

  get: function(key) {
    var item = this.map[key];
    if (!item) return null;
    // 移动到末尾（最近使用）
    var idx = this.keys.indexOf(key);
    if (idx > -1) {
      this.keys.splice(idx, 1);
      this.keys.push(key);
    }
    return item.dr;
  },

  put: function(key, drawable) {
    // 清理旧的
    if (this.map[key]) {
      this._remove(key);
    }

    // 空间检查：超过 80% 时批量清理 20%
    if (this.keys.length >= this.max * 0.8) {
      var removeCount = Math.floor(this.max * 0.2);
      for (var i = 0; i < removeCount && this.keys.length > 0; i++) {
        var oldKey = this.keys.shift();
        this._remove(oldKey);
      }
    }

    this.keys.push(key);
    this.map[key] = {dr: drawable, ts: Date.now()};
  },

  _remove: function(key) {
    var item = this.map[key];
    if (item && item.dr) {
      // 关键：回收 Bitmap，防止内存泄漏
      try {
        if (item.dr instanceof android.graphics.drawable.BitmapDrawable) {
          var bmp = item.dr.getBitmap();
          if (bmp && !bmp.isRecycled()) bmp.recycle();
        }
       } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      delete this.map[key];
    }
  },

  clear: function() {
    for (var i = 0; i < this.keys.length; i++) {
      this._remove(this.keys[i]);
    }
    this.keys = [];
  }
};

// 兼容性封装（保持原有调用方式不变）
FloatBallAppWM.prototype._iconLruEnsure = function() {};
FloatBallAppWM.prototype._iconLruGet = function(key) {
  return this._iconCache.get(key);
};

FloatBallAppWM.prototype._iconLruPut = function(key, val) {
  try {
    this._iconLruEnsure(120);
    var k = String(key || "");
    if (!k) return;
    if (val == null) return;

    // # 若已存在，先移除旧顺序位置
    try {
      var ord = this._iconLru.order;
      for (var i = ord.length - 1; i >= 0; i--) {
        if (ord[i] === k) { ord.splice(i, 1); break; }
      }
      ord.push(k);
     } catch(eLru3) { safeLog(null, 'e', "catch " + String(eLru3)); }

    this._iconLru.map[k] = val;

    // # 超限清理：按最久未使用淘汰
    try {
      var maxN = Math.max(20, Math.floor(Number(this._iconLru.max || 120)));
      var ord2 = this._iconLru.order;
      while (ord2.length > maxN) {
        var oldK = ord2.shift();
        if (oldK != null) {
          try { delete this._iconLru.map[oldK];  } catch(eDel) { safeLog(null, 'e', "catch " + String(eDel)); }
        }
      }
     } catch(eLru4) { safeLog(null, 'e', "catch " + String(eLru4)); }
   } catch(eLru5) { safeLog(null, 'e', "catch " + String(eLru5)); }
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

