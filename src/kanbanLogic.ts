import { getRepairs, updateRepairStatusAndCost } from './lib/repairService';
import { dictionary, getLang } from './lib/i18n';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';
import { getStatusLabel } from './lib/statusConfig';
import { openTicketDetailsModal } from './lib/ticketModal';

declare const Sortable: any;

let repairsList: any[] = [];

// Map status to visual properties for the beautiful cards
const statusMeta: Record<string, any> = {
    'pending': { color: 'text-yellow-400', dot: 'bg-yellow-400', border: 'border-yellow-500/10', hoverShadow: 'rgba(234,179,8,0.3)', hoverBorder: 'border-yellow-500/40', icon: 'smartphone' },
    'in_progress': { color: 'text-primary', dot: 'bg-primary', border: 'border-primary/30', hoverShadow: 'rgba(227,30,36,0.5)', hoverBorder: 'border-primary/70', icon: 'build', pulse: true, progress: '45%' },
    'quality_check': { color: 'text-blue-400', dot: 'bg-blue-400', border: 'border-blue-500/20', hoverShadow: 'rgba(59,130,246,0.3)', hoverBorder: 'border-blue-500/50', icon: 'fact_check' },
    'ready_for_pickup': { color: 'text-emerald-400', dot: 'bg-emerald-400', border: 'border-emerald-500/20', hoverShadow: 'rgba(16,185,129,0.3)', hoverBorder: 'border-emerald-500/50', icon: 'done_all' },
    'completed': { color: 'text-slate-400', dot: 'bg-slate-400', border: 'border-slate-500/20', hoverShadow: 'rgba(148,163,184,0.3)', hoverBorder: 'border-slate-500/50', icon: 'verified' }
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
        repairsList = await getRepairs();
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

            // On mobile screens (< 768px), auto-switch to List View by default
            if (window.innerWidth < 768) {
                btnList.click();
            }
        }

        // Mobile Status Filter Pills
        const mobFilterPills = document.querySelectorAll('#mobile-status-filter-pills .mob-filter-pill');
        mobFilterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const status = pill.getAttribute('data-filter') || 'all';
                mobFilterPills.forEach(p => {
                    p.className = 'mob-filter-pill px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-surface-container border border-white/10 text-on-surface-variant hover:text-white transition-all';
                });
                pill.className = 'mob-filter-pill active px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-primary text-black transition-all';
                
                const filterInput = document.getElementById('list-filter-status') as HTMLInputElement;
                if (filterInput) {
                    filterInput.setAttribute('data-value', status);
                }
                renderTicketsList();
            });
        });

        // Quick Status Action Sheet Setup
        setupQuickStatusSheet();

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

let sheetActiveTicketId: string | null = null;

function setupQuickStatusSheet() {
    const sheet = document.getElementById('quick-status-sheet');
    const closeBtn = document.getElementById('close-quick-status-sheet');
    if (!sheet) return;

    closeBtn?.addEventListener('click', closeQuickStatusSheet);
    sheet.addEventListener('click', (e) => {
        if (e.target === sheet) closeQuickStatusSheet();
    });

    const statusBtns = sheet.querySelectorAll('.status-option-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const newStatus = btn.getAttribute('data-status');
            if (!newStatus || !sheetActiveTicketId) return;

            const targetId = sheetActiveTicketId;
            const lang = localStorage.getItem('appLang') || 'tr';
            const isAr = lang === 'ar';

            try {
                await updateRepairStatusAndCost(targetId, newStatus);
                const existing = repairsList.find(r => r.id === targetId);
                if (existing) {
                    existing.status = newStatus;
                }
                renderBoard();
                renderTicketsList();
                closeQuickStatusSheet();

                const statusLabel = getStatusLabel(newStatus, lang);
                const msg = isAr ? `تم تحديث الحالة إلى: ${statusLabel}` : `Durum güncellendi: ${statusLabel}`;
                (window as any).showToast ? (window as any).showToast(msg, 'success') : null;

                // If updated to ready_for_pickup, offer WhatsApp notification
                if (newStatus === 'ready_for_pickup' && existing && existing.customers?.phone) {
                    const waPrompt = isAr ? 'هل تود إرسال إشعار للعميل عبر واتساب؟' : 'Müşteriye WhatsApp bildirim mesajı göndermek ister misiniz?';
                    setTimeout(() => {
                        if (confirm(waPrompt)) {
                            sendWhatsAppNotification({
                                customerName: existing.customers?.name || (isAr ? 'عميلنا العزيز' : 'Değerli Müşterimiz'),
                                customerPhone: existing.customers?.phone,
                                deviceModel: existing.device_model,
                                cost: existing.cost,
                                ticketId: existing.id,
                                status: existing.status,
                                lang
                            });
                        }
                    }, 250);
                }
            } catch (err: any) {
                const errMsg = 'Error updating status: ' + (err?.message || err);
                (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
            }
        });
    });
}

function openQuickStatusSheet(ticketId: string) {
    const sheet = document.getElementById('quick-status-sheet');
    const subtitle = document.getElementById('sheet-ticket-subtitle');
    if (!sheet) return;

    sheetActiveTicketId = ticketId;
    const repair = repairsList.find(r => r.id === ticketId);
    if (repair) {
        const shortId = repair.id.split('-')[0].toUpperCase();
        const customerName = repair.customers?.name || '';
        if (subtitle) {
            subtitle.textContent = `#TKT-${shortId} • ${repair.device_model || ''} (${customerName})`;
        }

        const statusBtns = sheet.querySelectorAll('.status-option-btn');
        statusBtns.forEach(btn => {
            const st = btn.getAttribute('data-status');
            const check = btn.querySelector('.status-check');
            if (st === repair.status) {
                btn.classList.add('ring-2', 'ring-primary', 'bg-white/10');
                check?.classList.remove('hidden');
            } else {
                btn.classList.remove('ring-2', 'ring-primary', 'bg-white/10');
                check?.classList.add('hidden');
            }
        });
    }

    sheet.classList.remove('hidden');
}

function closeQuickStatusSheet() {
    const sheet = document.getElementById('quick-status-sheet');
    if (sheet) {
        sheet.classList.add('hidden');
    }
    sheetActiveTicketId = null;
}

function extractDepositAndRemaining(repair: any) {
    let deposit = typeof repair.deposit === 'number' ? repair.deposit : 0;
    const total = typeof repair.cost === 'number' ? repair.cost : 0;
    
    // Check technician_notes fallback if deposit not populated in column
    if (!deposit && repair.technician_notes) {
        const match = repair.technician_notes.match(/\[KAPORA:\s*₺?([\d.]+)/i);
        if (match && match[1]) {
            deposit = parseFloat(match[1]) || 0;
        }
    }
    const remaining = Math.max(0, total - deposit);
    return { total, deposit, remaining };
}

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

    const lang = localStorage.getItem('appLang') || 'tr';
    const isAr = lang === 'ar';

    if (filtered.length === 0) {
        const msg = isAr ? 'لا توجد تذاكر مطابقة.' : 'Eşleşen talep bulunamadı.';
        container.innerHTML = `<div class="text-center py-12"><p class="text-xs text-on-surface-variant italic">${msg}</p></div>`;
        return;
    }

    const nowTime = Date.now();

    filtered.forEach((r, index) => {
        const shortId = r.id.split('-')[0].toUpperCase();
        const customerName = r.customers?.name || (isAr ? 'عميل غير مسجل' : 'Kayıtsız Müşteri');
        const meta = statusMeta[r.status] || statusMeta['pending'];
        const localizedStatus = getStatusLabel(r.status, lang);
        const finances = extractDepositAndRemaining(r);

        const isExpress = r.priority === 'express';
        const isOverdue = r.estimated_completion && new Date(r.estimated_completion).getTime() < nowTime && r.status !== 'ready_for_pickup' && r.status !== 'completed';
        
        let badgesHtml = '';
        if (isExpress) badgesHtml += `<span class="text-amber-400 bg-amber-500/20 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">⚡ ${isAr ? 'عاجل' : 'EKSPRES'}</span>`;
        if (isOverdue) badgesHtml += `<span class="text-red-400 bg-red-500/20 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">⚠️ ${isAr ? 'متأخر' : 'GECİKMİŞ'}</span>`;
        
        container.innerHTML += `
        <!-- MOBILE CARD VIEW (< md) -->
        <div class="list-ticket-card md:hidden bg-surface-container/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 flex flex-col gap-3 relative transition-all duration-200 active:scale-[0.99] cursor-pointer" data-id="${r.id}">
            <!-- Header: Ticket ID & Quick Status Sheet Trigger Button -->
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-headline-sm text-sm font-bold text-on-surface">#TKT-${shortId}</span>
                    ${badgesHtml}
                </div>
                <!-- 1-Tap Quick Status Trigger Button -->
                <button type="button" class="btn-quick-status-trigger shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.border} bg-black/40 ${meta.color} hover:bg-white/10 transition-all">
                    <span class="w-2 h-2 rounded-full ${meta.dot || 'bg-primary'} animate-pulse"></span>
                    <span>${localizedStatus}</span>
                    <span class="material-symbols-outlined text-[14px]">unfold_more</span>
                </button>
            </div>

            <!-- Customer & Device Info -->
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold text-on-surface truncate">${customerName}</div>
                    <div class="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                        <span class="material-symbols-outlined text-[13px]">smartphone</span>
                        <span class="truncate">${r.device_model || '-'}</span>
                    </div>
                    <div class="text-xs text-on-surface-variant/80 mt-1 line-clamp-1 italic">
                        ${r.issue_description || ''}
                    </div>
                </div>

                <!-- Financial breakdown pill -->
                <div class="shrink-0 text-end">
                    <div class="text-base font-extrabold text-primary">${finances.total ? `₺${finances.total}` : '-'}</div>
                    ${finances.deposit > 0 ? `
                    <div class="text-[10px] text-emerald-400 font-semibold">${isAr ? 'المقدم: ' : 'Kapora: '}₺${finances.deposit}</div>
                    <div class="text-[10px] text-amber-400 font-semibold">${isAr ? 'المتبقي: ' : 'Kalan: '}₺${finances.remaining}</div>
                    ` : ''}
                </div>
            </div>

            <!-- Quick Actions Toolbar -->
            <div class="flex items-center gap-2 pt-2 border-t border-white/5">
                <!-- WhatsApp notification button -->
                <button type="button" class="btn-wa-notify-row flex-1 py-1.5 px-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black text-xs font-bold flex items-center justify-center gap-1 transition-all">
                    <span class="material-symbols-outlined text-[15px]">chat</span>
                    <span>${isAr ? 'واتساب' : 'WhatsApp'}</span>
                </button>

                <!-- Thermal Receipt Print -->
                <button type="button" class="btn-print-receipt-row flex-1 py-1.5 px-2 rounded-xl bg-white/5 border border-white/10 text-on-surface hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-1 transition-all">
                    <span class="material-symbols-outlined text-[15px]">receipt_long</span>
                    <span>${isAr ? 'إيصال' : 'Fiş'}</span>
                </button>

                <!-- Details / Modal -->
                <button type="button" class="btn-open-details-row py-1.5 px-3 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary hover:text-black text-xs font-bold flex items-center justify-center gap-1 transition-all">
                    <span class="material-symbols-outlined text-[15px]">edit</span>
                    <span class="hidden sm:inline">${isAr ? 'تفاصيل' : 'Detay'}</span>
                </button>
            </div>
        </div>

        <!-- DESKTOP TABLE ROW (>= md) -->
        <div class="list-ticket-row hidden md:grid grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer" data-id="${r.id}">
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
            <div class="col-span-3 text-sm text-on-surface font-semibold truncate">${customerName}</div>
            
            <!-- Device -->
            <div class="col-span-2 text-sm text-on-surface-variant flex items-center gap-1 truncate">
                <span class="material-symbols-outlined text-[14px]">smartphone</span> ${r.device_model}
            </div>

            <!-- Cost & Balance -->
            <div class="col-span-2 text-center text-sm font-bold text-primary">
                <div>${finances.total ? `₺${finances.total}` : '-'}</div>
                ${finances.deposit > 0 ? `<div class="text-[10px] text-amber-400 font-normal">${isAr ? 'المتبقي: ' : 'Kalan: '}₺${finances.remaining}</div>` : ''}
            </div>
            
            <!-- Status Badge (with 1-tap quick sheet trigger) -->
            <div class="col-span-1 flex justify-end">
                <button type="button" class="btn-quick-status-trigger text-[10px] uppercase font-bold px-2 py-1 rounded bg-surface-container border border-white/5 hover:border-primary/40 whitespace-nowrap ${meta.color} flex items-center gap-1 transition-all">
                    <span class="w-1.5 h-1.5 rounded-full ${meta.dot || 'bg-primary'}"></span>
                    <span>${localizedStatus}</span>
                </button>
            </div>
        </div>
        `;
    });

    // Wire clicks for list rows & cards to open full modal
    container.querySelectorAll('.list-ticket-row, .list-ticket-card').forEach(item => {
        item.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
            const ticketId = item.getAttribute('data-id')!;
            openTicketModal(ticketId);
        });
    });

    // Wire quick status trigger buttons
    container.querySelectorAll('.btn-quick-status-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = (btn as HTMLElement).closest('[data-id]');
            const ticketId = parent?.getAttribute('data-id');
            if (ticketId) openQuickStatusSheet(ticketId);
        });
    });

    // Wire WhatsApp notification button in mobile list
    container.querySelectorAll('.btn-wa-notify-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = (btn as HTMLElement).closest('[data-id]');
            const ticketId = parent?.getAttribute('data-id');
            const repair = repairsList.find(r => r.id === ticketId);
            if (repair) {
                sendWhatsAppNotification({
                    customerName: repair.customers?.name || (isAr ? 'عميلنا العزيز' : 'Değerli Müşterimiz'),
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

    // Wire Print Receipt button in mobile list
    container.querySelectorAll('.btn-print-receipt-row').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const parent = (btn as HTMLElement).closest('[data-id]');
            const ticketId = parent?.getAttribute('data-id');
            const repair = repairsList.find(r => r.id === ticketId);
            if (repair) {
                const fin = extractDepositAndRemaining(repair);
                await openReceiptPreviewModal({
                    ticketId: repair.id,
                    qrHash: repair.qr_hash || repair.id,
                    customerName: repair.customers?.name || 'Customer',
                    customerPhone: repair.customers?.phone,
                    deviceModel: repair.device_model,
                    issueDescription: repair.issue_description,
                    cost: fin.total,
                    deposit: fin.deposit,
                    remainingCost: fin.remaining,
                    paymentMethod: repair.payment_method,
                    priority: repair.priority,
                    createdAt: repair.created_at,
                    estimatedCompletion: repair.estimated_completion,
                    devicePasscode: repair.device_passcode,
                    intakeCondition: repair.intake_condition,
                    accessories: repair.accessories,
                    warrantyMonths: repair.warranty_months,
                    lang
                });
            }
        });
    });

    // Wire Open Details button in mobile list
    container.querySelectorAll('.btn-open-details-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = (btn as HTMLElement).closest('[data-id]');
            const ticketId = parent?.getAttribute('data-id');
            if (ticketId) openTicketModal(ticketId);
        });
    });
}

async function openTicketModal(ticketId: string) {
    await openTicketDetailsModal(ticketId, {
        onUpdate: (updated) => {
            const existing = repairsList.find(r => r.id === ticketId);
            if (existing && updated) {
                Object.assign(existing, updated);
            }
            renderBoard();
            renderTicketsList();
        },
        onDelete: (id) => {
            repairsList = repairsList.filter(r => r.id !== id);
            renderBoard();
            renderTicketsList();
        },
        onHandover: (id) => {
            repairsList = repairsList.filter(r => r.id !== id);
            renderBoard();
            renderTicketsList();
        }
    });
}
