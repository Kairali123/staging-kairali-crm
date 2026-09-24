
export const LANGUAGES = {
  "EN": {
    "code": "EN",
    "label": "English"
  },
  "HI": {
    "code": "HI",
    "label": "हिन्दी"
  },
  "ML": {
    "code": "ML",
    "label": "മലയാളം"
  },
  "DE": {
    "code": "DE",
    "label": "Deutsch"
  },
  "RU": {
    "code": "RU",
    "label": "Русский"
  },
  "FR": {
    "code": "FR",
    "label": "Français"
  },
  "NL": {
    "code": "NL",
    "label": "Nederlands"
  },
  "ES": {
    "code": "ES",
    "label": "Español"
  },
  "AR": {
    "code": "AR",
    "label": "العربية"
  },
  "ZH": {
    "code": "ZH",
    "label": "中文"
  }
} as const;
export type Lang = keyof typeof LANGUAGES;

export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  "EN": {
    "tagline": "The Ayurvedic Healing Village",
    "feedback_title": "How Are We Doing?",
    "feedback_sub": "Share your experience. Your voice makes us better.",
    "btn_feedback": "Share Quick Feedback",
    "btn_rate": "Rate Your Journey",
    "btn_request": "Make a Request",
    "qr_title": "Riya Sharma AI",
    "qr_sub": "Scan to chat with our AI Guest Relations Manager on your personal device.",
    "slide_controls": "Slide"
  },
  "HI": {
    "tagline": "आयुर्वेदिक हीलिंग विलेज",
    "feedback_title": "आप कैसा महसूस कर रहे हैं?",
    "feedback_sub": "अपना अनुभव साझा करें। आपकी राय हमें बेहतर बनाती है।",
    "btn_feedback": "त्वरित प्रतिक्रिया दें",
    "btn_rate": "अपनी यात्रा को रेट करें",
    "btn_request": "अनुरोध करें",
    "qr_title": "रिया शर्मा AI",
    "qr_sub": "अपने फोन पर हमारे AI गेस्ट मैनेजर से चैट करने के लिए स्कैन करें।",
    "slide_controls": "स्लाइड"
  },
  "ML": {
    "tagline": "ആയുർവേദ ഹീലിംഗ് വില്ലേജ്",
    "feedback_title": "ഞങ്ങൾ എങ്ങനെ പ്രവർത്തിക്കുന്നു?",
    "feedback_sub": "നിങ്ങളുടെ അനുഭവം പങ്കിടുക. നിങ്ങളുടെ ശബ്ദം ഞങ്ങളെ മികച്ചതാക്കുന്നു.",
    "btn_feedback": "പെട്ടെന്നുള്ള ഫീഡ്‌ബാക്ക് പങ്കിടുക",
    "btn_rate": "നിങ്ങളുടെ യാത്ര റേറ്റ് ചെയ്യുക",
    "btn_request": "ഒരു അഭ്യർത്ഥന നടത്തുക",
    "qr_title": "റിയ ശർമ്മ AI",
    "qr_sub": "നിങ്ങളുടെ സ്വകാര്യ ഉപകരണത്തിൽ ഞങ്ങളുടെ AI ഗസ്റ്റ് റിലേഷൻസ് മാനേജറുമായി ചാറ്റ് ചെയ്യാൻ സ്കാൻ ചെയ്യുക.",
    "slide_controls": "സ്ലൈഡ്"
  },
  "DE": {
    "tagline": "Das Ayurvedische Heilungsdorf",
    "feedback_title": "Wie gefällt es Ihnen?",
    "feedback_sub": "Teilen Sie Ihre Erfahrungen. Ihr Feedback macht uns besser.",
    "btn_feedback": "Schnelles Feedback",
    "btn_rate": "Reise bewerten",
    "btn_request": "Anfrage stellen",
    "qr_title": "Riya Sharma KI",
    "qr_sub": "Scannen Sie, um mit unserem KI-Gästemanager zu chatten.",
    "slide_controls": "Folie"
  },
  "RU": {
    "tagline": "Аюрведическая деревня исцеления",
    "feedback_title": "Как у вас дела?",
    "feedback_sub": "Поделитесь своим опытом. Ваш отзыв делает нас лучше.",
    "btn_feedback": "Быстрый отзыв",
    "btn_rate": "Оценить поездку",
    "btn_request": "Сделать запрос",
    "qr_title": "Рия Шарма AI",
    "qr_sub": "Отсканируйте для чата с AI-менеджером.",
    "slide_controls": "Слайд"
  },
  "FR": {
    "tagline": "Le Village de Guérison Ayurvédique",
    "feedback_title": "Comment allons-nous ?",
    "feedback_sub": "Partagez votre expérience. Votre avis nous rend meilleurs.",
    "btn_feedback": "Partager un avis rapide",
    "btn_rate": "Évaluez votre séjour",
    "btn_request": "Faire une demande",
    "qr_title": "Riya Sharma IA",
    "qr_sub": "Scannez pour discuter avec notre gestionnaire IA.",
    "slide_controls": "Diapositive"
  },
  "NL": {
    "tagline": "Het Ayurvedische Genezingsdorp",
    "feedback_title": "Hoe doen we het?",
    "feedback_sub": "Deel uw ervaring. Uw stem maakt ons beter.",
    "btn_feedback": "Snel feedback delen",
    "btn_rate": "Beoordeel uw reis",
    "btn_request": "Een verzoek indienen",
    "qr_title": "Riya Sharma AI",
    "qr_sub": "Scan om te chatten met onze AI-manager.",
    "slide_controls": "Dia"
  },
  "ES": {
    "tagline": "La Aldea de Sanación Ayurvédica",
    "feedback_title": "¿Cómo lo estamos haciendo?",
    "feedback_sub": "Comparte tu experiencia. Tu voz nos hace mejores.",
    "btn_feedback": "Compartir comentarios rápidos",
    "btn_rate": "Califica tu viaje",
    "btn_request": "Hacer una solicitud",
    "qr_title": "Riya Sharma IA",
    "qr_sub": "Escanea para chatear con nuestro gerente de IA.",
    "slide_controls": "Diapositiva"
  },
  "AR": {
    "tagline": "قرية الشفاء الأيروفيدية",
    "feedback_title": "كيف نؤدي عملنا؟",
    "feedback_sub": "شارك تجربتك. صوتك يجعلنا أفضل.",
    "btn_feedback": "شارك تعليقات سريعة",
    "btn_rate": "قيم رحلتك",
    "btn_request": "قدم طلبا",
    "qr_title": "ريا شارما للذكاء الاصطناعي",
    "qr_sub": "امسح للتحدث مع مدير علاقات الضيوف الذكي.",
    "slide_controls": "شريحة"
  },
  "ZH": {
    "tagline": "阿育吠陀疗愈村",
    "feedback_title": "我们做得怎么样？",
    "feedback_sub": "分享您的体验。您的声音让我们做得更好。",
    "btn_feedback": "快速分享反馈",
    "btn_rate": "评价您的旅程",
    "btn_request": "提出请求",
    "qr_title": "Riya Sharma 人工智能",
    "qr_sub": "扫描以与我们的AI客户关系经理聊天。",
    "slide_controls": "幻灯片"
  }
};

export const KAIRALI_IMAGES = {
  hero:      "https://ayurvedichealingvillage.com/wp-content/uploads/2024/11/bg-1.jpg",
  therapy:   "https://ayurvedichealingvillage.com/wp-content/uploads/2025/01/Therapy.jpg",
  villa:     "https://ayurvedichealingvillage.com/wp-content/uploads/2025/01/Villa.jpg",
  yoga:      "https://ayurvedichealingvillage.com/wp-content/uploads/2025/01/Yoga1.jpg",
  resort:    "https://ayurvedichealingvillage.com/wp-content/uploads/2025/04/Kairali-Ayurvedic-Health-Resort.jpeg",
  food:      "https://ayurvedichealingvillage.com/wp-content/uploads/2024/11/5.jpg",
  legacy:    "https://ayurvedichealingvillage.com/wp-content/uploads/2024/11/bg-1.jpg", // placeholder, will re-use hero if needed
  riyaQr:    "/riya-sharma-qr.png",
};

export const KAIRALI_VIDEOS = {
  welcome: { id: "1s1gMtcpTME", start: 6 },
  village: { id: "1RWUh8QEIpE", start: 0 },
};

// Base definitions for 8 slides.
export const SLIDES = [
  {
    id: 1,
    image: KAIRALI_IMAGES.hero,
    title: { EN: "Welcome to", HI: "आपका स्वागत है", ML: "സ്വാഗതം", DE: "Willkommen in", RU: "Добро пожаловать в", FR: "Bienvenue au", NL: "Welkom in", ES: "Bienvenido a", AR: "مرحبا بكم في", ZH: "欢迎来到" },
    highlight: { EN: "God's Own Country.", HI: "ईश्वर के अपने देश में।", ML: "ദൈവത്തിന്റെ സ്വന്തം നാട്ടിലേക്ക്.", DE: "Gottes eigenem Land.", RU: "Землю Бога.", FR: "Pays de Dieu.", NL: "Gods eigen land.", ES: "El país de Dios.", AR: "بلد الله.", ZH: "上帝的国度。" },
    subtitle: { 
      EN: "Your journey to holistic wellness begins here.", 
      HI: "आपकी समग्र भलाई की यात्रा यहाँ से शुरू होती है।", 
      ML: "നിങ്ങളുടെ ആരോഗ്യയാത്ര ഇവിടെ തുടങ്ങുന്നു.", 
      DE: "Ihre Reise zum ganzheitlichen Wohlbefinden beginnt hier.", 
      RU: "Ваше путешествие к целостному благополучию начинается здесь.",
      FR: "Votre voyage vers le bien-être holistique commence ici.",
      NL: "Uw reis naar holistisch welzijn begint hier.",
      ES: "Su viaje hacia el bienestar holístico comienza aquí.",
      AR: "رحلتك إلى العافية الشاملة تبدأ هنا.",
      ZH: "您的整体健康之旅从这里开始。" 
    },
    showVideo: true, videoId: KAIRALI_VIDEOS.welcome.id, videoStart: KAIRALI_VIDEOS.welcome.start,
  },
  {
    id: 2,
    image: KAIRALI_IMAGES.therapy,
    title: { EN: "NABH Accredited", HI: "NABH प्रमाणित", ML: "NABH അംഗീകൃത", DE: "NABH Akkreditiert", RU: "Аккредитация NABH", FR: "Accrédité NABH", NL: "NABH Geaccrediteerd", ES: "Acreditado por NABH", AR: "معتمد من NABH", ZH: "NABH 认证" },
    highlight: { EN: "Ayurvedic Hospital.", HI: "आयुर्वेदिक अस्पताल।", ML: "ആയുർവേദ ആശുപത്രി.", DE: "Ayurveda-Krankenhaus.", RU: "Аюрведическая больница.", FR: "Hôpital Ayurvédique.", NL: "Ayurvedisch Ziekenhuis.", ES: "Hospital Ayurvédico.", AR: "مستشفى الأيورفيدا.", ZH: "阿育吠陀医院。" },
    subtitle: { 
      EN: "Experience clinical Ayurveda supervised by expert doctors. As an NABH accredited hospital, we uphold the highest international standards of care.", 
      HI: "विशेषज्ञ डॉक्टरों द्वारा पर्यवेक्षित नैदानिक आयुर्वेद का अनुभव करें।", 
      ML: "വിദഗ്ദ്ധ ഡോക്ടർമാരുടെ കീഴിൽ ക്ലിനിക്കൽ ആയുർവേദം അനുഭവിക്കുക.", 
      DE: "Erleben Sie klinisches Ayurveda unter der Aufsicht von Experten.", 
      RU: "Испытайте клиническую Аюрведу под наблюдением экспертов.",
      FR: "Découvrez l'Ayurveda clinique supervisé par des médecins experts.",
      NL: "Ervaar klinische Ayurveda onder toezicht van deskundige artsen.",
      ES: "Experimente el Ayurveda clínico supervisado por médicos expertos.",
      AR: "جرب الأيورفيدا السريرية تحت إشراف أطباء خبراء.",
      ZH: "体验由专家医生监督的临床阿育吠陀。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
  {
    id: 3,
    image: KAIRALI_IMAGES.villa,
    title: { EN: "Luxury in", HI: "विलासिता", ML: "ആഡംബരം", DE: "Luxus in", RU: "Роскошь в", FR: "Luxe en", NL: "Luxe in", ES: "Lujo en", AR: "الفخامة في", ZH: "奢华于" },
    highlight: { EN: "Harmony with Nature.", HI: "प्रकृति के साथ सामंजस्य।", ML: "പ്രകൃതിയോടിണങ്ങി.", DE: "Harmonie mit der Natur.", RU: "Гармонии с природой.", FR: "Harmonie avec la nature.", NL: "Harmonie met de natuur.", ES: "Armonía con la naturaleza.", AR: "انسجام مع الطبيعة.", ZH: "与自然和谐相处。" },
    subtitle: { 
      EN: "Retreat into our award-winning wellness villas, intricately designed according to Vaastu principles for ultimate serenity.", 
      HI: "हमारे पुरस्कार विजेता वेलनेस विलाओं में आराम करें।", 
      ML: "വാസ്തു പ്രകാരം രൂപകല്പന ചെയ്ത ഞങ്ങളുടെ വെൽനെസ് വില്ലകളിൽ വിശ്രമിക്കുക.", 
      DE: "Rückzug in unsere preisgekrönten Wellness-Villen.", 
      RU: "Отдохните в наших отмеченных наградами виллах.",
      FR: "Retirez-vous dans nos villas de bien-être primées.",
      NL: "Trek u terug in onze bekroonde wellnessvilla's.",
      ES: "Refúgiese en nuestras galardonadas villas de bienestar.",
      AR: "تراجع إلى فيلات العافية الحائزة على جوائز.",
      ZH: "在我们屡获殊荣的健康别墅中休憩。" 
    },
    showVideo: true, videoId: KAIRALI_VIDEOS.village.id, videoStart: KAIRALI_VIDEOS.village.start,
  },
  {
    id: 4,
    image: KAIRALI_IMAGES.food,
    title: { EN: "Nourish Your", HI: "पोषण करें", ML: "പോഷിപ്പിക്കുക", DE: "Nähren Sie", RU: "Питайте", FR: "Nourrissez votre", NL: "Voed uw", ES: "Nutre tu", AR: "غذي", ZH: "滋养您的" },
    highlight: { EN: "Body and Spirit.", HI: "शरीर और आत्मा को।", ML: "ശരീരവും മനസ്സും.", DE: "Körper und Geist.", RU: "Тело и дух.", FR: "Corps et Esprit.", NL: "Lichaam en Geest.", ES: "Cuerpo y Espíritu.", AR: "الجسد والروح.", ZH: "身体和精神。" },
    subtitle: { 
      EN: "Savor exquisite, farm-to-table Ayurvedic cuisine, customized to balance your unique wellness profile.", 
      HI: "खेत से मेज तक आयुर्वेदिक भोजन का आनंद लें।", 
      ML: "നിങ്ങളുടെ ആരോഗ്യത്തിന് അനുയോജ്യമായ ആയുർവേദ ഭക്ഷണങ്ങൾ ആസ്വദിക്കുക.", 
      DE: "Genießen Sie exquisite ayurvedische Küche.", 
      RU: "Наслаждайтесь изысканной аюрведической кухней.",
      FR: "Savourez une cuisine ayurvédique exquise.",
      NL: "Geniet van voortreffelijke Ayurvedische gerechten.",
      ES: "Saboree la exquisita cocina ayurvédica.",
      AR: "تذوق المأكولات الأيروفيدية الرائعة.",
      ZH: "品尝精致的阿育吠陀美食。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
  {
    id: 5,
    image: KAIRALI_IMAGES.resort,
    title: { EN: "115 Years of", HI: "115 वर्षों की", ML: "115 വർഷത്തെ", DE: "115 Jahre", RU: "115 лет", FR: "115 Ans de", NL: "115 Jaar", ES: "115 Años de", AR: "115 عامًا من", ZH: "115 年的" },
    highlight: { EN: "Ayurvedic Legacy.", HI: "आयुर्वेदिक विरासत।", ML: "ആയുർവേദ പാരമ്പര്യം.", DE: "Ayurveda-Erbe.", RU: "Аюрведического наследия.", FR: "Héritage Ayurvédique.", NL: "Ayurvedische Erfenis.", ES: "Legado Ayurvédico.", AR: "إرث الأيورفيدا.", ZH: "阿育吠陀遗产。" },
    subtitle: { 
      EN: "From Kairali Ayurvedic Products to global centers and Villa Raag, our legacy spans 115 years of authentic healing.", 
      HI: "115 वर्षों से प्रामाणिक उपचार की हमारी विरासत।", 
      ML: "115 വർഷത്തെ പാരമ്പര്യമുള്ള യഥാർത്ഥ ചികിത്സ.", 
      DE: "Unsere Tradition umfasst 115 Jahre authentischer Heilung.", 
      RU: "Наше наследие охватывает 115 лет подлинного исцеления.",
      FR: "Notre héritage s'étend sur 115 ans de guérison authentique.",
      NL: "Onze erfenis omvat 115 jaar authentieke genezing.",
      ES: "Nuestro legado abarca 115 años de curación auténtica.",
      AR: "يمتد إرثنا إلى 115 عامًا من الشفاء الأصيل.",
      ZH: "我们的遗产涵盖了 115 年的真实疗愈。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
  {
    id: 6,
    image: KAIRALI_IMAGES.hero,
    title: { EN: "Global Presence &", HI: "वैश्विक उपस्थिति", ML: "ആഗോള സാന്നിധ്യം", DE: "Globale Präsenz", RU: "Глобальное присутствие", FR: "Présence Mondiale", NL: "Wereldwijde Aanwezigheid", ES: "Presencia Global", AR: "التواجد العالمي", ZH: "全球业务" },
    highlight: { EN: "Kairali Group.", HI: "कैराली समूह।", ML: "കൈരളി ഗ്രൂപ്പ്.", DE: "Kairali Gruppe.", RU: "Группа Кайрали.", FR: "Groupe Kairali.", NL: "Kairali Groep.", ES: "Grupo Kairali.", AR: "مجموعة كايرالي.", ZH: "Kairali 集团。" },
    subtitle: { 
      EN: "With 35+ centers, expansive franchise networks, and expert training academies, we bring Ayurveda to the world.", 
      HI: "35+ केंद्रों और विशेषज्ञ प्रशिक्षण के साथ, हम आयुर्वेद को दुनिया तक लाते हैं।", 
      ML: "35-ൽ അധികം കേന്ദ്രങ്ങളിലൂടെ ഞങ്ങൾ ആയുർവേദം ലോകമെമ്പാടും എത്തിക്കുന്നു.", 
      DE: "Mit über 35 Zentren bringen wir Ayurveda in die Welt.", 
      RU: "Имея более 35 центров, мы несем Аюрведу в мир.",
      FR: "Avec plus de 35 centres, nous apportons l'Ayurveda au monde.",
      NL: "Met meer dan 35 centra brengen wij Ayurveda naar de wereld.",
      ES: "Con más de 35 centros, llevamos el Ayurveda al mundo.",
      AR: "مع أكثر من 35 مركزًا، ننقل الأيورفيدا إلى العالم.",
      ZH: "拥有 35 个以上的中心，我们将阿育吠陀推向世界。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
  {
    id: 7,
    image: KAIRALI_IMAGES.therapy,
    title: { EN: "Excellence &", HI: "उत्कृष्टता और", ML: "മികവും", DE: "Exzellenz &", RU: "Совершенство и", FR: "Excellence &", NL: "Excellentie &", ES: "Excelencia y", AR: "التميز و", ZH: "卓越与" },
    highlight: { EN: "Giving Back.", HI: "समाज सेवा।", ML: "സാമൂഹിക സേവനവും.", DE: "Etwas zurückgeben.", RU: "Отдача.", FR: "Redonner.", NL: "Teruggeven.", ES: "Devolviendo.", AR: "العطاء.", ZH: "回馈社会。" },
    subtitle: { 
      EN: "Recognized by World Travel Awards. Deeply committed to CSR through local empowerment, education, and sustainable organic farming.", 
      HI: "विश्व यात्रा पुरस्कारों द्वारा मान्यता प्राप्त और सीएसआर के लिए प्रतिबद्ध।", 
      ML: "ലോക ട്രാവൽ അവാർഡുകൾ നേടിയതും സാമൂഹിക സേവനത്തിന് പ്രതിജ്ഞാബദ്ധവുമാണ്.", 
      DE: "Anerkannt durch World Travel Awards. Engagiert für CSR.", 
      RU: "Признано World Travel Awards. Глубокая приверженность КСО.",
      FR: "Reconnu par les World Travel Awards. Profondément engagé dans la RSE.",
      NL: "Erkend door de World Travel Awards. Diep toegewijd aan CSR.",
      ES: "Reconocido por los World Travel Awards. Comprometido con la RSE.",
      AR: "معترف بها من قبل جوائز السفر العالمية. ملتزمون بالمسؤولية الاجتماعية للشركات.",
      ZH: "荣获世界旅游大奖认可。致力于企业社会责任。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
  {
    id: 8,
    image: KAIRALI_IMAGES.yoga,
    title: { EN: "At Your", HI: "आपकी", ML: "നിങ്ങളുടെ", DE: "Zu Ihren", RU: "К вашим", FR: "À Votre", NL: "Tot Uw", ES: "A Su", AR: "في", ZH: "随时" },
    highlight: { EN: "Service, Always.", HI: "सेवा में, हमेशा।", ML: "സേവനത്തിൽ.", DE: "Diensten, stets.", RU: "Услугам, всегда.", FR: "Service, Toujours.", NL: "Dienst, Altijd.", ES: "Servicio, Siempre.", AR: "خدمتك دائمًا.", ZH: "为您服务。" },
    subtitle: { 
      EN: "Connect instantly with Riya Sharma, your personal AI Guest Relations Manager. We are here to fulfill your every request.", 
      HI: "रिया शर्मा AI से तुरंत जुड़ें।", 
      ML: "റിയ ശർമ്മ AI-യുമായി ബന്ധപ്പെടുക.", 
      DE: "Verbinden Sie sich sofort mit Riya Sharma, Ihrem KI-Manager.", 
      RU: "Мгновенно свяжитесь с Рия Шарма.",
      FR: "Connectez-vous avec Riya Sharma, votre gestionnaire IA.",
      NL: "Maak direct verbinding met Riya Sharma, uw AI-manager.",
      ES: "Conéctese con Riya Sharma, su gerente de IA.",
      AR: "تواصل مع ريا شارما، مدير الذكاء الاصطناعي.",
      ZH: "立即与您的AI客户关系经理 Riya Sharma 联系。" 
    },
    showVideo: false, videoId: null, videoStart: 0,
  },
];

export const WIDGET_DATA = {
  clock: {
    EN: { rec: "Reception Open 24/7", doc: "Doctor Consultations Available" },
    HI: { rec: "रिसेप्शन 24/7 खुला", doc: "डॉक्टर परामर्श उपलब्ध" },
    ML: { rec: "റിസപ്ഷൻ 24/7 തുറന്നിരിക്കുന്നു", doc: "ഡോക്ടർ കൺസൾട്ടേഷൻ ലഭ്യമാണ്" },
    DE: { rec: "Rezeption 24/7 geöffnet", doc: "Arztkonsultationen verfügbar" },
    RU: { rec: "Стойка регистрации 24/7", doc: "Консультации врача доступны" },
    FR: { rec: "Réception ouverte 24/7", doc: "Consultations médicales" },
    NL: { rec: "Receptie 24/7 geopend", doc: "Arts consulten beschikbaar" },
    ES: { rec: "Recepción abierta 24/7", doc: "Consultas médicas" },
    AR: { rec: "الاستقبال مفتوح 24/7", doc: "استشارات الطبيب متاحة" },
    ZH: { rec: "接待处 24/7 开放", doc: "提供医生咨询" },
  },
  badge: {
    EN: "Authentic Healing", HI: "प्रामाणिक उपचार", ML: "യഥാർത്ഥ ചികിത്സ", DE: "Authentische Heilung", RU: "Подлинное исцеление", FR: "Guérison Authentique", NL: "Authentieke Genezing", ES: "Curación Auténtica", AR: "الشفاء الأصيل", ZH: "真正的疗愈"
  },
  treatmentsTitle: {
    EN: "Prescribed Treatments", HI: "निर्धारित उपचार", ML: "നിർദ്ദേശിച്ച ചികിത്സകൾ", DE: "Verschriebene Behandlungen", RU: "Назначенные процедуры", FR: "Traitements prescrits", NL: "Voorgeschreven behandelingen", ES: "Tratamientos prescritos", AR: "العلاجات الموصوفة", ZH: "处方治疗"
  },
  villaStats: {
    EN: { size: "50", unit: "Acres", label1: "Lush Greenery", count: "30", label2: "Exclusive Villas" },
    HI: { size: "50", unit: "एकड़", label1: "हरी-भरी हरियाली", count: "30", label2: "विशेष विला" },
    ML: { size: "50", unit: "ഏക്കർ", label1: "പച്ചപ്പ്", count: "30", label2: "എക്സ്ക്ലൂസീവ് വില്ലകൾ" },
    DE: { size: "50", unit: "Morgen", label1: "Grünes Land", count: "30", label2: "Exklusive Villen" },
    RU: { size: "50", unit: "Акров", label1: "Зелени", count: "30", label2: "Эксклюзивных вилл" },
    FR: { size: "50", unit: "Acres", label1: "Verdure", count: "30", label2: "Villas Exclusives" },
    NL: { size: "50", unit: "Acres", label1: "Groen", count: "30", label2: "Exclusieve Villa's" },
    ES: { size: "50", unit: "Acres", label1: "Vegetación", count: "30", label2: "Villas Exclusivas" },
    AR: { size: "50", unit: "فدان", label1: "مساحات خضراء", count: "30", label2: "فيلات حصرية" },
    ZH: { size: "50", unit: "英亩", label1: "郁郁葱葱", count: "30", label2: "专属别墅" },
  },
  cuisine: {
    EN: { badge: "Chef's Special", title: "Sadhya Thali", desc: "A traditional feast balancing all six tastes for optimal digestion." },
    HI: { badge: "शेफ की विशेष", title: "साध्या थाली", desc: "इष्टतम पाचन के लिए सभी छह स्वादों को संतुलित करने वाली दावत।" },
    ML: { badge: "ഷെഫിന്റെ സ്പെഷ്യൽ", title: "സദ്യ", desc: "ആറ് രുചികളും സമന്വയിപ്പിച്ച പരമ്പരാഗത ഭക്ഷണം." },
    DE: { badge: "Spezialität des Küchenchefs", title: "Sadhya Thali", desc: "Ein traditionelles Festmahl zur optimalen Verdauung." },
    RU: { badge: "Фирменное блюдо", title: "Садхья Тали", desc: "Традиционный пир, сбалансированный для пищеварения." },
    FR: { badge: "Spécialité du chef", title: "Sadhya Thali", desc: "Un festin traditionnel pour une digestion optimale." },
    NL: { badge: "Specialiteit", title: "Sadhya Thali", desc: "Een traditioneel feestmaal voor optimale spijsvertering." },
    ES: { badge: "Especial del Chef", title: "Sadhya Thali", desc: "Un festín tradicional para una digestión óptima." },
    AR: { badge: "طبق الشيف", title: "ساديا ثالي", desc: "وليمة تقليدية لهضم مثالي." },
    ZH: { badge: "厨师特色", title: "Sadhya Thali", desc: "平衡六种味道的传统盛宴。" },
  },
  actions: {
    EN: ["Room Service", "Housekeeping", "Spa Booking", "Concierge"],
    HI: ["रूम सर्विस", "हाउसकीपिंग", "स्पा बुकिंग", "कंसीयर्ज"],
    ML: ["റൂം സർവീസ്", "ഹൗസ്കീപ്പിംഗ്", "സ്പാ ബുക്കിംഗ്", "സഹായം"],
    DE: ["Zimmerservice", "Zimmerreinigung", "Spa-Buchung", "Concierge"],
    RU: ["Обслуживание", "Уборка", "Бронирование Спа", "Консьерж"],
    FR: ["Service en chambre", "Ménage", "Réservation Spa", "Conciergerie"],
    NL: ["Roomservice", "Schoonmaak", "Spa boeken", "Receptie"],
    ES: ["Servicio a la hab.", "Limpieza", "Reserva de Spa", "Conserje"],
    AR: ["خدمة الغرف", "التنظيف", "حجز المنتجع", "الاستعلامات"],
    ZH: ["客房服务", "客房清洁", "水疗预订", "礼宾服务"],
  },
  legacy: {
    EN: [
      { title: "Kairali Ayurvedic Products", desc: "Authentic herbal remedies & oils" },
      { title: "Kairali Ayurvedic Center", desc: "35+ Global wellness centers" },
      { title: "Villa Raag", desc: "Ultra-luxury yoga retreat in Goa" },
      { title: "Training & Franchise", desc: "Empowering practitioners worldwide" }
    ],
    HI: [
      { title: "कैराली आयुर्वेदिक उत्पाद", desc: "प्रामाणिक हर्बल उपचार" },
      { title: "कैराली केंद्र", desc: "35+ वैश्विक वेलनेस केंद्र" },
      { title: "विला राग", desc: "गोवा में अल्ट्रा-लक्ज़री रिट्रीट" },
      { title: "प्रशिक्षण और फ्रेंचाइजी", desc: "दुनिया भर में सशक्तिकरण" }
    ],
    ML: [
      { title: "കൈരളി ഉൽപ്പന്നങ്ങൾ", desc: "യഥാർത്ഥ ആയുർവേദ മരുന്നുകൾ" },
      { title: "കൈരളി കേന്ദ്രം", desc: "35+ ആഗോള കേന്ദ്രങ്ങൾ" },
      { title: "വില്ല രാഗ്", desc: "ഗോവയിലെ ആഡംബര റിട്രീറ്റ്" },
      { title: "പരിശീലനം & ഫ്രാഞ്ചൈസി", desc: "ആഗോള തലത്തിൽ പരിശീലനം" }
    ],
    // For other languages just use English as a fallback to save space. We cast later.
  },
  awards: {
    EN: [
      { title: "World Travel Awards", desc: "India's Leading Resort" },
      { title: "NABH Accreditation", desc: "Hospital Quality Standards" },
      { title: "Green Leaf", desc: "Kerala Govt Certification" },
      { title: "Community CSR", desc: "Organic Farming & Women Empowerment" }
    ]
  }
};

export const getLegacy = (lang: Lang): { title: string; desc: string }[] => (WIDGET_DATA.legacy as any)[lang] ?? WIDGET_DATA.legacy.EN;
export const getAwards = (lang: Lang): { title: string; desc: string }[] => (WIDGET_DATA.awards as any)[lang] ?? WIDGET_DATA.awards.EN;

