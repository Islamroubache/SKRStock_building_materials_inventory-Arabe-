/**
 * AI Analytics Utilities for Inventory Management
 */

// 1. Simple Moving Average (SMA)
export function movingAverage(values: number[], window: number): number[] {
    if (values.length < window) return [];
    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
        const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
    }
    return result;
}

// 2. Linear Regression Forecast
// Forecasts the value after 'periods' into the future based on historical data
export function forecastNextPeriod(history: number[], periods: number): number {
    const n = history.length;
    if (n < 2) return history[0] || 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += history[i];
        sumXY += i * history[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecastValue = intercept + slope * (n + periods - 1);
    return Math.max(0, forecastValue);
}

// 3. Demand Statistics
export function calculateDemandStats(movements: any[]) {
    if (movements.length === 0) return { avgDailySales: 0, peakDay: 'N/A', trend: 'stable' as const };

    const dailyUsage: Record<string, number> = {};
    movements.forEach(m => {
        const day = new Date(m.createdAt).toISOString().split('T')[0];
        dailyUsage[day] = (dailyUsage[day] || 0) + Math.abs(m.quantity);
    });

    const values = Object.values(dailyUsage);
    const avgDailySales = values.reduce((a, b) => a + b, 0) / (values.length || 1);

    let peakDay = 'N/A';
    let maxVal = -1;
    for (const [day, val] of Object.entries(dailyUsage)) {
        if (val > maxVal) {
            maxVal = val;
            peakDay = day;
        }
    }

    // Simple trend detection using first half vs second half
    const half = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const secondHalfAvg = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half || 1);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down';

    return { avgDailySales, peakDay, trend };
}

// 4. Reorder Point (ROP)
// ROP = (Average Daily Usage * Lead Time) + Safety Stock
export function calculateReorderPoint(avgDaily: number, leadTimeDays: number, safetyDays: number): number {
    return avgDaily * (leadTimeDays + safetyDays);
}

// 5. Economic Order Quantity (EOQ)
// EOQ = sqrt(2 * Annual Demand * Cost per Order / (Holding Cost % * Unit Cost))
export function calculateEOQ(annualDemand: number, orderCost: number, holdingCostPct: number, unitCost: number): number {
    if (unitCost <= 0) return 0;
    const numerator = 2 * annualDemand * orderCost;
    const denominator = (holdingCostPct / 100) * unitCost;
    return Math.round(Math.sqrt(numerator / denominator));
}

// 6. Arabic Number to Words (Tafqeet) - Re-exported/Consolidated here
export { numberToArabicWords } from './number-to-arabic-words';
