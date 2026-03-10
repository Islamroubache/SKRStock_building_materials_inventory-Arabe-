import { prisma } from './prisma';

/**
 * Calculates the status of an invoice based on total amount and paid amount.
 */
export function calculateInvoiceStatus(totalAmount: number, paidAmount: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
    if (paidAmount <= 0) return 'UNPAID';
    if (paidAmount >= totalAmount) return 'PAID';
    return 'PARTIAL';
}

/**
 * Fetches and calculates customer balance details.
 */
export async function getCustomerBalanceDetails(customerId: number) {
    // @ts-ignore - Bypass IDE cache issue
    const invoices = await prisma.invoice.findMany({
        where: { customerId, status: { in: ['UNPAID', 'PARTIAL'] } } as any,
        orderBy: { createdAt: 'asc' } as any
    });

    const totalDebt = invoices.reduce((sum, inv) => sum + (inv.total - (inv.paid || 0)), 0);
    const oldestUnpaid = invoices.length > 0 ? (invoices[0] as any).createdAt : null;

    // Check overdue (if dueDate exists and is past)
    const now = new Date();
    const overdueAmount = invoices.reduce((sum, inv) => {
        if ((inv as any).dueDate && new Date((inv as any).dueDate) < now) {
            return sum + (inv.total - (inv.paid || 0));
        }
        return sum;
    }, 0);

    return {
        totalDebt,
        oldestUnpaid,
        overdueAmount,
        unpaidCount: invoices.length
    };
}

/**
 * Validates if a new order fits within a customer's credit limit.
 */
export async function checkCreditLimit(customerId: number, orderTotal: number, initialPayment: number) {
    const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { creditLimit: true, balanceDue: true, type: true, name: true }
    });

    if (!customer) throw new Error('Customer not found');

    // For non-contractors or those without limits, always allowed (or handled differently)
    if (!customer.creditLimit) {
        return { allowed: true, currentDebt: customer.balanceDue, limit: null };
    }

    const newDebt = customer.balanceDue + (orderTotal - initialPayment);
    const allowed = newDebt <= customer.creditLimit;

    return {
        allowed,
        currentDebt: customer.balanceDue,
        newDebt,
        limit: customer.creditLimit,
        availableCredit: customer.creditLimit - customer.balanceDue,
        message: allowed
            ? 'الطلب ضمن حدود الائتمان المسموح بها'
            : `تنبيه: سيؤدي هذا الطلب إلى تجاوز حد الائتمان (${customer.creditLimit.toLocaleString()} دج). الحد المتبقي المتاح هو ${(customer.creditLimit - customer.balanceDue).toLocaleString()} دج.`
    };
}
