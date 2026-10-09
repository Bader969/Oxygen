import { getRepairs } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { dictionary, applyTranslation } from './lib/i18n';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';
import { openTicketDetailsModal } from './lib/ticketModal';

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
    await openTicketDetailsModal(ticketId, {
        onUpdate: () => renderMetricsAndTickets(),
        onDelete: (deletedId) => {
            repairsList = repairsList.filter(r => r.id !== deletedId);
            renderMetricsAndTickets();
        },
        onHandover: () => renderMetricsAndTickets()
    });
}

