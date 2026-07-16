#!/usr/bin/env python3
from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


preview_path = Path("code/th_21_result_preview.js")
preview = preview_path.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.2.2", "// @version 1.2.3", "preview version")
preview = replace_once(
    preview,
    "    render.forceDarkDisabled = false;\n",
    "",
    "dynamic render force-dark reset",
)
preview = replace_once(
    preview,
    '''    var render = {
      rootToken: Number(st.rootToken || 0),
      generation: Number(st.generation || 0),
      payloadId: String(st.payload && st.payload.id ? st.payload.id : ""),
      line1: String(st.line1 || ""),
      line2: String(st.line2 || ""),
      copyVisible: st.copyVisible === true,
      copyPressed: false,
      copyFeedbackKind: "",
      copyHitRect: null,
      drawCount: 0,
      firstDrawAt: 0,
      firstDrawLogged: false,
      visibleStartedAt: 0,
      attachedAt: now21(),
      pressed: false,
      themeDark: false,
      themeSource: "",
      bgApplyOk: false,
      strokeApplyOk: false,
      textApplyOk: false,
      copyApplyOk: false,
      bgExpectedHex: "",
      bgActualHex: "",
      textExpectedHex: "",
      textActualHex: "",
      copyExpectedHex: "",
      copyActualHex: "",
      canvasHardware: false,
      windowFormat: 0,
      forceDarkDisabled: false,
      disposed: false,
      enterStarted: false
    };
''',
    '''    var render = {
      rootToken: Number(st.rootToken || 0),
      enterStarted: false,
      forceDarkDisabled: false
    };
    syncRender21(render, st);
''',
    "create view render defaults",
)
preview = replace_once(
    preview,
    '''    st.root = built.view;
    st.rootRender = built.render;
    syncRender21(st.rootRender, st);
    st.rootRender.rootToken = Number(st.rootToken || 0);
    st.rootRender.enterStarted = false;
''',
    '''    st.root = built.view;
    st.rootRender = built.render;
''',
    "attach root duplicate render sync",
)
preview_path.write_text(preview, encoding="utf-8")

verify_path = Path("scripts/verify_result_preview.py")
verify = verify_path.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    '''    create_view = section(preview, "function createView21(appObj, st)", "function createLp21(appObj, st)")
    draw_preview = section(preview, "function drawPreview21(appObj, st, canvas, view, render)", "function cancelDismiss21(st)")
''',
    '''    sync_render = section(preview, "function syncRender21(render, st)", "function isCurrentRoot21(st, rootRef, render)")
    create_view = section(preview, "function createView21(appObj, st)", "function createLp21(appObj, st)")
    attach_new_root = section(preview, "function attachNewRoot21(appObj, st)", "function rebuildRoot21(appObj, st, rootRef, render)")
    draw_preview = section(preview, "function drawPreview21(appObj, st, canvas, view, render)", "function cancelDismiss21(st)")
''',
    "preview verifier sections",
)
marker = '''    require(
        "preview / canvas-only custom rendering",
'''
insert = '''    require(
        "preview / single render initialization source",
        "syncRender21(render, st);" in create_view
        and create_view.find("syncRender21(render, st);") < create_view.find("new JavaAdapter")
        and "generation: Number(st.generation || 0)" not in create_view
        and "payloadId: String(st.payload" not in create_view
        and "render.forceDarkDisabled = false;" not in sync_render
        and "syncRender21(st.rootRender, st);" not in attach_new_root
        and "st.rootRender.rootToken =" not in attach_new_root
        and "st.rootRender.enterStarted =" not in attach_new_root,
        "new roots must initialize dynamic render state once before view creation and preserve per-view Force Dark status",
        failures,
    )

'''
verify = replace_once(verify, marker, insert + marker, "render initialization verifier")
verify_path.write_text(verify, encoding="utf-8")

print("Applied result preview render initialization cleanup")
