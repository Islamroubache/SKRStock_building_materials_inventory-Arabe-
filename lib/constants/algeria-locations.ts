/**
 * Algerian Wilayas and Communes Data
 * Standard 58 Wilayas
 */

export interface Commune {
    name: string;
    arabicName: string;
}

export interface Wilaya {
    id: string;
    name: string;
    arabicName: string;
    communes: string[];
}

export const ALGERIA_LOCATIONS: Wilaya[] = [
    { id: "01", name: "Adrar", arabicName: "أدرار", communes: ["أدرار", "فنوغيل", "تمنطيط", "بودة", "أولاد أحمد تيمي"] },
    { id: "02", name: "Chlef", arabicName: "الشلف", communes: ["الشلف", "تنس", "بوقادير", "أولاد فارس"] },
    { id: "03", name: "Laghouat", arabicName: "الأغواط", communes: ["الأغواط", "قصر الحيران", "بني ناصر"] },
    { id: "04", name: "Oum El Bouaghi", arabicName: "أم البواقي", communes: ["أم البواقي", "عين البيضاء", "عين مليلة"] },
    { id: "05", name: "Batna", arabicName: "باتنة", communes: ["باتنة", "أريس", "بريكة", "مروانة"] },
    { id: "06", name: "Béjaïa", arabicName: "بجاية", communes: ["بجاية", "أميزور", "أوقاس", "خراطة"] },
    { id: "07", name: "Biskra", arabicName: "بسكرة", communes: ["بسكرة", "أولاد جلال", "طولقة", "سيدي عقبة"] },
    { id: "08", name: "Béchar", arabicName: "بشار", communes: ["بشار", "القنادسة", "تاغيت"] },
    { id: "09", name: "Blida", arabicName: "البليدة", communes: ["البليدة", "الأربعاء", "بوفاريك", "العفرون"] },
    { id: "10", name: "Bouira", arabicName: "البويرة", communes: ["البويرة", "الأخضرية", "سور الغزلان"] },
    { id: "11", name: "Tamanrasset", arabicName: "تمنراست", communes: ["تمنراست", "أبالسة", "عين صالح"] },
    { id: "12", name: "Tébessa", arabicName: "تبسة", communes: ["تبسة", "بئر العاتر", "الشريعة"] },
    { id: "13", name: "Tlemcen", arabicName: "تلمسان", communes: ["تلمسان", "مغنية", "سبدو"] },
    { id: "14", name: "Tiaret", arabicName: "تيارت", communes: ["تيارت", "السوقر", "فرندة"] },
    { id: "15", name: "Tizi Ouzou", arabicName: "تيزي وزو", communes: ["تيزي وزو", "عزازقة", "تيقزيرت"] },
    { id: "16", name: "Alger", arabicName: "الجزائر", communes: ["الجزائر الوسطى", "باب الوادي", "سيدي امحمد", "الحراش", "بئر مراد رايس", "الدوايرة", "زرالدة"] },
    { id: "17", name: "Djelfa", arabicName: "الجلفة", communes: ["الجلفة", "حاسي بحبح", "عين وسارة", "مسعد"] },
    { id: "18", name: "Jijel", arabicName: "جيجل", communes: ["جيجل", "الطاهير", "الميلية"] },
    { id: "19", name: "Sétif", arabicName: "سطيف", communes: ["سطيف", "العلمة", "بوقاعة", "عين أرنات"] },
    { id: "20", name: "Saïda", arabicName: "سعيدة", communes: ["سعيدة", "الحساسنة", "عين الحجر"] },
    { id: "21", name: "Skikda", arabicName: "سكيكدة", communes: ["سكيكدة", "عزابة", "القل"] },
    { id: "22", name: "Sidi Bel Abbès", arabicName: "سيدي بلعباس", communes: ["سيدي بلعباس", "تسالة", "سفيزف"] },
    { id: "23", name: "Annaba", arabicName: "عنابة", communes: ["عنابة", "الحجار", "البوني"] },
    { id: "24", name: "Guelma", arabicName: "قالمة", communes: ["قالمة", "هيليوبوليس", "بوشقوف"] },
    { id: "25", name: "Constantine", arabicName: "قسنطينة", communes: ["قسنطينة", "الخروب", "حامة بوزيان"] },
    { id: "26", name: "Médéa", arabicName: "المدية", communes: ["المدية", "قصر البخاري", "البرواقية"] },
    { id: "27", name: "Mostaganem", arabicName: "مستغانم", communes: ["مستغانم", "عين تادلس", "سيدي علي"] },
    { id: "28", name: "M'Sila", arabicName: "المسيلة", communes: [
        "المسيلة", "بوسعادة", "سيدي عيسى", "مقرة", "حمام الضلعة", "أولاد دراج", "تارمونت", 
        "سيدي هجرس", "خبانة", "المعاضيد", "أولاد منصور", "شلال", "أولاد عدي لقبال", 
        "بن سرور", "الحوامد", "أولاد سيدي إبراهيم", "تامسة", "عين الملح", "بلهيبة", "الزرزور"
    ] },
    { id: "29", name: "Mascara", arabicName: "معسكر", communes: ["معسكر", "سيق", "تغنيف"] },
    { id: "30", name: "Ouargla", arabicName: "ورقلة", communes: ["ورقلة", "حاسي مسعود", "تقرت"] },
    { id: "31", name: "Oran", arabicName: "وهران", communes: ["وهران", "السانية", "أرزيو", "عين الترك"] },
    { id: "32", name: "El Bayadh", arabicName: "البيض", communes: ["البيض", "بوقطب", "الأبيض سيدي الشيخ"] },
    { id: "33", name: "Illizi", arabicName: "إليزي", communes: ["إليزي", "جانت", "إن أميناس"] },
    { id: "34", name: "Bordj Bou Arréridj", arabicName: "برج بوعريريج", communes: ["برج بوعريريج", "رأس الوادي", "المنصورة"] },
    { id: "35", name: "Boumerdès", arabicName: "بومرداس", communes: ["بومرداس", "برج منايل", "دلس"] },
    { id: "36", name: "El Tarf", arabicName: "الطارف", communes: ["الطارف", "القالة", "الذرعان"] },
    { id: "37", name: "Tindouf", arabicName: "تندوف", communes: ["تندوف", "أم العسل"] },
    { id: "38", name: "Tissemsilt", arabicName: "تيسمسيلت", communes: ["تيسمسيلت", "لرجام", "ثنية الحد"] },
    { id: "39", name: "El Oued", arabicName: "الوادي", communes: ["الوادي", "قمار", "جامعة"] },
    { id: "40", name: "Khenchela", arabicName: "خنشلة", communes: ["خنشلة", "قايس", "ششار"] },
    { id: "41", name: "Souk Ahras", arabicName: "سوق أهراس", communes: ["سوق أهراس", "سدراتة", "مداوروش"] },
    { id: "42", name: "Tipaza", arabicName: "تيبازة", communes: ["تيبازة", "حجوط", "شيرشال", "القليعة"] },
    { id: "43", name: "Mila", arabicName: "ميلة", communes: ["ميلة", "شلغوم العيد", "فرجيوة"] },
    { id: "44", name: "Aïn Defla", arabicName: "عين الدفلى", communes: ["عين الدفلى", "خميس مليانة", "العطاف"] },
    { id: "45", name: "Naâma", arabicName: "النعامة", communes: ["النعامة", "مشرية", "عين الصفراء"] },
    { id: "46", name: "Aïn Témouchent", arabicName: "عين تموشنت", communes: ["عين تموشنت", "بني صاف", "حمام بوحجر"] },
    { id: "47", name: "Ghardaïa", arabicName: "غرداية", communes: ["غرداية", "متليلي", "القرارة"] },
    { id: "48", name: "Relizane", arabicName: "غليزان", communes: ["غليزان", "مازونة", "وادي ارهيو"] },
    { id: "49", name: "El M'Ghair", arabicName: "المغير", communes: ["المغير", "جامعة"] },
    { id: "50", name: "El Meniaa", arabicName: "المنيعة", communes: ["المنيعة", "حاسي الفحل"] },
    { id: "51", name: "Ouled Djellal", arabicName: "أولاد جلال", communes: ["أولاد جلال", "سيدي خالد"] },
    { id: "52", name: "Bordj Baji Mokhtar", arabicName: "برج باجي مختار", communes: ["برج باجي مختار"] },
    { id: "53", name: "Béni Abbès", arabicName: "بني عباس", communes: ["بني عباس", "كرزاز"] },
    { id: "54", name: "Timimoun", arabicName: "تيميمون", communes: ["تيميمون", "أوقروت"] },
    { id: "55", name: "Touggourt", arabicName: "تقرت", communes: ["تقرت", "تماسين"] },
    { id: "56", name: "Djanet", arabicName: "جانت", communes: ["جانت"] },
    { id: "57", name: "In Salah", arabicName: "عين صالح", communes: ["عين صالح"] },
    { id: "58", name: "In Guezzam", arabicName: "عين قزام", communes: ["عين قزام"] }
];
