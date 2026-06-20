/* Centralized Hijri date utility — single source of truth for all screens.
   Both Dashboard and Prayer Times call this instead of their own separate algorithms. */
window.HijriCalc = (function () {

    function _gregorianToJdn(year, month, day) {
        const a = Math.floor((14 - month) / 12);
        const y = year + 4800 - a;
        const m = month + 12 * a - 3;
        return day + Math.floor((153 * m + 2) / 5) + 365 * y
             + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    }

    function _jdnToHijri(jdn) {
        const l  = jdn - 1948440 + 10632;
        const n  = Math.floor((l - 1) / 10631);
        const l2 = l - 10631 * n + 354;
        const j  = Math.floor((10985 - l2) / 5316) * Math.floor(50 * l2 / 17719)
                 + Math.floor(l2 / 5670) * Math.floor(43 * l2 / 15238);
        const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50)
                 - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
        return {
            year:  30 * n + j - 30,
            month: Math.floor(24 * l3 / 709),
            day:   l3 - Math.floor(709 * Math.floor(24 * l3 / 709) / 24),
        };
    }

    const _MONTHS = {
        uz:     ['Muharram','Safar','Rabiul-avval','Rabius-soniy','Jumodul-avval','Jumodus-soniy','Rajab',"Sha'bon",'Ramazon','Shavvol',"Zulqa'da",'Zulhijja'],
        uz_cyr: ['Муҳаррам','Сафар','Рабиул-аввал','Рабиус-соний','Жумодул-аввал','Жумодус-соний','Ражаб',"Ша'бон",'Рамазон','Шаввол','Зулқаъда','Зулҳижжа'],
        ru:     ['Мухаррам','Сафар','Раби аль-Авваль','Раби аль-Тани','Джумада аль-Авваль','Джумада аль-Тани','Раджаб','Шаабан','Рамадан','Шавваль','Зуль-Каада','Зуль-Хиджа'],
        en:     ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhul-Qa'dah",'Dhul-Hijjah'],
        ar:     ['مُحَرَّم','صَفَر','رَبِيعٌ الأَوَّل','رَبِيعٌ الثَّانِي','جُمَادَى الأُولَى','جُمَادَى الآخِرَة','رَجَب','شَعْبَان','رَمَضَان','شَوَّال','ذُو القَعْدَة','ذُو الحِجَّة'],
    };

    function toHijri(year, month, day) {
        return _jdnToHijri(_gregorianToJdn(year, month, day));
    }

    function toHijriFromDate(date) {
        return toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    function monthName(monthNum, lang) {
        const m = _MONTHS[lang] || _MONTHS.en;
        return m[monthNum - 1] || '';
    }

    function format(h, lang) {
        return `${h.day} ${monthName(h.month, lang)} ${h.year}`;
    }

    function toArabicNum(n) {
        return String(n).split('').map(d => '٠١٢٣٤٥٦٧٨٩'[+d] ?? d).join('');
    }

    function formatArabic(h) {
        return `${toArabicNum(h.day)} ${monthName(h.month, 'ar')} ${toArabicNum(h.year)}`;
    }

    return { toHijri, toHijriFromDate, monthName, format, toArabicNum, formatArabic };
})();
