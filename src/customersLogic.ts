import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getRepairs, getDevices } from './lib/repairService';
import { checkAuthSession } from './lib/authService';

let customers: any[] = [];
let repairs: any[] = [];
let devices: any[] = [];
let isAdmin = false;

async function loadData() {
    try {
        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

        customers = await getCustomers();
        repairs = await getRepairs();
        devices = await getDevices();

        renderCustomers();
        setupAdminUI();
    } catch (err) {
        console.error('Failed to load customers data', err);
    }
}

function getTicketCount(customerId: string) {
    return repairs.filter(r => r.customer_id === customerId).length;
}

function renderCustomers(filter = 'all', search = '') {
    const list = document.getElementById('customerList');
    if (!list) return;
    list.innerHTML = '';

    const lang = localStorage.getItem('appLang') || 'tr';

    let filtered = customers.filter(c => {
        const hasTickets = getTicketCount(c.id) > 0;
        const matchesFilter = filter === 'all' || 
            (filter === 'active' && hasTickets);
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search));
        return matchesFilter && matchesSearch;
    });

    filtered.forEach((c, index) => {
        const tickets = getTicketCount(c.id);
        
        const statusText = tickets > 0 ? (lang === 'ar' ? 'نشط' : 'Aktif') : (lang === 'ar' ? 'غير نشط' : 'Pasif');
        const statusColor = tickets > 0 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-on-surface-variant border-white/10 bg-black/20';
        
        const actionButtons = isAdmin ? `
            <button class="edit-btn w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary" data-id="${c.id}">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button class="delete-btn w-8 h-8 rounded-full bg-black/40 border border-error/30 inline-flex items-center justify-center hover:bg-error hover:text-black transition-colors text-error" data-id="${c.id}">
                <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
        ` : `
            <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
        `;

        list.innerHTML += `
            <div class="customer-row grid grid-cols-1 md:grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer" data-id="${c.id}">
                <!-- Row Number -->
                <div class="col-span-1 hidden md:block text-xs font-bold text-primary/70">${index + 1}</div>
                <!-- Customer Name & Avatar -->
                <div class="col-span-3 flex items-center gap-3">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30 group-hover:scale-110 transition-transform">
                        ${c.name.charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">${c.name}</h3>
                            
                        </div>
                        <span class="text-xs text-primary/70 truncate block">${c.id.split('-')[0].toUpperCase()}</span>
                    </div>
                </div>
                
                <!-- Contact -->
                <div class="col-span-3 flex items-center gap-2 text-sm text-on-surface-variant mt-2 md:mt-0">
                    <span class="material-symbols-outlined text-[16px] text-primary/70 md:hidden">call</span>
                    ${c.phone || '-'}
                </div>
                
                <!-- Status -->
                <div class="col-span-2 mt-2 md:mt-0">
                    <span class="px-2.5 py-1 rounded-full text-xs border ${statusColor} uppercase tracking-wider inline-block">
                        <span>${statusText}</span>
                    </span>
                </div>
                
                <!-- Tickets -->
                <div class="col-span-2 md:text-center mt-2 md:mt-0 text-sm text-on-surface-variant">
                    <span class="md:hidden font-bold">${lang === 'ar' ? 'التذاكر' : 'Talepler'}: </span>
                    <span class="text-primary font-bold">${tickets}</span>
                </div>
                
                <!-- Action -->
                <div class="col-span-1 flex items-center justify-end gap-2 mt-4 md:mt-0">
                    ${actionButtons}
                </div>
            </div>
        `;
    });

    // Wire up row details clicks
    document.querySelectorAll('.customer-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.edit-btn') || target.closest('.delete-btn')) return;
            const id = row.getAttribute('data-id')!;
            openCustomerDetailsModal(id);
        });
    });

    // Wire up edit/delete events
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            openCustomerModal(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع التذاكر المرتبطة به!' : 'Bu müşteriyi silmek istediğinize emin misiniz? Bağlı tüm talepler silinecektir!';
            if (confirm(confirmMsg)) {
                try {
                    await deleteCustomer(id);
                    await loadData();
                } catch (err: any) {
                    alert('Error: ' + err.message);
                }
            }
        });
    });
}

function openCustomerDetailsModal(id: string) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const lang = localStorage.getItem('appLang') || 'tr';
    const custDevices = devices.filter(d => d.customer_id === id);
    const custRepairs = repairs.filter(r => r.customer_id === id);

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';

    const devicesListHtml = custDevices.length > 0 ? custDevices.map(d => `
        <div class="p-3 bg-black/20 rounded border border-white/5 flex justify-between items-center text-sm">
            <span>${d.brand} ${d.model}</span>
            <span class="text-xs text-on-surface-variant font-mono">${d.imei || '-'}</span>
        </div>
    `).join('') : `<p class="text-xs text-on-surface-variant italic">${lang === 'ar' ? 'لا توجد أجهزة مسجلة' : 'Kayıtlı cihaz yok'}</p>`;

    const repairsListHtml = custRepairs.length > 0 ? custRepairs.map(r => {
        const shortTkt = r.id.split('-')[0].toUpperCase();
        return `
        <div class="p-3 bg-black/20 rounded border border-white/5 flex flex-col gap-1 text-sm text-start">
            <div class="flex justify-between items-center">
                <span class="font-bold text-primary">#TKT-${shortTkt}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">${r.status}</span>
            </div>
            <div class="text-xs text-on-surface-variant">${r.device_model}</div>
            <div class="text-xs text-on-surface font-body-md mt-1 border-t border-white/5 pt-1">${r.issue_description}</div>
            ${r.cost ? `<div class="text-xs text-primary font-bold mt-1">₺${r.cost}</div>` : ''}
        </div>
        `;
    }).join('') : `<p class="text-xs text-on-surface-variant italic">${lang === 'ar' ? 'لا توجد تذاكر مسجلة' : 'Kayıtlı talep yok'}</p>`;

    modal.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-md w-full relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <h2 class="text-2xl font-bold text-primary mb-2">${lang === 'ar' ? 'معلومات العميل' : 'Müşteri Detayları'}</h2>
        
        <div class="flex flex-col gap-3">
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الاسم' : 'Adı'}</label>
                <div class="font-body-lg text-on-surface font-bold">${customer.name}</div>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الهاتف' : 'Telefon'}</label>
                <div class="font-body-md text-on-surface">${customer.phone || '-'}</div>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'اللغة المفضلة' : 'Tercih Edilen Dil'}</label>
                <div class="font-body-md text-on-surface uppercase">${customer.preferred_language || 'tr'}</div>
            </div>
            
            <div class="border-t border-white/5 my-2"></div>
            
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الأجهزة المسجلة' : 'Kayıtlı Cihazlar'} (${custDevices.length})</label>
                <div class="flex flex-col gap-2 mt-1">
                    ${devicesListHtml}
                </div>
            </div>
            
            <div class="border-t border-white/5 my-2"></div>
            
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'سجل التذاكر' : 'Talep Geçmişi'} (${custRepairs.length})</label>
                <div class="flex flex-col gap-2 mt-1 max-h-48 overflow-y-auto no-scrollbar">
                    ${repairsListHtml}
                </div>
            </div>
        </div>
        
        <button id="close-details-modal" class="mt-4 btn-primary w-full py-3 rounded-xl font-bold">${lang === 'ar' ? 'إغلاق' : 'Kapat'}</button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-details-modal')?.addEventListener('click', () => modal.remove());
}

function setupAdminUI() {
    if (!isAdmin) return;

    const filterContainer = document.querySelector('.filter-pills');
    if (filterContainer && !document.getElementById('add-customer-btn')) {
        const addBtn = document.createElement('button');
        addBtn.id = 'add-customer-btn';
        const lang = localStorage.getItem('appLang') || 'tr';
        addBtn.textContent = lang === 'ar' ? '+ إضافة عميل' : '+ Müşteri Ekle';
        addBtn.className = 'px-4 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-black transition-all text-sm font-bold ml-2';
        addBtn.addEventListener('click', () => openCustomerModal());
        filterContainer.appendChild(addBtn);
    }
}

function openCustomerModal(id?: string) {
    const customer = id ? customers.find(c => c.id === id) : null;
    const lang = localStorage.getItem('appLang') || 'tr';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';
    
    const titleText = customer 
        ? (lang === 'ar' ? 'تعديل بيانات العميل' : 'Müşteri Bilgilerini Düzenle') 
        : (lang === 'ar' ? 'إضافة عميل جديد' : 'Yeni Müşteri Ekle');

    modal.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-sm w-full relative">
        <h2 class="text-2xl font-bold text-primary mb-2">${titleText}</h2>
        
        <form id="modal-customer-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الاسم الكامل' : 'Tam Adı'}</label>
                <input type="text" id="cust-name" required value="${customer ? customer.name : ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'رقم الهاتف' : 'Telefon Numarası'}</label>
                <input type="tel" id="cust-phone" value="${customer ? customer.phone || '' : ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
            </div>
            <div class="flex flex-col gap-1 relative">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'اللغة المفضلة' : 'Tercih Edilen Dil'}</label>
                <input type="text" id="cust-lang-display" readonly value="${customer && customer.preferred_language === 'ar' ? 'العربية' : 'Türkçe'}" data-value="${customer ? customer.preferred_language : 'tr'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors cursor-pointer bg-black/40">
                <div id="cust-lang-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-surface-container-high/95 backdrop-blur-xl border border-primary/20 rounded-lg hidden z-50 max-h-48 overflow-y-auto divide-y divide-white/5 shadow-lg no-scrollbar">
                    <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="tr">Türkçe</div>
                    <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="ar">العربية</div>
                </div>
            </div>
            
            <div class="flex gap-2 mt-4">
                <button type="button" id="close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-lg font-bold hover:bg-white/5 transition-colors">${lang === 'ar' ? 'إلغاء' : 'İptal'}</button>
                <button type="submit" class="w-1/2 btn-primary py-3 rounded-lg font-bold">${lang === 'ar' ? 'حفظ' : 'Kaydet'}</button>
            </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const langDisplay = modal.querySelector('#cust-lang-display') as HTMLInputElement;
    const langSuggestions = modal.querySelector('#cust-lang-suggestions') as HTMLDivElement;

    if (langDisplay && langSuggestions) {
        langDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            langSuggestions.classList.toggle('hidden');
        });

        langSuggestions.querySelectorAll('div').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-val')!;
                langDisplay.value = item.textContent || '';
                langDisplay.setAttribute('data-value', val);
                langSuggestions.classList.add('hidden');
            });
        });

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target !== langDisplay && !langSuggestions.contains(target)) {
                langSuggestions.classList.add('hidden');
            }
        });
    }

    modal.querySelector('#close-modal')?.addEventListener('click', () => modal.remove());
    
    modal.querySelector('#modal-customer-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (modal.querySelector('#cust-name') as HTMLInputElement).value;
        const phone = (modal.querySelector('#cust-phone') as HTMLInputElement).value;
        const preferred_language = (modal.querySelector('#cust-lang-display') as HTMLInputElement).getAttribute('data-value') || 'tr';

        try {
            if (customer) {
                await updateCustomer(customer.id, name, phone, preferred_language);
            } else {
                await createCustomer(name, phone, preferred_language);
            }
            modal.remove();
            await loadData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    const searchInput = document.getElementById('customerSearch');
    const pills = document.querySelectorAll('.filter-pills button');
    let currentFilter = 'all';

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCustomers(currentFilter, (e.target as HTMLInputElement).value);
        });
    }

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => {
                if (p.id !== 'add-customer-btn') {
                    p.classList.remove('bg-primary/10', 'text-primary', 'border-primary');
                    p.classList.add('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
                }
            });
            pill.classList.remove('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            pill.classList.add('bg-primary/10', 'text-primary', 'border-primary');
            currentFilter = pill.getAttribute('data-filter') || 'all';
            if (searchInput) renderCustomers(currentFilter, (searchInput as HTMLInputElement).value);
        });
    });
});
