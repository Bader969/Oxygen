export interface StatusMeta {
    key: string;
    tr: string;
    ar: string;
    color: string;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    icon: string;
}

export const STATUS_CONFIG: Record<string, StatusMeta> = {
    pending: {
        key: 'pending',
        tr: 'Bekliyor',
        ar: 'قيد الانتظار',
        color: 'text-amber-400',
        bgClass: 'bg-amber-500/15',
        borderClass: 'border-amber-500/30',
        badgeClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        icon: 'hourglass_empty'
    },
    in_progress: {
        key: 'in_progress',
        tr: 'Onarımda',
        ar: 'قيد الإصلاح',
        color: 'text-primary',
        bgClass: 'bg-primary/15',
        borderClass: 'border-primary/30',
        badgeClass: 'text-primary bg-primary/15 border-primary/30',
        icon: 'build'
    },
    quality_check: {
        key: 'quality_check',
        tr: 'Kalite Kontrol',
        ar: 'فحص الجودة',
        color: 'text-blue-400',
        bgClass: 'bg-blue-500/15',
        borderClass: 'border-blue-500/30',
        badgeClass: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
        icon: 'verified_user'
    },
    ready_for_pickup: {
        key: 'ready_for_pickup',
        tr: 'Teslimata Hazır',
        ar: 'جاهز للتسليم',
        color: 'text-emerald-400',
        bgClass: 'bg-emerald-500/15',
        borderClass: 'border-emerald-500/30',
        badgeClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        icon: 'check_circle'
    },
    completed: {
        key: 'completed',
        tr: 'Teslim Edildi',
        ar: 'تم التسليم',
        color: 'text-slate-400',
        bgClass: 'bg-slate-500/15',
        borderClass: 'border-slate-500/30',
        badgeClass: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
        icon: 'archive'
    }
};

export function getStatusMeta(status: string): StatusMeta {
    return STATUS_CONFIG[status] || {
        key: status,
        tr: status,
        ar: status,
        color: 'text-slate-400',
        bgClass: 'bg-slate-500/15',
        borderClass: 'border-slate-500/30',
        badgeClass: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
        icon: 'help_outline'
    };
}

export function getStatusLabel(status: string, lang: string = 'tr'): string {
    const meta = STATUS_CONFIG[status];
    if (!meta) return status;
    return lang === 'ar' ? meta.ar : meta.tr;
}

export function getNextWorkflowStatus(status: string): string | null {
    const sequence = ['pending', 'in_progress', 'quality_check', 'ready_for_pickup', 'completed'];
    const idx = sequence.indexOf(status);
    if (idx >= 0 && idx < sequence.length - 1) {
        return sequence[idx + 1];
    }
    return null;
}

export function getStatusBadgeHtml(status: string, lang: string = 'tr'): string {
    const meta = getStatusMeta(status);
    const label = lang === 'ar' ? meta.ar : meta.tr;
    return `<span class="px-3 py-1 rounded-full text-xs font-bold border ${meta.badgeClass} inline-flex items-center gap-1.5 shadow-sm">
        <span class="w-2 h-2 rounded-full ${meta.badgeClass.split(' ')[0]} bg-current"></span>
        <span>${label}</span>
    </span>`;
}
