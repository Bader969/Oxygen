import { describe, it, expect } from 'vitest';
import { 
    STATUS_CONFIG, 
    getStatusLabel, 
    getStatusMeta, 
    getNextWorkflowStatus 
} from '../src/lib/statusConfig';

describe('Repair Status Workflow & Metadata', () => {
    const validStatuses = ['pending', 'in_progress', 'quality_check', 'ready_for_pickup', 'completed'];

    it('contains all 5 canonical statuses in STATUS_CONFIG', () => {
        validStatuses.forEach(status => {
            expect(STATUS_CONFIG[status]).toBeDefined();
            expect(STATUS_CONFIG[status].key).toBe(status);
            expect(STATUS_CONFIG[status].tr).toBeTruthy();
            expect(STATUS_CONFIG[status].ar).toBeTruthy();
            expect(STATUS_CONFIG[status].color).toBeTruthy();
            expect(STATUS_CONFIG[status].icon).toBeTruthy();
        });
    });

    it('returns valid localized status labels in Turkish and Arabic', () => {
        expect(getStatusLabel('pending', 'tr')).toBe('Bekliyor');
        expect(getStatusLabel('pending', 'ar')).toBe('قيد الانتظار');

        expect(getStatusLabel('in_progress', 'tr')).toBe('Onarımda');
        expect(getStatusLabel('in_progress', 'ar')).toBe('قيد الإصلاح');

        expect(getStatusLabel('quality_check', 'tr')).toBe('Kalite Kontrol');
        expect(getStatusLabel('quality_check', 'ar')).toBe('فحص الجودة');

        expect(getStatusLabel('ready_for_pickup', 'tr')).toBe('Teslimata Hazır');
        expect(getStatusLabel('ready_for_pickup', 'ar')).toBe('جاهز للتسليم');

        expect(getStatusLabel('completed', 'tr')).toBe('Teslim Edildi');
        expect(getStatusLabel('completed', 'ar')).toBe('تم التسليم');
    });

    it('falls back safely for unknown statuses', () => {
        expect(getStatusLabel('unknown_status', 'tr')).toBe('unknown_status');
        const meta = getStatusMeta('unknown_status');
        expect(meta.key).toBe('unknown_status');
    });

    it('progresses tickets through correct sequential workflow stages', () => {
        expect(getNextWorkflowStatus('pending')).toBe('in_progress');
        expect(getNextWorkflowStatus('in_progress')).toBe('quality_check');
        expect(getNextWorkflowStatus('quality_check')).toBe('ready_for_pickup');
        expect(getNextWorkflowStatus('ready_for_pickup')).toBe('completed');
        expect(getNextWorkflowStatus('completed')).toBeNull();
    });
});
