/* ═══════════════════════════════════════════════════
   Splash Screen
   ═══════════════════════════════════════════════════ */

const SplashScreen = (function () {

  function render() {
    const el = document.getElementById('screen-splash');

    el.innerHTML = `
      <div class="geo-bg"></div>

      <div class="splash-wrap">
        <img
          class="splash-logo"
          src="assets/logo.svg"
          alt="IslamTimeWorldBot"
          draggable="false"
        />

        <h1 class="splash-title">IslamTimeWorldBot</h1>

        <p class="splash-bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>

        <p class="splash-tagline">Your Islamic Companion</p>

        <div class="splash-dots">
          <span class="splash-dot"></span>
          <span class="splash-dot"></span>
          <span class="splash-dot"></span>
        </div>
      </div>
    `;
  }

  return { render };
})();
