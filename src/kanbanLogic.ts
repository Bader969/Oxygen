function getStatusLabel(status: string, lang: string) {
    if (status === 'pending') return lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor';
    if (status === 'in_progress') return lang === 'ar' ? 'قيد الإصلاح' : 'Onarımda';
    if (status === 'quality_check') return lang === 'ar' ? 'فحص الجودة' : 'Kalite Kontrol';
    if (status === 'ready_for_pickup') return lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır';
    return status;
}
import { getRepairs, updateRepairStatusAndCost, createCustomer, createRepairTicket, deleteRepair, updateRepair } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { dictionary, getLang } from './lib/i18n';

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
        
        await createRepairTicket({ customerId: c1.id, deviceModel: 'iPhone 14 Pro', issueDescription: 'Screen Replacement', cost: 150 });
        await createRepairTicket({ customerId: c2.id, deviceModel: 'MacBook Air M2', issueDescription: 'Battery Issue', cost: 85 });
        const t3 = await createRepairTicket({ customerId: c3.id, deviceModel: 'iPad Pro 12.9"', issueDescription: 'Logic Board Repair', cost: 250 });
        const t4 = await createRepairTicket({ customerId: c4.id, deviceModel: 'Samsung Galaxy S23', issueDescription: 'Diagnostic', cost: 45 });
        const t5 = await createRepairTicket({ customerId: c1.id, deviceModel: 'Apple Watch Ultra', issueDescription: 'Screen polish', cost: 100 });
        
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
    'ready_for_pickup': { color: 'text-emerald-400', border: 'border-emerald-500/20', hoverShadow: 'rgba(16,185,129,0.3)', hoverBorder: 'border-emerald-500/50', icon: 'done_all' }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        repairsList = await seedDataIfEmpty();
        
        const cols = document.querySelectorAll('.group\\/col');
        const newTicketsCol = cols[0]?.querySelector('.overflow-y-auto') as HTMLElement;
        const inProgressCol = cols[1]?.querySelector('.overflow-y-auto') as HTMLElement;
        const qualityCheckCol = cols[2]?.querySelector('.overflow-y-auto') as HTMLElement;
        const completedCol = cols[3]?.querySelector('.overflow-y-auto') as HTMLElement;

        if (newTicketsCol) { newTicketsCol.innerHTML = ''; newTicketsCol.dataset.status = 'pending'; }
        if (inProgressCol) { inProgressCol.innerHTML = ''; inProgressCol.dataset.status = 'in_progress'; }
        if (qualityCheckCol) { qualityCheckCol.innerHTML = ''; qualityCheckCol.dataset.status = 'quality_check'; qualityCheckCol.classList.remove('opacity-50', 'items-center', 'justify-center'); }
        if (completedCol) { completedCol.innerHTML = ''; completedCol.dataset.status = 'ready_for_pickup'; }

        // Counters
        const counts: any = { 'pending': 0, 'in_progress': 0, 'quality_check': 0, 'ready_for_pickup': 0 };

        repairsList.forEach(repair => {
            counts[repair.status] = (counts[repair.status] || 0) + 1;
            const meta = statusMeta[repair.status] || statusMeta['pending'];
            const shortId = repair.id.split('-')[0].toUpperCase();
            const customerName = repair.customers?.name || ('Customer ' + repair.customer_id.substring(0,6));
            
            let extraHtml = '';
            if (repair.status === 'in_progress') {
                extraHtml = `
                <div class="w-full bg-surface-container-high h-1 mt-2 rounded-full overflow-hidden pointer-events-none">
                    <div class="bg-primary h-full w-[45%] shadow-[0_0_5px_rgba(227,30,36,0.8)]"></div>
                </div>`;
            } else if (repair.status === 'ready_for_pickup') {
                extraHtml = `<button class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded text-xs font-bold hover:bg-emerald-500 hover:text-black transition-colors pointer-events-auto">Notify User</button>`;
            }

            const cardHtml = `
            <div data-id="${repair.id}" class="kanban-card cursor-grab bg-black/40 backdrop-blur-md p-stack-md rounded-lg border ${meta.border} hover:shadow-[0_0_20px_-5px_${meta.hoverShadow}] hover:${meta.hoverBorder} transition-all duration-300 relative mb-4">
                <div class="flex justify-between items-start mb-2 pointer-events-none">
                    <span class="font-label-caps text-label-caps ${meta.color} uppercase tracking-wider">#TKT-${shortId}</span>
                    ${meta.icon !== 'smartphone' ? `<span class="material-symbols-outlined ${meta.color} text-[18px]">${meta.icon}</span>` : ''}
                </div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1 pointer-events-none">${customerName}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 pointer-events-none">
                    <span class="material-symbols-outlined text-[16px]">devices</span> ${repair.device_model}
                </p>
                <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between pointer-events-none">
                    <span class="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded line-clamp-1 w-full text-ellipsis overflow-hidden break-all">${repair.issue_description}</span>
                </div>
                ${extraHtml}
            </div>
            `;
            
            if (repair.status === 'pending' && newTicketsCol) newTicketsCol.insertAdjacentHTML('beforeend', cardHtml);
            else if (repair.status === 'in_progress' && inProgressCol) inProgressCol.insertAdjacentHTML('beforeend', cardHtml);
            else if (repair.status === 'quality_check' && qualityCheckCol) qualityCheckCol.insertAdjacentHTML('beforeend', cardHtml);
            else if (repair.status === 'ready_for_pickup' && completedCol) completedCol.insertAdjacentHTML('beforeend', cardHtml);
        });

        // Update counts
        if (cols[0]) { const b = cols[0].querySelector('.bg-surface-container-high'); if (b) b.textContent = counts['pending']; }
        if (cols[1]) { const b = cols[1].querySelector('.bg-primary\\/20'); if (b) b.textContent = counts['in_progress']; }
        if (cols[2]) { const b = cols[2].querySelector('.bg-surface-container-high'); if (b) b.textContent = counts['quality_check']; }
        if (cols[3]) { const b = cols[3].querySelector('.bg-surface-container-high'); if (b) b.textContent = counts['ready_for_pickup']; }

        // Wire up ticket card clicks to edit modal
        document.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                const ticketId = card.getAttribute('data-id')!;
                openTicketModal(ticketId);
            });
        });

        const sortableOptions = {
            group: 'kanban',
            animation: 150,
            ghostClass: 'opacity-50',
            dragClass: 'scale-105',
            onEnd: async function (evt: any) {
                const itemEl = evt.item;
                const toList = evt.to;
                
                const ticketId = itemEl.getAttribute('data-id');
                const newStatus = toList.getAttribute('data-status');
                
                if (ticketId && newStatus && evt.from !== evt.to) {
                    itemEl.style.opacity = '0.5';
                    try {
                        await updateRepairStatusAndCost(ticketId, newStatus as any);
                        window.location.reload();
                    } catch (err: any) {
                        alert('Failed to update status: ' + err.message);
                        evt.from.appendChild(itemEl);
                        itemEl.style.opacity = '1';
                    }
                }
            },
        };

        if (newTicketsCol) Sortable.create(newTicketsCol, sortableOptions);
        if (inProgressCol) Sortable.create(inProgressCol, sortableOptions);
        if (qualityCheckCol) Sortable.create(qualityCheckCol, sortableOptions);
        if (completedCol) Sortable.create(completedCol, sortableOptions);

        // View Mode Toggles
        const btnBoard = document.getElementById('view-toggle-board') as HTMLButtonElement;
        const btnList = document.getElementById('view-toggle-list') as HTMLButtonElement;
        const viewBoard = document.getElementById('kanban-board-view') as HTMLDivElement;
        const viewList = document.getElementById('kanban-list-view') as HTMLDivElement;

        if (btnBoard && btnList && viewBoard && viewList) {
            btnBoard.addEventListener('click', () => {
                btnBoard.className = 'px-4 py-1.5 rounded-full bg-primary text-black font-bold transition-all duration-300';
                btnList.className = 'px-4 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all duration-300';
                
                viewBoard.classList.remove('hidden');
                viewList.classList.add('hidden');
            });

            btnList.addEventListener('click', () => {
                btnList.className = 'px-4 py-1.5 rounded-full bg-primary text-black font-bold transition-all duration-300';
                btnBoard.className = 'px-4 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all duration-300';
                
                viewList.classList.remove('hidden');
                viewBoard.classList.add('hidden');
                
                renderTicketsList();
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
                    { value: 'ready_for_pickup', key: 'kanban.filterReady' }
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

    let filtered = [...repairsList];
    if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
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
        container.innerHTML = `<div class="text-center py-12"><p class="text-xs text-on-surface-variant italic">No matching tickets found.</p></div>`;
        return;
    }

    filtered.forEach((r, index) => {
        const shortId = r.id.split('-')[0].toUpperCase();
        const customerName = r.customers?.name || 'Unknown';
        const meta = statusMeta[r.status] || statusMeta['pending'];
        
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
                    <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">#TKT-${shortId}</h3>
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
                <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-container border border-white/5 whitespace-nowrap">${r.status.replace('_', ' ')}</span>
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
        const repairsList = await getRepairs();
        const repair = repairsList.find(r => r.id === ticketId);
        if (!repair) return;

        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

        const lang = localStorage.getItem('appLang') || 'tr';
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';

        const statusOptions = `
            <option value="pending" ${repair.status === 'pending' ? 'selected' : ''}>${lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor'}</option>
            <option value="in_progress" ${repair.status === 'in_progress' ? 'selected' : ''}>${lang === 'ar' ? 'قيد الإصلاح' : 'Onarımda'}</option>
            <option value="quality_check" ${repair.status === 'quality_check' ? 'selected' : ''}>${lang === 'ar' ? 'فحص الجودة' : 'Kalite Kontrol'}</option>
            <option value="ready_for_pickup" ${repair.status === 'ready_for_pickup' ? 'selected' : ''}>${lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır'}</option>
        `;

        const deleteBtnHtml = isAdmin ? `
            <button type="button" id="delete-ticket-btn" class="w-full bg-error/10 hover:bg-error text-error hover:text-black border border-error/30 font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2">
                ${lang === 'ar' ? 'حذف التذكرة' : 'Talebi Sil'}
            </button>
        ` : '';

        modal.innerHTML = `
          <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-sm w-full relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <h2 class="text-2xl font-bold text-primary mb-2">${lang === 'ar' ? 'تفاصيل التذكرة' : 'Talep Detayları'}</h2>
            
            <form id="modal-ticket-form" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'العميل' : 'Müşteri'}</label>
                    <div class="font-body-md text-on-surface py-1">${repair.customers?.name || 'Unknown'}</div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الجهاز' : 'Cihaz'}</label>
                    <input type="text" id="ticket-device" required value="${repair.device_model}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'وصف المشكلة' : 'Sorun Açıklaması'}</label>
                    <textarea id="ticket-issue" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors h-24 resize-none">${repair.issue_description}</textarea>
                </div>
                <div class="flex flex-col gap-1 relative">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الحالة' : 'Durum'}</label>
                    <input type="text" id="ticket-status-display" readonly value="${getStatusLabel(repair.status, lang)}" data-value="${repair.status}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors cursor-pointer bg-black/40">
                    <div id="ticket-status-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-surface-container-high/95 backdrop-blur-xl border border-primary/20 rounded-lg hidden z-50 max-h-48 overflow-y-auto divide-y divide-white/5 shadow-lg no-scrollbar">
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="pending">${lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="in_progress">${lang === 'ar' ? 'قيد الإصلاح' : 'Onarımda'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="quality_check">${lang === 'ar' ? 'فحص الجودة' : 'Kalite Kontrol'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="ready_for_pickup">${lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır'}</div>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'التكلفة (₺)' : 'Maliyet (₺)'}</label>
                    <input type="number" id="ticket-cost" step="0.01" value="${repair.cost || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
                </div>
                
                <div class="flex gap-2 mt-4">
                    <button type="button" id="close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-lg font-bold hover:bg-white/5 transition-colors">${lang === 'ar' ? 'إلغاء' : 'İptal'}</button>
                    <button type="submit" class="w-1/2 btn-primary py-3 rounded-lg font-bold">${lang === 'ar' ? 'حفظ' : 'Kaydet'}</button>
                </div>
                <button type="button" id="view-qr-btn" class="w-full bg-primary/20 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2">
                    ${lang === 'ar' ? 'عرض رمز QR' : 'QR Kodunu Göster'}
                </button>
                ${deleteBtnHtml}
            </form>
          </div>
        `;

        document.body.appendChild(modal);

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

        modal.querySelector('#close-modal')?.addEventListener('click', () => modal.remove());

        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذه التذكرة؟' : 'Bu talebi silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticketId);
                    modal.remove();
                    window.location.reload();
                } catch (err: any) {
                    alert('Error deleting ticket: ' + err.message);
                }
            }
        });

        modal.querySelector('#view-qr-btn')?.addEventListener('click', async () => {
            try {
                const qrUrl = await generateQrCodeDataUrl(repair.qr_hash);
                const qrOverlay = document.createElement('div');
                qrOverlay.className = 'fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6';
                qrOverlay.innerHTML = `
                  <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
                    <h2 class="text-2xl font-bold text-primary">TKT-${repair.id.split('-')[0].toUpperCase()}</h2>
                    <div class="bg-white p-4 rounded-xl shadow-lg">
                        <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded" />
                    </div>
                    <p class="font-mono text-xs text-on-surface-variant mt-2 break-all">${repair.qr_hash}</p>
                    <button id="close-qr-overlay" class="mt-4 btn-primary w-full py-3 rounded-xl font-bold">${lang === 'ar' ? 'إغلاق' : 'Kapat'}</button>
                  </div>
                `;
                document.body.appendChild(qrOverlay);
                qrOverlay.querySelector('#close-qr-overlay')?.addEventListener('click', () => qrOverlay.remove());
            } catch (err: any) {
                alert('Failed to generate QR Code: ' + err.message);
            }
        });

        modal.querySelector('#modal-ticket-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const deviceModel = (modal.querySelector('#ticket-device') as HTMLInputElement).value;
            const issueDescription = (modal.querySelector('#ticket-issue') as HTMLTextAreaElement).value;
            const status = (modal.querySelector('#ticket-status-display') as HTMLInputElement).getAttribute('data-value')!;
            const costVal = (modal.querySelector('#ticket-cost') as HTMLInputElement).value;
            const cost = costVal ? parseFloat(costVal) : undefined;

            try {
                await updateRepair(ticketId, { deviceModel, issueDescription, status, cost });
                modal.remove();
                window.location.reload();
            } catch (err: any) {
                alert('Error updating ticket: ' + err.message);
            }
        });
    } catch (err: any) {
        console.error('Modal launch failed', err);
    }
}
