'use strict';
/* Strategy: overlaysWebView=true — WebView behind status bar (edge-to-edge).
   Primary: MainActivity.java injects --sat/--sab via evaluateJavascript.
   Fallback: if Java injection hasn't run after 200ms, estimate from env() or Android dp. */
(function () {
  function _apply() {
    var root = document.documentElement;
    /* Skip if Java already injected a real value */
    if (parseFloat(root.style.getPropertyValue('--sat') || '0') > 0) return;

    /* Try CSS env() — works on iOS and some Android Capacitor builds */
    var tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);height:0;visibility:hidden;pointer-events:none';
    if (document.body) {
      document.body.appendChild(tmp);
      var envPx = parseFloat(getComputedStyle(tmp).top) || 0;
      document.body.removeChild(tmp);
      if (envPx > 0) {
        root.style.setProperty('--sat', envPx + 'px');
        return;
      }
    }

    /* Android fallback: 28dp standard status bar. CSS px = dp in WebView — do NOT multiply by DPR. */
    if (/Android/.test(navigator.userAgent) && window.Capacitor) {
      root.style.setProperty('--sat', '28px');
    }
  }

  /* Run twice: once early, once after Java injection window (200ms) */
  if (document.readyState !== 'loading') { _apply(); }
  else { document.addEventListener('DOMContentLoaded', _apply); }
  setTimeout(_apply, 200);
})();
