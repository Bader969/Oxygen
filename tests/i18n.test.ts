import { describe, it, expect } from 'vitest';
import { dictionary } from '../src/lib/i18n';

describe('i18n Bilingual Integrity (Turkish & Arabic)', () => {
    const trKeys = Object.keys(dictionary.tr);
    const arKeys = Object.keys(dictionary.ar);

    it('has a extensive dictionary for both Turkish and Arabic', () => {
        expect(trKeys.length).toBeGreaterThan(150);
        expect(arKeys.length).toBeGreaterThan(150);
    });

    it('has 100% key parity between Turkish and Arabic (no missing keys)', () => {
        const missingInAr = trKeys.filter(k => !(k in dictionary.ar));
        const missingInTr = arKeys.filter(k => !(k in dictionary.tr));

        if (missingInAr.length > 0) {
            console.error('Keys in TR missing from AR:', missingInAr);
        }
        if (missingInTr.length > 0) {
            console.error('Keys in AR missing from TR:', missingInTr);
        }

        expect(missingInAr).toEqual([]);
        expect(missingInTr).toEqual([]);
    });

    it('contains non-empty strings for all translated values', () => {
        trKeys.forEach(k => {
            expect(dictionary.tr[k].trim()).not.toBe('');
            expect(dictionary.ar[k].trim()).not.toBe('');
        });
    });

    it('contains Arabic script characters for Arabic translations of major UI labels', () => {
        const sampleKeys = [
            'nav.dashboard',
            'nav.tickets',
            'nav.scanner',
            'nav.admin',
            'dash.welcome',
            'dash.openRepairs',
            'ticket.create',
            'status.pending'
        ];

        // Arabic Unicode range: \u0600-\u06FF
        const arabicRegex = /[\u0600-\u06FF]/;

        sampleKeys.forEach(k => {
            const arVal = dictionary.ar[k];
            expect(arVal).toBeDefined();
            expect(arabicRegex.test(arVal)).toBe(true);
        });
    });
});
