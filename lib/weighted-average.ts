/**
 * Formula:
 * newAvg = (currentQty * currentAvgCost + newQty * newUnitCost) / (currentQty + newQty)
 */
export function calculateWeightedAverage(
    currentQty: number,
    currentAvgCost: number,
    newQty: number,
    newUnitCost: number
): number {
    const totalQty = currentQty + newQty;
    if (totalQty === 0) return newUnitCost;

    const totalCost = (currentQty * currentAvgCost) + (newQty * newUnitCost);
    const newAvg = totalCost / totalQty;

    // Round to 2 decimal places for currency
    return Math.round(newAvg * 100) / 100;
}
