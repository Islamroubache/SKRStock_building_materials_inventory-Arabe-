export function generateProductCode(lastId: number): string {
    const nextId = lastId + 1;
    return `PRD-${nextId.toString().padStart(4, '0')}`;
}

export type ExpiryStatus = 'none' | 'valid' | 'expiring' | 'expired';

export function getExpiryStatus(date: Date | string | null | undefined): ExpiryStatus {
    if (!date) return 'none';

    let expiry: Date;
    if (typeof date === 'string') {
        // Handle ISO strings (2026-03-09T...) or short dates (2026-03-09)
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        expiry = new Date(year, month - 1, day);
    } else {
        expiry = new Date(date);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (isNaN(expiry.getTime())) return 'none';

    // Correction for years like 0026
    if (expiry.getFullYear() < 100) {
        expiry.setFullYear(expiry.getFullYear() + 2000);
    }

    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'expiring';
    return 'valid';
}

export function getDaysRemaining(date: Date | string | null | undefined): number | null {
    if (!date) return null;

    let expiry: Date;
    if (typeof date === 'string') {
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        expiry = new Date(year, month - 1, day);
    } else {
        expiry = new Date(date);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (isNaN(expiry.getTime())) return null;

    if (expiry.getFullYear() < 100) {
        expiry.setFullYear(expiry.getFullYear() + 2000);
    }

    const diffTime = expiry.getTime() - now.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
