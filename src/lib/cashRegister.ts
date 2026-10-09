export interface PaymentCalculation {
    cost: number;
    deposit: number;
    remaining: number;
    paidAmount: number;
    change: number;
    isOverpaid: boolean;
    isFullyPaid: boolean;
}

/**
 * Pure calculation logic for workshop payments, kapora (deposit), and cash register change.
 */
export function calculateWorkshopPayment(
    cost: number, 
    deposit: number = 0, 
    paidAmount: number = 0
): PaymentCalculation {
    const validCost = Math.max(0, Number(cost) || 0);
    const validDeposit = Math.max(0, Number(deposit) || 0);
    const validPaid = Math.max(0, Number(paidAmount) || 0);
    
    // Remaining balance after deposit
    const remaining = Math.max(0, validCost - validDeposit);
    
    // If a deposit was requested, cashier collects deposit; otherwise cashier collects full cost
    const targetAmount = validDeposit > 0 ? validDeposit : validCost;
    const change = Math.max(0, validPaid - targetAmount);
    
    return {
        cost: validCost,
        deposit: validDeposit,
        remaining,
        paidAmount: validPaid,
        change,
        isOverpaid: validPaid > targetAmount,
        isFullyPaid: validDeposit >= validCost || (validDeposit === 0 && validPaid >= validCost)
    };
}
