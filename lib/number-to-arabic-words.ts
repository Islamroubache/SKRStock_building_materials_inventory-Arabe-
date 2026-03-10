/**
 * Utility to convert numbers to Arabic words (Tafqeet)
 * Specifically tailored for Algerian Dinars (DZD)
 */

export function numberToArabicWords(n: number): string {
    if (n === 0) return "صفر دينار جزائري";

    const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
    const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
    const thousands = ["", "ألف", "ألفان", "آلاف", "ألف"];

    function convertUnder1000(num: number): string {
        let res = "";
        const h = Math.floor(num / 100);
        const rem = num % 100;

        if (h > 0) {
            res += hundreds[h];
        }

        if (rem > 0) {
            if (res !== "") res += " و";
            if (rem < 20) {
                res += ones[rem];
            } else {
                const o = rem % 10;
                const t = Math.floor(rem / 10);
                if (o > 0) {
                    res += ones[o] + " و" + tens[t];
                } else {
                    res += tens[t];
                }
            }
        }
        return res;
    }

    let result = "";
    const thousandPart = Math.floor(n / 1000);
    const remainder = n % 1000;

    if (thousandPart > 0) {
        if (thousandPart === 1) result = "ألف";
        else if (thousandPart === 2) result = "ألفان";
        else if (thousandPart >= 3 && thousandPart <= 10) result = convertUnder1000(thousandPart) + " آلاف";
        else result = convertUnder1000(thousandPart) + " ألف";
    }

    if (remainder > 0) {
        if (result !== "") result += " و";
        result += convertUnder1000(remainder);
    }

    return result + " دينار جزائري لا غير";
}
