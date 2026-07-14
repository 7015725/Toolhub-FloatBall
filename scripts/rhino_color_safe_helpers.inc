function toolhubJavaClassName(value) {
  if (!value) return "";
  try { return String(value.getClass().getName()); } catch (eClass) {}
  return "";
}

function toolhubIsColorStateList(value) {
  return toolhubJavaClassName(value) === "android.content.res.ColorStateList";
}

function toolhubColorInt(value, fallback) {
  var source = value;
  if (toolhubIsColorStateList(source)) {
    try { source = source.getDefaultColor(); } catch (eDefault) { source = fallback; }
  }
  var n = Number(source);
  if (isNaN(n)) n = Number(fallback || 0);
  if (isNaN(n)) n = 0;
  return n | 0;
}

function toolhubJintArray(values) {
  var src = values || [];
  var arr = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, src.length);
  for (var i = 0; i < src.length; i++) arr[i] = toolhubColorInt(src[i], 0);
  return arr;
}

function toolhubJint2Array(rows) {
  var src = rows || [];
  var outer = java.lang.reflect.Array.newInstance(java.lang.Class.forName("[I"), src.length);
  for (var i = 0; i < src.length; i++) outer[i] = toolhubJintArray(src[i]);
  return outer;
}

function toolhubSafeColorStateList(colorValue) {
  if (toolhubIsColorStateList(colorValue)) return colorValue;
  var color = toolhubColorInt(colorValue, 0);
  return new android.content.res.ColorStateList(
    toolhubJint2Array([
      [android.R.attr.state_pressed],
      [android.R.attr.state_focused],
      [android.R.attr.state_selected],
      []
    ]),
    toolhubJintArray([color, color, color, color])
  );
}

function toolhubSafeColorStateListFromStates(stateRows, colorValues) {
  if (toolhubIsColorStateList(stateRows)) return stateRows;
  return new android.content.res.ColorStateList(
    toolhubJint2Array(stateRows || []),
    toolhubJintArray(colorValues || [])
  );
}

function toolhubSafeSetTextColor(viewObj, colorValue) {
  if (!viewObj) return false;
  viewObj.setTextColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetHintTextColor(viewObj, colorValue) {
  if (!viewObj) return false;
  viewObj.setHintTextColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetLinkTextColor(viewObj, colorValue) {
  if (!viewObj) return false;
  viewObj.setLinkTextColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetHighlightColor(viewObj, colorValue) {
  if (!viewObj) return false;
  viewObj.setHighlightColor(java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0)));
  return true;
}

function toolhubSafeSetBackgroundColor(viewObj, colorValue) {
  if (!viewObj) return false;
  var background = new android.graphics.drawable.GradientDrawable();
  background.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
  toolhubSafeSetGradientColor(background, colorValue);
  viewObj.setBackground(background);
  return true;
}

function toolhubSafeSetGradientColor(drawableObj, colorValue) {
  if (!drawableObj) return false;
  drawableObj.setColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetGradientStroke(drawableObj, widthPx, colorValue) {
  if (!drawableObj) return false;
  var width = Math.max(0, Math.round(Number(widthPx) || 0));
  drawableObj.setStroke(width, toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetTintColor(drawableObj, colorValue) {
  if (!drawableObj) return false;
  drawableObj.setTintList(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetPaintColor(paintObj, colorValue) {
  if (!paintObj) return false;
  var color = toolhubColorInt(colorValue, 0);
  paintObj.setARGB(
    (color >>> 24) & 255,
    (color >>> 16) & 255,
    (color >>> 8) & 255,
    color & 255
  );
  return true;
}

function toolhubSafeSetColor(targetObj, colorValue) {
  if (!targetObj) return false;
  var className = toolhubJavaClassName(targetObj);
  if (className.indexOf("Paint") >= 0) return toolhubSafeSetPaintColor(targetObj, colorValue);
  if (className.indexOf("GradientDrawable") >= 0) return toolhubSafeSetGradientColor(targetObj, colorValue);
  try {
    targetObj.setColor(toolhubSafeColorStateList(colorValue));
    return true;
  } catch (eState) {}
  try {
    targetObj.setColor(java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0)));
    return true;
  } catch (eInteger) {}
  return false;
}

function toolhubSafeSetStroke(targetObj, widthPx, colorValue) {
  if (!targetObj) return false;
  var width = Math.max(0, Math.round(Number(widthPx) || 0));
  try {
    targetObj.setStroke(width, toolhubSafeColorStateList(colorValue));
    return true;
  } catch (eState) {}
  try {
    targetObj.setStroke(width, java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0)));
    return true;
  } catch (eInteger) {}
  return false;
}

function toolhubSafeApplyColorStateList(targetObj, methodName, listObj) {
  if (!targetObj || !methodName) return false;
  var list = listObj;
  if (list !== null && typeof list !== "undefined" && !toolhubIsColorStateList(list)) {
    list = toolhubSafeColorStateList(list);
  }
  targetObj[String(methodName)](list);
  return true;
}

function toolhubSafeSetColorFilter(drawableObj, colorValue, modeObj) {
  if (!drawableObj) return false;
  var filter = new android.graphics.PorterDuffColorFilter(
    java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0)),
    modeObj || android.graphics.PorterDuff.Mode.SRC_IN
  );
  drawableObj.setColorFilter(filter);
  return true;
}

function toolhubSafeApplyColorFilter(drawableObj, filterObj) {
  if (!drawableObj) return false;
  drawableObj.setColorFilter(filterObj);
  return true;
}

function toolhubSafeSetShadowLayer(targetObj, radius, dx, dy, colorValue) {
  if (!targetObj) return false;
  targetObj.setShadowLayer(
    Number(radius) || 0,
    Number(dx) || 0,
    Number(dy) || 0,
    java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0))
  );
  return true;
}

function toolhubColorLuminance(colorValue) {
  var color = toolhubColorInt(colorValue, 0);
  var r = (color >>> 16) & 255;
  var g = (color >>> 8) & 255;
  var b = color & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
}

function toolhubCompositeColor(overlayValue, baseValue) {
  var overlay = toolhubColorInt(overlayValue, 0);
  var base = toolhubColorInt(baseValue, 0);
  var sa = (overlay >>> 24) & 255;
  var sr = (overlay >>> 16) & 255;
  var sg = (overlay >>> 8) & 255;
  var sb = overlay & 255;
  var ba = (base >>> 24) & 255;
  var br = (base >>> 16) & 255;
  var bg = (base >>> 8) & 255;
  var bb = base & 255;
  var inv = 255 - sa;
  var outA = sa + Math.round(ba * inv / 255);
  if (outA <= 0) return 0;
  var outR = Math.round((sr * sa + br * ba * inv / 255) / outA);
  var outG = Math.round((sg * sa + bg * ba * inv / 255) / outA);
  var outB = Math.round((sb * sa + bb * ba * inv / 255) / outA);
  return ((outA << 24) | (outR << 16) | (outG << 8) | outB) | 0;
}