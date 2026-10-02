function getStatusLabel(status: string, lang: string) {
    if (status === 'pending') return lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor';
    if (status === 'in_progress') return lang === 'ar' ? 'قيد الإصلاح' : 'Onarımda';
    if (status === 'quality_check') return lang === 'ar' ? 'فحص الجودة' : 'Kalite Kontrol';
    if (status === 'ready_for_pickup') return lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır';
    if (status === 'completed') return lang === 'ar' ? 'تم التسليم' : 'Teslim Edildi';
    return status;
}
import { getRepairs, updateRepairStatusAndCost, createCustomer, createRepairTicket, deleteRepair, updateRepair, markRepairDelivered } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { dictionary, getLang } from './lib/i18n';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';

declare const Sortable: any;

let repairsList: any[] = [];

// Helper to seed mock data if the DB is empty
async function seedDataIfEmpty() {
    const repairs = await getRepairs();
    if (repairs && repairs.length > 0) return repairs;
    
    console.log("No repairs found. Seeding mock data via browser session...");
    
    try {
        const c1 = await createCustomer('Sarah Jenkins', '+15551234567', 'tr');
        const c2 = await createCustomer('Marcus Thorne', '+15559876543', 'ar');
        const c3 = await createCustomer('Elena Rostova', '+15555551212', 'tr');
        const c4 = await createCustomer('David Kim', '+15553334444', 'ar');
        
        await createRepairTicket({ 
            customerId: c1.id, 
            deviceModel: 'iPhone 14 Pro', 
            issueDescription: 'Screen Replacement', 
            cost: 150,
            priority: 'express',
            devicePasscode: '1234',
            intakeCondition: 'Cam kırık, dokunmatik çalışmıyor',
            accessories: 'Kılıf',
            warrantyMonths: 6
        });
        await createRepairTicket({ 
            customerId: c2.id, 
            deviceModel: 'MacBook Air M2', 
            issueDescription: 'Battery Issue', 
            cost: 85,
            priority: 'normal',
            intakeCondition: 'Temiz',
            warrantyMonths: 3
        });
        const t3 = await createRepairTicket({ 
            customerId: c3.id, 
            deviceModel: 'iPad Pro 12.9"', 
            issueDescription: 'Logic Board Repair', 
            cost: 250,
            priority: 'normal',
            intakeCondition: 'Kasada hafif ezik',
            warrantyMonths: 6
        });
        const t4 = await createRepairTicket({ 
            customerId: c4.id, 
            deviceModel: 'Samsung Galaxy S23', 
            issueDescription: 'Diagnostic', 
            cost: 45,
            priority: 'normal',
            warrantyMonths: 3
        });
        const t5 = await createRepairTicket({ 
            customerId: c1.id, 
            deviceModel: 'Apple Watch Ultra', 
            issueDescription: 'Screen polish', 
            cost: 100,
            priority: 'normal',
            warrantyMonths: 3
        });
        
        await updateRepairStatusAndCost(t3.id, 'in_progress');
        await updateRepairStatusAndCost(t4.id, 'quality_check');
        await updateRepairStatusAndCost(t5.id, 'ready_for_pickup');
        
        console.log("Seed complete. Reloading...");
        return await getRepairs();
    } catch (e) {
        console.error("Seed failed", e);
        return [];
    }
}

// Map status to visual properties for the beautiful cards
const statusMeta: Record<string, any> = {
    'pending': { color: 'text-yellow-400', border: 'border-yellow-500/10', hoverShadow: 'rgba(234,179,8,0.3)', hoverBorder: 'border-yellow-500/40', icon: 'smartphone' },
    'in_progress': { color: 'text-primary', border: 'border-primary/30', hoverShadow: 'rgba(227,30,36,0.5)', hoverBorder: 'border-primary/70', icon: 'build', pulse: true, progress: '45%' },
    'quality_check': { color: 'text-blue-400', border: 'border-blue-500/20', hoverShadow: 'rgba(59,130,246,0.3)', hoverBorder: 'border-blue-500/50', icon: 'fact_check' },
    'ready_for_pickup': { color: 'text-emerald-400', border: 'border-emerald-500/20', hoverShadow: 'rgba(16,185,129,0.3)', hoverBorder: 'border-emerald-500/50', icon: 'done_all' },
    'completed': { color: 'text-slate-400', border: 'border-slate-500/20', hoverShadow: 'rgba(148,163,184,0.3)', hoverBorder: 'border-slate-500/50', icon: 'verified' }
};

function updateCounters() {
    const cols = document.querySelectorAll('.group\\/col');
    const counts: Record<string, number> = { 'pending': 0, 'in_progress': 0, 'quality_check': 0, 'ready_for_pickup': 0 };
    repairsList.forEach(r => {
        if (counts[r.status] !== undefined) {
            counts[r.status] = (counts[r.status] || 0) + 1;
        }
    });

    if (cols[0]) { const b = cols[0].querySelector('.bg-surface-container-high'); if (b) b.textContent = String(counts['pending']); }
    if (cols[1]) { const b = cols[1].querySelector('.bg-primary\\/20'); if (b) b.textContent = String(counts['in_progress']); }
    if (cols[2]) { const b = cols[2].querySelector('.bg-surface-container-high'); if (b) b.textContent = String(counts['quality_check']); }
    if (cols[3]) { const b = cols[3].querySelector('.bg-surface-container-high'); if (b) b.textContent = String(counts['ready_for_pickup']); }

    // Update mobile pipeline tab counts
    const mobCounts = [counts['pending'], counts['in_progress'], counts['quality_check'], counts['ready_for_pickup']];
    mobCounts.forEach((c, i) => {
        const el = document.getElementById(`mob-count-${i}`);
        if (el) el.textContent = String(c);
    });
}

function renderBoard() {
    const cols = document.querySelectorAll('.group\\/col');
    const newTicketsCol = cols[0]?.querySelector('.overflow-y-auto') as HTMLElement;
    const inProgressCol = cols[1]?.querySelector('.overflow-y-auto') as HTMLElement;
    const qualityCheckCol = cols[2]?.querySelector('.overflow-y-auto') as HTMLElement;
    const completedCol = cols[3]?.querySelector('.overflow-y-auto') as HTMLElement;

    if (newTicketsCol) { newTicketsCol.innerHTML = ''; newTicketsCol.dataset.status = 'pending'; }
    if (inProgressCol) { inProgressCol.innerHTML = ''; inProgressCol.dataset.status = 'in_progress'; }
    if (qualityCheckCol) { qualityCheckCol.innerHTML = ''; qualityCheckCol.dataset.status = 'quality_check'; qualityCheckCol.classList.remove('opacity-50', 'items-center', 'justify-center'); }
    if (completedCol) { completedCol.innerHTML = ''; completedCol.dataset.status = 'ready_for_pickup'; }

    const lang = localStorage.getItem('appLang') || 'tr';
    const nowTime = Date.now();

    repairsList.forEach(repair => {
        // Skip archived / delivered tickets from active board
        if (repair.status === 'completed') return;

        const meta = statusMeta[repair.status] || statusMeta['pending'];
        const shortId = repair.id.split('-')[0].toUpperCase();
        const customerName = repair.customers?.name || ('Customer ' + (repair.customer_id ? repair.customer_id.substring(0,6) : ''));
        
        const isExpress = repair.priority === 'express';
        const isOverdue = repair.estimated_completion && new Date(repair.estimated_completion).getTime() < nowTime && repair.status !== 'ready_for_pickup';

        let badgePills = '';
        if (isExpress) {
            badgePills += `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.25)] flex items-center gap-0.5"><span class="material-symbols-outlined text-[12px]">bolt</span>${lang === 'ar' ? 'عاجل' : 'EKSPRES'}</span>`;
        }
        if (isOverdue) {
            badgePills += `<span class="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.3)] flex items-center gap-0.5"><span class="material-symbols-outlined text-[12px]">warning</span>${lang === 'ar' ? 'متأخر' : 'GECİKMİŞ'}</span>`;
        }

        let extraHtml = '';
        if (repair.status === 'in_progress') {
            extraHtml = `
            <div class="w-full bg-surface-container-high h-1 mt-2.5 rounded-full overflow-hidden pointer-events-none">
                <div class="bg-primary h-full w-[45%] shadow-[0_0_5px_rgba(227,30,36,0.8)]"></div>
            </div>`;
        } else if (repair.status === 'ready_for_pickup') {
            const waText = lang === 'ar' ? 'واتساب' : 'WhatsApp';
            const deliverText = lang === 'ar' ? 'تسليم للعميل' : 'Teslim Et';
            extraHtml = `
            <div class="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                <button type="button" class="btn-wa-notify flex-1 bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 pointer-events-auto">
                    <span class="material-symbols-outlined text-[14px]">chat</span>
                    ${waText}
                </button>
                <button type="button" class="btn-handover flex-1 bg-primary/20 hover:bg-primary hover:text-black text-primary border border-primary/30 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 pointer-events-auto">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    ${deliverText}
                </button>
            </div>`;
        }

        const cardHtml = `
        <div data-id="${repair.id}" class="kanban-card cursor-grab bg-black/40 backdrop-blur-md p-stack-md rounded-lg border ${meta.border} hover:shadow-[0_0_20px_-5px_${meta.hoverShadow}] hover:${meta.hoverBorder} transition-all duration-300 relative mb-4">
            <div class="flex justify-between items-start mb-2 pointer-events-none">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-label-caps text-label-caps ${meta.color} uppercase tracking-wider">#TKT-${shortId}</span>
                    ${badgePills}
                </div>
                ${meta.icon !== 'smartphone' ? `<span class="material-symbols-outlined ${meta.color} text-[18px]">${meta.icon}</span>` : ''}
            </div>
            <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1 pointer-events-none">${customerName}</h3>
            <p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 pointer-events-none">
                <span class="material-symbols-outlined text-[16px]">devices</span> ${repair.device_model}
            </p>
            <div class="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between pointer-events-none text-xs text-on-surface-variant">
                <span class="bg-surface-container px-2 py-0.5 rounded truncate max-w-[70%]">${repair.issue_description}</span>
                <span class="font-bold text-primary">${repair.cost ? `₺${repair.cost}` : ''}</span>
            </div>
            ${extraHtml}
        </div>
        `;
        
        if (repair.status === 'pending' && newTicketsCol) newTicketsCol.insertAdjacentHTML('beforeend', cardHtml);
        else if (repair.status === 'in_progress' && inProgressCol) inProgressCol.insertAdjacentHTML('beforeend', cardHtml);
        else if (repair.status === 'quality_check' && qualityCheckCol) qualityCheckCol.insertAdjacentHTML('beforeend', cardHtml);
        else if (repair.status === 'ready_for_pickup' && completedCol) completedCol.insertAdjacentHTML('beforeend', cardHtml);
    });

    updateCounters();

    // Wire up ticket card clicks to edit modal
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
            const ticketId = card.getAttribute('data-id')!;
            openTicketModal(ticketId);
        });
    });

    // Wire up WhatsApp notify button clicks
    document.querySelectorAll('.btn-wa-notify').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = (btn as HTMLElement).closest('.kanban-card');
            const ticketId = card?.getAttribute('data-id');
            const repair = repairsList.find(r => r.id === ticketId);
            if (repair) {
                sendWhatsAppNotification({
                    customerName: repair.customers?.name || (lang === 'ar' ? 'عميلنا العزيز' : 'Değerli Müşterimiz'),
                    customerPhone: repair.customers?.phone,
                    deviceModel: repair.device_model,
                    cost: repair.cost,
                    ticketId: repair.id,
                    status: repair.status,
                    lang
                });
            }
        });
    });

    // Wire up Handover to Customer button clicks
    document.querySelectorAll('.btn-handover').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = (btn as HTMLElement).closest('.kanban-card');
            const ticketId = card?.getAttribute('data-id');
            const repair = repairsList.find(r => r.id === ticketId);
            if (!repair) return;

            const confirmMsg = lang === 'ar' 
                ? `هل تؤكد تسليم الجهاز (${repair.device_model}) للعميل؟ سيتم أرشفة التذكرة.` 
                : `${repair.device_model} cihazı müşteriye teslim edilsin ve talep arşivlendi olarak işaretlensin mi?`;
            
            if (confirm(confirmMsg)) {
                try {
                    await markRepairDelivered(repair.id);
                    repair.status = 'completed';
                    repair.completed_at = new Date().toISOString();
                    renderBoard();
                    renderTicketsList();
                    const toastMsg = lang === 'ar' ? 'تم تسليم الجهاز وأرشفة التذكرة بنجاح' : 'Cihaz müşteriye teslim edildi ve talep arşivlendi';
                    (window as any).showToast ? (window as any).showToast(toastMsg, 'success') : null;
                } catch (err: any) {
                    const errMsg = 'Error completing repair: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });
    });
}


let sortablesInitialized = false;
function initSortables() {
    if (sortablesInitialized || typeof Sortable === 'undefined') return;

    const cols = document.querySelectorAll('.group\\/col');
    const newTicketsCol = cols[0]?.querySelector('.overflow-y-auto') as HTMLElement;
    const inProgressCol = cols[1]?.querySelector('.overflow-y-auto') as HTMLElement;
    const qualityCheckCol = cols[2]?.querySelector('.overflow-y-auto') as HTMLElement;
    const completedCol = cols[3]?.querySelector('.overflow-y-auto') as HTMLElement;

    const sortableOptions = {
        group: 'kanban',
        animation: 150,
        ghostClass: 'opacity-50',
        dragClass: 'scale-105',
        onEnd: async function (evt: any) {
            const itemEl = evt.item;
            const toList = evt.to;
            
            const ticketId = itemEl?.getAttribute('data-id');
            const newStatus = toList?.getAttribute('data-status');
            
            if (ticketId && newStatus && evt.from !== evt.to) {
                itemEl.style.opacity = '0.7';
                try {
                    await updateRepairStatusAndCost(ticketId, newStatus as any);
                    const rep = repairsList.find(r => r.id === ticketId);
                    if (rep) {
                        rep.status = newStatus;
                    }
                    itemEl.style.opacity = '1';
                    updateCounters();
                    const lang = localStorage.getItem('appLang') || 'tr';
                    const statusName = getStatusLabel(newStatus, lang);
                    const toastMsg = lang === 'ar' ? `تم تحديث الحالة إلى: ${statusName}` : `Durum güncellendi: ${statusName}`;
                    (window as any).showToast ? (window as any).showToast(toastMsg, 'success') : null;
                } catch (err: any) {
                    if (evt.from && itemEl) evt.from.appendChild(itemEl);
                    itemEl.style.opacity = '1';
                    const errMsg = err?.message || 'Durum güncellenemedi';
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        },
    };

    if (newTicketsCol) Sortable.create(newTicketsCol, sortableOptions);
    if (inProgressCol) Sortable.create(inProgressCol, sortableOptions);
    if (qualityCheckCol) Sortable.create(qualityCheckCol, sortableOptions);
    if (completedCol) Sortable.create(completedCol, sortableOptions);
    sortablesInitialized = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        repairsList = await seedDataIfEmpty();
        renderBoard();
        initSortables();

        // Wire mobile pipeline tabs → scroll to column
        const boardEl = document.getElementById('kanban-board-view');
        const colEls = boardEl ? Array.from(boardEl.querySelectorAll(':scope > div')) : [];
        const pipeTabs = document.querySelectorAll('.mob-pipe-tab');

        pipeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const idx = parseInt(tab.getAttribute('data-col') || '0', 10);
                const target = colEls[idx] as HTMLElement;
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }
                pipeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // IntersectionObserver: swipe updates active tab
        if (boardEl && colEls.length && pipeTabs.length && typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const idx = colEls.indexOf(entry.target as HTMLElement);
                        if (idx >= 0) {
                            pipeTabs.forEach((t, i) => t.classList.toggle('active', i === idx));
                        }
                    }
                });
            }, { root: boardEl, threshold: 0.5 });
            colEls.forEach(col => observer.observe(col));
        }

        // View Mode Toggles
        const btnBoard = document.getElementById('view-toggle-board') as HTMLButtonElement;
        const btnList = document.getElementById('view-toggle-list') as HTMLButtonElement;
        const viewBoard = document.getElementById('kanban-board-view') as HTMLDivElement;
        const viewList = document.getElementById('kanban-list-view') as HTMLDivElement;

        if (btnBoard && btnList && viewBoard && viewList) {
            const showBoard = () => {
                btnBoard.className = 'px-3 py-1.5 rounded-full bg-primary text-black font-bold transition-all duration-300';
                btnList.className  = 'px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all duration-300';
                viewBoard.classList.remove('hidden');
                viewList.classList.add('hidden');
                const pipeTabs = document.getElementById('mobile-pipeline-tabs');
                if (pipeTabs) pipeTabs.style.display = '';
            };

            btnBoard.addEventListener('click', showBoard);

            btnList.addEventListener('click', () => {
                btnList.className  = 'px-3 py-1.5 rounded-full bg-primary text-black font-bold transition-all duration-300';
                btnBoard.className = 'px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all duration-300';
                viewList.classList.remove('hidden');
                viewBoard.classList.add('hidden');

                // Hide pipeline tabs when in list view
                const pipeTabs = document.getElementById('mobile-pipeline-tabs');
                if (pipeTabs) pipeTabs.style.display = 'none';

                renderTicketsList();

                // Wire search input (once, on first list open)
                const searchInput = document.getElementById('list-search') as HTMLInputElement;
                if (searchInput && !searchInput.dataset.wired) {
                    searchInput.dataset.wired = 'true';
                    searchInput.addEventListener('input', () => renderTicketsList());
                }
            });
        }

        // Modern Suggestion boxes for Status and Sort
        const filterInput = document.getElementById('list-filter-status') as HTMLInputElement;
        const filterBox = document.getElementById('filter-status-suggestions') as HTMLDivElement;
        const sortInput = document.getElementById('list-sort-order') as HTMLInputElement;
        const sortBox = document.getElementById('sort-order-suggestions') as HTMLDivElement;

        if (filterInput && filterBox) {
            const showFilterSuggestions = () => {
                const lang = getLang();
                const options = [
                    { value: 'all', key: 'kanban.filterAll' },
                    { value: 'pending', key: 'kanban.filterPending' },
                    { value: 'in_progress', key: 'kanban.filterProgress' },
                    { value: 'quality_check', key: 'kanban.filterQuality' },
                    { value: 'ready_for_pickup', key: 'kanban.filterReady' },
                    { value: 'completed', key: 'kanban.filterCompleted' }
                ];

                filterBox.innerHTML = '';
                options.forEach(opt => {
                    const label = dictionary[lang][opt.key] || opt.value;
                    const item = document.createElement('div');
                    item.className = 'px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-xs transition-colors';
                    item.textContent = label;
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        filterInput.value = label;
                        filterInput.setAttribute('data-value', opt.value);
                        filterInput.setAttribute('data-i18n', opt.key);
                        filterBox.classList.add('hidden');
                        renderTicketsList();
                    });
                    filterBox.appendChild(item);
                });
                filterBox.classList.remove('hidden');
                sortBox?.classList.add('hidden');
            };

            filterInput.addEventListener('click', (e) => {
                e.stopPropagation();
                showFilterSuggestions();
            });
        }

        if (sortInput && sortBox) {
            const showSortSuggestions = () => {
                const lang = getLang();
                const options = [
                    { value: 'newest', key: 'kanban.sortNewest' },
                    { value: 'oldest', key: 'kanban.sortOldest' },
                    { value: 'cost-desc', key: 'kanban.sortCostDesc' },
                    { value: 'cost-asc', key: 'kanban.sortCostAsc' }
                ];

                sortBox.innerHTML = '';
                options.forEach(opt => {
                    const label = dictionary[lang][opt.key] || opt.value;
                    const item = document.createElement('div');
                    item.className = 'px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-xs transition-colors';
                    item.textContent = label;
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        sortInput.value = label;
                        sortInput.setAttribute('data-value', opt.value);
                        sortInput.setAttribute('data-i18n', opt.key);
                        sortBox.classList.add('hidden');
                        renderTicketsList();
                    });
                    sortBox.appendChild(item);
                });
                sortBox.classList.remove('hidden');
                filterBox?.classList.add('hidden');
            };

            sortInput.addEventListener('click', (e) => {
                e.stopPropagation();
                showSortSuggestions();
            });
        }

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (filterInput && filterBox && target !== filterInput && !filterBox.contains(target)) {
                filterBox.classList.add('hidden');
            }
            if (sortInput && sortBox && target !== sortInput && !sortBox.contains(target)) {
                sortBox.classList.add('hidden');
            }
        });
        
    } catch (err: any) {
        console.error('Failed to load Kanban data', err);
    }
});

function renderTicketsList() {
    const container = document.getElementById('tickets-list-container');
    if (!container) return;
    container.innerHTML = '';

    const statusFilter = (document.getElementById('list-filter-status') as HTMLInputElement)?.getAttribute('data-value') || 'all';
    const sortOrder = (document.getElementById('list-sort-order') as HTMLInputElement)?.getAttribute('data-value') || 'newest';
    const searchQuery = ((document.getElementById('list-search') as HTMLInputElement)?.value || '').trim().toLowerCase();

    let filtered = [...repairsList];
    if (statusFilter === 'all') {
        if (!searchQuery) {
            filtered = filtered.filter(r => r.status !== 'completed');
        }
    } else {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Live search: match ticket ID, customer name, device model, issue description
    if (searchQuery) {
        filtered = filtered.filter(r => {
            const customerName = (r.customers?.name || '').toLowerCase();
            const shortId = r.id.split('-')[0].toLowerCase();
            const deviceModel = (r.device_model || '').toLowerCase();
            const issue = (r.issue_description || '').toLowerCase();
            return (
                shortId.includes(searchQuery) ||
                customerName.includes(searchQuery) ||
                deviceModel.includes(searchQuery) ||
                issue.includes(searchQuery)
            );
        });
    }

    if (sortOrder === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortOrder === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (sortOrder === 'cost-desc') {
        filtered.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    } else if (sortOrder === 'cost-asc') {
        filtered.sort((a, b) => (a.cost || 0) - (b.cost || 0));
    }

    if (filtered.length === 0) {
        const lang = localStorage.getItem('appLang') || 'tr';
        const msg = lang === 'ar' ? 'لا توجد تذاكر مطابقة.' : 'Eşleşen talep bulunamadı.';
        container.innerHTML = `<div class="text-center py-12"><p class="text-xs text-on-surface-variant italic">${msg}</p></div>`;
        return;
    }

    const lang = localStorage.getItem('appLang') || 'tr';
    const nowTime = Date.now();

    filtered.forEach((r, index) => {
        const shortId = r.id.split('-')[0].toUpperCase();
        const customerName = r.customers?.name || 'Unknown';
        const meta = statusMeta[r.status] || statusMeta['pending'];
        const localizedStatus = getStatusLabel(r.status, lang);

        const isExpress = r.priority === 'express';
        const isOverdue = r.estimated_completion && new Date(r.estimated_completion).getTime() < nowTime && r.status !== 'ready_for_pickup' && r.status !== 'completed';
        
        let badgesHtml = '';
        if (isExpress) badgesHtml += `<span class="text-amber-400 bg-amber-500/20 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">⚡ ${lang === 'ar' ? 'عاجل' : 'EKSPRES'}</span>`;
        if (isOverdue) badgesHtml += `<span class="text-red-400 bg-red-500/20 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">⚠️ ${lang === 'ar' ? 'متأخر' : 'GECİKMİŞ'}</span>`;
        
        container.innerHTML += `
        <div class="list-ticket-row grid grid-cols-1 md:grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer" data-id="${r.id}">
            <!-- Row Number -->
            <div class="col-span-1 hidden md:block text-xs font-bold text-primary/70">${index + 1}</div>
            
            <!-- Ticket Info -->
            <div class="col-span-3 flex items-center gap-3">
                <div class="w-10 h-10 shrink-0 rounded-xl bg-black/40 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-[20px]">${meta.icon}</span>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">#TKT-${shortId}</h3>
                        ${badgesHtml}
                    </div>
                    <span class="text-xs text-on-surface-variant truncate block">${r.issue_description}</span>
                </div>
            </div>

            <!-- Customer -->
            <div class="col-span-3 text-sm text-on-surface font-semibold">${customerName}</div>
            
            <!-- Device -->
            <div class="col-span-2 text-sm text-on-surface-variant flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">smartphone</span> ${r.device_model}
            </div>

            <!-- Cost -->
            <div class="col-span-2 text-center text-sm font-bold text-primary">${r.cost ? `₺${r.cost}` : '-'}</div>
            
            <!-- Status Badge -->
            <div class="col-span-1 flex justify-end">
                <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-container border border-white/5 whitespace-nowrap ${meta.color}">${localizedStatus}</span>
            </div>
        </div>
        `;
    });

    // Wire clicks for list rows
    container.querySelectorAll('.list-ticket-row').forEach(row => {
        row.addEventListener('click', () => {
            const ticketId = row.getAttribute('data-id')!;
            openTicketModal(ticketId);
        });
    });
}

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
                <div>
                    <h2 class="text-xl font-bold text-primary">#TKT-${shortId}</h2>
                    <span class="text-xs text-on-surface-variant">${getStatusLabel(repair.status, lang)}</span>
                </div>
                <button type="button" id="close-modal-x" class="text-on-surface-variant hover:text-primary p-1">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Customer Bar with WhatsApp & Call -->
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
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'رمز القفل / النمط' : 'Ekran Kilidi / PIN'}</label>
                        <input type="text" id="ticket-passcode" value="${repair.device_passcode || ''}" placeholder="${isAr ? 'بدون رمز' : 'Şifresiz'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الأولوية' : 'Öncelik'}</label>
                        <select id="ticket-priority" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="normal" ${repair.priority === 'normal' || !repair.priority ? 'selected' : ''}>Normal</option>
                            <option value="express" ${repair.priority === 'express' ? 'selected' : ''}>⚡ Ekspres (Acil)</option>
                            <option value="low" ${repair.priority === 'low' ? 'selected' : ''}>Düşük (Low)</option>
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
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'حالة الجهاز عند الاستلام' : 'Mevcut Hasar / Durum'}</label>
                        <input type="text" id="ticket-condition" value="${repair.intake_condition || ''}" placeholder="${isAr ? 'خدوش، صدمات...' : 'Çizik, darbe vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الملحقات' : 'Alınan Aksesuarlar'}</label>
                        <input type="text" id="ticket-accessories" value="${repair.accessories || ''}" placeholder="${isAr ? 'شريحة، شاحن...' : 'SIM, kılıf vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="flex flex-col gap-1 relative sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الحالة' : 'Durum'}</label>
                        <input type="text" id="ticket-status-display" readonly value="${getStatusLabel(repair.status, lang)}" data-value="${repair.status}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none cursor-pointer">
                        <div id="ticket-status-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-surface-container-high/95 backdrop-blur-xl border border-primary/20 rounded-lg hidden z-50 max-h-48 overflow-y-auto divide-y divide-white/5 shadow-lg no-scrollbar">
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="pending">${isAr ? 'قيد الانتظار' : 'Bekliyor'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="in_progress">${isAr ? 'قيد الإصلاح' : 'Onarımda'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="quality_check">${isAr ? 'فحص الجودة' : 'Kalite Kontrol'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="ready_for_pickup">${isAr ? 'جاهز للتسليم' : 'Teslimata Hazır'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="completed">${isAr ? 'تم التسليم (الأرشيف)' : 'Teslim Edildi'}</div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'المبلغ (₺)' : 'Ücret (₺)'}</label>
                        <input type="number" id="ticket-cost" step="0.01" value="${repair.cost || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الضمان' : 'Garanti'}</label>
                        <select id="ticket-warranty" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="0" ${repair.warranty_months === 0 ? 'selected' : ''}>0 Ay</option>
                            <option value="1" ${repair.warranty_months === 1 ? 'selected' : ''}>1 Ay</option>
                            <option value="3" ${repair.warranty_months === 3 || !repair.warranty_months ? 'selected' : ''}>3 Ay</option>
                            <option value="6" ${repair.warranty_months === 6 ? 'selected' : ''}>6 Ay</option>
                            <option value="12" ${repair.warranty_months === 12 ? 'selected' : ''}>12 Ay</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'ملاحظات الخبير (داخلية)' : 'Uzman Notları (Dahili)'}</label>
                    <textarea id="ticket-technician-notes" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary/50 focus:outline-none h-14 resize-none" placeholder="${isAr ? 'تشخيص الخبير، قطع الغيار، الرقم التسلسلي...' : 'Uzman teşhisleri, yapılan işlemler, değişen parça seri no vb.'}">${repair.technician_notes || ''}</textarea>
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

        // Status suggestions dropdown
        const statusDisplay = modal.querySelector('#ticket-status-display') as HTMLInputElement;
        const statusSuggestions = modal.querySelector('#ticket-status-suggestions') as HTMLDivElement;

        if (statusDisplay && statusSuggestions) {
            statusDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                statusSuggestions.classList.toggle('hidden');
            });

            statusSuggestions.querySelectorAll('div').forEach(item => {
                item.addEventListener('click', () => {
                    const val = item.getAttribute('data-val')!;
                    statusDisplay.value = item.textContent || '';
                    statusDisplay.setAttribute('data-value', val);
                    statusSuggestions.classList.add('hidden');
                });
            });

            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target !== statusDisplay && !statusSuggestions.contains(target)) {
                    statusSuggestions.classList.add('hidden');
                }
            });
        }

        const closeModalFn = () => modal.remove();
        modal.querySelector('#close-modal')?.addEventListener('click', closeModalFn);
        modal.querySelector('#close-modal-x')?.addEventListener('click', closeModalFn);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModalFn();
        });

        // WhatsApp quick button
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

        // Handover button in modal
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
                    renderBoard();
                    renderTicketsList();
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

        // Delete ticket (admin)
        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذه التذكرة نهائياً؟' : 'Bu talebi kalıcı olarak silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticketId);
                    modal.remove();
                    repairsList = repairsList.filter(r => r.id !== ticketId);
                    renderBoard();
                    renderTicketsList();
                    const msg = isAr ? 'تم حذف التذكرة' : 'Talep başarıyla silindi';
                    (window as any).showToast ? (window as any).showToast(msg, 'info') : null;
                } catch (err: any) {
                    const errMsg = 'Error deleting ticket: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        // View QR Code overlay
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

        // Form submit (save updates)
        modal.querySelector('#modal-ticket-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const deviceModel = (modal.querySelector('#ticket-device') as HTMLInputElement).value;
            const issueDescription = (modal.querySelector('#ticket-issue') as HTMLTextAreaElement).value;
            const status = (modal.querySelector('#ticket-status-display') as HTMLInputElement).getAttribute('data-value')!;
            const costVal = (modal.querySelector('#ticket-cost') as HTMLInputElement).value;
            const cost = costVal ? parseFloat(costVal) : undefined;
            const priority = (modal.querySelector('#ticket-priority') as HTMLSelectElement).value as any;
            const deadlineVal = (modal.querySelector('#ticket-deadline') as HTMLInputElement).value;
            const estimatedCompletion = deadlineVal ? new Date(deadlineVal).toISOString() : null;
            const devicePasscode = (modal.querySelector('#ticket-passcode') as HTMLInputElement).value.trim();
            const intakeCondition = (modal.querySelector('#ticket-condition') as HTMLInputElement).value.trim();
            const accessories = (modal.querySelector('#ticket-accessories') as HTMLInputElement).value.trim();
            const warrantyMonths = parseInt((modal.querySelector('#ticket-warranty') as HTMLSelectElement).value, 10);
            const technicianNotes = (modal.querySelector('#ticket-technician-notes') as HTMLTextAreaElement).value.trim();

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
                renderBoard();
                renderTicketsList();
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

