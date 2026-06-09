/* Duas Collection — organized by category */
const DUAS_DATA = {
  morning: [
    {
      id: 'morning_1',
      arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      transliteration: "Asbahna wa asbahal mulku lillah, wal hamdu lillah, la ilaha illallahu wahdahu la sharika lah",
      translation: {
        en: "We have reached the morning and at this very time the dominion belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
        uz: "Biz ertalab turishdik va Allohning mulki ham ertalab turdi. Hamdu sano Allohga xosdir. Allohdan boshqa iloh yo'q, U yagona va sherigi yo'q.",
        ru: "Мы достигли утра, и всё царство принадлежит Аллаху. Вся хвала Аллаху. Нет бога, кроме Аллаха, Единого, без сотоварища.",
        ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ",
        tr: "Sabahladık, mülk de Allah'a sabahladı. Hamd Allah'a, Allah'tan başka ilah yoktur.",
      },
      source: "Abu Dawud"
    },
    {
      id: 'morning_2',
      arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
      transliteration: "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur",
      translation: {
        en: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
        uz: "Ey Alloh, Sening yordaming bilan ertalab turdik, Sening yordaming bilan kechga yetdik, Sening yordaming bilan yashaymiz, Sening yordaming bilan o'lamiz va Senga qaytish bor.",
        ru: "О Аллах, с Тобой мы встречаем утро и с Тобой вечер, с Тобой мы живём и с Тобой умираем, и к Тебе воскресение.",
        tr: "Allah'ım, seninle sabahladık, seninle akşamladık, seninle yaşar, seninle ölürüz.",
      },
      source: "Abu Dawud, Tirmidhi"
    },
    {
      id: 'morning_3',
      arabic: 'أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ — اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
      transliteration: "A'udhu billahi minash-shaytanir-rajim — Allahu la ilaha illa huwal-hayyul-qayyum",
      translation: {
        en: "I seek refuge in Allah from the accursed devil — Ayatul Kursi: Allah — there is no deity except Him, the Ever-Living, the Sustainer.",
        uz: "Men la'nati shaytonga qarshi Allohdan panoh tilayman — Oyatul Kursiy: Alloh — Undan boshqa iloh yo'q, U Tirik va Qayyum.",
        ru: "Прибегаю к Аллаху от проклятого шайтана — Аят аль-Курси: Аллах — нет бога кроме Него, Живого и Вечного.",
        tr: "Kovulmuş şeytandan Allah'a sığınırım — Ayetel Kürsi: Allah, ondan başka ilah yoktur, diri ve kayyumdur.",
      },
      source: "Quran 2:255 + Bukhari"
    },
    {
      id: 'morning_4',
      arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
      transliteration: "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana abduk, wa ana ala ahdika wa wa'dika mastata't",
      translation: {
        en: "O Allah, You are my Lord, none has the right to be worshipped except You, You created me and I am Your servant, and I abide to Your covenant and promise as best I can.",
        uz: "Ey Alloh, Sen mening Rabbimsan, Sendan boshqa hech qanday iloh yo'q. Sen meni yaratding va men Sening bandam, qo'limdan kelgancha Senga ahd va va'damda turaman.",
        ru: "О Аллах, Ты мой Господь, нет бога кроме Тебя, Ты создал меня и я Твой раб, и я придерживаюсь Твоего завета и обещания, насколько могу.",
      },
      source: "Bukhari — Sayyidul Istighfar"
    },
  ],
  evening: [
    {
      id: 'evening_1',
      arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      transliteration: "Amsayna wa amsal mulku lillah, wal hamdu lillah, la ilaha illallahu wahdahu la sharika lah",
      translation: {
        en: "We have reached the evening and at this very time the dominion belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah.",
        uz: "Biz kechga yetdik va Allohning mulki ham kechga yetdi. Hamdu sano Allohga. Allohdan boshqa hech qanday iloh yo'q.",
        ru: "Мы достигли вечера, и всё царство принадлежит Аллаху. Вся хвала Аллаху. Нет бога, кроме Аллаха.",
      },
      source: "Muslim"
    },
    {
      id: 'evening_2',
      arabic: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
      transliteration: "Allahumma inni amsaytu ushhiduka wa ushhidu hamalata arshik...",
      translation: {
        en: "O Allah, I have reached the evening and call on You to witness, and all Your angels and all Your creation, that You are Allah, there is none worthy of worship but You, and Muhammad ﷺ is Your servant and messenger.",
        uz: "Ey Alloh, men kechga yetdim va Seni, Arshingni ko'taruvchilarni, farishtalaringni va barcha maxluqlaringni guvoh qilaman: Sen Allohsan, Sendan boshqa iloh yo'q, Muhammad ﷺ esa Sening bandag va rasulingSan.",
        ru: "О Аллах, я достиг вечера и призываю Тебя в свидетели, и несущих Твой Трон, и Твоих ангелов, и всё Твоё создание: Ты Аллах, нет бога кроме Тебя.",
      },
      source: "Abu Dawud"
    },
  ],
  food: [
    {
      id: 'food_before',
      arabic: 'بِسْمِ اللَّهِ',
      transliteration: "Bismillah",
      translation: {
        en: "In the name of Allah.",
        uz: "Alloh nomi bilan.",
        ru: "Во имя Аллаха.",
        tr: "Allah'ın adıyla.",
        ar: "بِسْمِ اللَّهِ",
        de: "Im Namen Allahs.",
        fr: "Au nom d'Allah.",
        id: "Dengan nama Allah.",
        hi: "अल्लाह के नाम से।",
        ur: "اللہ کے نام سے۔",
      },
      source: "Bukhari, Muslim"
    },
    {
      id: 'food_after',
      arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
      transliteration: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
      translation: {
        en: "All praise is to Allah Who has given me this food and provided it for me, without any strength or power on my part.",
        uz: "Meni bu taom bilan rizqlantirgan Allohga hamd bo'lsin. U mening kuch-quvvatimdan hech narsasiz buni menga berdi.",
        ru: "Хвала Аллаху, Который накормил меня этой едой и даровал её мне без какой-либо силы с моей стороны.",
        tr: "Bu yemeği bana yediren ve rızık olarak veren, benden güç ve kuvvet olmaksızın Allah'a hamdolsun.",
      },
      source: "Abu Dawud, Tirmidhi"
    },
    {
      id: 'food_forgot',
      arabic: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ',
      transliteration: "Bismillahi awwalahu wa akhirah",
      translation: {
        en: "In the name of Allah at its beginning and at its end. (Said when one forgets to say Bismillah before eating)",
        uz: "Alloh nomi bilan, boshida ham, oxirida ham. (Ovqat yeyishdan avval Bismilloh deyishni unutib qolsa aytiladi)",
        ru: "Во имя Аллаха в его начале и конце. (Говорится, если забыл сказать Бисмилла в начале еды)",
      },
      source: "Abu Dawud, Tirmidhi"
    },
  ],
  travel: [
    {
      id: 'travel_vehicle',
      arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
      transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun",
      translation: {
        en: "Glory be to Him Who has subjected this to us, and we could never have it by our efforts. And to our Lord we shall return.",
        uz: "Buni bizga bo'ysundirgan Alloh muqaddasdir, biz bu narsani o'zimiz qo'lga kirita olmasdik. Biz albatta Robbimizga qaytuvchilarmiz.",
        ru: "Пречист Тот, Кто подчинил нам это, а сами мы не смогли бы его подчинить. Воистину, мы возвращаемся к нашему Господу.",
        tr: "Bunu bize musahhar kılan Allah'ı tesbih ederiz. Yoksa biz buna güç yetiremezdik. Şüphesiz biz Rabbimize döneceğiz.",
      },
      source: "Quran 43:13-14, Abu Dawud, Tirmidhi"
    },
    {
      id: 'travel_start',
      arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى',
      transliteration: "Allahumma inna nas'aluka fi safarina hadhal birra wat-taqwa, wa minal amali ma tarda",
      translation: {
        en: "O Allah, we ask You on this journey for goodness and piety, and for works that are pleasing to You.",
        uz: "Ey Alloh, bu safarimizda Senden yaxshilik va taqvoni va Senga yoqadigan amallarni so'raymiz.",
        ru: "О Аллах, мы просим Тебя в этом нашем путешествии о добродетели и богобоязненности, и о делах, которые Тебе угодны.",
      },
      source: "Muslim"
    },
  ],
  sleep: [
    {
      id: 'sleep_before',
      arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      transliteration: "Bismika Allahumma amutu wa ahya",
      translation: {
        en: "In Your name O Allah, I die and I live.",
        uz: "Ey Alloh, Sening isming bilan o'laman va yashayman.",
        ru: "С именем Твоим, о Аллах, я умираю и оживаю.",
        tr: "Allah'ım, senin isminle ölür ve yaşarım.",
      },
      source: "Bukhari"
    },
    {
      id: 'sleep_ayat',
      arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
      transliteration: "Allahumma qini adhabaka yawma tab'athu ibadak",
      translation: {
        en: "O Allah, protect me from Your punishment on the day You resurrect Your servants.",
        uz: "Ey Alloh, bandalaringni tiriltirgan kunda azobingdan meni asra.",
        ru: "О Аллах, защити меня от Твоего наказания в день, когда Ты воскресишь Своих рабов.",
      },
      source: "Abu Dawud, Tirmidhi"
    },
    {
      id: 'sleep_3qul',
      arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
      transliteration: "Qul huwallahu ahad — Qul a'udhu birabbil falaq — Qul a'udhu birabbin nas",
      translation: {
        en: "Recite Surah Al-Ikhlas, Al-Falaq, and An-Nas — then blow into your hands and wipe over your body (3 times).",
        uz: "Ikhlos, Falaq va Nos suralarini o'qib, ikki kaftingga puf, keyin tanangga surt (3 marta).",
        ru: "Прочитать суры Ихлас, Фалак и Нас, затем подуть в ладони и провести ими по телу (3 раза).",
      },
      source: "Bukhari"
    },
  ],
  mosque: [
    {
      id: 'mosque_enter',
      arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
      transliteration: "Allahumma iftah li abwaba rahmatik",
      translation: {
        en: "O Allah, open the gates of Your mercy for me.",
        uz: "Ey Alloh, menga rahmatIngning eshiklarini oching.",
        ru: "О Аллах, открой для меня врата Твоей милости.",
        tr: "Allah'ım, bana rahmet kapılarını aç.",
        ar: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
      },
      source: "Muslim"
    },
    {
      id: 'mosque_exit',
      arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
      transliteration: "Allahumma inni as'aluka min fadlik",
      translation: {
        en: "O Allah, I ask You for Your bounty.",
        uz: "Ey Alloh, men Sening fadlIngdan so'rayman.",
        ru: "О Аллах, я прошу Тебя о Твоей щедрости.",
        tr: "Allah'ım, senden fazlını dilerim.",
      },
      source: "Muslim"
    },
    {
      id: 'mosque_adhan',
      arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ',
      transliteration: "Allahumma rabba hadhihid-da'watit-tammah, was-salatil qa'imah, ati Muhammadanil wasilata wal fadilah",
      translation: {
        en: "O Allah, Lord of this perfect call and the prayer to be offered, grant Muhammad the privilege and the eminence.",
        uz: "Ey Alloh, bu mukammal da'vat va bo'lib o'tadigan namozning Rabbisi, Muhammadga (s.a.v.) vosila va afzallikni ber.",
        ru: "О Аллах, Господь этого совершенного призыва и предстоящей молитвы, даруй Мухаммаду привилегию и почёт.",
      },
      source: "Bukhari — after Adhan"
    },
  ],
  general: [
    {
      id: 'general_istighfar',
      arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
      transliteration: "Astaghfirullaha-l-'azima-l-ladhi la ilaha illa huwal-hayyul-qayyumu wa atubu ilayh",
      translation: {
        en: "I seek forgiveness from Allah the Mighty, Whom there is none worthy of worship except Him, the Living, the Eternal, and I repent to Him.",
        uz: "Men ulug' Allohdan mag'firat so'rayman, Undan boshqa ibodatga loyiq iloh yo'q, U Tirik va Qayyumdir, men Unga tavba qilaman.",
        ru: "Прошу прощения у Аллаха Великого, кроме Которого нет достойного поклонения, Живого, Вечного, и каюсь к Нему.",
        tr: "Kendisinden başka ilah olmayan, Hay ve Kayyum olan Allah-u Teala'dan mağfiret dilerim ve O'na tövbe ederim.",
      },
      source: "Abu Dawud, Tirmidhi"
    },
    {
      id: 'general_salawat',
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ',
      transliteration: "Allahumma salli ala Muhammadin wa ala ali Muhammad, kama sallayta ala Ibrahima wa ala ali Ibrahim",
      translation: {
        en: "O Allah, send prayers upon Muhammad and upon the family of Muhammad, as You sent prayers upon Ibrahim and upon the family of Ibrahim.",
        uz: "Ey Alloh, Muhammadga (s.a.v.) va uning oilasiga Ibrohim va uning oilasiga salavot yuborganingdek salavot yuber.",
        ru: "О Аллах, благослови Мухаммада и семью Мухаммада, как Ты благословил Ибрахима и семью Ибрахима.",
        tr: "Allah'ım, Muhammed'e ve âline, İbrahim'e ve âline salat ettiğin gibi salat et.",
      },
      source: "Bukhari, Muslim — Salawat Ibrahim"
    },
    {
      id: 'general_dua_qunut',
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",
      translation: {
        en: "Our Lord, give us good in this world and good in the Hereafter, and protect us from the torment of the Fire.",
        uz: "Ey Rabbimiz, bizga dunyoda ham yaxshilik ber, oxiratda ham yaxshilik ber, bizni do'zax azobidan asra.",
        ru: "Господь наш, дай нам добро в этом мире и добро в будущей жизни, и защити нас от мук Огня.",
        tr: "Rabbimiz bize dünyada güzellik, ahirette de güzellik ver ve bizi cehennem azabından koru.",
        ar: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        de: "Unser Herr, gib uns Gutes in dieser Welt und Gutes im Jenseits, und schütze uns vor der Qual des Feuers.",
        fr: "Notre Seigneur, accorde-nous le bien dans ce monde et le bien dans l'Au-delà, et protège-nous du supplice du Feu.",
        id: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat dan peliharalah kami dari siksa neraka.",
        hi: "ऐ अल्लाह, हमें दुनिया में भी भलाई दे और आखिरत में भी भलाई दे और हमें जहन्नम के अज़ाब से बचा।",
        ur: "اے ہمارے رب، ہمیں دنیا میں بھی بھلائی عطا فرما اور آخرت میں بھی بھلائی عطا فرما اور ہمیں جہنم کے عذاب سے بچا۔",
        kk: "Раббымыз, бізге дүниеде де, ахиретте де жақсылық бер, бізді тозақ азабынан сақта.",
        tg: "Парвардигоро, ба мо дар дунё некӣ ва дар охират некӣ де ва моро аз азоби дӯзах нигоҳ дор.",
        ky: "Эй Раббибиз, бизге дүйнөдө да, акыретте да жакшылык бер жана бизди тозоктун азабынан сакта.",
      },
      source: "Quran 2:201"
    },
    {
      id: 'general_stress',
      arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
      transliteration: "Hasbunallahu wa ni'mal wakil",
      translation: {
        en: "Allah is sufficient for us, and He is the Best Disposer of Affairs.",
        uz: "Alloh bizga yetarli va U eng yaxshi Vaqildir.",
        ru: "Достаточно нам Аллаха, и Он наилучший Покровитель.",
        tr: "Allah bize yeter. O ne güzel vekildir.",
        ar: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
      },
      source: "Quran 3:173, Bukhari"
    },
    {
      id: 'general_patience',
      arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ',
      transliteration: "Inna lillahi wa inna ilayhi raji'un",
      translation: {
        en: "Indeed, to Allah we belong and to Him we shall return.",
        uz: "Albatta, biz Allohning mulkimiz va albatta Unga qaytuvchilarmiz.",
        ru: "Воистину, мы принадлежим Аллаху и к Нему возвращаемся.",
        tr: "Şüphesiz biz Allah'a aidiz ve şüphesiz O'na döneceğiz.",
        ar: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
        de: "Wahrlich, wir gehören Allah und zu Ihm kehren wir zurück.",
        fr: "En vérité, nous appartenons à Allah et c'est vers Lui que nous retournerons.",
        id: "Sesungguhnya kami adalah milik Allah dan kepada-Nya kami kembali.",
        hi: "बेशक हम अल्लाह के लिए हैं और बेशक उसी की तरफ लौटने वाले हैं।",
        ur: "بیشک ہم اللہ کے لیے ہیں اور بیشک اسی کی طرف لوٹنے والے ہیں۔",
      },
      source: "Quran 2:156"
    },
  ]
};

const DUAS_CATEGORIES = ['morning','evening','food','travel','sleep','mosque','general'];
