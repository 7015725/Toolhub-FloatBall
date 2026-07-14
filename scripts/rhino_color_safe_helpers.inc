function toolhubSafeColorStateListFromStates(stateRows, colorValues) {
  return new android.content.res.ColorStateList(
    toolhubJint2Array(stateRows || []),
    toolhubJintArray(colorValues || [])
  );
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
  viewObj.setHighlightColor(toolhubColorInt(colorValue, 0));
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

function toolhubSafeSetColor(targetObj, colorValue) {
  if (!targetObj) return false;
  var className = "";
  try { className = String(targetObj.getClass().getName()); } catch (eClass) {}
  if (className.indexOf("Paint") >= 0) return toolhubSafeSetPaintColor(targetObj, colorValue);
  if (className.indexOf("GradientDrawable") >= 0) return toolhubSafeSetGradientColor(targetObj, colorValue);
  var color = toolhubColorInt(colorValue, 0);
  try { targetObj.setColor(toolhubSafeColorStateList(color)); return true; } catch (eState) {}
  try { targetObj.setColor(java.lang.Integer.valueOf(color)); return true; } catch (eInteger) {}
  try { targetObj.setColor(color); return true; } catch (eInt) {}
  return false;
}

function toolhubSafeSetStroke(targetObj, widthPx, colorValue) {
  if (!targetObj) return false;
  var width = Math.max(0, Math.round(Number(widthPx) || 0));
  try { targetObj.setStroke(width, toolhubSafeColorStateList(colorValue)); return true; } catch (eState) {}
  try { targetObj.setStroke(width, java.lang.Integer.valueOf(toolhubColorInt(colorValue, 0))); return true; } catch (eInteger) {}
  return false;
}

function toolhubSafeApplyColorStateList(targetObj, methodName, listObj) {
  if (!targetObj || !methodName) return false;
  targetObj[String(methodName)](listObj);
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
    toolhubColorInt(colorValue, 0)
  );
  return true;
}
