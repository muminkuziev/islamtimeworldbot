/* ═══════════════════════════════════════════════════
   Splash Screen
   ═══════════════════════════════════════════════════ */

const SplashScreen = (function () {

  const TAGLINES = {
    uz:     "Islomiy hayot yo'ldoshi",
    uz_cyr: "Исломий ҳаёт йўлдоши",
    en:     "Your Islamic Companion",
    ru:     "Ваш исламский спутник",
    tr:     "İslami Hayat Rehberi",
    ar:     "رفيقك الإسلامي",
    kk:     "Ислами өмір серігі",
    tg:     "Ёри Исломии Шумо",
    ky:     "Ислам жолдошуңуз",
    de:     "Ihr islamischer Begleiter",
    fr:     "Votre compagnon islamique",
    id:     "Teman Islammu",
    hi:     "आपका इस्लामिक साथी",
    ur:     "آپ کا اسلامی ساتھی",
    fa:     "همراه اسلامی شما",
  };

  function render() {
    const el = document.getElementById('screen-splash');
    const savedLang = localStorage.getItem('islamtime_lang') || 'uz';
    const tagline   = TAGLINES[savedLang] || TAGLINES['en'];

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

        <p class="splash-tagline">${tagline}</p>

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
