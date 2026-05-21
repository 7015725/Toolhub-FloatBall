// @version 1.0.0
// =======================【工具：快捷方式选择器（内置，合并 shortcuts.js）】======================
// 这段代码的主要内容/用途：在 toolhub.js 内部提供与 shortcuts.js 等价的"快捷方式浏览/选择"页面（仅在点击"选择快捷方式"时触发）。
// 设计要点：
// 1) 双线程流水线：UI 线程专管 WM/View；BG 线程专管 icon 加载，避免卡顿/ANR 风险。
// 2) 稳定性：失败 TTL 熔断 + 限次重试 + icon LRU 上限；滚动触底用轮询，避免 interface listener 的 JavaAdapter 风险。
// 3) UI 风格：复用 ToolHub 主题（白天/夜晚），避免与主面板割裂；支持关闭与安全销毁。
// 4) 日志：复用 ToolHubLogger（self.L / _th_log）记录关键步骤与异常。
FloatBallAppWM.prototype.showShortcutPicker = function(opts) {
  var self = this;
  var opt = opts || {};
  var mode = (opt.mode != null) ? String(opt.mode) : "browse"; // "pick" | "browse"
  var onPick = (typeof opt.onPick === "function") ? opt.onPick : null;

  // # 会话隔离：生成唯一会话 ID，防止状态污染
  var sessionId = String(new Date().getTime()) + "_" + Math.random().toString(36).substr(2, 9);
  var currentSession = sessionId;

  // 保存当前会话 ID 到实例（用于新选择器）
  this.__currentShortcutSession = sessionId;

  // 会话检查函数：所有异步回调都必须检查
  function checkSession() {
    if (self.__currentShortcutSession !== currentSession) {
      safeLog(self.L, 'w', "Shortcut picker session expired, dropping callback");
      return false;
    }
    return true;
  }

  // 清理函数
  function destroySession() {
    if (self.__currentShortcutSession === currentSession) {
      self.__currentShortcutSession = null;
    }
  }

  // # 稳定性：复用单例选择器，避免频繁 add/remove View 与线程创建销毁导致 system_server 概率性崩溃
  try {
    if (self.__shortcutPickerSingleton && typeof self.__shortcutPickerSingleton.show === "function") {
      // # 新会话覆盖旧会话
      self.__shortcutPickerSingleton.show(opts);
      return;
    }
   } catch(eSingle) { safeLog(null, 'e', "catch " + String(eSingle)); }


  // # 兼容：toolhub.js 全局未必定义 Context 别名，这里显式绑定，避免 ReferenceError。
  var Context = android.content.Context;

  // # 常量：可按需调小以降低 system_server 内存峰值
  var CFG_PAGE_BATCH = 40;
  var CFG_ICON_CACHE_MAX = 120;
  var CFG_ICON_FAIL_TTL_MS = 15000;
  var CFG_ICON_FAIL_MAX_RETRY = 2;
  var CFG_ICON_LOAD_CONCURRENCY = 2;
  // # 这段代码的主要内容/用途：ShortcutService.getShortcuts 的匹配 flags（与 shortcuts.js 保持一致）
  // # 说明：使用 0x0000000F 可尽量覆盖 Dynamic / Manifest / Pinned / Cached 等类型
  var CFG_MATCH_ALL = 0x0000000F;

  function now() { try { return new Date().getTime(); } catch(e) { return 0; } }
  function lower(s) { try { return String(s || "").toLowerCase(); } catch(e) { return ""; } }
  function safeStr(s) { try { return String(s == null ? "" : s); } catch(e) { return ""; } }

  // # 增强版：动态获取系统用户目录（适配不同 ROM）
  function getSystemUserDir() {
    var candidates = [
      "/data/system_ce",           // 标准 AOSP
      "/data/system/users",      // 部分 MIUI/HyperOS
      "/data/data/system_ce"     // 极少数定制系统
    ];

    for (var i = 0; i < candidates.length; i++) {
      try {
        var f = new java.io.File(candidates[i]);
        if (f.exists() && f.isDirectory() && f.canRead()) {
          return candidates[i];
        }
       } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    }

    // 反射获取环境变量（最可靠但较慢）
    try {
      var env = java.lang.System.getenv("ANDROID_DATA");
      if (env) {
        var envPath = String(env) + "/system_ce";
        var envDir = new java.io.File(envPath);
        if (envDir.exists() && envDir.isDirectory()) {
          return envPath;
        }
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    // 最终兜底
    return "/data/system_ce";
  }

  // ==================== Shortcut 枚举（system_ce + shortcut service） ====================
  function listUserIdsFromSystemCE() {
    // # 这段代码的主要内容/用途：扫描 /data/system_ce 下的用户目录，得到可用 userId 列表。
    var out = [];
    try {
      var basePath = getSystemUserDir();
      var base = new java.io.File(basePath);
      if (!base.exists() || !base.isDirectory()) return out;
      var arr = base.listFiles();
      if (!arr) return out;
      for (var i = 0; i < arr.length; i++) {
        var f = arr[i];
        if (!f || !f.isDirectory()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        // 只收数字目录
        var ok = true;
        for (var j = 0; j < name.length; j++) {
          var c = name.charCodeAt(j);
          if (c < 48 || c > 57) { ok = false; break; }
        }
        if (!ok) continue;
        out.push(parseInt(name, 10));
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    // 默认兜底：至少有 user 0
    if (out.length === 0) out.push(0);
    return out;
  }

  function listPackagesHavingShortcuts(userId) {
    // # 这段代码的主要内容/用途：从 shortcut_service 的持久化目录推断哪些包存在快捷方式记录（快速筛选）。
    var out = [];
    try {
      // # 使用动态获取的系统用户目录
      var basePath = "/data/system_ce";
      try {
        if (typeof getSystemUserDir === "function") {
          basePath = getSystemUserDir();
        }
       } catch(eGSD2) { safeLog(null, 'e', "catch " + String(eGSD2)); }

      var dir = new java.io.File(basePath + "/" + String(userId) + "/shortcut_service/packages");
      if (!dir.exists() || !dir.isDirectory()) return out;
      var fs = dir.listFiles();
      if (!fs) return out;
      for (var i = 0; i < fs.length; i++) {
        var f = fs[i];
        if (!f || !f.isFile()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        if (name.indexOf(".xml") > 0) {
          var pkg = name.substring(0, name.length - 4);
          if (pkg && pkg.length > 0) out.push(pkg);
        }
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    return out;
  }

  function getShortcutServiceBinder() {
    // # 这段代码的主要内容/用途：获取 "shortcut" service 的 Binder（不同 ROM 上可能失败，失败则回退到 LauncherApps API 取 icon）。
    try {
      var sm = android.os.ServiceManager;
      return sm.getService("shortcut");
    } catch(e) {
      return null;
    }
  }

  function getShortcutsForPackage(pkg, userId) {
    // # 这段代码的主要内容/用途：尝试从 shortcut service 拉取指定包的 ShortcutInfo 列表。
    // 说明：此处采用"尽力而为"，因为 ROM 兼容性差；失败时返回空数组即可。
    var out = [];
    try {
      // # 修复：与 shortcuts.js 行为一致，优先走 shortcut 服务直连（可拿到"添加到桌面"的微信小程序这类入口）
      // # 说明：LauncherApps.getShortcuts 在部分 ROM/桌面上对非 Launcher 调用者可见性不足，导致列表缺项。
      try {
        var svc = getShortcutServiceBinder();
        if (svc) {
          var slice = null;
          try { slice = svc.getShortcuts(String(pkg), CFG_MATCH_ALL, parseInt(String(userId), 10)); } catch(eS0) { slice = null; }
          if (slice) {
            var listObj = null;
            try { listObj = slice.getList(); } catch(eS1) { listObj = null; }
            if (listObj) {
              try {
                var sz = listObj.size();
                for (var si0 = 0; si0 < sz; si0++) {
                  try {
                    var s0 = listObj.get(si0);
                    if (s0) out.push(s0);
                   } catch(eS2) { safeLog(null, 'e', "catch " + String(eS2)); }
                }
               } catch(eS3) { safeLog(null, 'e', "catch " + String(eS3)); }
              if (out.length > 0) return out;
            }
          }
        }
      } catch(eSvc) {
        // ignore and fallback
      }

      // # 兜底：走 LauncherApps.getShortcuts（某些 ROM 上 shortcut 服务直连可能不可用）
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (!la) return out;

      var LauncherApps = android.content.pm.LauncherApps;
      var LauncherAppsShortcutQuery = android.content.pm.LauncherApps.ShortcutQuery;

      var q = new LauncherAppsShortcutQuery();
      // FLAG_MATCH_*：尽量全拿（动态/固定/清单）
      try {
        q.setQueryFlags(
          LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
          LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
          LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST |
          LauncherAppsShortcutQuery.FLAG_MATCH_CACHED
        );
      } catch(eF) {
        // 某些 ROM 没有 FLAG_MATCH_CACHED
        try {
          q.setQueryFlags(
            LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
            LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
            LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST
          );
         } catch(eF2) { safeLog(null, 'e', "catch " + String(eF2)); }
      }
      try { q.setPackage(safeStr(pkg));  } catch(eP) { safeLog(null, 'e', "catch " + String(eP)); }

      // user 处理：尽量兼容多用户
      var userHandle = null;
      try {
        if (userId != null) {
          var UserHandle = android.os.UserHandle;
          userHandle = UserHandle.of(parseInt(String(userId), 10));
        }
      } catch(eU) { userHandle = null; }

      var list = null;
      try {
        if (userHandle) list = la.getShortcuts(q, userHandle);
        else list = la.getShortcuts(q, android.os.Process.myUserHandle());
      } catch(eQ) {
        list = null;
      }

      if (!list) return out;
      for (var i = 0; i < list.size(); i++) {
        try {
          var si = list.get(i);
          if (si) out.push(si);
         } catch(eI) { safeLog(null, 'e', "catch " + String(eI)); }
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    return out;
  }

  function getAppLabelAsUser(pkg, userId) {
    // # 这段代码的主要内容/用途：获取应用名称（用于分组/搜索显示），失败则返回包名。
    try {
      var pm = context.getPackageManager();
      var ai = pm.getApplicationInfo(String(pkg), 0);
      var lb = pm.getApplicationLabel(ai);
      if (lb != null) return String(lb);
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    return String(pkg);
  }

  function buildShortcutItemsIndex() {
    // # 这段代码的主要内容/用途：汇总所有 userId 下的快捷方式为统一列表，结构与 shortcuts.js 保持一致。
    var items = [];
    var users = listUserIdsFromSystemCE();
    for (var ui = 0; ui < users.length; ui++) {
      var uid = users[ui];
      var pkgs = listPackagesHavingShortcuts(uid);
      for (var pi = 0; pi < pkgs.length; pi++) {
        var pkg = pkgs[pi];
        if (!pkg) continue;
        var sis = getShortcutsForPackage(pkg, uid);
        if (!sis || sis.length === 0) continue;
        for (var si = 0; si < sis.length; si++) {
          var sInfo = sis[si];
          if (!sInfo) continue;
          var id = "";
          var label = "";
          var intentUri = "";
          try { id = safeStr(sInfo.getId()); } catch(eId) { id = ""; }
          try { label = safeStr(sInfo.getShortLabel()); } catch(eLb) { label = ""; }
          try {
            var it = sInfo.getIntent();
            if (it) intentUri = safeStr(it.toUri(0));
          } catch(eIt) { intentUri = ""; }

          items.push({
            userId: uid,
            pkg: safeStr(pkg),
            id: id,
            label: label,
            intentUri: intentUri,
            shortcutInfo: sInfo
          });
        }
      }
    }
    return items;
  }

  // ==================== icon 加载（与 resolveIconDrawable 回退策略一致） ====================
  function loadShortcutIconDrawable(item) {
    // # 这段代码的主要内容/用途：尽力加载 shortcut icon；失败时回退到 app icon。
    try {
      if (!item) return null;
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (la && item.shortcutInfo) {
        try {
          // density: 0 让系统自适应（部分 ROM 更稳）
          var dr = la.getShortcutIconDrawable(item.shortcutInfo, 0);
          if (dr) return dr;
         } catch(eLa) { safeLog(null, 'e', "catch " + String(eLa)); }
      }
     } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
    // fallback: app icon
    try {
      var pm = context.getPackageManager();
      return pm.getApplicationIcon(String(item.pkg));
     } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }
    return null;
  }

  // ==================== 分组/过滤 ====================
  function groupItems(items) {
    // # 这段代码的主要内容/用途：按应用分组，tab 显示用；同时保留 "__ALL__"。
    var groups = {};
    var order = [];
    function ensure(key, title) {
      if (groups[key]) return;
      groups[key] = { key: key, title: title, items: [] };
      order.push(key);
    }
    ensure("__ALL__", "全部");
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      groups["__ALL__"].items.push(it);
      var k = safeStr(it.pkg);
      if (!groups[k]) {
        ensure(k, getAppLabelAsUser(k, it.userId));
      }
      groups[k].items.push(it);
    }
    // 让 "__ALL__" 固定在第一位，其余按 title 排序（中文/英文混排就随缘）
    try {
      var rest = [];
      for (var j = 0; j < order.length; j++) if (order[j] !== "__ALL__") rest.push(order[j]);
      rest.sort(function(a, b) {
        var ta = safeStr(groups[a].title);
        var tb = safeStr(groups[b].title);
        return ta.localeCompare(tb);
      });
      order = ["__ALL__"].concat(rest);
     } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }
    return { groups: groups, order: order };
  }

  function filterItems(items, q) {
    var qLower = lower(q || "");
    if (!qLower) return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var hit = false;
      if (lower(it.label).indexOf(qLower) > -1) hit = true;
      else if (lower(it.pkg).indexOf(qLower) > -1) hit = true;
      else if (lower(it.id).indexOf(qLower) > -1) hit = true;
      else if (lower(it.intentUri).indexOf(qLower) > -1) hit = true;
      if (hit) out.push(it);
    }
    return out;
  }

  // ==================== 主 UI（WM 双线程 + 轮询触底） ====================
  var HandlerThread = android.os.HandlerThread;
  var Handler = android.os.Handler;
  var Runnable = java.lang.Runnable;
  var Thread = java.lang.Thread;

  var ht = new HandlerThread("sx-toolhub-shortcut-ui");
  ht.start();
  var h = new Handler(ht.getLooper());

  var bgHt = new HandlerThread("sx-toolhub-shortcut-bg");
  bgHt.start();
  var bgH = new Handler(bgHt.getLooper());

  var wm = context.getSystemService(Context.WINDOW_SERVICE);

  var state = {
    destroyed: false,
    hidden: false,
    // # 单例标识：用于避免旧实例的异步回调误操作新实例
    instanceId: String(now()) + "_" + String(Math.random()),
    root: null,
    params: null,
    isAdded: false,

    allItems: [],
    groups: null,
    groupOrder: [],
    currentGroupKey: "__ALL__",

    query: "",
    lastFilterToken: 0,

    iconCache: {},
    iconCacheOrder: [],
    iconCacheMax: CFG_ICON_CACHE_MAX,

    iconFail: {},

    iconQ: [],
    iconInFlight: 0,
    iconConc: CFG_ICON_LOAD_CONCURRENCY,

    grid: null,
    tvStat: null,
    etSearch: null,
    tabRow: null,
    scrollView: null,

    renderList: [],
    renderCursor: 0,
    isAppending: false,
    lastAppendTryTs: 0,

    scrollPollRunning: false,

    // # 回调：关闭/隐藏后通知外层恢复上层 UI（避免被新增按钮页遮挡）
    onDismiss: (opt && typeof opt.onDismiss === "function") ? opt.onDismiss : null,
    onDismissCalled: false
  };


  function Ld(msg) { try { if (self.L) self.L.d("[shortcut] " + msg);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
  function Li(msg) { try { if (self.L) self.L.i("[shortcut] " + msg);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
  function Le(msg) { try { if (self.L) self.L.e("[shortcut] " + msg);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }

  function runOn(handler, fn) {
    try {
      handler.post(new JavaAdapter(Runnable, { run: function() { try { fn();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } } }));
      return true;
    } catch(e) { return false; }
  }
  function hide() {
    // # 这段代码的主要内容/用途：隐藏"选择快捷方式"窗口（不 removeView、不销毁线程），显著降低 system_server 概率性崩溃
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      if (state.destroyed) return;
      if (state.hidden) return;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 停止队列与异步：隐藏后不再触发 UI/图标加载逻辑
      try { h.removeCallbacksAndMessages(null);  } catch(eCB0) { safeLog(null, 'e', "catch " + String(eCB0)); }
      try { bgH.removeCallbacksAndMessages(null);  } catch(eCB1) { safeLog(null, 'e', "catch " + String(eCB1)); }

      // # 输入法/焦点：无论是否弹出输入法，都先退焦点并尝试隐藏软键盘
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus();  } catch(eK0) { safeLog(null, 'e', "catch " + String(eK0)); }
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
           } catch(eK1) { safeLog(null, 'e', "catch " + String(eK1)); }
        }
       } catch(eK2) { safeLog(null, 'e', "catch " + String(eK2)); }

      // # 仅隐藏 View：不触碰 WM removeView，避免 WM/IME token 状态机被打乱
      try {
        if (state.root) {
          state.root.setVisibility(android.view.View.GONE);
        }
       } catch(eV0) { safeLog(null, 'e', "catch " + String(eV0)); }

      // # 退出线程：hide 时也释放线程，避免反复打开/隐藏导致线程堆积
      try {
        var killer = new Thread(new JavaAdapter(Runnable, {
          run: function() {
            try { bgHt.quitSafely();  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
            try { ht.quitSafely();  } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
          }
        }));
        killer.start();
       } catch(eQuit) { safeLog(null, 'e', "catch " + String(eQuit)); }

      // # 通知外层：选择器已隐藏，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss();  } catch(eOD0) { safeLog(null, 'e', "catch " + String(eOD0)); }
        }
       } catch(eOD1) { safeLog(null, 'e', "catch " + String(eOD1)); }
    });
  }

  function destroy() {
    // # 会话清理：标记当前会话已结束
    destroySession();

    // # 这段代码的主要内容/用途：彻底销毁选择器（仅在 wm_add_failed 等失败场景使用）
    runOn(h, function() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 清理消息队列
      try { h.removeCallbacksAndMessages(null);  } catch(eCB0) { safeLog(null, 'e', "catch " + String(eCB0)); }
      try { bgH.removeCallbacksAndMessages(null);  } catch(eCB1) { safeLog(null, 'e', "catch " + String(eCB1)); }

      try { state.iconQ = [];  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
      state.iconInFlight = 0;

      // # 通知外层：选择器即将销毁，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss();  } catch(eOD0) { safeLog(null, 'e', "catch " + String(eOD0)); }
        }
       } catch(eOD1) { safeLog(null, 'e', "catch " + String(eOD1)); }

      // # 输入法/焦点清理
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus();  } catch(eK0) { safeLog(null, 'e', "catch " + String(eK0)); }
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
           } catch(eK1) { safeLog(null, 'e', "catch " + String(eK1)); }
        }
       } catch(eK2) { safeLog(null, 'e', "catch " + String(eK2)); }

      // # 尝试移除 View（失败也吞掉，避免把 system_server 再次打穿）
      var rootRef = state.root;
      var wasAdded = state.isAdded;
      try {
        if (rootRef && wasAdded) {
          try { wm.removeViewImmediate(rootRef); } catch(eR0) { try { wm.removeView(rootRef);  } catch(eR1) { safeLog(null, 'e', "catch " + String(eR1)); } }
        }
       } catch(eR2) { safeLog(null, 'e', "catch " + String(eR2)); }

      state.isAdded = false;
      state.root = null;

      // # 单例清理
      try { if (self.__shortcutPickerSingleton && self.__shortcutPickerSingleton.instanceId === state.instanceId) self.__shortcutPickerSingleton = null;  } catch(eS0) { safeLog(null, 'e', "catch " + String(eS0)); }

      // # 退出线程
      var killer = new Thread(new JavaAdapter(Runnable, {
        run: function() {
          try { bgHt.quitSafely();  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
          try { ht.quitSafely();  } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
        }
      }));
      killer.start();
    });
  }

function cacheGet(key) {
    if (state.iconCache.hasOwnProperty(key)) return state.iconCache[key];
    return null;
  }

  function cachePut(key, drawable) {
    state.iconCache[key] = drawable;
    var seen = false;
    for (var i = state.iconCacheOrder.length - 1; i >= 0; i--) {
      if (state.iconCacheOrder[i] === key) { seen = true; break; }
    }
    if (!seen) state.iconCacheOrder.push(key);

    while (state.iconCacheOrder.length > state.iconCacheMax) {
      var oldKey = state.iconCacheOrder.shift();
      if (oldKey == null) continue;
      if (oldKey === key) continue;
      try { delete state.iconCache[oldKey]; } catch(e1) { state.iconCache[oldKey] = null; }
      try { delete state.iconFail[oldKey]; } catch(e2) { state.iconFail[oldKey] = null; }
    }
  }

  function canTryLoadIcon(key) {
    var rec = state.iconFail[key];
    if (!rec) return true;
    var t = now();
    if (rec.count >= CFG_ICON_FAIL_MAX_RETRY) {
      if (t - rec.ts < 300000) return false;
      return true;
    }
    if (t - rec.ts < CFG_ICON_FAIL_TTL_MS) return false;
    return true;
  }

  function markIconFail(key) {
    var t = now();
    var rec = state.iconFail[key];
    if (!rec) rec = { ts: t, count: 1 };
    else { rec.ts = t; rec.count = (rec.count || 0) + 1; }
    state.iconFail[key] = rec;
  }

  function enqueueIconLoad(item, iv, key) {
    if (!item || !iv || !key) return;
    if (!canTryLoadIcon(key)) return;

    state.iconQ.push({ item: item, iv: iv, key: key });
    pumpIconQ();
  }

  function pumpIconQ() {
    if (state.destroyed) return;
    while (state.iconInFlight < state.iconConc && state.iconQ.length > 0) {
      var job = state.iconQ.shift();
      if (!job) continue;
      state.iconInFlight++;

      (function(j) {
        runOn(bgH, function() {
          var dr = null;
          try { dr = loadShortcutIconDrawable(j.item); } catch(e0) { dr = null; }
          runOn(h, function() {
            state.iconInFlight--;
            if (state.destroyed) return;

            if (dr) {
              try { j.iv.setImageDrawable(dr);  } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }
              cachePut(j.key, dr);
            } else {
              markIconFail(j.key);
            }
            pumpIconQ();
          });
        });
      })(job);
    }
  }

  function setStat(text) { try { if (state.tvStat) state.tvStat.setText(String(text));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }

  function rebuildRenderList() {
    var g = state.groups ? state.groups[state.currentGroupKey] : null;
    var base = (g && g.items) ? g.items : state.allItems;
    var filtered = filterItems(base, state.query);

    state.renderList = filtered;
    state.renderCursor = 0;
    state.isAppending = false;
    state.lastAppendTryTs = 0;
  }

  function clearGrid() {
    try {
      if (state.grid) state.grid.removeAllViews();
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  function appendBatch() {
    if (state.destroyed) return;
    if (!state.grid) return;

    if (state.isAppending) return;
    state.isAppending = true;

    var start = state.renderCursor;
    var end = Math.min(state.renderCursor + CFG_PAGE_BATCH, state.renderList.length);

    for (var i = start; i < end; i++) {
      (function(idx) {
        var it = state.renderList[idx];

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);

        // # 条目间距：卡片式列表，每条之间留 8dp 间隔
        try {
          var lpRow = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lpRow.setMargins(0, 0, 0, self.dp(8));
          row.setLayoutParams(lpRow);
         } catch(eLpR) { safeLog(null, 'e', "catch " + String(eLpR)); }

        row.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));

        // # 行背景：与 ToolHub 卡片色一致，并加轻微描边增强层次
        try {
          var isDark = self.isDarkTheme();
          var bgColor = isDark ? self.ui.colors.cardDark : self.ui.colors.cardLight;
          var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;
          row.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(12)));
         } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }

        var iv = new android.widget.ImageView(context);
        var lpI = new android.widget.LinearLayout.LayoutParams(self.dp(40), self.dp(40));
        lpI.setMargins(0, 0, self.dp(12), 0);
        iv.setLayoutParams(lpI);
        try { iv.setImageResource(android.R.drawable.sym_def_app_icon);  } catch(eI0) { safeLog(null, 'e', "catch " + String(eI0)); }

        var key = safeStr(it.pkg) + "@" + safeStr(it.id) + "@" + safeStr(it.userId);
        var cached = cacheGet(key);
        if (cached) {
          try { iv.setImageDrawable(cached);  } catch(eIC) { safeLog(null, 'e', "catch " + String(eIC)); }
        } else {
          enqueueIconLoad(it, iv, key);
        }

        var col = new android.widget.LinearLayout(context);
        col.setOrientation(android.widget.LinearLayout.VERTICAL);
        var lpC = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        lpC.weight = 1;
        col.setLayoutParams(lpC);

        var tv1 = new android.widget.TextView(context);
        tv1.setText(safeStr(it.label || it.id || it.pkg));
        tv1.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        try { tv1.setTypeface(null, android.graphics.Typeface.BOLD);  } catch(eB) { safeLog(null, 'e', "catch " + String(eB)); }
        try { tv1.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight);  } catch(eC1) { safeLog(null, 'e', "catch " + String(eC1)); }
        tv1.setSingleLine(true);
        tv1.setEllipsize(android.text.TextUtils.TruncateAt.END);
        col.addView(tv1);

        var tv2 = new android.widget.TextView(context);
        tv2.setText(safeStr(it.pkg) + " / " + safeStr(it.id));
        tv2.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        tv2.setSingleLine(true);
        tv2.setEllipsize(android.text.TextUtils.TruncateAt.END);
        try { tv2.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);  } catch(eC2) { safeLog(null, 'e', "catch " + String(eC2)); }
        col.addView(tv2);

        // # pick 模式：额外显示 userId，避免多用户/工作资料混淆
        if (mode === "pick") {
          var tv3 = new android.widget.TextView(context);
          tv3.setText("userId: " + safeStr(it.userId));
          tv3.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
          tv3.setSingleLine(true);
          try { tv3.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);  } catch(eC3) { safeLog(null, 'e', "catch " + String(eC3)); }
          col.addView(tv3);
        }

        row.addView(iv);
        row.addView(col);

        // 点击：pick 模式回传；browse 模式尝试启动
        row.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function() {
            try {
              if (mode === "pick") {
                if (onPick) onPick({ pkg: it.pkg, shortcutId: it.id, label: it.label, userId: it.userId, intentUri: it.intentUri });
                hide();
                return;
              }
              // browse：尽力启动（用 LauncherApps.startShortcut）
              try {
                var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
                if (la) {
                  var uh = android.os.UserHandle.of(parseInt(String(it.userId), 10));
                  la.startShortcut(String(it.pkg), String(it.id), null, null, uh);
                  self.toast("已尝试启动: " + safeStr(it.label || it.id));
                } else {
                  self.toast("LauncherApps 不可用");
                }
              } catch(eStart) {
                self.toast("启动失败: " + eStart);
              }
             } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
          }
        }));

        state.grid.addView(row);

      })(i);
    }

    state.renderCursor = end;
    state.isAppending = false;

    // 统计
    setStat("快捷方式: " + String(state.renderList.length) + "  已渲染: " + String(state.renderCursor));
  }

  function setupTabs() {
    try {
      if (!state.tabRow) return;
      state.tabRow.removeAllViews();
      var order = state.groupOrder || [];
      for (var i = 0; i < order.length; i++) {
        (function(key) {
          var g = state.groups[key];
          var tv = new android.widget.TextView(context);
          tv.setText(safeStr(g ? g.title : key));
          tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
          tv.setSingleLine(true);
          tv.setEllipsize(android.text.TextUtils.TruncateAt.END);

          var isSel = (key === state.currentGroupKey);
          var isDark = self.isDarkTheme();

          // # Tabs 选中态：用 accent 低透明底 + 更醒目的文字；未选中态：轻描边
          try {
            var tPri = isDark ? self.ui.colors.textPriDark : self.ui.colors.textPriLight;
            var tSec = isDark ? self.ui.colors.textSecDark : self.ui.colors.textSecLight;

            var bgColor = isSel ? self.withAlpha(self.ui.colors.accent, isDark ? 0.22 : 0.14)
                                : (isDark ? self.withAlpha(android.graphics.Color.BLACK, 0.10)
                                          : self.withAlpha(android.graphics.Color.BLACK, 0.04));
            var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;

            tv.setTextColor(isSel ? tPri : tSec);
            tv.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(16)));
           } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }

          tv.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              state.currentGroupKey = key;
              rebuildRenderList();
              clearGrid();
              appendBatch();
              setupTabs();
            }
          }));

          var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lp.setMargins(0, 0, self.dp(8), 0);
          tv.setLayoutParams(lp);
          state.tabRow.addView(tv);
        })(order[i]);
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  function startScrollPoll() {
    if (state.scrollPollRunning) return;
    state.scrollPollRunning = true;

    function tick() {
      if (!state.scrollPollRunning || state.destroyed) return;
      runOn(h, function() {
        try {
          if (!state.scrollView) { schedule(); return; }
          var sv = state.scrollView;
          var child = sv.getChildAt(0);
          if (!child) { schedule(); return; }

          var dy = sv.getScrollY();
          var vh = sv.getHeight();
          var ch = child.getHeight();

          // 触底阈值：80dp
          var near = (dy + vh) >= (ch - self.dp(80));
          if (near) {
            if (state.renderCursor < state.renderList.length) {
              appendBatch();
            }
          }
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        schedule();
      });
    }

    function schedule() {
      try {
        h.postDelayed(new JavaAdapter(Runnable, { run: tick }), 180);
       } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    }

    schedule();
  }

  function buildUI() {
    // # 这段代码的主要内容/用途：构建"选择快捷方式"页面 UI（颜色/间距/字体与 ToolHub 面板统一）。
    // 说明：尽量复用 ToolHub 的 UI helper 色板（light/dark），避免出现"黑底黑字/黄底刺眼"等问题。

    // # root（标准面板容器：圆角 + 轻阴影 + 统一 padding）
    var root = self.ui.createStyledPanel(self, 12);

    // # 顶栏（标题 + 右侧关闭）
    var top = self.ui.createStyledHeader(self, 10);

    var title = new android.widget.TextView(context);
    title.setText(mode === "pick" ? "选择快捷方式" : "快捷方式浏览器");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    try { title.setTypeface(null, android.graphics.Typeface.BOLD);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    try { title.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    var lpT = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    lpT.weight = 1;
    title.setLayoutParams(lpT);

    // 关闭按钮：用 flat 风格，颜色与危险色一致（更像"工具面板"的关闭）
    var btnClose = self.ui.createFlatButton(self, (mode === "pick" ? "取消" : "关闭"), self.ui.colors.danger, function() {
      hide();
    });
    try {
      btnClose.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
      btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    top.addView(title);
    top.addView(btnClose);

    // # 搜索框（可聚焦 + 统一输入背景）
    var et = new android.widget.EditText(context);
    et.setHint("搜索：名称 / 包名 / ID");
    et.setSingleLine(true);
    et.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    try {
      et.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight);
      et.setHintTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    try {
      var inBg = self.ui.createRoundDrawable(self.isDarkTheme() ? self.ui.colors.inputBgDark : self.ui.colors.inputBgLight, self.dp(12));
      et.setBackground(inBg);
     } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }

    // # Tabs（横向滚动：统一为"胶囊按钮"风格，选中态更明确）
    var tabSv = new android.widget.HorizontalScrollView(context);
    tabSv.setHorizontalScrollBarEnabled(false);
    tabSv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var tabRow = new android.widget.LinearLayout(context);
    tabRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    try { tabRow.setPadding(0, self.dp(8), 0, self.dp(6));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    tabSv.addView(tabRow);

    // # 状态栏（数量/渲染进度）
    var tvStat = new android.widget.TextView(context);
    tvStat.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { tvStat.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    tvStat.setPadding(0, self.dp(6), 0, self.dp(6));

    // # 列表（卡片式条目列表）
    var sv = new android.widget.ScrollView(context);
    sv.setFillViewport(true);
    sv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    try { list.setPadding(0, self.dp(2), 0, self.dp(2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    sv.addView(list);

    // bind
    state.root = root;
    state.etSearch = et;
    state.tabRow = tabRow;
    state.tvStat = tvStat;
    state.grid = list;
    state.scrollView = sv;

    // listeners：实时过滤（TextWatcher）
    try {
      var TextWatcher = android.text.TextWatcher;
      et.addTextChangedListener(new JavaAdapter(TextWatcher, {
        beforeTextChanged: function() {},
        onTextChanged: function() {},
        afterTextChanged: function(s) {
          try {
            if (state.destroyed) return;
            state.query = safeStr(s);
            rebuildRenderList();
            clearGrid();
            appendBatch();
           } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        }
      }));
     } catch(eTw) { safeLog(null, 'e', "catch " + String(eTw)); }

    // layout
    root.addView(top);

    // 搜索框与 tabs 之间留一点呼吸空间
    try {
      var lpEt = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      lpEt.setMargins(0, 0, 0, self.dp(8));
      et.setLayoutParams(lpEt);
     } catch(eLpEt) { safeLog(null, 'e', "catch " + String(eLpEt)); }
    root.addView(et);

    root.addView(tabSv);
    root.addView(tvStat);

    var lpSv = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    lpSv.weight = 1;
    sv.setLayoutParams(lpSv);
    root.addView(sv);

    // 主题：用 ToolHub 现有的背景更新逻辑兜底（防止外部主题配置影响）
    try { self.updatePanelBackground(root);  } catch(eTheme) { safeLog(null, 'e', "catch " + String(eTheme)); }

    return root;
  }

  function show() {
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      // # 稳定性：复用已添加的 root，避免频繁 add/removeView 触发 system_server WM 状态机崩溃
      if (state.root && state.isAdded) {
        state.hidden = false;
        // # 每次显示前允许再次触发 onDismiss（用于外层恢复）
        state.onDismissCalled = false;
        // # UI 修复：每次重新显示时都重新把窗口定位到屏幕顶部（横向居中 + y=0），避免被其它面板遮挡或位置漂移
        try {
          if (state.params) {
            state.params.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            // # UI 修复：复用显示时也强制关闭 IME 调整，避免上次输入导致位置被系统推下去
            try {
              state.params.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
                | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
             } catch(eSIM1) { safeLog(null, 'e', "catch " + String(eSIM1)); }
            try {
              state.params.flags = state.params.flags
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
             } catch(eTop1) { safeLog(null, 'e', "catch " + String(eTop1)); }
            var sw2 = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
            if (sw2 > 0) state.params.x = Math.max(0, Math.round((sw2 - state.params.width) / 2));
            else state.params.x = 0;
            state.params.y = 0;
            wm.updateViewLayout(state.root, state.params);
          }
         } catch(ePos2) { safeLog(null, 'e', "catch " + String(ePos2)); }

        // # 层级修复：同类型(TYPE_APPLICATION_OVERLAY)窗口之间的上下层由 addView 顺序决定
        // # 说明：当"新增按钮页/主面板"在本窗口之后 addView 时，会把本窗口盖住；复用 show 仅 setVisibility 无法提升层级
        // # 处理：在 WM 线程内对本窗口做一次 removeViewImmediate + addView 以"提到最上层"（不在关闭时 remove，避免旧崩溃路径）
        try {
          var tsNow = now();
          if (!state.lastRaiseTs || (tsNow - state.lastRaiseTs) > 300) {
            state.lastRaiseTs = tsNow;
            try { wm.removeViewImmediate(state.root);  } catch(eZ0) { safeLog(null, 'e', "catch " + String(eZ0)); }
            try { wm.addView(state.root, state.params);  } catch(eZ1) { safeLog(null, 'e', "catch " + String(eZ1)); }
            state.isAdded = true;
          }
         } catch(eZ2) { safeLog(null, 'e', "catch " + String(eZ2)); }
try { state.root.setVisibility(android.view.View.VISIBLE);  } catch(eVis) { safeLog(null, 'e', "catch " + String(eVis)); }
        try {
          setStat("正在加载快捷方式...");
          Li("reloading shortcuts index...");
         } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
        try {
          state.allItems = buildShortcutItemsIndex();
          var gg = groupItems(state.allItems);
          state.groups = gg.groups;
          state.groupOrder = gg.order;
        } catch(e1) {
          state.allItems = [];
          state.groups = groupItems([]).groups;
          state.groupOrder = ["__ALL__"];
          Le("build index err=" + String(e1));
        }
        try { setupTabs();  } catch(eT0) { safeLog(null, 'e', "catch " + String(eT0)); }
        try { rebuildRenderList();  } catch(eT1) { safeLog(null, 'e', "catch " + String(eT1)); }
        try { clearGrid();  } catch(eT2) { safeLog(null, 'e', "catch " + String(eT2)); }
        try { appendBatch();  } catch(eT3) { safeLog(null, 'e', "catch " + String(eT3)); }
        try { startScrollPoll();  } catch(eT4) { safeLog(null, 'e', "catch " + String(eT4)); }
        Li("shortcut picker reused items=" + String(state.allItems.length));
        return;
      }

      try {
        // build data
        setStat("正在加载快捷方式...");
        Li("loading shortcuts index...");
       } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }

      try {
        state.allItems = buildShortcutItemsIndex();
        var gg = groupItems(state.allItems);
        state.groups = gg.groups;
        state.groupOrder = gg.order;
      } catch(e1) {
        state.allItems = [];
        state.groups = groupItems([]).groups;
        state.groupOrder = ["__ALL__"];
        Le("build index err=" + String(e1));
      }

      // build UI
      var root = buildUI();

      // wm params
      var p = new android.view.WindowManager.LayoutParams();
      p.type = android.view.WindowManager.LayoutParams.TYPE_SYSTEM_DIALOG; // 修改：提升窗口层级，确保多次打开后仍在最顶层
      // # 说明：TYPE_APPLICATION_OVERLAY 与其他面板同层时会按 add 顺序叠放，频繁开关后容易被后开的面板盖住。
      // #       TYPE_SYSTEM_DIALOG 层级更高，可稳定压过 ToolHub 其他面板（仍不频繁 add/remove，避免崩溃）。
      p.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      p.format = android.graphics.PixelFormat.TRANSLUCENT;
      // # UI 修复：固定在顶部显示时，避免被输入法/系统 inset 影响导致二次打开位置下移
      // # 说明：不使用 ADJUST_RESIZE/ADJUST_PAN，让窗口位置不被 IME 推动；同时默认隐藏软键盘状态
      try {
        p.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
          | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
       } catch(eSIM0) { safeLog(null, 'e', "catch " + String(eSIM0)); }
      // # 允许窗口覆盖到屏幕顶部区域（含状态栏区域），避免视觉上"不是贴顶"
      try {
        p.flags = p.flags
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
       } catch(eTop0) { safeLog(null, 'e', "catch " + String(eTop0)); }
      p.width = self.dp(340);
      p.height = self.dp(520);
      // # UI 修复：选择快捷方式页应贴近屏幕顶部显示（与"新增按钮页"的顶部布局一致），而不是居中
      // # 说明：居中会让用户感觉"弹窗不是在顶部"，也更容易被其它面板遮挡。
      p.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      try {
        var sw = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
        // 顶部显示：水平居中 + y=0
        if (sw > 0) p.x = Math.max(0, Math.round((sw - p.width) / 2));
        else p.x = 0;
        p.y = 0;
      } catch(ePos) {
        p.x = 0;
        p.y = 0;
      }

      // 允许输入法：搜索框要能聚焦
      try {
        p.flags = p.flags & (~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE);
       } catch(eF) { safeLog(null, 'e', "catch " + String(eF)); }

      state.params = p;

      try {
        wm.addView(root, p);
        state.isAdded = true;
      } catch(eAdd) {
        Le("wm addView err=" + String(eAdd));
        destroy();
        self.toast("快捷方式选择器打开失败: wm_add_failed");
        return;
      }

      // tabs + first render
      setupTabs();
      rebuildRenderList();
      appendBatch();
      startScrollPoll();

      Li("shortcut picker shown items=" + String(state.allItems.length));
    });
  }

  // 入口
  // # 创建单例 API：后续再次打开直接复用已添加的 root 与线程，只做"显示/刷新"，不做 removeView
  var api = {
    instanceId: state.instanceId,
    show: function(newOpts) {
      try {
        var o = newOpts || {};
        mode = (o.mode != null) ? String(o.mode) : mode;
        onPick = (typeof o.onPick === "function") ? o.onPick : onPick;
       } catch(eOpt) { safeLog(null, 'e', "catch " + String(eOpt)); }
      // # 显示前先把隐藏标记清掉
      try { state.hidden = false;  } catch(eH0) { safeLog(null, 'e', "catch " + String(eH0)); }
      show();
    },
    hide: hide,
    destroy: destroy
  };
  try { self.__shortcutPickerSingleton = api;  } catch(eSet) { safeLog(null, 'e', "catch " + String(eSet)); }
  api.show(opts);
};

// =======================【工具：ShortX 图标库选择器【多宫格自适应排列】======================
FloatBallAppWM.prototype.showIconPicker = function(opts) {
  var self = this;
  var opt = opts || {};
  var onPick = (typeof opt.onPick === "function") ? opt.onPick : null;
  var onDismiss = (typeof opt.onDismiss === "function") ? opt.onDismiss : null;

  // # 会话隔离
  var sessionId = String(new Date().getTime()) + "_" + Math.random().toString(36).substr(2, 9);
  var currentSession = sessionId;
  this.__currentIconSession = sessionId;

  function checkSession() {
    if (self.__currentIconSession !== currentSession) return false;
    return true;
  }

  // # 单例复用（关键修复：跳过已销毁的实例）
  try {
    if (self.__iconPickerSingleton && typeof self.__iconPickerSingleton.show === "function") {
      self.__iconPickerSingleton.show(opts);
      return;
    }
   } catch(eSingle) { safeLog(null, 'e', "catch " + String(eSingle)); }

  // # 获取图标列表
  var allIcons = [];
  try {
    allIcons = self.getShortXIconCatalog(true) || [];
  } catch(eCatalog) {
    safeLog(self.L, 'e', "icon picker catalog failed: " + String(eCatalog));
  }
  if (!allIcons || allIcons.length === 0) {
    self.toast("无法加载 ShortX 图标库");
    if (onDismiss) try { onDismiss();  } catch(eD) { safeLog(null, 'e', "catch " + String(eD)); }
    return;
  }

  var Context = android.content.Context;
  var wm = context.getSystemService(Context.WINDOW_SERVICE);

  // # 状态（新增分页状态）
  var state = {
    destroyed: false,
    hidden: false,
    root: null,
    params: null,
    isAdded: false,
    query: "",
    filteredIcons: allIcons.slice(),
    grid: null,
    etSearch: null,
    tvStat: null,
    scrollView: null,
    pagerBar: null,     // 分页栏
    tvPager: null,      // 页码显示
    onDismiss: onDismiss,
    onDismissCalled: false,
    // 分页
    currentPage: 0,
    itemsPerPage: 24,   // 动态计算，这里是默认
    totalPages: 1
  };

  function Li(msg) { try { if (self.L) self.L.i("[iconPicker] " + msg);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
  function Le(msg) { try { if (self.L) self.L.e("[iconPicker] " + msg);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }

  // # 列数自适应计算
  function computeColumns() {
    try {
      var sw = self.state.screen.w;
      var sh = self.state.screen.h;
      var isLandscape = sw > sh;
      var cellMinDp = isLandscape ? 60 : 68;
      var paddingTotalDp = 32;
      var availablePx = sw - self.dp(paddingTotalDp);
      var cols = Math.floor(availablePx / self.dp(cellMinDp));
      if (isLandscape) {
        cols = Math.max(6, Math.min(12, cols));
      } else {
        cols = Math.max(3, Math.min(6, cols));
      }
      return cols;
    } catch(e) { return 4; }
  }

  // # 计算每页图标数（根据屏幕高度动态计算行数）
  function computePageSize() {
    try {
      var sh = self.state.screen.h;
      var maxPanelH = Math.floor(sh * 0.75);
      var cols = computeColumns();

      // 估算各部分占用的 dp 数
      var headerH     = 48;  // 标题栏
      var sepH        = 1;   // 分隔线
      var searchH     = 72;  // 搜索框（含边距）
      var footerH     = 30;  // 状态栏
      var pagerH      = 44;  // 分页栏
      var panelPad    = 24;  // 面板内边距 top+bottom
      var scrollPad   = 16;  // 滚动区域内边距
      var fixedDp     = headerH + sepH + searchH + footerH + pagerH + panelPad + scrollPad;

      var density = self.state.density || 2.75;
      var availableDp = (maxPanelH / density) - fixedDp;
      var cellH = 72; // 每个格子大约 72dp（图标+文字+边距）
      var rows = Math.max(3, Math.floor(availableDp / cellH));

      var pageSize = cols * rows;
      Li("pageSize calc cols=" + cols + " rows=" + rows + " → " + pageSize + " per page");
      return Math.max(12, pageSize);
    } catch(e) {
      return 24;
    }
  }

  // # 过滤
  function filterIcons(q) {
    var qLower = "";
    try { qLower = String(q || "").toLowerCase();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    if (!qLower) return allIcons.slice();
    var out = [];
    for (var i = 0; i < allIcons.length; i++) {
      var ic = allIcons[i];
      if (!ic) continue;
      var name = "";
      try { name = String(ic.shortName || ic.name || "").toLowerCase();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      if (name.indexOf(qLower) >= 0) out.push(ic);
    }
    return out;
  }

  // # 分页：跳到指定页
  function goPage(page) {
    try {
      if (state.totalPages <= 1) return;
      if (page < 0) page = 0;
      if (page >= state.totalPages) page = state.totalPages - 1;
      state.currentPage = page;
      buildGrid();
      // 滚回顶部
      try {
        if (state.scrollView) state.scrollView.scrollTo(0, 0);
       } catch(eScroll) { safeLog(null, 'e', "catch " + String(eScroll)); }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  // # 更新统计/页码显示
  function updateStat() {
    try {
      if (state.tvStat) {
        state.tvStat.setText("共 " + String(allIcons.length) + " 个 · 当前 " + String(state.filteredIcons.length) + " 个");
      }
      if (state.tvPager) {
        state.tvPager.setText(String(state.currentPage + 1) + " / " + String(state.totalPages));
      }
      // 更新分页按钮状态
      try {
        if (state.pagerBar) {
          var childCount = state.pagerBar.getChildCount();
          for (var i = 0; i < childCount; i++) {
            var child = state.pagerBar.getChildAt(i);
            if (!child) continue;
            try {
              var tag = String(child.getTag() || "");
              if (tag === "btnPrev") {
                child.setEnabled(state.currentPage > 0);
                child.setAlpha(state.currentPage > 0 ? 1.0 : 0.35);
              } else if (tag === "btnNext") {
                child.setEnabled(state.currentPage < state.totalPages - 1);
                child.setAlpha(state.currentPage < state.totalPages - 1 ? 1.0 : 0.35);
              }
             } catch(eTag) { safeLog(null, 'e', "catch " + String(eTag)); }
          }
        }
       } catch(eBar) { safeLog(null, 'e', "catch " + String(eBar)); }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  // # 构建网格（只渲染当前页）
  function buildGrid() {
    try {
      if (!state.grid) return;
      state.grid.removeAllViews();

      var cols = computeColumns();
      state.grid.setColumnCount(cols);

      var isDark = self.isDarkTheme();
      var C = self.ui.colors;
      var cardColor = isDark ? C.cardDark : C.cardLight;
      var textColor = isDark ? C.textPriDark : C.textPriLight;

      var cellSizeDp = 56;
      var labelSizeSp = 9;
      var cellPadDp = 4;

      // 计算当前页要显示的图标范围
      var startIdx = state.currentPage * state.itemsPerPage;
      var endIdx = Math.min(startIdx + state.itemsPerPage, state.filteredIcons.length);
      var pageIcons = [];
      for (var pi = startIdx; pi < endIdx; pi++) {
        pageIcons.push(state.filteredIcons[pi]);
      }

      for (var i = 0; i < pageIcons.length; i++) {
        (function(idx, iconInfo) {
          var cell = new android.widget.LinearLayout(context);
          cell.setOrientation(android.widget.LinearLayout.VERTICAL);
          cell.setGravity(android.view.Gravity.CENTER);
          cell.setPadding(self.dp(cellPadDp), self.dp(cellPadDp), self.dp(cellPadDp), self.dp(cellPadDp));

          var lp = new android.widget.GridLayout.LayoutParams();
          lp.width = 0;
          lp.height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT;
          lp.columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1, 1.0);
          lp.setMargins(self.dp(2), self.dp(2), self.dp(2), self.dp(2));
          cell.setLayoutParams(lp);

          // 图标
          var iv = new android.widget.ImageView(context);
          try {
            var dr = self.resolveShortXDrawable(iconInfo.name);
            if (dr) iv.setImageDrawable(dr);
           } catch(eIcon) { safeLog(null, 'e', "catch " + String(eIcon)); }
          try { iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          var ivLp = new android.widget.LinearLayout.LayoutParams(self.dp(cellSizeDp), self.dp(cellSizeDp));
          iv.setLayoutParams(ivLp);
          cell.addView(iv);

          // 文字
          var tv = new android.widget.TextView(context);
          var label = "";
          try { label = String(iconInfo.shortName || iconInfo.name || "");  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          if (label.length > 10) label = label.substring(0, 9) + "…";
          tv.setText(label);
          tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, labelSizeSp);
          tv.setTextColor(textColor);
          tv.setGravity(android.view.Gravity.CENTER);
          try { tv.setLines(1); tv.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          var tvLp = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
          );
          tvLp.topMargin = self.dp(2);
          tv.setLayoutParams(tvLp);
          cell.addView(tv);

          // 点击效果
          try {
            var rippleDr = self.ui.createRippleDrawable(cardColor, self.withAlpha(C.primary, 0.2), self.dp(8));
            cell.setBackground(rippleDr);
          } catch(eRipple) {
            cell.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(8)));
          }
          cell.setClickable(true);

          cell.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              try {
                self.touchActivity();
                if (onPick) onPick(iconInfo.name);
                hide();
               } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
            }
          }));

          state.grid.addView(cell);
        })(i, pageIcons[i]);
      }

      updateStat();
    } catch(eBuild) {
      Le("buildGrid err=" + String(eBuild));
    }
  }

  // # 重新渲染（过滤 + 重置到第1页）
  function rebuild() {
    try {
      state.filteredIcons = filterIcons(state.query);
      // 重新计算分页
      state.itemsPerPage = computePageSize();
      state.totalPages = Math.max(1, Math.ceil(state.filteredIcons.length / state.itemsPerPage));
      state.currentPage = 0;
      buildGrid();
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  // # 隐藏
  function hide() {
    try {
      if (state.destroyed || state.hidden) return;
      state.hidden = true;

      // 退输入法
      try {
        if (state.etSearch) {
          state.etSearch.clearFocus();
          var imm = context.getSystemService(Context.INPUT_METHOD_SERVICE);
          if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
        }
       } catch(eK) { safeLog(null, 'e', "catch " + String(eK)); }

      // 隐藏 View
      try {
        if (state.root) state.root.setVisibility(android.view.View.GONE);
       } catch(eV) { safeLog(null, 'e', "catch " + String(eV)); }

      // 通知外层
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          state.onDismiss();
        }
       } catch(eD) { safeLog(null, 'e', "catch " + String(eD)); }

      Li("icon picker hidden");
     } catch(eHide) { safeLog(null, 'e', "catch " + String(eHide)); }
  }

  // # 销毁
  function destroy() {
    try {
      if (state.destroyed) return;
      state.destroyed = true;
      state.hidden = true;

      hide();

      try {
        if (state.isAdded && state.root) {
          wm.removeView(state.root);
        }
       } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }

      state.isAdded = false;
      state.root = null;

      if (self.__currentIconSession === currentSession) {
        self.__currentIconSession = null;
      }
      try { self.__iconPickerSingleton = null;  } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }

      Li("icon picker destroyed");
     } catch(eDes) { safeLog(null, 'e', "catch " + String(eDes)); }
  }

  // # 显示（关键修复：正确处理隐藏后重新显示）
  function show() {
    if (!checkSession()) return;
    if (state.destroyed) return;

    // 如果已有实例
    if (state.root && state.isAdded) {
      if (state.hidden) {
        // 之前被隐藏了，重新显示
        try {
          state.hidden = false;
          state.onDismissCalled = false; // 重置 dismiss 标志
          state.root.setVisibility(android.view.View.VISIBLE);
          // 刷新列数（可能旋转了屏幕）和内容
          rebuild();
          Li("icon picker re-shown (from hidden)");
          return;
        } catch(eShow) {
          Le("re-show failed: " + String(eShow));
        }
      } else {
        // 已经是显示状态，什么都不做
        Li("icon picker already visible");
        return;
      }
    }

    // 如果 root 存在但未添加（不应该发生），清掉重建
    if (state.root && !state.isAdded) {
      try { state.root = null;  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    }

    // ========== 新建面板 ==========
    var isDark = self.isDarkTheme();
    var C = self.ui.colors;
    var bgColor = isDark ? C.bgDark : C.bgLight;
    var textColor = isDark ? C.textPriDark : C.textPriLight;
    var subTextColor = isDark ? C.textSecDark : C.textSecLight;
    var dividerColor = isDark ? C.dividerDark : C.dividerLight;
    var inputBgColor = isDark ? C.inputBgDark : C.inputBgLight;

    var sw = self.state.screen.w;
    var sh = self.state.screen.h;

    var panelW = sw - self.dp(32);
    var maxPanelH = Math.floor(sh * 0.75);

    // --- Root ---
    var root = new android.widget.FrameLayout(context);
    root.setBackgroundColor(0x00000000);
    root.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
      onTouch: function(v, e) {
        self.touchActivity();
        if (e.getAction() === android.view.MotionEvent.ACTION_DOWN) {
          try {
            var rect = new android.graphics.Rect();
            if (panel) {
              panel.getGlobalVisibleRect(rect);
              var x = e.getRawX();
              var y = e.getRawY();
              if (!rect.contains(x, y)) {
                hide();
                return true;
              }
            }
           } catch(eOut) { safeLog(null, 'e', "catch " + String(eOut)); }
        }
        return false;
      }
    }));

    // --- 面板容器 ---
    var panel = new android.widget.LinearLayout(context);
    panel.setOrientation(android.widget.LinearLayout.VERTICAL);
    var bgDr = new android.graphics.drawable.GradientDrawable();
    bgDr.setColor(bgColor);
    bgDr.setCornerRadius(self.dp(16));
    panel.setBackground(bgDr);
    try { panel.setElevation(self.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    panel.setPadding(self.dp(16), self.dp(12), self.dp(16), self.dp(12));

    var panelLp = new android.widget.FrameLayout.LayoutParams(panelW, android.widget.FrameLayout.LayoutParams.WRAP_CONTENT);
    panelLp.gravity = android.view.Gravity.CENTER;
    root.addView(panel, panelLp);

    // --- 标题栏 ---
    var header = new android.widget.LinearLayout(context);
    header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    header.setGravity(android.view.Gravity.CENTER_VERTICAL);

    var tvTitle = new android.widget.TextView(context);
    tvTitle.setText("选择图标");
    tvTitle.setTextColor(textColor);
    tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    header.addView(tvTitle);

    var spacer = new android.widget.LinearLayout(context);
    spacer.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, 0, 1));
    header.addView(spacer);

    var btnClose = new android.widget.TextView(context);
    btnClose.setText("✕");
    btnClose.setTextColor(subTextColor);
    btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
    btnClose.setPadding(self.dp(8), self.dp(4), self.dp(4), self.dp(4));
    btnClose.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function() { hide(); }
    }));
    header.addView(btnClose);

    panel.addView(header);

    // --- 分隔线 ---
    var sep = new android.view.View(context);
    sep.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
      android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(1)
    ));
    sep.setBackgroundColor(dividerColor);
    panel.addView(sep);

    // --- 搜索框 ---
    var searchBox = new android.widget.LinearLayout(context);
    searchBox.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    searchBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
    searchBox.setBackground(self.ui.createRoundDrawable(inputBgColor, self.dp(8)));
    searchBox.setPadding(self.dp(10), self.dp(6), self.dp(10), self.dp(6));
    var searchLp = new android.widget.LinearLayout.LayoutParams(
      android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
      android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    searchLp.setMargins(0, self.dp(8), 0, self.dp(8));
    searchBox.setLayoutParams(searchLp);

    var et = new android.widget.EditText(context);
    et.setHint("搜索图标名称...");
    try { et.setHintTextColor(subTextColor);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    et.setTextColor(textColor);
    et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    et.setBackground(null);
    et.setSingleLine(true);
    var etLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    et.setLayoutParams(etLp);

    et.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
      beforeTextChanged: function(s, start, count, after) {},
      onTextChanged: function(s, start, before, count) {},
      afterTextChanged: function(s) {
        try {
          state.query = String(s || "");
          rebuild();
         } catch(eTxt) { safeLog(null, 'e', "catch " + String(eTxt)); }
      }
    }));

    searchBox.addView(et);
    state.etSearch = et;

    var btnClear = new android.widget.TextView(context);
    btnClear.setText("✕");
    btnClear.setTextColor(subTextColor);
    btnClear.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    btnClear.setPadding(self.dp(6), self.dp(2), self.dp(2), self.dp(2));
    btnClear.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function() {
        try {
          et.setText("");
          state.query = "";
          rebuild();
         } catch(eClr) { safeLog(null, 'e', "catch " + String(eClr)); }
      }
    }));
    searchBox.addView(btnClear);

    panel.addView(searchBox);

    // --- 滚动区域 ---
    var scroll = new android.widget.ScrollView(context);
    try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    try { scroll.setVerticalScrollBarEnabled(false);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    var grid = new android.widget.GridLayout(context);
    state.grid = grid;
    scroll.addView(grid);

    var scrollLp = new android.widget.LinearLayout.LayoutParams(
      android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0
    );
    scrollLp.weight = 1;
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);
    state.scrollView = scroll;

    // --- 底部：状态栏 + 分页栏 ---
    // 状态栏
    var footer = new android.widget.LinearLayout(context);
    footer.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    footer.setGravity(android.view.Gravity.CENTER_VERTICAL);
    footer.setPadding(0, self.dp(4), 0, self.dp(4));

    var tvStat = new android.widget.TextView(context);
    tvStat.setTextColor(subTextColor);
    tvStat.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    footer.addView(tvStat);
    state.tvStat = tvStat;

    panel.addView(footer);

    // 分页栏
    var pagerBar = new android.widget.LinearLayout(context);
    pagerBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    pagerBar.setGravity(android.view.Gravity.CENTER);
    pagerBar.setPadding(0, self.dp(2), 0, 0);
    var pagerLp = new android.widget.LinearLayout.LayoutParams(
      android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
      android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    pagerBar.setLayoutParams(pagerLp);

    // 分页按钮工厂
    function makePagerBtn(text, tag, onClick) {
      var btn = new android.widget.TextView(context);
      btn.setText(text);
      btn.setTag(tag);
      btn.setTextColor(C.primary);
      btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      btn.setTypeface(null, android.graphics.Typeface.BOLD);
      btn.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
      try {
        var btnBg = self.ui.createRoundDrawable(
          self.withAlpha(C.primary, 0.08),
          self.dp(6)
        );
        btn.setBackground(btnBg);
       } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      btn.setClickable(true);
      btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
          try { self.touchActivity();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          onClick();
        }
      }));
      return btn;
    }

    var btnPrev = makePagerBtn("◀ 上一页", "btnPrev", function() {
      goPage(state.currentPage - 1);
    });
    pagerBar.addView(btnPrev);

    // 页码
    var tvPager = new android.widget.TextView(context);
    tvPager.setText("1 / 1");
    tvPager.setTextColor(subTextColor);
    tvPager.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tvPager.setPadding(self.dp(16), self.dp(4), self.dp(16), self.dp(4));
    pagerBar.addView(tvPager);
    state.tvPager = tvPager;

    var btnNext = makePagerBtn("下一页 ▶", "btnNext", function() {
      goPage(state.currentPage + 1);
    });
    pagerBar.addView(btnNext);

    panel.addView(pagerBar);
    state.pagerBar = pagerBar;

    // --- 添加到 WM ---
    var lp = new android.view.WindowManager.LayoutParams(
      android.view.WindowManager.LayoutParams.MATCH_PARENT,
      android.view.WindowManager.LayoutParams.MATCH_PARENT,
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND,
      android.graphics.PixelFormat.TRANSLUCENT
    );
    lp.dimAmount = 0.5;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
    lp.x = 0;
    lp.y = 0;

    try {
      wm.addView(root, lp);
      state.isAdded = true;
    } catch(eAdd) {
      Le("addView failed: " + String(eAdd));
      self.toast("图标选择器打开失败");
      if (onDismiss) try { onDismiss();  } catch(eD) { safeLog(null, 'e', "catch " + String(eD)); }
      return;
    }

    state.root = root;
    state.params = lp;

    // 动画
    try {
      panel.setScaleX(0.95);
      panel.setScaleY(0.95);
      panel.setAlpha(0);
      panel.animate()
        .scaleX(1)
        .scaleY(1)
        .alpha(1)
        .setDuration(180)
        .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
        .start();
     } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

    // 初始渲染（会计算分页）
    rebuild();

    Li("icon picker shown icons=" + String(allIcons.length));
  }

  // 入口（关键修复：不在 api.show 中提前设置 state.hidden，让 show() 自己判断）
  var api = {
    show: function(newOpts) {
      try {
        var o = newOpts || {};
        onPick = (typeof o.onPick === "function") ? o.onPick : onPick;
        onDismiss = (typeof o.onDismiss === "function") ? o.onDismiss : onDismiss;
        state.onDismiss = onDismiss;
        state.onDismissCalled = false;
       } catch(eOpt) { safeLog(null, 'e', "catch " + String(eOpt)); }
      // 不在这里设置 state.hidden = false！让内部 show() 自己判断是隐藏重显还是新建
      show();
    },
    hide: hide,
    destroy: destroy
  };
  try { self.__iconPickerSingleton = api;  } catch(eSet) { safeLog(null, 'e', "catch " + String(eSet)); }
  api.show(opts);
};

