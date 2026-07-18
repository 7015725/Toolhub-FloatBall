#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "scripts" / "verify_result_preview.py"
text = path.read_text(encoding="utf-8")

old = '''    main_enter = section(pickword, "function animatePickwordMainEnter(view)", "function applyButtonAnimation(btn)")
    pickword_show = section(pickword, "show: function(text)", "hide: function()")
    require(
        "pickword / opaque main-window entry",
        "view.setAlpha(1)" in main_enter
        and "view.setAlpha(0)" not in main_enter
        and ".alpha(" not in main_enter
        and pickword_show.count("animatePickwordMainEnter(mainLayout)") == 2
        and "animateWindowEnter(mainLayout)" not in pickword_show
        and "animateWindowEnter(pinLayout)" in pickword,
        "main pickword window must enter fully opaque while pin-window animation remains unchanged",
        failures,
    )
'''
new = '''    overlay_stabilizer = section(pickword, "function stabilizePickwordOverlayView20(view)", "function hapticFeedback(view)")
    pickword_show = section(pickword, "show: function(text)", "hide: function()")
    require(
        "pickword / opaque overlay stabilization",
        "view.setAlpha(1)" in overlay_stabilizer
        and "view.setAlpha(0)" not in overlay_stabilizer
        and ".alpha(" not in overlay_stabilizer
        and pickword_show.count("stabilizePickwordOverlayView20(mainLayout)") == 2
        and "stabilizePickwordOverlayView20(pinLayout)" in pickword
        and "animatePickwordMainEnter" not in pickword
        and "animateWindowEnter" not in pickword,
        "main and pin pickword overlays must share one fully opaque static stabilizer without legacy animation helpers",
        failures,
    )
'''
if text.count(old) != 1:
    raise SystemExit("legacy pickword overlay verifier block missing")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("pickword result-preview verifier updated")
