/* ═══════════════════════════════════════════════════════════════
   Hijri Calendar Screen — Full Navy+Gold v2
   ✅ Calendar grid + month nav (all math kept)
   ✅ 9 Islomiy events — full detail: Qur'on, Hadis, Duo, Amallar
   ✅ Detail page with 5 sub-tabs + reminder modal (localStorage)
   ✅ Gregorian ↔ Hijri converter
   ═══════════════════════════════════════════════════════════════ */

const CalendarScreen = (function () {

  /* ── Month names ── */
  const OYLAR = ['Muharram','Safar',"Rabi'ul-avval","Rabi'ul-oxir",
                 'Jumadal-ula','Jumadal-oxira','Rajab',"Sha'bon",
                 'Ramazon','Shavvol',"Zulqa'da",'Zulhijja'];
  const OYLAR_CYR = ['Муҳаррам','Сафар','Рабиул-аввал','Рабиул-охир',
                     'Жумадал-уло','Жумадал-охира','Ражаб','Шаъбон',
                     'Рамазон','Шаввол','Зулқаъда','Зулҳижжа'];
  const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun',
                     'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  const MONTHS_CYR = ['Январ','Феврал','Март','Апрел','Май','Июн',
                      'Июл','Август','Сентябр','Октябр','Ноябр','Декабр'];
  const OYLAR_RU  = ['Мухаррам','Сафар','Раби аль-Авваль','Раби аль-Ахир',
                     'Джумада аль-Уля','Джумада аль-Ахира','Раджаб','Шаъбан',
                     'Рамадан','Шавваль','Зуль-Каъда','Зуль-Хиджжа'];
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                     'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const OYLAR_EN  = ['Muharram','Safar',"Rabi' al-Awwal","Rabi' al-Thani",
                     'Jumada al-Ula','Jumada al-Akhira','Rajab',"Sha'ban",
                     'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'];
  const MONTHS_EN = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

  /* ── Full event data (9 events) ── */
  const HIJRI_EVENTS = [
    {
      id:'arafa', icon:'🕋', type:'muhim', color:'#E8C15A',
      nomi:'Arafa kuni', nomi_cyr:'Арафа куни', nomi_ru:'День Арафа', nomi_en:'Day of Arafah', arNomi:'يوم عرفة',
      hYear:1447, hMonth:12, hDay:9,
      qisqa:"Zulhijjaning 9-kuni — Haj amallarining eng muhim qismi va ro'za tutish tavsiya etiladigan ulug' kun.",
      muhim:"Hajning asosi Arofatda wuquf (turish)dir. Hojjilar Arofat tekisligida dua qiladilar. Hajda bo'lmaganlar uchun bu kuni ro'za tutish ikki yillik gunohlarni kafforat qiladi.",
      amallar:["Ro'za tutish (hajda bo'lmaganlar uchun)","Ko'p dua va zikr qilish","Istig'for aytish","La ilaha illalloh ko'p aytish","Qur'on o'qish","Qurbon hayitiga tayyorgarlik ko'rish"],
      quran:{ar:"الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي",uz:"Bugun sizlar uchun dinizni to'liq qilib berdim va sizga ne'matimni to'ldirdim.",manba:"Al-Moidah, 5:3 — Arofat kuni nozil bo'lgan"},
      hadis:{ar:"صِيَامُ يَوْمِ عَرَفَةَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الْمَاضِيَةَ وَالْبَاقِيَةَ",uz:"Arofat kuni ro'za tutish — o'tgan va kelgusi yilning gunohlarini kafforat qilishini Allohdan umid qilaman.",manba:"Muslim · 1162"},
      hadis2:{ar:"خَيْرُ الدُّعَاءِ دُعَاءُ يَوْمِ عَرَفَةَ",uz:"Duolarning eng yaxshisi — Arofat kuni qilinadigan duodir.",manba:"Tirmiziy · 3585"},
      duo:{ar:"لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",tr:"La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa ala kulli shay'in qodir",uz:"Allohdan boshqa iloh yo'q, U yagonadir, mulk Uniki, hamd Uniki, U hamma narsaga qodirdir.",manba:"Tirmiziy · 3585 — Arofatning eng afzal zikri"},
    },
    {
      id:'qurbon', icon:'🐑', type:'bayram', color:'#4fcfa0',
      nomi:'Iyd al-Adha', nomi_cyr:'Ийд ал-Адҳа', nomi_ru:'Ид аль-Адха', nomi_en:'Eid al-Adha', arNomi:'عيد الأضحى',
      hYear:1447, hMonth:12, hDay:10,
      qisqa:"Qurbon hayiti — Ibrohim a.s.ning Allohga bo'lgan itoatini xotirlash va qurbon so'yish bayrami.",
      muhim:"Islomning ikki rasmiy bayramidan biri. Qurbon so'yish — Ibrohim a.s. o'g'lini qurbon qilishga tayyor bo'lganining ramzi. Qurbon go'shti kambag'allarga ulashiladi.",
      amallar:["Bayram namozi o'qish","Qurbon so'yish (imkoniyatga qarab)","Takbir aytish","G'usl va bayram kiyimi kiyish","Qurbon go'shtini uchga bo'lish (o'zi, qarindosh, kambag'al)","Qarindosh-urug'larni ziyorat qilish"],
      quran:{ar:"فَصَلِّ لِرَبِّكَ وَانْحَرْ",uz:"Rabbingga namoz o'qi va qurbon so'y.",manba:"Al-Kavsar, 108:2"},
      hadis:{ar:"مَا عَمِلَ آدَمِيٌّ مِنْ عَمَلٍ يَوْمَ النَّحْرِ أَحَبَّ إِلَى اللَّهِ مِنْ إِهْرَاقِ الدَّمِ",uz:"Qurbon kunida Allohga eng sevimli amal — qurbon so'yishdir.",manba:"Tirmiziy · 1493"},
      duo:{ar:"تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ وَتَقَبَّلْ مِنِّي يَا رَبِّ",tr:"Taqabbalallahu minna wa minkum wa taqabbal minni ya Rabb",uz:"Alloh bizdan ham, sizdan ham qabul qilsin. Ya Rabb, mendan qabul qilgin.",manba:"Sahoba rivoyati"},
    },
    {
      id:'yangi_yil', icon:'🌙', type:'bayram', color:'#4fcfa0',
      nomi:'Yangi Hijriy yil', nomi_cyr:'Янги Ҳижрий йил', nomi_ru:'Исламский Новый год', nomi_en:'Islamic New Year', arNomi:'رأس السنة الهجرية',
      hYear:1448, hMonth:1, hDay:1,
      qisqa:"Islomiy yangi yilning boshlanishi — Hijriy taqvimning birinchi kuni.",
      muhim:"Islom tarixi Payg'ambar s.a.v.ning Makkadan Madinaga hijratlari bilan boshlanadi. Bu kundan boshlab 1448 yil sanala boshlanadi.",
      amallar:["Ro'za tutish (ixtiyoriy)","Ko'proq Qur'on o'qish","Islom tarixini o'rganish","Yangi yilga niyat va maqsadlar qo'yish","Qarindosh-urug'lar bilan muloqot qilish"],
      quran:{ar:"إِنَّ عِدَّةَ الشُّهُورِ عِندَ اللَّهِ اثْنَا عَشَرَ شَهْرًا",uz:"Darhaqiqat, Alloh oldida oylar soni o'n ikkita — Alloh osmonu yerni yaratgan kundan beri.",manba:"At-Tavba, 9:36"},
      hadis:{ar:"السَّنَةُ اثْنَا عَشَرَ شَهْرًا",uz:"Yil o'n ikki oydan iborat bo'lib, ularning to'rttasi hurmatli oylardir.",manba:"Buxoriy · 3197"},
      duo:{ar:"اللَّهُمَّ أَدْخِلْهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ",tr:"Allohim, adkhilhu alayna bil-amni wal-iymaan",uz:"Allohim, uni bizga xavfsizlik va iymon bilan kirgaz.",manba:"Tabaroniy"},
    },
    {
      id:'ashura', icon:'⭐', type:'muhim', color:'#E8C15A',
      nomi:'Ashura kuni', nomi_cyr:'Ашура куни', nomi_ru:'День Ашура', nomi_en:'Day of Ashura', arNomi:'يوم عاشوراء',
      hYear:1448, hMonth:1, hDay:10,
      qisqa:"Muharramning o'ninchi kuni — ro'za tutish tavsiya etiladigan ulug' kun.",
      muhim:"Bu kunda Muso a.s. va uning ummatini Alloh Fir'avndan najot bergan. Payg'ambar s.a.v. bu kunning fozilati haqida ko'p hadis aytganlar.",
      amallar:["9 va 10 Muharram ro'za tutish (yoki 10 va 11)","Ko'p sadaqa berish","Oila a'zolariga saxiylik ko'rsatish","Istig'for aytish","Namoz o'qish"],
      eslatma:"9-10 yoki 10-11 Muharram ro'za tutish tavsiya etiladi",
      quran:{ar:"وَإِذْ فَرَقْنَا بِكُمُ الْبَحْرَ فَأَنجَيْنَاكُمْ وَأَغْرَقْنَا آلَ فِرْعَوْنَ",uz:"Va sizlar uchun dengizni yorib yuborganimizni, sizni qutqarganmizni va Fir'avn xonadonini cho'ktirganmizni esla.",manba:"Al-Baqara, 2:50"},
      hadis:{ar:"صِيَامُ يَوْمِ عَاشُورَاءَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الْمَاضِيَةَ",uz:"Ashura kuni ro'za tutish — o'tgan yilning gunohlarini kafforat qilishini Allohdan umid qilaman.",manba:"Muslim · 1162"},
      hadis2:{ar:"لَئِنْ بَقِيتُ إِلَى قَابِلٍ لَأَصُومَنَّ التَّاسِعَ",uz:"Agar kelasi yilga yetsam, 9-kunni ham ro'za tutaman (yahudiylardan farq qilish uchun).",manba:"Muslim · 1134"},
      duo:{ar:"اللَّهُمَّ اغْفِرْ لِي ذُنُوبِي وَخَطَايَايَ كُلَّهَا",tr:"Allohim, ag'fir li zunubi va khatayaya kullaha",uz:"Allohim, barcha gunohlarimni va xatolarimni kechir.",manba:"Abu Dovud"},
    },
    {
      id:'isro_meraj', icon:'🌟', type:'muhim', color:'#c084fc',
      nomi:"Isro' va Me'roj", nomi_cyr:'Исро ва Меърож', nomi_ru:'Исра и Мирадж', nomi_en:"Isra' and Mi'raj", arNomi:'الإسراء والمعراج',
      hYear:1448, hMonth:7, hDay:27,
      qisqa:"Payg'ambar s.a.v. ning Makkadan Quddusga (Isro') va u yerdan osmonlarga (Me'roj) ko'tarilgan kechasi.",
      muhim:"Bu kechada 5 vaqt namoz farz qilindi. Bu Islom tarixidagi eng ulug' voqealardan biri — Payg'ambar s.a.v. Alloh bilan bevosita muloqot qildilar.",
      amallar:["Namozni o'z vaqtida o'qish","Namozning qadri haqida o'ylash","Qur'on o'qish — ayniqsa Al-Isro surasi","Payg'ambar s.a.v. siyrasi o'qish","Salavot ko'p aytish"],
      quran:{ar:"سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى",uz:"Bandasini kechasi Masjid al-Haromdan Masjid al-Aqsoga safari qildirgan Zot ulug' va pok.",manba:"Al-Isro', 17:1"},
      hadis:{ar:"فَرَضَ اللَّهُ عَلَى أُمَّتِي خَمْسِينَ صَلاَةً",uz:"Alloh dastlab mening ummatimga 50 vaqt namozni farz qildi, so'ngra uni 5 ga tushirdi va 50 ning savobi beriladi.",manba:"Buxoriy · 3207"},
      duo:{ar:"اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",tr:"Allohim solli ala Muhammadin va ala ali Muhammad",uz:"Allohim, Muhammadga va Muhammad oilasiga salavot ayta.",manba:"Buxoriy · 3370"},
    },
    {
      id:'barat', icon:'🌙', type:'muhim', color:'#5b9bd5',
      nomi:'Barat kechasi', nomi_cyr:'Барот кечаси', nomi_ru:'Ночь Бараат', nomi_en:"Laylat al-Bara'ah", arNomi:"ليلة البراءة",
      hYear:1448, hMonth:8, hDay:15,
      qisqa:"Sha'bonning 15-kechasi — ko'p olimlar bu kechada duolar qabul bo'lishi haqida rivoyatlar keltirgan.",
      muhim:"Ba'zi hadislarda bu kechada Alloh bandalarining gunohlarini kechirishi tilga olinadi. Shuningdek bu oy Payg'ambar s.a.v. eng ko'p ro'za tutgan oy.",
      amallar:["Nafl namoz o'qish","Istig'for aytish","Qarindoshlar bilan munosabatni yaxshilash","Qabr ziyorati","Sha'bon oyida ko'p ro'za tutish"],
      quran:null,
      hadis:{ar:"كَانَ رَسُولُ اللَّهِ يَصُومُ شَعْبَانَ كُلَّهُ",uz:"Rasululloh s.a.v. butun Sha'bon oyini ro'za tutardilar.",manba:"Muslim · 1156"},
      duo:{ar:"اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",tr:"Allohim, innaka afuvvun keriymun tuhibbul afva fa'fu anni",uz:"Allohim, Sen kechiruvchisan, saxiysan, afvni yaxshi ko'rasan — meni afv et.",manba:"Tirmiziy · 3513"},
    },
    {
      id:'ramazon', icon:'🌙', type:'bayram', color:'#4fcfa0',
      nomi:'Ramazon boshi', nomi_cyr:'Рамазон боши', nomi_ru:'Начало Рамадана', nomi_en:'Beginning of Ramadan', arNomi:'بداية رمضان',
      hYear:1448, hMonth:9, hDay:1,
      qisqa:"Islomning to'rtinchi rukni — Ramazon ro'zasining boshlanishi.",
      muhim:"Ramazon — Qur'on nozil bo'lgan muborak oy. Bu oyda ro'za tutish har bir baquvvat, baliq musulmonga farz.",
      amallar:["Ro'za niyat qilish","Saharlik qilish","Taroveh namozi o'qish","Qur'on xatm qilish","Sadaqa berish","Zikr va duolarni ko'paytirish"],
      quran:{ar:"شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ",uz:"Ramazon oyi — insonga hidoyat va haqdan batilni ajratuvchi dalillar sifatida Qur'on nozil qilingan oy.",manba:"Al-Baqara, 2:185"},
      hadis:{ar:"مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",uz:"Kim Ramazon oyini iymon va savob kutib ro'za tutsa, o'tgan gunohlari kechiriladi.",manba:"Buxoriy · 38"},
      duo:{ar:"اللَّهُمَّ بَلِّغْنَا رَمَضَانَ وَبَلِّغْنَا لَيْلَةَ الْقَدْرِ",tr:"Allohim, ballig'na Ramadona wa ballig'na laylatal-Qadr",uz:"Allohim, bizni Ramazonga yetkazgin va Qadr kechasiga ham yetkazgin.",manba:"Hadis"},
    },
    {
      id:'qadr', icon:'✨', type:'eng_muhim', color:'#c084fc',
      nomi:'Qadr kechasi', nomi_cyr:'Қадр кечаси', nomi_ru:'Ночь Кадр', nomi_en:'Laylat al-Qadr', arNomi:'ليلة القدر',
      hYear:1448, hMonth:9, hDay:27,
      qisqa:"Ming oydan yaxshiroq kecha — Qur'on nozil bo'lishining boshlanishi.",
      muhim:"Bu kecha Alloh tomonidan ming oydan afzal deb belgilangan. Jabroil a.s. va boshqa farishtalar yerga tushadilar. Tong otguncha tinchlik va xayir hukm suradi.",
      amallar:["Butun kechani ibodat bilan o'tkazish","Tahajjud namozi o'qish","Allohumma innaka afuvv duosini ko'p aytish","Qur'on o'qish","Istig'for va tavba qilish","Sadaqa berish","I'tikof o'tirish (iloji bo'lsa)"],
      quran:{ar:"لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم",uz:"Qadr kechasi ming oydan yaxshidir. Farishtalar va Ruh o'sha kechada Rabbilari izni bilan har bir ish uchun tushadilar.",manba:"Al-Qadr, 97:3-4"},
      hadis:{ar:"مَنْ قَامَ لَيْلَةَ الْقَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",uz:"Kim Qadr kechasini iymon va savob kutib ibodatda o'tkazsa, o'tgan gunohlari kechiriladi.",manba:"Buxoriy · 1901"},
      duo:{ar:"اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",tr:"Allohim, innaka afuvvun tuhibbul afva fa'fu anni",uz:"Allohim, Sen kechiruvchisan, afvni yaxshi ko'rasan — meni afv et.",manba:"Tirmiziy · 3513 — Oisha r.a. so'ragan duo"},
    },
    {
      id:'iyd_fitr', icon:'🎉', type:'bayram', color:'#4fcfa0',
      nomi:'Iyd al-Fitr', nomi_cyr:'Ийд ал-Фитр', nomi_ru:'Ид аль-Фитр', nomi_en:'Eid al-Fitr', arNomi:'عيد الفطر',
      hYear:1448, hMonth:10, hDay:1,
      qisqa:"Ramazon ro'zasini muvaffaqiyatli tugatganlik sharafiga bayram — Fitr hayiti.",
      muhim:"Ramazon oyini ro'za tutib tugatganlarga Allohning sovg'asi. Bu kunda ro'za tutish harom, bayram namozi sunnati muakkada.",
      amallar:["Fitr sadaqasi berish (bayram namozidan oldin)","Bayram namozi o'qish","G'usl qilish va yangi kiyim kiyish","Takbir aytish","Qarindoshlarni ziyorat qilish","Bayram tabrikini ulashish"],
      quran:{ar:"وَلِتُكْمِلُوا الْعِدَّةَ وَلِتُكَبِّرُوا اللَّهَ عَلَىٰ مَا هَدَاكُمْ",uz:"Raqamni to'ldirganingiz uchun va sizni hidoyat etgani uchun Allohni ulug'laganingiz uchun.",manba:"Al-Baqara, 2:185"},
      hadis:{ar:"زَيِّنُوا الْعِيدَيْنِ بِالتَّكْبِيرِ",uz:"Ikki bayramni takbir bilan bezainglar.",manba:"Tabaroniy"},
      duo:{ar:"تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ",tr:"Taqabbalallahu minna wa minkum",uz:"Alloh bizdan ham, sizdan ham qabul qilsin.",manba:"Sahobalar bir-birlarini shu so'zlar bilan tabriklaganlar"},
    },
  ];

  const SPECIAL = [
    { m:1,  d:1,  type:'bayram',    color:'#4fcfa0', uz:'Yangi Hijriy yil',  cyr:'Янги Ҳижрий йил',    ru:'Исламский Новый год',  en:'Islamic New Year',      desc:'Hijriy yangi yil boshlanadi',          desc_cyr:'Ҳижрий янги йил бошланади',        desc_ru:'Начало исламского года',           desc_en:'Islamic new year begins'             },
    { m:1,  d:10, type:'muhim',     color:'#E8C15A', uz:'Ashura kuni',        cyr:'Ашура куни',          ru:'День Ашура',           en:'Day of Ashura',         desc:"Ro'za tutish mustahab",                 desc_cyr:"Рўза тутиш мустаҳаб",              desc_ru:'Рекомендуется поститься',          desc_en:'Fasting is recommended'             },
    { m:7,  d:27, type:'muhim',     color:'#E8C15A', uz:"Isro' va Me'roj",    cyr:"Исро ва Меърож",     ru:'Исра и Мирадж',        en:"Isra' and Mi'raj",     desc:"Payg'ambar s.a.v. me'roj kechasi",     desc_cyr:"Пайғамбар с.а.в. меърож кечаси", desc_ru:'Ночь вознесения Пророка ﷺ',        desc_en:"Night of Prophet's ﷺ Ascension"      },
    { m:8,  d:15, type:'muhim',     color:'#E8C15A', uz:'Barat kechasi',      cyr:'Барот кечаси',       ru:'Ночь Бараат',          en:"Laylat al-Bara'ah",    desc:"Qabrlarni ziyorat qilish",              desc_cyr:"Қабрларни зиёрат қилиш",          desc_ru:'Посещение кладбищ',                desc_en:'Night of forgiveness'               },
    { m:9,  d:1,  type:'bayram',    color:'#4fcfa0', uz:'Ramazon boshi',      cyr:'Рамазон боши',       ru:'Начало Рамадана',      en:'Start of Ramadan',     desc:"Ro'za boshlanadi",                      desc_cyr:"Рўза бошланади",                  desc_ru:'Начало поста',                     desc_en:'Fasting begins'                     },
    { m:9,  d:27, type:'eng_muhim', color:'#c084fc', uz:'Qadr kechasi',       cyr:'Қадр кечаси',        ru:'Ночь Кадр',            en:'Laylat al-Qadr',       desc:'Ming oydan yaxshi kecha',               desc_cyr:'Минг ойдан яхши кеча',            desc_ru:'Ночь лучше тысячи месяцев',       desc_en:'Better than a thousand months'      },
    { m:10, d:1,  type:'bayram',    color:'#4fcfa0', uz:'Iyd al-Fitr',        cyr:'Ийд ал-Фитр',        ru:'Ид аль-Фитр',          en:'Eid al-Fitr',          desc:'Ramazon hayiti',                        desc_cyr:'Рамазон ҳайити',                  desc_ru:'Праздник разговения',             desc_en:'Festival of Breaking the Fast'     },
    { m:12, d:9,  type:'muhim',     color:'#E8C15A', uz:'Arafa kuni',         cyr:'Арафа куни',          ru:'День Арафа',           en:'Day of Arafah',        desc:"Ro'za tutish afzal",                    desc_cyr:"Рўза тутиш афзал",                desc_ru:'Рекомендуется поститься',          desc_en:'Fasting is recommended'            },
    { m:12, d:10, type:'bayram',    color:'#4fcfa0', uz:'Iyd al-Adha',        cyr:'Ийд ал-Адҳа',        ru:'Ид аль-Адха',          en:'Eid al-Adha',          desc:'Qurbon hayiti',                         desc_cyr:'Қурбон ҳайити',                   desc_ru:'Праздник жертвоприношения',       desc_en:'Festival of Sacrifice'            },
  ];

  /* ── Language helpers ── */
  function _T(lat, cyr, ru, en) { if (_lang === 'uz_cyr') return cyr; if (_lang === 'ru' && ru !== undefined) return ru; if (_lang === 'en' && en !== undefined) return en; return lat; }
  function _cy(t) {
    if (!t || _lang !== 'uz_cyr') return t;
    return t
      .replace(/O'/g,'Ў').replace(/o'/g,'ў')
      .replace(/G'/g,'Ғ').replace(/g'/g,'ғ')
      .replace(/Sh/g,'Ш').replace(/sh/g,'ш')
      .replace(/Ch/g,'Ч').replace(/ch/g,'ч')
      .replace(/Ng/g,'Нг').replace(/ng/g,'нг')
      .replace(/Yo/g,'Ё').replace(/yo/g,'ё')
      .replace(/Yu/g,'Ю').replace(/yu/g,'ю')
      .replace(/Ya/g,'Я').replace(/ya/g,'я')
      .replace(/A/g,'А').replace(/a/g,'а')
      .replace(/B/g,'Б').replace(/b/g,'б')
      .replace(/D/g,'Д').replace(/d/g,'д')
      .replace(/E/g,'Е').replace(/e/g,'е')
      .replace(/F/g,'Ф').replace(/f/g,'ф')
      .replace(/G/g,'Г').replace(/g/g,'г')
      .replace(/H/g,'Ҳ').replace(/h/g,'ҳ')
      .replace(/I/g,'И').replace(/i/g,'и')
      .replace(/J/g,'Ж').replace(/j/g,'ж')
      .replace(/K/g,'К').replace(/k/g,'к')
      .replace(/L/g,'Л').replace(/l/g,'л')
      .replace(/M/g,'М').replace(/m/g,'м')
      .replace(/N/g,'Н').replace(/n/g,'н')
      .replace(/O/g,'О').replace(/o/g,'о')
      .replace(/P/g,'П').replace(/p/g,'п')
      .replace(/Q/g,'Қ').replace(/q/g,'қ')
      .replace(/R/g,'Р').replace(/r/g,'р')
      .replace(/S/g,'С').replace(/s/g,'с')
      .replace(/T/g,'Т').replace(/t/g,'т')
      .replace(/U/g,'У').replace(/u/g,'у')
      .replace(/V/g,'В').replace(/v/g,'в')
      .replace(/X/g,'Х').replace(/x/g,'х')
      .replace(/Y/g,'Й').replace(/y/g,'й')
      .replace(/Z/g,'З').replace(/z/g,'з');
  }
  function _evName(ev) {
    if (_lang === 'uz_cyr' && ev.nomi_cyr) return ev.nomi_cyr;
    if (_lang === 'ru' && ev.nomi_ru) return ev.nomi_ru;
    if (_lang === 'en' && ev.nomi_en) return ev.nomi_en;
    return ev.nomi;
  }
  function _evTxt(obj, field) {
    if (!obj) return '';
    if (_lang === 'uz_cyr' && obj[field + '_cyr']) return obj[field + '_cyr'];
    if (_lang === 'en' && obj[field + '_en']) return obj[field + '_en'];
    const v = obj[field] || '';
    return _lang === 'uz_cyr' ? _cy(v) : v;
  }
  function _gMonth(idx) {
    if (_lang === 'uz_cyr') return MONTHS_CYR[idx] || '';
    if (_lang === 'ru') return MONTHS_RU[idx] || '';
    if (_lang === 'en') return MONTHS_EN[idx] || '';
    return MONTHS_UZ[idx] || '';
  }
  function _hMonth(idx) {
    if (_lang === 'uz_cyr') return OYLAR_CYR[idx] || '';
    if (_lang === 'ru') return OYLAR_RU[idx] || '';
    if (_lang === 'en') return OYLAR_EN[idx] || '';
    return OYLAR[idx] || '';
  }

  /* ══════════════════════════════════════════════
     Math functions (unchanged from v1)
  ══════════════════════════════════════════════ */
  function toHijri(year, month, day) {
    return _jdnToHijri(_gregorianToJdn(year, month, day));
  }
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
      hMonth: Math.floor(24 * l3 / 709),
      hDay:   l3 - Math.floor(709 * Math.floor(24 * l3 / 709) / 24),
      hYear:  30 * n + j - 30,
    };
  }
  function _hijriDaysInMonth(year, month) {
    const leap = (((11 * year) + 14) % 30) < 11;
    if (month === 12 && leap) return 30;
    return month % 2 === 1 ? 30 : 29;
  }
  function _hijriToJdn(year, month, day) {
    return Math.floor((11 * year + 3) / 30)
         + 354 * year
         + 30 * month
         - Math.floor((month - 1) / 2)
         + day + 1948440 - 385;
  }
  function _jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      gDay:   e - Math.floor((153 * m + 2) / 5) + 1,
      gMonth: m + 3 - 12 * Math.floor(m / 10),
      gYear:  100 * b + d - 4800 + Math.floor(m / 10),
    };
  }

  /* ══════════════════════════════════════════════
     State
  ══════════════════════════════════════════════ */
  let _lang       = 'uz';
  let _tab        = 'taqvim';
  let _today      = null;
  let _viewYear   = 0;
  let _viewMonth  = 0;
  let _selDay     = 0;
  let _selEvent   = null;
  let _detailTab  = 'asosiy';
  let _reminders  = {};
  let _el         = null;

  /* ══════════════════════════════════════════════
     Entry points
  ══════════════════════════════════════════════ */
  function render() {
    _lang = window.App?.state?.lang || 'uz';
    _tab = 'taqvim'; _selEvent = null;
    _initToday(); _loadReminders();
    _el = document.getElementById('screen-calendar');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
  }

  function load(lang) {
    _lang = lang;
    _tab = 'taqvim'; _selEvent = null;
    _initToday(); _loadReminders();
    _el = document.getElementById('screen-calendar');
    if (!_el) return;
    _el.innerHTML = _buildHTML();
    _bind();
  }

  function _initToday() {
    _lang = window.App?.state?.lang || _lang;
    const now = new Date();
    const h = toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    _today = {
      gYear: now.getFullYear(), gMonth: now.getMonth() + 1, gDay: now.getDate(),
      hYear: h.hYear, hMonth: h.hMonth, hDay: h.hDay,
    };
    if (!_viewYear) { _viewYear = _today.hYear; _viewMonth = _today.hMonth; _selDay = _today.hDay; }
  }

  function _loadReminders() {
    try { _reminders = JSON.parse(localStorage.getItem('islamtime_cal_reminders') || '{}'); }
    catch { _reminders = {}; }
  }
  function _saveReminders() {
    localStorage.setItem('islamtime_cal_reminders', JSON.stringify(_reminders));
  }

  /* ══════════════════════════════════════════════
     Root HTML dispatcher
  ══════════════════════════════════════════════ */
  function _buildHTML() {
    return _selEvent ? _buildDetail() : _buildMain();
  }

  /* ══════════════════════════════════════════════
     MAIN VIEW
  ══════════════════════════════════════════════ */
  function _buildMain() {
    const remCount = Object.values(_reminders).filter(r => r.length > 0).length;
    return `
<div class="hc-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="hc-hdr-inner">
    <div class="hc-top-row">
      <button class="hc-back-btn" id="hc-back">← ${_T('Menyu','Меню','Меню','Menu')}</button>
      ${remCount ? `<div class="hc-remind-count">🔔 ${remCount}</div>` : '<div></div>'}
    </div>
    <div class="hc-title">${_T('Hijriy taqvim','Ҳижрий тақвим','Исламский календарь','Islamic Calendar')}</div>
    <div class="hc-sub-row">
      <span style="font-family:'Amiri',serif;font-size:14px;color:#E8C15A">${_mname()} ${_viewYear}</span>
      <span style="color:rgba(232,223,200,.3)">·</span>
      <span style="font-size:11px;color:rgba(232,223,200,.45)">${_gMonth((_today?.gMonth||1)-1)} ${_today?.gYear||''}</span>
    </div>
    <div class="hc-month-nav">
      <button class="hc-nav-btn" id="hc-prev">‹</button>
      <span class="hc-nav-label">${_mname()} ${_viewYear}</span>
      <button class="hc-nav-btn" id="hc-next">›</button>
    </div>
    <div class="hc-divider"></div>
    <div class="hc-tabs">
      <button class="hc-tab${_tab==='taqvim'?' active':''}" data-tab="taqvim">📅 ${_T('Taqvim','Тақвим','Календарь','Calendar')}</button>
      <button class="hc-tab${_tab==='islomiy'?' active':''}" data-tab="islomiy">🌙 ${_T('Islomiy','Исломий','Исламские','Islamic')}</button>
      <button class="hc-tab${_tab==='konvertor'?' active':''}" data-tab="konvertor">🔄 ${_T('Konvertor','Конвертор','Конвертер','Converter')}</button>
    </div>
  </div>
</div>
<div class="hc-body" id="hc-body">
  ${_buildTabContent()}
</div>`;
  }

  function _buildTabContent() {
    if (_tab === 'taqvim')    return _buildTaqvimTab();
    if (_tab === 'islomiy')   return _buildIslomiyTab();
    if (_tab === 'konvertor') return _buildKonvertorTab();
    return '';
  }

  /* ── Tab 1: Taqvim ── */
  function _buildTaqvimTab() {
    const WD = _lang === 'uz_cyr'
      ? ['Душ','Сеш','Чор','Пай','Жум','Шан','Якш']
      : _lang === 'ru'
      ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
      : _lang === 'en'
      ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
      : ['Du','Se','Ch','Pa','Ju','Sh','Ya'];
    const dim = _hijriDaysInMonth(_viewYear, _viewMonth);
    const fJdn = _hijriToJdn(_viewYear, _viewMonth, 1);
    const startWday = fJdn % 7;
    const weeks = [];
    let week = [];
    for (let i = 0; i < startWday; i++) week.push(null);
    for (let d = 1; d <= dim; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    while (week.length && week.length < 7) week.push(null);
    if (week.length) weeks.push(week);

    const isToday = d => _today && _viewYear===_today.hYear && _viewMonth===_today.hMonth && d===_today.hDay;
    const sp = (d) => SPECIAL.find(s => s.m===_viewMonth && s.d===d) || null;

    const rows = weeks.map(w => `
      <div class="hc-cal-row">${w.map(d => {
        if (!d) return `<div class="hc-cell hc-cell-empty"></div>`;
        const s = sp(d), tod = isToday(d), sel = d===_selDay, c = s?.color||null;
        let st = '';
        if (sel) st = 'background:#E8C15A;';
        else if (tod) st = 'background:rgba(232,193,90,.18);border:1px solid rgba(232,193,90,.35);';
        else if (c) st = `background:${c}18;border:1px solid ${c}30;`;
        else st = 'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);';
        const numSt = sel ? 'color:#09121f;font-weight:800;' : tod ? 'color:#E8C15A;font-weight:700;' : c ? `color:${c};` : '';
        const dot = (!sel && (c||tod)) ? `<span class="hc-dot" style="background:${tod?'#E8C15A':c}"></span>` : '';
        return `<div class="hc-cell" data-d="${d}" style="${st}">
          <span class="hc-day-num" style="${numSt}">${d}</span>${dot}</div>`;
      }).join('')}</div>`).join('');

    const selSp = sp(_selDay);
    const g = _jdnToGregorian(_hijriToJdn(_viewYear, _viewMonth, _selDay));
    const gregStr = `${g.gDay} ${_gMonth(g.gMonth-1)} ${g.gYear}`;

    return `
<div class="hc-wd-row">${WD.map(d=>`<div class="hc-wd">${d}</div>`).join('')}</div>
<div class="hc-grid-wrap">${rows}</div>
<div class="hc-sel-card">
  <div class="hc-sel-topline"></div>
  <div class="hc-sel-row">
    <div>
      <div class="hc-sel-lbl">${_T('TANLANGAN KUN','ТАНЛАНГАН КУН','ВЫБРАННЫЙ ДЕНЬ','SELECTED DAY')}</div>
      <div class="hc-sel-hijri" style="font-family:'Amiri',serif;font-size:16px;color:#E8C15A;">${_selDay} ${_mname()} ${_viewYear}</div>
      <div class="hc-sel-greg">${gregStr}${isToday(_selDay) ? ' · ' + _T('Bugun','Бугун','Сегодня','Today') : ''}</div>
    </div>
    <div class="hc-sel-num">${_selDay}</div>
  </div>
  ${selSp ? `<div class="hc-sel-event"><span class="hc-sel-ev-name" style="color:${selSp.color}">${_lang==='uz_cyr'?(selSp.cyr||selSp.uz):_lang==='ru'?(selSp.ru||selSp.uz):_lang==='en'?(selSp.en||selSp.uz):selSp.uz}</span> <span class="hc-sel-ev-desc">— ${_lang==='uz_cyr'?(selSp.desc_cyr||selSp.desc):_lang==='ru'?(selSp.desc_ru||selSp.desc):_lang==='en'?(selSp.desc_en||selSp.desc):selSp.desc}</span></div>` : ''}
</div>`;
  }

  /* ── Tab 2: Islomiy kunlar ── */
  function _buildIslomiyTab() {
    return `
<div class="hc-islomiy">
  <div class="hc-slbl">${_T("MUHIM ISLOMIY KUNLAR · Batafsil ma'lumot uchun bosing","МУҲИМ ИСЛОМИЙ КУНЛАР · Батафсил маълумот учун босинг","ВАЖНЫЕ ИСЛАМСКИЕ ДАТЫ · Нажмите для подробностей",'IMPORTANT ISLAMIC DATES · Tap for details')}</div>
  ${HIJRI_EVENTS.map(ev => {
    const g = _jdnToGregorian(_hijriToJdn(ev.hYear, ev.hMonth, ev.hDay));
    const milodiy = `${g.gDay} ${_gMonth(g.gMonth-1)} ${g.gYear}`;
    const bLabel = ev.type==='bayram'?_T('BAYRAM','БАЙРАМ','ПРАЗДНИК','HOLIDAY'):ev.type==='eng_muhim'?_T("✨ ULUG'","✨ УЛУҒ",'✨ ВАЖНО','✨ IMPORTANT'):_T('MUHIM','МУҲИМ','ВАЖНО','IMPORTANT');
    const hasRem = (_reminders[ev.id]||[]).length > 0;
    return `
    <div class="hc-ev-card" data-evid="${ev.id}">
      <div class="hc-ev-bar" style="background:${ev.color}"></div>
      <div class="hc-ev-icon" style="background:${ev.color}15;border:1px solid ${ev.color}35">${ev.icon}</div>
      <div class="hc-ev-text">
        <div class="hc-ev-head">
          <span class="hc-ev-name">${_evName(ev)}</span>
          <span class="hc-ev-badge" style="color:${ev.color};background:${ev.color}18;border:1px solid ${ev.color}35">${bLabel}</span>
          ${hasRem ? '<span style="font-size:11px">🔔</span>' : ''}
        </div>
        <div class="hc-ev-arname" style="font-family:'Amiri',serif;font-size:10px;color:rgba(232,223,200,.28)">${ev.arNomi}</div>
        <div class="hc-ev-date" style="color:${ev.color}">${milodiy}</div>
      </div>
      <div class="hc-ev-arrow">›</div>
    </div>`;
  }).join('')}
</div>`;
  }

  /* ── Tab 3: Konvertor ── */
  function _buildKonvertorTab() {
    return `
<div class="hc-conv">
  <div class="hc-conv-card hc-conv-gold">
    <div class="hc-conv-topline"></div>
    <div class="hc-conv-lbl">${_T('MILODIY → HIJRIY','МИЛОДИЙ → ҲИЖРИЙ','ГРИГ. → ХИДЖРА','GREGORIAN → HIJRI')}</div>
    <div class="hc-conv-inputs">
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Kun','Кун','День','Day')}</div>
        <input type="number" class="hc-conv-input" id="hc-g-day"   min="1"    max="31"   value="${_today?.gDay||1}"/></div>
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Oy','Ой','Месяц','Month')}</div>
        <input type="number" class="hc-conv-input" id="hc-g-month" min="1"    max="12"   value="${_today?.gMonth||1}"/></div>
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Yil','Йил','Год','Year')}</div>
        <input type="number" class="hc-conv-input" id="hc-g-year"  min="1900" max="2100" value="${_today?.gYear||2025}"/></div>
    </div>
    <button class="hc-conv-btn hc-conv-btn-gold" id="hc-g2h-btn">${_T('Hisoblash →','Ҳисоблаш →','Вычислить →','Calculate →')}</button>
    <div class="hc-conv-result" id="hc-g2h-res"></div>
  </div>
  <div class="hc-conv-card hc-conv-blue">
    <div class="hc-conv-lbl" style="color:rgba(91,155,213,.7)">${_T('HIJRIY → MILODIY','ҲИЖРИЙ → МИЛОДИЙ','ХИДЖРА → ГРИГ.','HIJRI → GREGORIAN')}</div>
    <div class="hc-conv-inputs">
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Kun','Кун','День','Day')}</div>
        <input type="number" class="hc-conv-input hc-conv-input-blue" id="hc-h-day"   min="1"    max="30"   value="${_today?.hDay||1}"/></div>
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Oy','Ой','Месяц','Month')}</div>
        <input type="number" class="hc-conv-input hc-conv-input-blue" id="hc-h-month" min="1"    max="12"   value="${_today?.hMonth||1}"/></div>
      <div class="hc-conv-field"><div class="hc-conv-fl">${_T('Yil','Йил','Год','Year')}</div>
        <input type="number" class="hc-conv-input hc-conv-input-blue" id="hc-h-year"  min="1300" max="1600" value="${_today?.hYear||1447}"/></div>
    </div>
    <button class="hc-conv-btn hc-conv-btn-blue" id="hc-h2g-btn">${_T('Hisoblash →','Ҳисоблаш →','Вычислить →','Calculate →')}</button>
    <div class="hc-conv-result" id="hc-h2g-res"></div>
  </div>
</div>`;
  }

  /* ══════════════════════════════════════════════
     DETAIL VIEW
  ══════════════════════════════════════════════ */
  function _buildDetail() {
    const ev = _selEvent;
    const g = _jdnToGregorian(_hijriToJdn(ev.hYear, ev.hMonth, ev.hDay));
    const milodiy = `${g.gDay} ${_gMonth(g.gMonth-1)} ${g.gYear}`;
    const hasRem = (_reminders[ev.id]||[]).length > 0;
    const bLabel = ev.type==='bayram'?_T('BAYRAM','БАЙРАМ','ПРАЗДНИК','HOLIDAY'):ev.type==='eng_muhim'?_T('ENG MUHIM','ЭНГ МУҲИМ','ОСОБО ВАЖНО','MOST IMPORTANT'):_T('MUHIM','МУҲИМ','ВАЖНО','IMPORTANT');
    const tabs = [
      { k:'asosiy',  l:'📋 ' + _T('Asosiy','Асосий','Основное','Main')   },
      { k:'amallar', l:'✅ ' + _T('Amallar','Амаллар','Действия','Actions') },
      ...(ev.quran ? [{ k:'quran', l:'📖 ' + _T("Qur'on","Қуръон","Коран",'Quran') }] : []),
      { k:'hadis',   l:'📚 ' + _T('Hadis','Ҳадис','Хадис','Hadith')     },
      { k:'duo',     l:'🤲 ' + _T('Duo','Дуо','Дуа','Dua')            },
    ];

    return `
<div class="hc-hdr">
  <div class="nm-tile-bg"></div>
  <div class="nm-tile-ov" style="background:rgba(9,18,31,0.65)"></div>
  <div class="hc-hdr-inner">
    <div class="hc-top-row">
      <button class="hc-back-btn" id="hc-det-back">← ${_T('Islomiy kunlar','Исломий кунлар','Исламские даты','Islamic dates')}</button>
      <button class="hc-remind-btn ${hasRem?'hc-remind-btn--active':''}" id="hc-remind-toggle">
        <span>🔔</span>
        <span>${hasRem ? `${(_reminders[ev.id]||[]).length} ${_T('ta','та','напом.','rem.')}` : _T('Eslatma','Эслатма','Напомн.','Remind')}</span>
      </button>
    </div>
    <div class="hc-det-top">
      <div class="hc-det-icon" style="background:${ev.color}18;border:1.5px solid ${ev.color}44;box-shadow:0 4px 16px ${ev.color}22">${ev.icon}</div>
      <div style="flex:1">
        <div style="margin-bottom:4px"><span class="hc-ev-badge" style="color:${ev.color};background:${ev.color}18;border:1px solid ${ev.color}35">${bLabel}</span></div>
        <div class="hc-det-name">${_evName(ev)}</div>
        <div style="font-family:'Amiri',serif;font-size:13px;color:${ev.color};line-height:1.4">${ev.arNomi}</div>
      </div>
    </div>
    <div class="hc-dates-grid">
      <div class="hc-date-cell hc-date-gold">
        <div class="hc-date-lbl">${_T('Hijriy','Ҳижрий','Хиджра','Hijri')}</div>
        <div style="font-family:'Amiri',serif;font-size:13px;color:#E8C15A;line-height:1.4">${ev.hDay} ${_hMonth(ev.hMonth-1)} ${ev.hYear}</div>
      </div>
      <div class="hc-date-cell hc-date-blue">
        <div class="hc-date-lbl">${_T('Milodiy','Милодий','Григ.','Gregorian')}</div>
        <div style="font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:700;color:#5b9bd5">${milodiy}</div>
      </div>
    </div>
    <div class="hc-det-tabs">
      ${tabs.map(t=>`<button class="hc-det-tab${_detailTab===t.k?' active':''}" data-dtab="${t.k}">${t.l}</button>`).join('')}
    </div>
  </div>
</div>
<div class="hc-body" id="hc-det-body">
  ${_buildDetailContent()}
</div>
<!-- Reminder modal -->
<div id="hc-modal" class="hc-modal-overlay" style="display:none">
  <div class="hc-modal" id="hc-modal-inner">
    <div class="hc-modal-title">🔔 ${_T("Eslatma qo'yish","Эслатма қўйиш","Добавить напоминание",'Add Reminder')}</div>
    <div class="hc-modal-sub">${_evName(ev)} · ${milodiy}</div>
    ${[
      {days:1,label:_T('1 kun oldin','1 кун олдин','За 1 день','1 day before'),icon:'🔔'},
      {days:3,label:_T('3 kun oldin','3 кун олдин','За 3 дня','3 days before'),icon:'📅'},
      {days:7,label:_T('1 hafta oldin','1 ҳафта олдин','За 1 неделю','1 week before'),icon:'📆'}
    ].map(opt => {
      const active = (_reminders[ev.id]||[]).includes(opt.days);
      return `<div class="hc-rem-opt ${active?'hc-rem-opt--active':''}" data-days="${opt.days}">
        <span>${opt.icon}</span>
        <span style="flex:1;font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:600;color:#e8dfc8">${opt.label}</span>
        <div class="hc-rem-check ${active?'hc-rem-check--active':''}">${active?'✓':''}</div>
      </div>`;
    }).join('')}
    <button class="hc-rem-save" id="hc-rem-save">✓ ${_T('Saqlash','Сақлаш','Сохранить','Save')}</button>
  </div>
</div>`;
  }

  function _buildDetailContent() {
    const ev = _selEvent;
    if (_detailTab === 'asosiy')  return _buildAsosiy(ev);
    if (_detailTab === 'amallar') return _buildAmallar(ev);
    if (_detailTab === 'quran')   return _buildQuran(ev);
    if (_detailTab === 'hadis')   return _buildHadis(ev);
    if (_detailTab === 'duo')     return _buildDuo(ev);
    return '';
  }

  /* ── Detail: Asosiy ── */
  function _buildAsosiy(ev) {
    const eslatmaHTML = ev.eslatma ? `
      <div class="hc-eslatma">
        <div class="hc-eslatma-lbl">⚠️ ${_T('MUHIM ESLATMA','МУҲИМ ЭСЛАТМА','ВАЖНОЕ ЗАМЕЧАНИЕ','IMPORTANT NOTE')}</div>
        <div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:rgba(232,223,200,.55);line-height:1.7;margin-bottom:8px">${_evTxt(ev,'eslatma')}</div>
      </div>` : '';
    return `
<div class="hc-det-content">
  <div class="hc-info-card">
    <div class="hc-slbl" style="margin-bottom:8px">${_T('QISQA TAVSIF','ҚИСҚА ТАВСИФ','КРАТКОЕ ОПИСАНИЕ','BRIEF DESCRIPTION')}</div>
    <div style="font-family:'Inter',system-ui,sans-serif;font-size:12px;color:rgba(232,223,200,.55);line-height:1.8">${_evTxt(ev,'qisqa')}</div>
  </div>
  <div class="hc-info-card hc-info-color" style="background:${ev.color}08;border-color:${ev.color}28">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${ev.color},transparent)"></div>
    <div class="hc-slbl" style="margin-bottom:8px">${_T('MUHIMLIGI','МУҲИМЛИГИ','ЗНАЧИМОСТЬ','SIGNIFICANCE')}</div>
    <div style="font-family:'Inter',system-ui,sans-serif;font-size:12px;color:rgba(232,223,200,.55);line-height:1.8">${_evTxt(ev,'muhim')}</div>
  </div>
  ${eslatmaHTML}
  <div class="hc-info-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px">
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:9px;color:rgba(232,223,200,.28)">${_T('Manba','Манба','Источник','Source')}</span>
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:10px;font-weight:700;color:rgba(232,223,200,.55)">${_T('Sahih hadislar va Islom fiqhi','Саҳиҳ ҳадислар ва Ислом фиқҳи','Достоверные хадисы и исламское право','Authentic hadiths and Islamic jurisprudence')}</span>
  </div>
</div>`;
  }

  /* ── Detail: Amallar ── */
  function _buildAmallar(ev) {
    return `
<div class="hc-det-content">
  <div class="hc-slbl">${_T('TAVSIYA ETILGAN AMALLAR','ТАВСИЯ ЭТИЛГАН АМАЛЛАР','РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ','RECOMMENDED ACTIONS')}</div>
  ${(ev.amallar_cyr && _lang==='uz_cyr' ? ev.amallar_cyr : ev.amallar).map((a, i) => `
    <div class="hc-amal-row">
      <div class="hc-amal-num" style="background:${ev.color}18;border:1px solid ${ev.color}35;color:${ev.color}">${i+1}</div>
      <span style="font-family:'Inter',system-ui,sans-serif;font-size:12px;color:#e8dfc8;line-height:1.4;font-weight:500">${_lang==='uz_cyr'&&!ev.amallar_cyr?_cy(a):a}</span>
    </div>`).join('')}
</div>`;
  }

  /* ── Detail: Qur'on ── */
  function _buildQuran(ev) {
    if (!ev.quran) return `<div class="hc-det-content"><div class="hc-slbl">${_T("Bu voqea uchun maxsus oyat yo'q","Бу воқеа учун махсус оят йўқ","Нет специального аята для этого события",'No specific verse for this event')}</div></div>`;
    return `
<div class="hc-det-content">
  <div class="hc-slbl">${_T("QUR'ON OYATI","ҚУРЪОН ОЯТИ","АЯТ КОРАНА",'QURAN VERSE')}</div>
  <div class="hc-verse-card">
    <div class="hc-verse-topline"></div>
    <div class="hc-ar-text" style="font-size:18px;padding:12px 14px;background:rgba(255,255,255,.03);border-radius:12px;margin-bottom:12px">${ev.quran.ar}</div>
    <div style="height:1px;background:rgba(232,193,90,.1);margin-bottom:12px"></div>
    <div style="font-family:'Inter',system-ui,sans-serif;font-style:italic;font-size:12px;color:rgba(232,223,200,.55);line-height:1.85;margin-bottom:12px">"${_evTxt(ev.quran,'uz')}"</div>
    <div class="hc-manba-row">
      <span>${_T('Manba','Манба','Источник','Source')}</span>
      <span style="color:#E8C15A">${ev.quran.manba}</span>
    </div>
  </div>
</div>`;
  }

  /* ── Detail: Hadis ── */
  function _buildHadis(ev) {
    const card = (h) => `
      <div class="hc-hadis-card">
        <div class="hc-ar-text" style="font-size:15px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:10px;margin-bottom:8px">${h.ar}</div>
        <div style="height:1px;background:rgba(232,193,90,.08);margin-bottom:8px"></div>
        <div style="font-family:'Inter',system-ui,sans-serif;font-style:italic;font-size:11px;color:rgba(232,223,200,.55);line-height:1.8;margin-bottom:10px">"${_evTxt(h,'uz')}"</div>
        <div class="hc-manba-row"><span>${_T('Manba','Манба','Источник','Source')}</span><span style="color:#E8C15A">${h.manba}</span></div>
      </div>`;
    return `
<div class="hc-det-content">
  <div class="hc-slbl">${_T('HADIS','ҲАДИС','ХАДИС','HADITH')}</div>
  ${card(ev.hadis)}
  ${ev.hadis2 ? card(ev.hadis2) : ''}
</div>`;
  }

  /* ── Detail: Duo ── */
  function _buildDuo(ev) {
    return `
<div class="hc-det-content">
  <div class="hc-slbl">${_T('TAVSIYA ETILGAN DUO','ТАВСИЯ ЭТИЛГАН ДУО','РЕКОМЕНДУЕМАЯ ДУА','RECOMMENDED DUA')}</div>
  <div class="hc-verse-card">
    <div class="hc-verse-topline"></div>
    <div class="hc-ar-text" style="font-size:18px;padding:12px 14px;background:rgba(255,255,255,.03);border-radius:12px;margin-bottom:10px">${ev.duo.ar}</div>
    ${ev.duo.tr ? `<div style="font-family:'Inter',system-ui,sans-serif;font-style:italic;font-size:10px;color:#E8C15A;line-height:1.7;margin-bottom:10px;padding:8px 10px;background:rgba(232,193,90,.05);border-radius:9px">${ev.duo.tr}</div>` : ''}
    <div style="height:1px;background:rgba(232,193,90,.1);margin-bottom:10px"></div>
    <div style="font-family:'Inter',system-ui,sans-serif;font-style:italic;font-size:12px;color:rgba(232,223,200,.55);line-height:1.85;margin-bottom:12px">"${_evTxt(ev.duo,'uz')}"</div>
    <div class="hc-manba-row"><span>${_T('Manba','Манба','Источник','Source')}</span><span style="color:#E8C15A">${ev.duo.manba}</span></div>
  </div>
</div>`;
  }

  /* ══════════════════════════════════════════════
     Event binding
  ══════════════════════════════════════════════ */
  function _bind() {
    /* Back */
    _el.querySelector('#hc-back')?.addEventListener('click', () => {
      window.App.navigate('screen-dashboard');
    });

    /* Month nav */
    _el.querySelector('#hc-prev')?.addEventListener('click', () => {
      _viewMonth--;
      if (_viewMonth < 1) { _viewMonth = 12; _viewYear--; }
      _selDay = (_viewYear===_today?.hYear && _viewMonth===_today?.hMonth) ? _today.hDay : 1;
      _el.innerHTML = _buildHTML(); _bind();
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
    _el.querySelector('#hc-next')?.addEventListener('click', () => {
      _viewMonth++;
      if (_viewMonth > 12) { _viewMonth = 1; _viewYear++; }
      _selDay = (_viewYear===_today?.hYear && _viewMonth===_today?.hMonth) ? _today.hDay : 1;
      _el.innerHTML = _buildHTML(); _bind();
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });

    /* Main tabs */
    _el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        const body = _el.querySelector('#hc-body');
        if (body) { body.innerHTML = _buildTabContent(); _bindTabExtras(); }
        _el.querySelectorAll('.hc-tab').forEach(b => b.classList.toggle('active', b.dataset.tab===_tab));
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });


    /* Detail: back */
    _el.querySelector('#hc-det-back')?.addEventListener('click', () => {
      _selEvent = null; _tab = 'islomiy';
      _el.innerHTML = _buildHTML(); _bind();
    });

    /* Detail: sub-tabs */
    _el.querySelectorAll('[data-dtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _detailTab = btn.dataset.dtab;
        const body = _el.querySelector('#hc-det-body');
        if (body) body.innerHTML = _buildDetailContent();
        _el.querySelectorAll('.hc-det-tab').forEach(b => b.classList.toggle('active', b.dataset.dtab===_detailTab));
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Reminder button */
    _el.querySelector('#hc-remind-toggle')?.addEventListener('click', () => {
      const modal = _el.querySelector('#hc-modal');
      if (modal) modal.style.display = 'flex';
    });

    /* Reminder modal: option toggle */
    _el.querySelectorAll('.hc-rem-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const days = parseInt(opt.dataset.days);
        const ev = _selEvent;
        if (!ev) return;
        const cur = _reminders[ev.id] || [];
        _reminders[ev.id] = cur.includes(days) ? cur.filter(d=>d!==days) : [...cur, days];
        _saveReminders();
        /* Update UI */
        opt.classList.toggle('hc-rem-opt--active', _reminders[ev.id].includes(days));
        const chk = opt.querySelector('.hc-rem-check');
        if (chk) {
          chk.classList.toggle('hc-rem-check--active', _reminders[ev.id].includes(days));
          chk.textContent = _reminders[ev.id].includes(days) ? '✓' : '';
        }
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Reminder modal: save */
    _el.querySelector('#hc-rem-save')?.addEventListener('click', () => {
      const modal = _el.querySelector('#hc-modal');
      if (modal) modal.style.display = 'none';
      /* Refresh button label */
      const btn = _el.querySelector('#hc-remind-toggle');
      if (btn && _selEvent) {
        const n = (_reminders[_selEvent.id]||[]).length;
        btn.innerHTML = `<span>🔔</span><span>${n > 0 ? `${n} ${_T('ta','та','напом.','rem.')}` : _T('Eslatma','Эслатма','Напомн.','Remind')}</span>`;
        btn.classList.toggle('hc-remind-btn--active', n > 0);
      }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });

    /* Modal backdrop click */
    _el.querySelector('#hc-modal')?.addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });

    _bindTabExtras();
  }

  function _bindTabExtras() {
    /* Event card clicks (Islomiy tab) */
    _el.querySelectorAll('[data-evid]').forEach(card => {
      card.addEventListener('click', () => {
        _selEvent = HIJRI_EVENTS.find(e => e.id === card.dataset.evid);
        _detailTab = 'asosiy';
        _el.innerHTML = _buildHTML(); _bind();
      });
    });

    /* Calendar day clicks (Taqvim tab) */
    _el.querySelectorAll('.hc-cell:not(.hc-cell-empty)').forEach(cell => {
      cell.addEventListener('click', () => {
        _selDay = parseInt(cell.dataset.d);
        const body = _el.querySelector('#hc-body');
        if (body) { body.innerHTML = _buildTaqvimTab(); _bindTabExtras(); }
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      });
    });

    /* Converter buttons */
    _el.querySelector('#hc-g2h-btn')?.addEventListener('click', () => {
      const y = parseInt(_el.querySelector('#hc-g-year')?.value||''), m = parseInt(_el.querySelector('#hc-g-month')?.value||''), d = parseInt(_el.querySelector('#hc-g-day')?.value||'');
      const res = _el.querySelector('#hc-g2h-res');
      if (!y||!m||!d||!res) return;
      try {
        const h = toHijri(y, m, d);
        res.innerHTML = `<span style="color:#E8C15A;font-size:17px;font-weight:800;font-family:'Amiri',serif">${h.hDay} ${_hMonth(h.hMonth-1)} ${h.hYear}</span>`;
      } catch { res.textContent = '❌'; }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
    _el.querySelector('#hc-h2g-btn')?.addEventListener('click', () => {
      const y = parseInt(_el.querySelector('#hc-h-year')?.value||''), m = parseInt(_el.querySelector('#hc-h-month')?.value||''), d = parseInt(_el.querySelector('#hc-h-day')?.value||'');
      const res = _el.querySelector('#hc-h2g-res');
      if (!y||!m||!d||!res) return;
      try {
        const g = _jdnToGregorian(_hijriToJdn(y, m, d));
        res.innerHTML = `<span style="color:#5b9bd5;font-size:17px;font-weight:800">${g.gDay} ${_gMonth(g.gMonth-1)} ${g.gYear}</span>`;
      } catch { res.textContent = '❌'; }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    });
  }

  /* ── Helper ── */
  function _mname(m) {
    const months = t('calendar_hijri_months', _lang);
    if (Array.isArray(months)) return months[(m || _viewMonth) - 1] || '';
    return OYLAR[(m || _viewMonth) - 1] || '';
  }

  return { render, load };
})();
