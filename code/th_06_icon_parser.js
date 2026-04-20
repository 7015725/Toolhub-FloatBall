// @version 1.0.0
// =======================【工具：吸边数据】======================
FloatBallAppWM.prototype.getDockInfo = function() {
  var ballSize = this.dp(this.config.BALL_SIZE_DP);
  var visible = Math.max(1, Math.round(ballSize * this.config.EDGE_VISIBLE_RATIO));
  var hidden = ballSize - visible;
  return { ballSize: ballSize, visiblePx: visible, hiddenPx: hidden };
};

// =======================【工具：图标解析】======================

// =======================【工具：快捷方式图标文件路径】======================
FloatBallAppWM.prototype.getShortcutIconFilePath = function(pkg, shortcutId, userId) {
  // # 主要用途：把快捷方式图标持久化到 shortcut_icons 目录，供按钮页/按钮管理页稳定显示（桌面移除后仍可显示）
  try {
    var p = (pkg == null) ? "" : String(pkg);
    var s = (shortcutId == null) ? "" : String(shortcutId);
    var u = (userId == null) ? "0" : String(userId);

    // # 文件名去非法字符，避免路径注入或创建失败
    function _sn(v) {
      try {
        var t = String(v == null ? "" : v);
        t = t.replace(/[^a-zA-Z0-9._-]+/g, "_");
        if (t.length > 120) t = t.substring(0, 120);
        return t;
      } catch(e) { return ""; }
    }

    var dir = String(APP_ROOT_DIR) + "/shortcut_icons";
    var fn = _sn(p) + "__" + _sn(s) + "__u" + _sn(u) + ".png";
    return dir + "/" + fn;
  } catch (e0) {
    return "";
  }
};

FloatBallAppWM.prototype.resolveIconDrawable = function(btn) {
  // # 主要用途：解析面板按钮图标（优先 app 包名图标，其次自定义 resId，最后兜底）
  try {
    if (!btn) return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);

    // # 0) 优先检查 iconPath (绝对路径)
    // # 引用优化：复用 loadBallIconDrawableFromFile 安全加载逻辑
    if (btn.iconPath) {
        try {
             var path = String(btn.iconPath);
             if (path) {
                 // targetPx: 面板图标大小; Limit: 1MB, 1024px
                 var sizeDp = this.config.PANEL_ICON_SIZE_DP || 32;
                 var dr = this.loadBallIconDrawableFromFile(path, this.dp(sizeDp), 1048576, 1024);
                 if (dr) return dr;
             }
        } catch (ePath) {}
    }


// # 1) type=app 且配置了 pkg：自动取应用图标
try {
  var t = (btn.type == null) ? "" : String(btn.type);
  if (t === "app") {
    var pkg = (btn.pkg == null) ? "" : String(btn.pkg);
    if (pkg.length > 0) {
      // # 统一 LRU 缓存：避免频繁走 PackageManager（Drawable 可复用）；并带容量上限，防止无限增长
      var kApp = "app|" + pkg;
      var hitApp = this._iconLruGet(kApp);
      if (hitApp) return hitApp;

      var pm = context.getPackageManager();
      var drApp = pm.getApplicationIcon(pkg);
      if (drApp != null) {
        this._iconLruPut(kApp, drApp);
        return drApp;
      }
    }
  }
} catch (eApp) {}


    // # 1.5) type=shortcut：尝试取 Shortcuts 快捷方式图标（显示与 shortcuts.js 页面一致）
    // # 说明：btn 需要包含 pkg + shortcutId；图标获取可能较重，因此做简单缓存，失败则回退到应用图标。
    try {
      var t2 = (btn.type == null) ? "" : String(btn.type);
      if (t2 === "shortcut") {
        var pkg2 = (btn.pkg == null) ? "" : String(btn.pkg);
        var sid2 = (btn.shortcutId == null) ? "" : String(btn.shortcutId);
        if (pkg2.length > 0 && sid2.length > 0) {
          // # 1.5.1) 优先从 shortcut_icons 持久化目录读取（桌面移除后仍可显示正确图标）
          try {
            var iconFilePath0 = this.getShortcutIconFilePath(pkg2, sid2, (btn.userId != null ? String(btn.userId) : "0"));
            if (iconFilePath0) {
              try {
                var f0 = new java.io.File(iconFilePath0);
                if (f0.exists() && f0.isFile()) {
                  var sizeDp0 = this.config.PANEL_ICON_SIZE_DP || 32;
                  var iconSizePx0 = this.dp(sizeDp0);
                  var dr0 = this.loadBallIconDrawableFromFile(iconFilePath0, iconSizePx0, 1048576, 1024);
                  if (dr0) {
                    // # 写入统一 LRU 缓存：同一个 shortcut 复用 Drawable，避免反复解码 PNG
                    try {
                      var sk0 = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
                      this._iconLruPut("sc|" + sk0, dr0);
                    } catch (eSc0) {}
                    return dr0;
                  }
                }
              } catch(eF0) {}
            }
          } catch(eFile0) {}
var skey = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
          var kSc = "sc|" + skey;
          var hitSc = this._iconLruGet(kSc);
          if (hitSc) return hitSc;
          // # 失败冷却：某些 ROM/桌面在短时间内反复查询 Shortcuts 会很慢或直接抛异常。
          // # 这里对同一个 shortcut key 做短暂冷却（默认 10 秒），避免面板频繁刷新导致卡顿/ANR 风险。
          if (!this._shortcutIconFailTs) this._shortcutIconFailTs = {};
          var nowTs = 0;
          try { nowTs = new Date().getTime(); } catch(eNow) { nowTs = 0; }
          var lastFailTs = this._shortcutIconFailTs[skey];
          if (lastFailTs && nowTs > 0 && (nowTs - lastFailTs) < 10000) {
            // # 冷却期内直接跳过 shortcut icon 查询，走回退逻辑（应用图标）
          } else {

          var la = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
          if (la) {

            // # 修复：按钮管理页/按钮面板中，微信小程序等 shortcut 图标显示成宿主 App 图标
            // # 根因（工作假设）：用 setShortcutIds() 精确查询时，部分 ROM 的实现会返回"退化"的 ShortcutInfo，
            // # getShortcutIconDrawable 结果被降级为宿主 App 图标。
            // # 方案：完全复用 shortcuts.js 的做法--先按 package + flags 拉取该包的 shortcuts 列表，再在列表里按 id 过滤命中项取图标。
            // # 注意：不依赖外部 buildShortcutItemsIndex()，避免主程序环境下未加载 shortcuts.js 导致直接回退。
                        // # 方案：完全复用"选择快捷方式列表"的取数路径，确保微信小程序等 pinned shortcut 能拿到正确的 ShortcutInfo
            // # 1) 优先直连 shortcut service（选择器同款：信息更完整）
            // # 2) 失败再回退 LauncherApps.getShortcuts
            var list = null;

            // # 1) shortcut service 直连（与选择器保持一致）
            try {
              var userIdIntForSvc = 0;
              try {
                var buid2 = null;
                if (btn.userId != null) buid2 = btn.userId;
                if (buid2 == null && btn.user != null) buid2 = btn.user;
                if (buid2 != null) {
                  var tmpUid2 = parseInt(String(buid2), 10);
                  if (!isNaN(tmpUid2)) userIdIntForSvc = tmpUid2;
                }
              } catch(eUidSvc) {}

              var sm2 = android.os.ServiceManager;
              var shortcutSvc = null;
              try { shortcutSvc = sm2.getService("shortcut"); } catch(eSm2) { shortcutSvc = null; }
              if (shortcutSvc) {
                var CFG_MATCH_ALL2 = 0x0000000F;
                var slice2 = null;
                try { slice2 = shortcutSvc.getShortcuts(String(pkg2), CFG_MATCH_ALL2, userIdIntForSvc); } catch(eS0b) { slice2 = null; }
                if (slice2) {
                  var listObj2 = null;
                  try { listObj2 = slice2.getList(); } catch(eS1b) { listObj2 = null; }
                  if (listObj2) list = listObj2;
                }
              }
            } catch(eSvc2) {}

            // # 2) LauncherApps 回退（当 shortcut service 不可用或返回空时）
            if (list == null) {
              var q = new android.content.pm.LauncherApps.ShortcutQuery();
              try { q.setPackage(pkg2); } catch(eSP) {}

              // # 重要：必须设置 QueryFlags，否则 getShortcuts 可能返回空（默认 flags=0）
              // # 兼容性：不同 Android/ROM 可能缺少部分 FLAG，逐个 try 叠加
              try {
                var qFlags = 0;
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC; } catch(eF1) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED; } catch(eF2) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST; } catch(eF3) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_CACHED; } catch(eF4) {}
                try { q.setQueryFlags(qFlags); } catch(eSF) {}
              } catch(eQF) {}

              // # 重要：用户句柄优先用按钮携带的 userId（如有），否则使用当前用户
              var uh = android.os.Process.myUserHandle();
              try {
                var buid = null;
                if (btn.userId != null) buid = btn.userId;
                if (buid == null && btn.user != null) buid = btn.user;
                if (buid != null) {
                  var uidInt = parseInt(String(buid), 10);
                  if (!isNaN(uidInt)) {
                    uh = android.os.UserHandle.of(uidInt);
                  }
                }
              } catch(eUH) {}

              try { list = la.getShortcuts(q, uh); } catch(eGS) { list = null; }
            }

if (list && list.size && list.size() > 0) {
              // # 在返回列表中按 shortcutId 精确命中
              var si = null;
              try {
                for (var kk = 0; kk < list.size(); kk++) {
                  var s0 = list.get(kk);
                  if (s0 != null) {
                    var id0 = "";
                    try { id0 = String(s0.getId()); } catch(eId0) { id0 = ""; }
                    if (id0 === sid2) { si = s0; break; }
                  }
                }
              } catch(eFind) { si = null; }
if (si != null) {
                // # 与 shortcuts.js 一致：优先 la.getShortcutIconDrawable(shortcutInfo, 0)，再兜底 Icon.loadDrawable
                var drSc = null;
                try { drSc = la.getShortcutIconDrawable(si, 0); } catch(eIcon0) { drSc = null; }
                if (drSc == null) {
                  try {
                    var ic = si.getIcon();
                    if (ic != null) {
                      var d2 = ic.loadDrawable(context);
                      if (d2 != null) drSc = d2;
                    }
                  } catch(eIcon1) {}
                }
                if (drSc != null) {
                  try { this._iconLruPut("sc|" + skey, drSc); } catch (eSc1) {}
                  return drSc;
                }
              }
            }
          }



// # 如果没拿到 shortcut 图标，记录一次失败时间，触发冷却
            try {
              if (nowTs > 0) this._shortcutIconFailTs[skey] = nowTs;
              else this._shortcutIconFailTs[skey] = new Date().getTime();
            } catch(eFT) {}
          }


          // # 回退：取应用图标，至少保证按钮有图标可见
          try {
            var pm2 = context.getPackageManager();
            var drApp2 = pm2.getApplicationIcon(pkg2);
            if (drApp2 != null) return drApp2;
          } catch(eFall) {}
        }
      }
    } catch (eSc) {}
    // # 2) 显式指定 iconResName (String) 或 iconResId (int)
    try {
      if (btn.iconResName) {
        var drShortx = this.resolveShortXDrawable(btn.iconResName, btn && btn.iconTint ? String(btn.iconTint) : "");
        if (drShortx != null) return drShortx;
        var name = this.normalizeShortXIconName(btn.iconResName, true);
        // # 回退到 android 系统图标
        var id = context.getResources().getIdentifier(name, "drawable", "android");
        if (id > 0) return context.getResources().getDrawable(id, null);
      }
      if (btn.iconResId) return context.getResources().getDrawable(btn.iconResId, null);
    } catch (e1) {}

    // # 3) 兜底
    return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);
  } catch (e2) {}
  return null;
};

FloatBallAppWM.prototype.getShortXResHandle = function() {
  if (this._shortxResHandle) return this._shortxResHandle;
  try {
    var flags = 0;
    try { flags = android.content.Context.CONTEXT_INCLUDE_CODE | android.content.Context.CONTEXT_IGNORE_SECURITY; } catch (eF) { flags = android.content.Context.CONTEXT_RESTRICTED; }
    var sxCtx = context.createPackageContext(CONST_SHORTX_PACKAGE, flags);
    this._shortxResHandle = {
      ctx: sxCtx,
      res: sxCtx.getResources(),
      cl: sxCtx.getClassLoader(),
      pkg: CONST_SHORTX_PACKAGE
    };
    return this._shortxResHandle;
  } catch (e) {
    safeLog(this.L, 'w', "getShortXResHandle failed: " + String(e));
    return null;
  }
};

FloatBallAppWM.prototype.normalizeShortXIconName = function(name, keepPrefix) {
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return "";
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    if (s.indexOf("ic_remix_") === 0) {
      return keepPrefix ? s : s.substring("ic_remix_".length);
    }
    if (s.indexOf("ic_") === 0) {
      return s;
    }
    return keepPrefix ? ("ic_remix_" + s) : s;
  } catch (e) {}
  return "";
};

FloatBallAppWM.prototype.getShortXApkPaths = function() {
  var out = [];
  try {
    var handle = this.getShortXResHandle();
    var ai = null;
    try { if (handle && handle.ctx) ai = handle.ctx.getApplicationInfo(); } catch (eAi0) { ai = null; }
    if (ai == null) {
      try { ai = context.getPackageManager().getApplicationInfo(CONST_SHORTX_PACKAGE, 0); } catch (eAi1) { ai = null; }
    }
    function pushPath(p) {
      try {
        p = String(p || "");
        if (!p) return;
        if (out.indexOf(p) < 0) out.push(p);
      } catch (eP) {}
    }
    if (ai) {
      try { pushPath(ai.sourceDir); } catch (e0) {}
      try { pushPath(ai.publicSourceDir); } catch (e1) {}
      try {
        var ss = ai.splitSourceDirs;
        if (ss) {
          var i;
          for (i = 0; i < ss.length; i++) pushPath(ss[i]);
        }
      } catch (e2) {}
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.scanShortXIconsFromApk = function() {
  var out = [];
  var seen = {};
  var paths = this.getShortXApkPaths();
  // 宽松匹配：匹配 res/drawable* 和 res/mipmap* 下所有以 ic_ 开头的图标
  var regex = /^res\/(drawable[^\/]*|mipmap[^\/]*)\/(ic_[a-z0-9_]+)\.(xml|png|webp|jpg|jpeg)$/;
  var lastErr = "";
  var totalFiles = 0;
  var pi;
  for (pi = 0; pi < paths.length; pi++) {
    var zip = null;
    try {
      zip = new java.util.zip.ZipFile(String(paths[pi]));
      var en = zip.entries();
      while (en.hasMoreElements()) {
        var ze = en.nextElement();
        var name = String(ze.getName());
        totalFiles++;
        var m = regex.exec(name);
        if (!m) continue;
        var fullName = String(m[2]);
        // 过滤掉系统图标
        if (fullName.indexOf("ic_launcher") === 0 || fullName.indexOf("ic_menu_") === 0) continue;
        if (seen[fullName]) continue;
        seen[fullName] = true;
        out.push({
          name: fullName,
          shortName: this.normalizeShortXIconName(fullName, false),
          id: 0
        });
      }
    } catch (eZip) {
      lastErr = String(eZip);
    } finally {
      try { if (zip) zip.close(); } catch (eClose) {}
    }
  }
  if ((!out || out.length === 0) && lastErr) this._shortxIconCatalogError = "APK扫描: " + lastErr + " (路径数=" + paths.length + ", 文件数=" + totalFiles + ")";
  return out;
};

FloatBallAppWM.prototype.getShortXIconLookupNames = function(name) {
  var out = [];
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return out;
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    function add(v) {
      if (!v) return;
      if (out.indexOf(v) < 0) out.push(v);
    }
    add(s);
    if (s.indexOf("ic_remix_") === 0) {
      add(s.substring("ic_remix_".length));
    } else if (s.indexOf("ic_") !== 0) {
      add("ic_remix_" + s);
      add("ic_" + s);
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.resolveShortXDrawableResId = function(name) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return 0;
    var cands = this.getShortXIconLookupNames(name);
    var i;
    for (i = 0; i < cands.length; i++) {
      var resId = 0;
      try { resId = handle.res.getIdentifier(String(cands[i]), "drawable", handle.pkg); } catch (e1) { resId = 0; }
      if (resId > 0) return resId;
    }
  } catch (e) {}
  return 0;
};

FloatBallAppWM.prototype.resolveShortXDrawable = function(name, tintHex) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return null;
    var resId = this.resolveShortXDrawableResId(name);
    if (resId <= 0) return null;
    var dr = handle.res.getDrawable(resId, null);
    if (dr && tintHex) {
      try {
        dr = dr.mutate();
        dr.setColorFilter(android.graphics.Color.parseColor(String(tintHex)), android.graphics.PorterDuff.Mode.SRC_IN);
      } catch (eTint) {}
    }
    return dr;
  } catch (e) {}
  return null;
};

FloatBallAppWM.prototype.getShortXIconDrawable = function(name) {
  try {
    return this.resolveShortXDrawable(name, null);
  } catch (e) {
    safeLog(this.L, 'w', "getShortXIconDrawable failed: " + String(e));
    return null;
  }
};

FloatBallAppWM.prototype.getShortXIconCatalog = function(forceReload) {
  if (!forceReload && this._shortxIconCatalog) return this._shortxIconCatalog;
  var out = [];
  this._shortxIconCatalogError = "";
  try {
    var handle = this.getShortXResHandle();
    if (handle && handle.cl) {
      try {
        // 尝试反射获取 R$drawable 类（未混淆时可用）
        var clz = handle.cl.loadClass(CONST_SHORTX_PACKAGE + ".R$drawable");
        var fields = clz.getFields();
        var i;
        for (i = 0; i < fields.length; i++) {
          try {
            var f = fields[i];
            var fname = String(f.getName());
            if (fname.indexOf("ic_remix_") !== 0 && fname.indexOf("ic_") !== 0) continue;
            out.push({
              name: fname,
              shortName: (fname.indexOf("ic_remix_") === 0) ? fname.substring("ic_remix_".length) : fname,
              id: f.getInt(null)
            });
          } catch (eField) {}
        }
      } catch (eClz) {
        this._shortxIconCatalogError = "reflect: " + String(eClz);
        safeLog(this.L, 'w', "getShortXIconCatalog reflect failed: " + String(eClz));
      }
    }
    if (!out || out.length === 0) {
      out = this.scanShortXIconsFromApk();
    }
    out.sort(function(a, b) {
      var aw = a.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      var bw = b.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      if (aw !== bw) return aw - bw;
      var as = String(a.shortName || a.name);
      var bs = String(b.shortName || b.name);
      return as < bs ? -1 : (as > bs ? 1 : 0);
    });
    if (!out || out.length === 0) {
      if (!this._shortxIconCatalogError) this._shortxIconCatalogError = "反射与 APK 扫描均未获取到图标";
    } else {
      this._shortxIconCatalogError = "";
    }
  } catch (e) {
    this._shortxIconCatalogError = String(e);
    safeLog(this.L, 'w', "getShortXIconCatalog failed: " + String(e));
  }
  this._shortxIconCatalog = out;
  return out;
};

