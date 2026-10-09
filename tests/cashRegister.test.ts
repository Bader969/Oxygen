import { describe, it, expect } from 'vitest';
import { calculateWorkshopPayment } from '../src/lib/cashRegister';

describe('Workshop Cash Register & Kapora Calculator', () => {
    it('calculates remaining balance correctly when deposit is paid', () => {
        const result = calculateWorkshopPayment(1500, 500, 500);
        expect(result.remaining).toBe(1000);
        expect(result.change).toBe(0);
        expect(result.isOverpaid).toBe(false);
        expect(result.isFullyPaid).toBe(false);
    });

    it('calculates change correctly when customer pays more than deposit', () => {
        const result = calculateWorkshopPayment(1200, 300, 500);
        expect(result.remaining).toBe(900);
        expect(result.change).toBe(200);
        expect(result.isOverpaid).toBe(true);
    });

    it('handles zero deposit (full payment upfront)', () => {
        const result = calculateWorkshopPayment(800, 0, 1000);
        expect(result.remaining).toBe(800);
        expect(result.change).toBe(200);
        expect(result.isFullyPaid).toBe(true);
    });

    it('marks as fully paid when deposit equals full repair cost', () => {
        const result = calculateWorkshopPayment(750, 750, 750);
        expect(result.remaining).toBe(0);
        expect(result.change).toBe(0);
        expect(result.isFullyPaid).toBe(true);
    });

    it('handles negative or invalid inputs gracefully', () => {
        const result = calculateWorkshopPayment(-500, -100, -50);
        expect(result.cost).toBe(0);
        expect(result.deposit).toBe(0);
        expect(result.paidAmount).toBe(0);
        expect(result.remaining).toBe(0);
        expect(result.change).toBe(0);
    });

    it('handles deposit exceeding total cost gracefully', () => {
        const result = calculateWorkshopPayment(500, 600, 600);
        expect(result.remaining).toBe(0);
        expect(result.isFullyPaid).toBe(true);
    });
});
