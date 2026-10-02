import { getRepairs, deleteRepair, updateRepair, markRepairDelivered } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { dictionary, applyTranslation } from './lib/i18n';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';

let repairsList: any[] = [];
let currentFilter: string = 'all';
let searchQuery: string = '';

function calculateMetrics() {
    const activeRepairs = repairsList.filter(r => r.status === 'pending' || r.status === 'in_progress' || r.status === 'quality_check');
    
    const now = Date.now();
    const urgentRepairs = repairsList.filter(r => {
        if (r.status === 'completed' || r.status === 'ready_for_pickup') return false;
        const isExpress = r.priority === 'express';
        const isOverdue = r.estimated_completion && new Date(r.estimated_completion).getTime() < now;
        return isExpress || isOverdue;
    });

    const expressCount = repairsList.filter(r => 
        (r.status === 'pending' || r.status === 'in_progress' || r.status === 'quality_check') && r.priority === 'express'
    ).length;

    const overdueCount = repairsList.filter(r => 
        (r.status === 'pending' || r.status === 'in_progress' || r.status === 'quality_check') && 
        r.estimated_completion && new Date(r.estimated_completion).getTime() < now
    ).length;

    const readyRepairs = repairsList.filter(r => r.status === 'ready_for_pickup');
    const readyTotalVal = readyRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);

    const warrantyRepairs = repairsList.filter(r => {
        if (!r.warranty_months || r.warranty_months <= 0) return false;
        const dateRef = r.completed_at || r.created_at;
        if (!dateRef) return false;
        const d = new Date(dateRef);
        const expiry = new Date(d);
        expiry.setMonth(expiry.getMonth() + r.warranty_months);
        return expiry.getTime() > now;
    });

    const today = new Date();
    const todayIncome = repairsList
        .filter(r => {
            if (r.status !== 'completed' || !r.completed_at) return false;
            const d = new Date(r.completed_at);
            return d.getDate() === today.getDate() && 
                   d.getMonth() === today.getMonth() && 
                   d.getFullYear() === today.getFullYear();
        })
        .reduce((sum, r) => sum + (r.cost || 0), 0);

    const pipelineValue = activeRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
        openCount: activeRepairs.length,
        urgentCount: urgentRepairs.length,
        expressCount,
        overdueCount,
        readyCount: readyRepairs.length,
        readyTotalVal,
        warrantyCount: warrantyRepairs.length,
        todayIncome,
        pipelineValue
    };
}

function renderKPIs() {
    const metrics = calculateMetrics();
    const lang = localStorage.getItem('appLang') || 'tr';
    const isAr = lang === 'ar';

    const elOpen = document.getElementById('metric-open');
    const elUrgent = document.getElementById('metric-urgent');
    const elUrgentSub = document.getElementById('metric-urgent-sub');
    const elReady = document.getElementById('metric-ready');
    const elReadyVal = document.getElementById('metric-ready-val');
    const elWarranty = document.getElementById('metric-warranty');
    const elIncome = document.getElementById('metric-income');
    const elPipeline = document.getElementById('metric-pipeline');

    if (elOpen) elOpen.textContent = metrics.openCount.toString();
    if (elUrgent) elUrgent.textContent = metrics.urgentCount.toString();
    if (elUrgentSub) {
        if (isAr) {
            elUrgentSub.textContent = `⚡ ${metrics.expressCount} عاجل • ⚠️ ${metrics.overdueCount} متأخر`;
        } else {
            elUrgentSub.textContent = `⚡ ${metrics.expressCount} ekspres • ⚠️ ${metrics.overdueCount} gecikmiş`;
        }
    }
    if (elReady) elReady.textContent = metrics.readyCount.toString();
    if (elReadyVal) {
        if (isAr) {
            elReadyVal.textContent = `تحصيل: ₺${metrics.readyTotalVal.toLocaleString('tr-TR')}`;
        } else {
            elReadyVal.textContent = `₺${metrics.readyTotalVal.toLocaleString('tr-TR')} tahsilat`;
        }
    }
    if (elWarranty) elWarranty.textContent = metrics.warrantyCount.toString();
    if (elIncome) elIncome.textContent = `₺${metrics.todayIncome.toLocaleString('tr-TR')}`;
    if (elPipeline) {
        if (isAr) {
            elPipeline.textContent = `قيد التنفيذ: ₺${metrics.pipelineValue.toLocaleString('tr-TR')}`;
        } else {
            elPipeline.textContent = `İş Hacmi: ₺${metrics.pipelineValue.toLocaleString('tr-TR')}`;
        }
    }
}

function renderPipeline() {
    const lang = localStorage.getItem('appLang') || 'tr';
    const isAr = lang === 'ar';

    const pending = repairsList.filter(r => r.status === 'pending').length;
    const inProgress = repairsList.filter(r => r.status === 'in_progress').length;
    const qc = repairsList.filter(r => r.status === 'quality_check').length;
    const ready = repairsList.filter(r => r.status === 'ready_for_pickup').length;
    const total = pending + inProgress + qc + ready;

    const elTotal = document.getElementById('pipeline-total-label');
    if (elTotal) {
        elTotal.textContent = isAr ? `الإجمالي: ${total} جهاز` : `Toplam ${total} Cihaz`;
    }

    const setElText = (id: string, text: string) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElText('pipe-count-pending', pending.toString());
    setElText('pipe-count-in_progress', inProgress.toString());
    setElText('pipe-count-quality_check', qc.toString());
    setElText('pipe-count-ready_for_pickup', ready.toString());

    // Update Bar Widths
    const getPct = (val: number) => total > 0 ? Math.max((val / total) * 100, val > 0 ? 5 : 0) : 25;
    const setWidth = (id: string, pct: number) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${pct}%`;
    };

    setWidth('pipe-bar-pending', getPct(pending));
    setWidth('pipe-bar-in_progress', getPct(inProgress));
    setWidth('pipe-bar-quality_check', getPct(qc));
    setWidth('pipe-bar-ready_for_pickup', getPct(ready));
}

function renderBrandDistribution() {
    const active = repairsList.filter(r => r.status === 'pending' || r.status === 'in_progress' || r.status === 'quality_check' || r.status === 'ready_for_pickup');
    const container = document.getElementById('brand-distribution-list');
    if (!container) return;

    if (active.length === 0) {
        container.innerHTML = `<div class="text-xs text-on-surface-variant text-center py-4">Henüz aktif cihaz yok</div>`;
        return;
    }

    const counts: Record<string, number> = {
        'Apple': 0,
        'Samsung': 0,
        'Xiaomi': 0,
        'Huawei': 0,
        'Diğer': 0
    };

    active.forEach(r => {
        const m = (r.device_model || '').toLowerCase();
        if (m.includes('iphone') || m.includes('ipad') || m.includes('mac') || m.includes('apple') || m.includes('watch')) {
            counts['Apple']++;
        } else if (m.includes('samsung') || m.includes('galaxy') || m.includes('note') || m.includes('ultra')) {
            counts['Samsung']++;
        } else if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco') || m.includes('mi ')) {
            counts['Xiaomi']++;
        } else if (m.includes('huawei') || m.includes('honor')) {
            counts['Huawei']++;
        } else {
            counts['Diğer']++;
        }
    });

    const brandColors: Record<string, string> = {
        'Apple': 'bg-slate-300 text-slate-300',
        'Samsung': 'bg-blue-400 text-blue-400',
        'Xiaomi': 'bg-amber-400 text-amber-400',
        'Huawei': 'bg-red-400 text-red-400',
        'Diğer': 'bg-emerald-400 text-emerald-400'
    };

    const sorted = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    container.innerHTML = sorted.map(([brand, count]) => {
        const pct = Math.round((count / active.length) * 100);
        const colClass = brandColors[brand] || 'bg-primary text-primary';
        const bgCol = colClass.split(' ')[0];
        return `
            <div class="flex flex-col gap-1">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-medium text-on-surface flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full ${bgCol}"></span>
                        <span>${brand}</span>
                    </span>
                    <span class="text-on-surface-variant font-mono text-[11px]">${count} (%${pct})</span>
                </div>
                <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div class="h-full ${bgCol} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTicketsList() {
    const listContainer = document.getElementById('recent-tickets-list');
    const countSub = document.getElementById('tickets-count-sub');
    if (!listContainer) return;

    const lang = localStorage.getItem('appLang') || 'tr';
    const isAr = lang === 'ar';
    const now = Date.now();

    // Filter tickets
    let filtered = repairsList.filter(ticket => {
        // Status / Category filter
        if (currentFilter === 'urgent') {
            const isExpress = ticket.priority === 'express';
            const isOverdue = ticket.estimated_completion && new Date(ticket.estimated_completion).getTime() < now && ticket.status !== 'ready_for_pickup' && ticket.status !== 'completed';
            if (!isExpress && !isOverdue) return false;
        } else if (currentFilter === 'in_progress') {
            if (ticket.status !== 'in_progress') return false;
        } else if (currentFilter === 'ready_for_pickup') {
            if (ticket.status !== 'ready_for_pickup') return false;
        } else if (currentFilter === 'pending') {
            if (ticket.status !== 'pending') return false;
        } else if (currentFilter === 'quality_check') {
            if (ticket.status !== 'quality_check') return false;
        } else if (currentFilter === 'warranty') {
            if (!ticket.warranty_months || ticket.warranty_months <= 0) return false;
            const refDate = ticket.completed_at || ticket.created_at;
            if (!refDate) return false;
            const exp = new Date(refDate);
            exp.setMonth(exp.getMonth() + ticket.warranty_months);
            if (exp.getTime() <= now) return false;
        }

        // Search query filter
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            const model = (ticket.device_model || '').toLowerCase();
            const issue = (ticket.issue_description || '').toLowerCase();
            const cust = (ticket.customers?.name || '').toLowerCase();
            const phone = (ticket.customers?.phone || '').toLowerCase();
            const id = (ticket.id || '').toLowerCase();
            const qr = (ticket.qr_hash || '').toLowerCase();
            if (!model.includes(q) && !issue.includes(q) && !cust.includes(q) && !phone.includes(q) && !id.includes(q) && !qr.includes(q)) {
                return false;
            }
        }

        return true;
    });

    // Update count subtitle
    if (countSub) {
        countSub.textContent = isAr 
            ? `المعروض: ${filtered.length} تذكرة` 
            : `Görüntülenen: ${filtered.length} talep`;
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">content_paste_off</span>
                <p class="text-sm font-medium text-on-surface-variant">${isAr ? 'لم يتم العثور على تذاكر مطابقة' : 'Aramaya uygun talep bulunamadı'}</p>
            </div>
        `;
        return;
    }

    // Sort: urgent tickets first, then newest
    filtered.sort((a, b) => {
        const aUrgent = (a.priority === 'express' || (a.estimated_completion && new Date(a.estimated_completion).getTime() < now && a.status !== 'ready_for_pickup' && a.status !== 'completed')) ? 1 : 0;
        const bUrgent = (b.priority === 'express' || (b.estimated_completion && new Date(b.estimated_completion).getTime() < now && b.status !== 'ready_for_pickup' && b.status !== 'completed')) ? 1 : 0;
        if (bUrgent !== aUrgent) return bUrgent - aUrgent;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const displayList = filtered.slice(0, 10);
    listContainer.innerHTML = '';

    const statusLabels: Record<string, Record<string, string>> = {
        'tr': { 'pending': 'Bekliyor', 'in_progress': 'Onarımda', 'quality_check': 'Kalite Kontrol', 'ready_for_pickup': 'Teslimata Hazır', 'completed': 'Teslim Edildi' },
        'ar': { 'pending': 'قيد الانتظار', 'in_progress': 'قيد الإصلاح', 'quality_check': 'فحص الجودة', 'ready_for_pickup': 'جاهز للتسليم', 'completed': 'تم التسليم' }
    };

    displayList.forEach(ticket => {
        const shortId = ticket.id.substring(0, 6).toUpperCase();
        let icon = 'smartphone';
        const modelLower = (ticket.device_model || '').toLowerCase();
        if (modelLower.includes('mac') || modelLower.includes('laptop')) {
            icon = 'laptop_mac';
        } else if (modelLower.includes('pad') || modelLower.includes('tablet')) {
            icon = 'tablet_mac';
        } else if (modelLower.includes('watch')) {
            icon = 'watch';
        }

        let statusClass = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        if (ticket.status === 'pending') {
            statusClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        } else if (ticket.status === 'in_progress') {
            statusClass = 'bg-primary/20 text-primary border-primary/30 animate-pulse';
        } else if (ticket.status === 'quality_check') {
            statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        } else if (ticket.status === 'ready_for_pickup') {
            statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        }

        const isExpress = ticket.priority === 'express';
        const isOverdue = ticket.estimated_completion && new Date(ticket.estimated_completion).getTime() < now && ticket.status !== 'ready_for_pickup' && ticket.status !== 'completed';
        
        let deadlineBadge = '';
        if (isExpress) {
            deadlineBadge += `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">⚡ ${isAr ? 'عاجل' : 'Ekspres'}</span>`;
        }
        if (isOverdue) {
            deadlineBadge += `<span class="bg-error/20 text-error border border-error/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-0.5">⚠️ ${isAr ? 'متأخر' : 'Gecikmiş'}</span>`;
        } else if (ticket.estimated_completion && ticket.status !== 'completed' && ticket.status !== 'ready_for_pickup') {
            const diffHours = Math.round((new Date(ticket.estimated_completion).getTime() - now) / (1000 * 60 * 60));
            if (diffHours > 0 && diffHours <= 24) {
                deadlineBadge += `<span class="bg-yellow-500/10 text-yellow-300/80 border border-yellow-500/20 text-[10px] px-2 py-0.5 rounded-full">⏱️ ${diffHours}s ${isAr ? 'متبقي' : 'kaldı'}</span>`;
            }
        }

        const statusText = statusLabels[lang]?.[ticket.status] || ticket.status;
        const customerName = ticket.customers?.name || (isAr ? 'عميل بدون اسم' : 'İsimsiz Müşteri');
        const costStr = ticket.cost ? `₺${ticket.cost.toLocaleString('tr-TR')}` : '—';

        const row = document.createElement('div');
        row.className = 'recent-ticket-row flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-black/30 rounded-xl border border-primary/5 hover:border-primary/25 transition-all duration-200 cursor-pointer gap-3';
        row.setAttribute('data-id', ticket.id);

        row.innerHTML = `
            <div class="flex items-start sm:items-center gap-3.5 min-w-0">
                <div class="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-base" data-icon="${icon}">${icon}</span>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-on-surface text-sm truncate">${ticket.device_model}</span>
                        ${deadlineBadge}
                    </div>
                    <p class="text-xs text-on-surface-variant truncate mt-0.5">${ticket.issue_description || (isAr ? 'لا يوجد وصف للإصلاح' : 'Onarım açıklaması yok')}</p>
                    <div class="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant/70">
                        <span class="font-mono text-primary/80">#TKT-${shortId}</span>
                        <span>•</span>
                        <span>${customerName}</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                <span class="font-mono font-bold text-xs text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">${costStr}</span>
                <span class="px-2.5 py-1 font-label-caps text-[11px] rounded-full border whitespace-nowrap ${statusClass}">${statusText}</span>

                <!-- Quick Action Buttons -->
                <div class="flex items-center gap-1">
                    ${ticket.customers?.phone ? `
                    <button type="button" class="quick-wa-btn p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 transition-colors" title="WhatsApp" data-id="${ticket.id}">
                        <span class="material-symbols-outlined text-sm">chat</span>
                    </button>` : ''}
                    <button type="button" class="quick-print-btn p-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-black text-primary transition-colors" title="${isAr ? 'طباعة' : 'Yazdır'}" data-id="${ticket.id}">
                        <span class="material-symbols-outlined text-sm">receipt_long</span>
                    </button>
                    <button type="button" class="p-1 text-on-surface-variant hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
                    </button>
                </div>
            </div>
        `;

        // Direct Row Click
        row.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.quick-wa-btn') || target.closest('.quick-print-btn')) return;
            openTicketModal(ticket.id);
        });

        // WhatsApp direct click
        row.querySelector('.quick-wa-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            sendWhatsAppNotification({
                customerName: ticket.customers?.name || 'Customer',
                customerPhone: ticket.customers?.phone,
                deviceModel: ticket.device_model,
                cost: ticket.cost,
                ticketId: ticket.id,
                status: ticket.status,
                lang
            });
        });

        // Print receipt direct click
        row.querySelector('.quick-print-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await openReceiptPreviewModal({
                ticketId: ticket.id,
                qrHash: ticket.qr_hash,
                customerName: ticket.customers?.name || 'Customer',
                customerPhone: ticket.customers?.phone,
                deviceModel: ticket.device_model,
                issueDescription: ticket.issue_description,
                cost: ticket.cost,
                priority: ticket.priority,
                createdAt: ticket.created_at,
                estimatedCompletion: ticket.estimated_completion,
                devicePasscode: ticket.device_passcode,
                intakeCondition: ticket.intake_condition,
                accessories: ticket.accessories,
                warrantyMonths: ticket.warranty_months,
                lang
            });
        });

        listContainer.appendChild(row);
    });
}

function renderMetricsAndTickets() {
    renderKPIs();
    renderPipeline();
    renderBrandDistribution();
    renderTicketsList();
}

function setupFiltersAndSearch() {
    // Search input
    const searchInput = document.getElementById('dashboard-search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = (e.target as HTMLInputElement).value;
            renderTicketsList();
        });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.dash-filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => {
                p.classList.remove('active', 'bg-primary', 'text-black');
                p.classList.add('bg-surface-container/60', 'text-on-surface-variant');
            });
            pill.classList.add('active', 'bg-primary', 'text-black');
            pill.classList.remove('bg-surface-container/60', 'text-on-surface-variant');

            currentFilter = pill.getAttribute('data-filter') || 'all';
            renderTicketsList();
        });
    });

    // KPI Cards as Quick Filters
    document.getElementById('card-filter-active')?.addEventListener('click', () => {
        setFilterPill('all');
    });
    document.getElementById('card-filter-urgent')?.addEventListener('click', () => {
        setFilterPill('urgent');
    });
    document.getElementById('card-filter-ready')?.addEventListener('click', () => {
        setFilterPill('ready_for_pickup');
    });
    document.getElementById('card-filter-warranty')?.addEventListener('click', () => {
        setFilterPill('warranty');
    });

    // Pipeline steps as Quick Filters
    document.querySelectorAll('.pipeline-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.getAttribute('data-status');
            if (status) {
                setFilterPill(status);
            }
        });
    });
}

function setFilterPill(filterName: string) {
    currentFilter = filterName;
    const filterPills = document.querySelectorAll('.dash-filter-pill');
    filterPills.forEach(p => {
        if (p.getAttribute('data-filter') === filterName) {
            p.classList.add('active', 'bg-primary', 'text-black');
            p.classList.remove('bg-surface-container/60', 'text-on-surface-variant');
        } else {
            p.classList.remove('active', 'bg-primary', 'text-black');
            p.classList.add('bg-surface-container/60', 'text-on-surface-variant');
        }
    });
    renderTicketsList();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        setupFiltersAndSearch();
        repairsList = await getRepairs();
        renderMetricsAndTickets();

        // Get user session details and render dynamic localized greeting
        const user = await checkAuthSession();
        let userName = '';
        if (user) {
            if (user.user_metadata?.name && user.user_metadata.name.trim() !== '') {
                userName = user.user_metadata.name.trim();
            } else if (user.email) {
                const emailPrefix = user.email.split('@')[0];
                userName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            }
        }

        const hours = new Date().getHours();
        let trGreeting: string;
        if (hours >= 5 && hours < 12) {
            trGreeting = 'Günaydın,';
        } else if (hours >= 12 && hours < 17) {
            trGreeting = 'Tünaydın,';
        } else {
            trGreeting = 'İyi akşamlar,';
        }

        const arGreeting = (hours >= 5 && hours < 12) ? 'صباح الخير،' : 'مساء الخير،';

        // Terminology: Uzman / خبير
        const trFinalName = userName || 'Uzman';
        const arFinalName = userName || 'خبير';

        dictionary['tr']['dash.welcome'] = `${trGreeting} ${trFinalName}`;
        dictionary['ar']['dash.welcome'] = `${arGreeting} ${arFinalName}`;

        const elWelcome = document.getElementById('welcome-greeting');
        if (elWelcome) {
            elWelcome.setAttribute('data-i18n', 'dash.welcome');
        }

        applyTranslation();

        // Admin check for Income card
        const elIncomeCard = document.getElementById('metric-income-card');
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
        if (elIncomeCard) {
            elIncomeCard.style.display = isAdmin ? 'flex' : 'none';
        }
    } catch (err) {
        console.error('Failed to load dashboard metrics', err);
    }
});

async function openTicketModal(ticketId: string) {
    try {
        let repair = repairsList.find(r => r.id === ticketId);
        if (!repair) {
            const fetched = await getRepairs();
            repair = fetched.find((r: any) => r.id === ticketId);
            if (!repair) return;
        }

        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

        const lang = localStorage.getItem('appLang') || 'tr';
        const isAr = lang === 'ar';
        const shortId = repair.id.split('-')[0].toUpperCase();

        const formatIsoForInput = (iso?: string | null) => {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6';

        const statusOptions = `
            <option value="pending" ${repair.status === 'pending' ? 'selected' : ''}>${isAr ? 'قيد الانتظار' : 'Bekliyor'}</option>
            <option value="in_progress" ${repair.status === 'in_progress' ? 'selected' : ''}>${isAr ? 'قيد الإصلاح' : 'Onarımda'}</option>
            <option value="quality_check" ${repair.status === 'quality_check' ? 'selected' : ''}>${isAr ? 'فحص الجودة' : 'Kalite Kontrol'}</option>
            <option value="ready_for_pickup" ${repair.status === 'ready_for_pickup' ? 'selected' : ''}>${isAr ? 'جاهز للتسليم' : 'Teslimata Hazır'}</option>
            <option value="completed" ${repair.status === 'completed' ? 'selected' : ''}>${isAr ? 'تم التسليم (الأرشيف)' : 'Teslim Edildi'}</option>
        `;

        const deleteBtnHtml = isAdmin ? `
            <button type="button" id="delete-ticket-btn" class="w-full bg-error/10 hover:bg-error text-error hover:text-black border border-error/30 font-bold py-2.5 px-4 rounded-lg transition-all duration-300 mt-1 text-xs">
                ${isAr ? 'حذف التذكرة' : 'Talebi Sil'}
            </button>
        ` : '';

        const handoverBtnHtml = (repair.status === 'ready_for_pickup') ? `
            <button type="button" id="modal-handover-btn" class="w-full bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/40 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">verified</span>
                ${isAr ? 'تسليم الجهاز للعميل (أرشفة التذكرة)' : 'Müşteriye Teslim Et & Arşivle'}
            </button>
        ` : '';

        modal.innerHTML = `
          <div class="glass-panel p-5 sm:p-7 rounded-2xl flex flex-col gap-3 text-start max-w-lg w-full relative max-h-[92vh] overflow-y-auto no-scrollbar">
            <!-- Header -->
            <div class="flex items-center justify-between pb-2 border-b border-primary/20">
                <h2 class="text-xl font-bold text-primary">#TKT-${shortId}</h2>
                <button type="button" id="close-modal-x" class="text-on-surface-variant hover:text-primary p-1">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Customer Bar -->
            <div class="bg-black/40 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                <div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'العميل' : 'Müşteri'}</div>
                    <div class="font-bold text-on-surface text-sm">${repair.customers?.name || 'Unknown'}</div>
                    <div class="text-xs text-on-surface-variant">${repair.customers?.phone || '—'}</div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${repair.customers?.phone ? `
                    <a href="tel:${repair.customers.phone}" class="p-2 rounded-lg bg-surface-container hover:bg-primary/20 text-primary transition-colors" title="Ara">
                        <span class="material-symbols-outlined text-[18px]">call</span>
                    </a>
                    <button type="button" id="modal-wa-btn" class="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 transition-colors" title="WhatsApp">
                        <span class="material-symbols-outlined text-[18px]">chat</span>
                    </button>` : ''}
                </div>
            </div>

            <!-- Form -->
            <form id="modal-ticket-form" class="flex flex-col gap-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الجهاز' : 'Cihaz'}</label>
                        <input type="text" id="ticket-device" required value="${repair.device_model || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'رمز قفل الشاشة' : 'Ekran Kilidi (PIN)'}</label>
                        <input type="text" id="ticket-passcode" value="${repair.device_passcode || ''}" placeholder="${isAr ? 'بدون رمز' : 'Şifresiz'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الأولوية' : 'Öncelik'}</label>
                        <select id="ticket-priority" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="normal" ${repair.priority === 'normal' || !repair.priority ? 'selected' : ''}>${isAr ? 'عادي' : 'Normal'}</option>
                            <option value="express" ${repair.priority === 'express' ? 'selected' : ''}>${isAr ? '⚡ سريع (عاجل)' : '⚡ Ekspres (Acil)'}</option>
                            <option value="low" ${repair.priority === 'low' ? 'selected' : ''}>${isAr ? 'منخفض' : 'Düşük'}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'موعد التسليم المتوقع' : 'Teslimat Hedefi'}</label>
                        <input type="datetime-local" id="ticket-deadline" value="${formatIsoForInput(repair.estimated_completion)}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'وصف المشكلة' : 'Sorun Açıklaması'}</label>
                    <textarea id="ticket-issue" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none h-16 resize-none">${repair.issue_description || ''}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'حالة الجهاز عند الاستلام' : 'Cihaz Kabul Durumu'}</label>
                        <input type="text" id="ticket-condition" value="${repair.intake_condition || ''}" placeholder="${isAr ? 'خدوش، صدمات...' : 'Çizik, darbe vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الملحقات المستلمة' : 'Alınan Aksesuarlar'}</label>
                        <input type="text" id="ticket-accessories" value="${repair.accessories || ''}" placeholder="${isAr ? 'شريحة، شاحن...' : 'SIM, kılıf vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الحالة' : 'Durum'}</label>
                        <select id="ticket-status" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'المبلغ (₺)' : 'Ücret (₺)'}</label>
                        <input type="number" id="ticket-cost" step="0.01" value="${repair.cost || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الضمان' : 'Garanti'}</label>
                        <select id="ticket-warranty" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="0" ${repair.warranty_months === 0 ? 'selected' : ''}>${isAr ? 'بدون ضمان' : 'Garanti Yok'}</option>
                            <option value="1" ${repair.warranty_months === 1 ? 'selected' : ''}>${isAr ? 'شهر واحد' : '1 Ay'}</option>
                            <option value="3" ${repair.warranty_months === 3 || !repair.warranty_months ? 'selected' : ''}>${isAr ? '3 أشهر' : '3 Ay'}</option>
                            <option value="6" ${repair.warranty_months === 6 ? 'selected' : ''}>${isAr ? '6 أشهر' : '6 Ay'}</option>
                            <option value="12" ${repair.warranty_months === 12 ? 'selected' : ''}>${isAr ? '12 شهر' : '12 Ay'}</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'ملاحظات الخبير (داخلية)' : 'Uzman Notları (Dahili)'}</label>
                    <textarea id="ticket-tech-notes" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary/50 focus:outline-none h-14 resize-none" placeholder="${isAr ? 'تشخيص الخبير، قطع الغيار، الرقم التسلسلي...' : 'Uzman teşhisleri, kullanılan parçalar, iç durum vb.'}">${repair.technician_notes || ''}</textarea>
                </div>

                ${handoverBtnHtml}

                <div class="grid grid-cols-2 gap-2 mt-2">
                    <button type="button" id="modal-print-receipt-btn" class="bg-primary/20 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs">
                        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                        ${isAr ? 'طباعة الإيصال' : 'Makbuz Yazdır'}
                    </button>
                    <button type="button" id="view-qr-btn" class="bg-surface-container hover:bg-white/10 text-on-surface border border-white/10 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs">
                        <span class="material-symbols-outlined text-[16px]">qr_code_2</span>
                        ${isAr ? 'عرض QR' : 'QR Göster'}
                    </button>
                </div>

                <div class="flex gap-2 mt-1">
                    <button type="button" id="close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">${isAr ? 'إلغاء' : 'İptal'}</button>
                    <button type="submit" class="w-1/2 btn-primary py-3 rounded-xl font-bold">${isAr ? 'حفظ التعديلات' : 'Kaydet'}</button>
                </div>
                ${deleteBtnHtml}
            </form>
          </div>
        `;

        document.body.appendChild(modal);

        const closeModalFn = () => modal.remove();
        modal.querySelector('#close-modal')?.addEventListener('click', closeModalFn);
        modal.querySelector('#close-modal-x')?.addEventListener('click', closeModalFn);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModalFn();
        });

        // WhatsApp button
        modal.querySelector('#modal-wa-btn')?.addEventListener('click', () => {
            sendWhatsAppNotification({
                customerName: repair.customers?.name || 'Customer',
                customerPhone: repair.customers?.phone,
                deviceModel: repair.device_model,
                cost: repair.cost,
                ticketId: repair.id,
                status: repair.status,
                lang
            });
        });

        // Handover button
        modal.querySelector('#modal-handover-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr 
                ? `هل تؤكد تسليم الجهاز (${repair.device_model}) للعميل وأرشفة التذكرة؟` 
                : `${repair.device_model} cihazını müşteriye teslim etmek ve talebi arşivlemek istiyor musunuz?`;
            if (confirm(confirmMsg)) {
                try {
                    await markRepairDelivered(ticketId);
                    modal.remove();
                    repair.status = 'completed';
                    repair.completed_at = new Date().toISOString();
                    renderMetricsAndTickets();
                    const msg = isAr ? 'تم تسليم الجهاز وأرشفة التذكرة بنجاح' : 'Cihaz teslim edildi ve talep arşivlendi';
                    (window as any).showToast ? (window as any).showToast(msg, 'success') : null;
                } catch (err: any) {
                    const errMsg = 'Error completing repair: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        // Print receipt
        modal.querySelector('#modal-print-receipt-btn')?.addEventListener('click', async () => {
            await openReceiptPreviewModal({
                ticketId: repair.id,
                qrHash: repair.qr_hash,
                customerName: repair.customers?.name || 'Customer',
                customerPhone: repair.customers?.phone,
                deviceModel: repair.device_model,
                issueDescription: repair.issue_description,
                cost: repair.cost,
                priority: repair.priority,
                createdAt: repair.created_at,
                estimatedCompletion: repair.estimated_completion,
                devicePasscode: repair.device_passcode,
                intakeCondition: repair.intake_condition,
                accessories: repair.accessories,
                warrantyMonths: repair.warranty_months,
                lang
            });
        });

        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذه التذكرة؟' : 'Bu talebi silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticketId);
                    modal.remove();
                    repairsList = repairsList.filter(r => r.id !== ticketId);
                    renderMetricsAndTickets();
                    const msg = isAr ? 'تم حذف التذكرة' : 'Talep başarıyla silindi';
                    (window as any).showToast ? (window as any).showToast(msg, 'info') : null;
                } catch (err: any) {
                    const errMsg = 'Error deleting ticket: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        modal.querySelector('#view-qr-btn')?.addEventListener('click', async () => {
            try {
                const qrUrl = await generateQrCodeDataUrl(repair.qr_hash);
                const qrOverlay = document.createElement('div');
                qrOverlay.className = 'fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6';
                qrOverlay.innerHTML = `
                  <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
                    <h2 class="text-2xl font-bold text-primary">#TKT-${shortId}</h2>
                    <div class="bg-white p-4 rounded-xl shadow-lg">
                        <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded" />
                    </div>
                    <p class="font-mono text-xs text-on-surface-variant mt-2 break-all">${repair.qr_hash}</p>
                    <button id="close-qr-overlay" class="mt-4 btn-primary w-full py-3 rounded-xl font-bold">${isAr ? 'إغلاق' : 'Kapat'}</button>
                  </div>
                `;
                document.body.appendChild(qrOverlay);
                qrOverlay.querySelector('#close-qr-overlay')?.addEventListener('click', () => qrOverlay.remove());
                qrOverlay.addEventListener('click', (e) => {
                    if (e.target === qrOverlay) qrOverlay.remove();
                });
            } catch (err: any) {
                const errMsg = 'Failed to generate QR Code: ' + (err?.message || err);
                (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
            }
        });

        modal.querySelector('#modal-ticket-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const deviceModel = (modal.querySelector('#ticket-device') as HTMLInputElement).value;
            const issueDescription = (modal.querySelector('#ticket-issue') as HTMLTextAreaElement).value;
            const status = (modal.querySelector('#ticket-status') as HTMLSelectElement).value;
            const costVal = (modal.querySelector('#ticket-cost') as HTMLInputElement).value;
            const cost = costVal ? parseFloat(costVal) : undefined;
            const priority = (modal.querySelector('#ticket-priority') as HTMLSelectElement).value as any;
            const deadlineVal = (modal.querySelector('#ticket-deadline') as HTMLInputElement).value;
            const estimatedCompletion = deadlineVal ? new Date(deadlineVal).toISOString() : null;
            const devicePasscode = (modal.querySelector('#ticket-passcode') as HTMLInputElement).value.trim();
            const intakeCondition = (modal.querySelector('#ticket-condition') as HTMLInputElement).value.trim();
            const accessories = (modal.querySelector('#ticket-accessories') as HTMLInputElement).value.trim();
            const warrantyMonths = parseInt((modal.querySelector('#ticket-warranty') as HTMLSelectElement).value, 10);
            const technicianNotes = (modal.querySelector('#ticket-tech-notes') as HTMLTextAreaElement).value.trim();

            try {
                await updateRepair(ticketId, { 
                    deviceModel, 
                    issueDescription, 
                    status, 
                    cost,
                    priority,
                    estimatedCompletion,
                    devicePasscode,
                    intakeCondition,
                    accessories,
                    warrantyMonths,
                    technicianNotes
                });
                modal.remove();
                const existing = repairsList.find(r => r.id === ticketId);
                if (existing) {
                    existing.device_model = deviceModel;
                    existing.issue_description = issueDescription;
                    existing.status = status;
                    if (cost !== undefined) existing.cost = cost;
                    existing.priority = priority;
                    existing.estimated_completion = estimatedCompletion;
                    existing.device_passcode = devicePasscode;
                    existing.intake_condition = intakeCondition;
                    existing.accessories = accessories;
                    existing.warranty_months = warrantyMonths;
                    existing.technician_notes = technicianNotes;
                }
                renderMetricsAndTickets();
                const msg = isAr ? 'تم حفظ التعديلات بنجاح' : 'Değişiklikler başarıyla kaydedildi';
                (window as any).showToast ? (window as any).showToast(msg, 'success') : null;
            } catch (err: any) {
                const errMsg = 'Error updating ticket: ' + (err?.message || err);
                (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
            }
        });
    } catch (err: any) {
        console.error('Modal launch failed', err);
    }
}
