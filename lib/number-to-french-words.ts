export function numberToFrenchWords(n: number): string {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (n === 0) return 'zéro';

    function convert(num: number): string {
        if (num < 20) return units[num];
        if (num < 100) {
            const t = Math.floor(num / 10);
            const u = num % 10;
            if (t === 7 || t === 9) {
                return tens[t - 1] + (u === 1 ? ' et ' : '-') + convert(u + 10);
            }
            return tens[t] + (u === 1 ? ' et ' : (u > 0 ? '-' : '')) + units[u];
        }
        if (num < 1000) {
            const h = Math.floor(num / 100);
            const r = num % 100;
            const hStr = h === 1 ? 'cent' : units[h] + ' cent' + (r === 0 ? 's' : '');
            return hStr + (r > 0 ? ' ' + convert(r) : '');
        }
        if (num < 1000000) {
            const k = Math.floor(num / 1000);
            const r = num % 1000;
            const kStr = k === 1 ? 'mille' : convert(k) + ' mille';
            return kStr + (r > 0 ? ' ' + convert(r) : '');
        }
        if (num < 1000000000) {
            const m = Math.floor(num / 1000000);
            const r = num % 1000000;
            const mStr = convert(m) + ' million' + (m > 1 ? 's' : '');
            return mStr + (r > 0 ? ' ' + convert(r) : '');
        }
        return n.toString();
    }

    const whole = Math.floor(n);
    const result = convert(whole);
    return result.charAt(0).toUpperCase() + result.slice(1);
}
