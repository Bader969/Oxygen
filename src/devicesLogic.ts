import { getDevices, createDevice, updateDevice, deleteDevice, getCustomers, getRepairs } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';

let devices: any[] = [];
let customers: any[] = [];
let repairs: any[] = [];
let isAdmin = false;

async function seedDevicesIfEmpty() {
    const devs = await getDevices();
    if (devs && devs.length > 0) return devs;

    console.log("No devices found in DB. Seeding mock devices...");
    try {
        const custs = await getCustomers();
        if (!custs || custs.length === 0) return [];

        const c1 = custs.find(c => c.name === 'Sarah Jenkins');
        const c2 = custs.find(c => c.name === 'Marcus Thorne');
        const c3 = custs.find(c => c.name === 'Elena Rostova');
        const c4 = custs.find(c => c.name === 'David Kim');

        if (c1) {
            await createDevice(c1.id, 'Apple', 'iPhone 14 Pro', 'phone', '358911002233445');
            await createDevice(c1.id, 'Apple', 'Apple Watch Ultra', 'watch', '358911002233999');
        }
        if (c2) {
            await createDevice(c2.id, 'Apple', 'MacBook Air M2', 'laptop', '358911002233555');
        }
        if (c3) {
            await createDevice(c3.id, 'Apple', 'iPad Pro 12.9"', 'tablet', '358911002233666');
        }
        if (c4) {
            await createDevice(c4.id, 'Samsung', 'Galaxy S23', 'phone', '358911002233777');
        }

        return await getDevices();
    } catch (e) {
        console.error("Device seeding failed", e);
        return [];
    }
}

async function loadData() {
    try {
        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

        customers = await getCustomers();
        devices = await seedDevicesIfEmpty();
        repairs = await getRepairs();

        renderDevices();
        setupAdminUI();
    } catch (err) {
        console.error('Failed to load devices data', err);
    }
}

function renderDevices(filter = 'all', search = '') {
    const list = document.getElementById('deviceList');
    if (!list) return;
    list.innerHTML = '';

    const lang = localStorage.getItem('appLang') || 'tr';

    let filtered = devices.filter(d => {
        const matchesFilter = filter === 'all' || d.type === filter;
        const matchesSearch = d.model.toLowerCase().includes(search.toLowerCase()) || 
            d.brand.toLowerCase().includes(search.toLowerCase()) || 
            (d.imei && d.imei.includes(search)) || 
            (d.customers?.name && d.customers.name.toLowerCase().includes(search.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    filtered.forEach((d, index) => {
        const ownerName = d.customers?.name || '-';
        const icon = d.type === 'laptop' ? 'laptop_mac' : (d.type === 'tablet' ? 'tablet_mac' : 'smartphone');
        
        // Find if this device has a repair ticket
        const devRepair = repairs.find(r => r.device_id === d.id);
        const qrButton = devRepair ? `
            <button class="qr-btn w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary" data-qr="${devRepair.qr_hash}" data-tkt="TKT-${devRepair.id.split('-')[0].toUpperCase()}" title="${lang === 'ar' ? 'عرض رمز QR' : 'QR Kodunu Göster'}">
                <span class="material-symbols-outlined text-[16px]">qr_code</span>
            </button>
        ` : '';

        const actionButtons = isAdmin ? `
            ${qrButton}
            <button class="edit-btn w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary" data-id="${d.id}">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button class="delete-btn w-8 h-8 rounded-full bg-black/40 border border-error/30 inline-flex items-center justify-center hover:bg-error hover:text-black transition-colors text-error" data-id="${d.id}">
                <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
        ` : `
            ${qrButton}
            <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
                <span class="material-symbols-outlined text-[18px]">build</span>
            </button>
        `;

        list.innerHTML += `
            <div class="device-row grid grid-cols-1 md:grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer" data-id="${d.id}">
                <!-- Row Number -->
                <div class="col-span-1 hidden md:block text-xs font-bold text-primary/70">${index + 1}</div>
                <!-- Device -->
                <div class="col-span-3 flex items-center gap-3">
                    <div class="w-10 h-10 shrink-0 rounded-xl bg-black/40 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[24px]">${icon}</span>
                    </div>
                    <div class="min-w-0">
                        <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">${d.brand} ${d.model}</h3>
                        <span class="text-xs text-primary/70 truncate block">${d.id.split('-')[0].toUpperCase()}</span>
                    </div>
                </div>
                
                <!-- Owner -->
                <div class="col-span-3 flex items-center gap-2 text-sm text-on-surface-variant mt-2 md:mt-0">
                    <span class="material-symbols-outlined text-[16px] text-primary/70 md:hidden">person</span>
                    ${ownerName}
                </div>
                
                <!-- IMEI -->
                <div class="col-span-3 mt-2 md:mt-0">
                    <span class="font-mono text-xs text-on-surface-variant px-2 py-1 bg-black/20 rounded border border-white/5">
                        ${d.imei || '-'}
                    </span>
                </div>
                
                <!-- Action -->
                <div class="col-span-2 flex items-center justify-end gap-2 mt-4 md:mt-0">
                    ${actionButtons}
                </div>
            </div>
        `;
    });

    // Wire up row details clicks
    document.querySelectorAll('.device-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.edit-btn') || target.closest('.delete-btn') || target.closest('.qr-btn')) return;
            const id = row.getAttribute('data-id')!;
            openDeviceDetailsModal(id);
        });
    });

    // Wire up edit/delete/qr events
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            openDeviceModal(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذا الجهاز؟' : 'Bu cihazı silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteDevice(id);
                    await loadData();
                } catch (err: any) {
                    alert('Error: ' + err.message);
                }
            }
        });
    });

    document.querySelectorAll('.qr-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const qrHash = (btn as HTMLElement).dataset.qr!;
            const tktName = (btn as HTMLElement).dataset.tkt!;
            showQrOverlay(qrHash, tktName);
        });
    });
}

async function showQrOverlay(qrHash: string, tktName: string) {
    const lang = localStorage.getItem('appLang') || 'tr';
    try {
        const qrUrl = await generateQrCodeDataUrl(qrHash);
        const qrOverlay = document.createElement('div');
        qrOverlay.className = 'fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6';
        qrOverlay.innerHTML = `
          <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
            <h2 class="text-2xl font-bold text-primary">${tktName}</h2>
            <div class="bg-white p-4 rounded-xl shadow-lg">
                <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded" />
            </div>
            <p class="font-mono text-xs text-on-surface-variant mt-2 break-all">${qrHash}</p>
            <button id="close-qr-overlay" class="mt-4 btn-primary w-full py-3 rounded-xl font-bold">${lang === 'ar' ? 'إغلاق' : 'Kapat'}</button>
          </div>
        `;
        document.body.appendChild(qrOverlay);
        qrOverlay.querySelector('#close-qr-overlay')?.addEventListener('click', () => qrOverlay.remove());
    } catch (err: any) {
        alert('Failed to generate QR Code: ' + err.message);
    }
}

function openDeviceDetailsModal(id: string) {
    const d = devices.find(dev => dev.id === id);
    if (!d) return;

    const lang = localStorage.getItem('appLang') || 'tr';
    const owner = customers.find(c => c.id === d.customer_id);
    const devRepairs = repairs.filter(r => r.device_id === d.id);

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';

    const repairsListHtml = devRepairs.length > 0 ? devRepairs.map(r => {
        const shortTkt = r.id.split('-')[0].toUpperCase();
        return `
        <div class="p-3 bg-black/20 rounded border border-white/5 flex flex-col gap-1 text-sm text-start">
            <div class="flex justify-between items-center">
                <span class="font-bold text-primary">#TKT-${shortTkt}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">${r.status}</span>
            </div>
            <div class="text-xs text-on-surface-variant font-body-md mt-1 border-t border-white/5 pt-1">${r.issue_description}</div>
            ${r.cost ? `<div class="text-xs text-primary font-bold mt-1">₺${r.cost}</div>` : ''}
            <button class="tkt-qr-btn mt-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold py-1 px-3 rounded text-xs transition-colors" data-qr="${r.qr_hash}" data-tkt="TKT-${shortTkt}">
                ${lang === 'ar' ? 'عرض رمز QR' : 'QR Kodunu Göster'}
            </button>
        </div>
        `;
    }).join('') : `<p class="text-xs text-on-surface-variant italic text-center">${lang === 'ar' ? 'لا توجد إصلاحات مسجلة' : 'Kayıtlı onarım yok'}</p>`;

    modal.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-md w-full relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <h2 class="text-2xl font-bold text-primary mb-2">${lang === 'ar' ? 'تفاصيل Cihaz' : 'Cihaz Detayları'}</h2>
        
        <div class="flex flex-col gap-3">
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الجهاز' : 'Cihaz'}</label>
                <div class="font-body-lg text-on-surface font-bold">${d.brand} ${d.model}</div>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'النوع' : 'Tip'}</label>
                <div class="font-body-md text-on-surface capitalize">${d.type}</div>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">IMEI / Serial</label>
                <div class="font-body-md text-on-surface font-mono">${d.imei || '-'}</div>
            </div>
            
            <div class="border-t border-white/5 my-2"></div>
            
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'العميل المالك' : 'Sahibi (Müşteri)'}</label>
                <div class="p-3 bg-black/20 rounded border border-white/5 mt-1 flex flex-col gap-1 text-sm">
                    <div class="font-bold text-on-surface">${owner ? owner.name : '-'}</div>
                    <div class="text-xs text-on-surface-variant">${owner ? owner.phone : '-'}</div>
                </div>
            </div>
            
            <div class="border-t border-white/5 my-2"></div>
            
            <div>
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'تاريخ الإصلاحات' : 'Onarım Geçmişi'} (${devRepairs.length})</label>
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

    modal.querySelectorAll('.tkt-qr-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const qrHash = (btn as HTMLElement).dataset.qr!;
            const tktName = (btn as HTMLElement).dataset.tkt!;
            showQrOverlay(qrHash, tktName);
        });
    });
}

function setupAdminUI() {
    if (!isAdmin) return;

    const filterContainer = document.querySelector('.filter-pills');
    if (filterContainer && !document.getElementById('add-device-btn')) {
        const addBtn = document.createElement('button');
        addBtn.id = 'add-device-btn';
        const lang = localStorage.getItem('appLang') || 'tr';
        addBtn.textContent = lang === 'ar' ? '+ إضافة جهاز' : '+ Cihaz Ekle';
        addBtn.className = 'px-4 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-black transition-all text-sm font-bold ml-2';
        addBtn.addEventListener('click', () => openDeviceModal());
        filterContainer.appendChild(addBtn);
    }
}

function openDeviceModal(id?: string) {
    const device = id ? devices.find(d => d.id === id) : null;
    const lang = localStorage.getItem('appLang') || 'tr';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';
    
    const titleText = device 
        ? (lang === 'ar' ? 'تعديل تفاصيل الجهاز' : 'Cihaz Detaylarını Düzenle') 
        : (lang === 'ar' ? 'إضافة جهاز جديد' : 'Yeni Cihaz Ekle');

    const customerOptions = customers.map(c => `
        <option value="${c.id}" ${device && device.customer_id === c.id ? 'selected' : ''}>${c.name}</option>
    `).join('');

    modal.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-sm w-full relative">
        <h2 class="text-2xl font-bold text-primary mb-2">${titleText}</h2>
        
        <form id="modal-device-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'العميل المالك' : 'Sahibi (Müşteri)'}</label>
                <select id="dev-customer" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors appearance-none bg-black/40">
                    ${customerOptions}
                </select>
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'العلامة التجارية' : 'Marka'}</label>
                <input type="text" id="dev-brand" placeholder="e.g. Apple" required value="${device ? device.brand : ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الموديل' : 'Model'}</label>
                <input type="text" id="dev-model" placeholder="e.g. iPhone 14" required value="${device ? device.model : ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'النوع' : 'Tip'}</label>
                <select id="dev-type" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors appearance-none bg-black/40">
                    <option value="phone" ${device && device.type === 'phone' ? 'selected' : ''}>${lang === 'ar' ? 'هاتف' : 'Telefon'}</option>
                    <option value="laptop" ${device && device.type === 'laptop' ? 'selected' : ''}>${lang === 'ar' ? 'حاسب محمول' : 'Laptop'}</option>
                    <option value="tablet" ${device && device.type === 'tablet' ? 'selected' : ''}>${lang === 'ar' ? 'تابلت' : 'Tablet'}</option>
                    <option value="watch" ${device && device.type === 'watch' ? 'selected' : ''}>${lang === 'ar' ? 'ساعة ذكية' : 'Akıllı Saat'}</option>
                    <option value="other" ${device && device.type === 'other' ? 'selected' : ''}>${lang === 'ar' ? 'آخر' : 'Diğer'}</option>
                </select>
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">IMEI / Serial</label>
                <input type="text" id="dev-imei" value="${device ? device.imei : ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
            </div>
            
            <div class="flex gap-2 mt-4">
                <button type="button" id="close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-lg font-bold hover:bg-white/5 transition-colors">${lang === 'ar' ? 'إلغاء' : 'İptal'}</button>
                <button type="submit" class="w-1/2 btn-primary py-3 rounded-lg font-bold">${lang === 'ar' ? 'حفظ' : 'Kaydet'}</button>
            </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-modal')?.addEventListener('click', () => modal.remove());
    
    modal.querySelector('#modal-device-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = (modal.querySelector('#dev-customer') as HTMLSelectElement).value;
        const brand = (modal.querySelector('#dev-brand') as HTMLInputElement).value;
        const modelName = (modal.querySelector('#dev-model') as HTMLInputElement).value;
        const type = (modal.querySelector('#dev-type') as HTMLSelectElement).value;
        const imei = (modal.querySelector('#dev-imei') as HTMLInputElement).value;

        try {
            if (device) {
                await updateDevice(device.id, brand, modelName, type, imei);
            } else {
                await createDevice(customerId, brand, modelName, type, imei);
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

    const searchInput = document.getElementById('deviceSearch');
    const pills = document.querySelectorAll('.filter-pills button');
    let currentFilter = 'all';

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderDevices(currentFilter, (e.target as HTMLInputElement).value);
        });
    }

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => {
                if (p.id !== 'add-device-btn') {
                    p.classList.remove('bg-primary/10', 'text-primary', 'border-primary');
                    p.classList.add('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
                }
            });
            pill.classList.remove('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            pill.classList.add('bg-primary/10', 'text-primary', 'border-primary');
            currentFilter = pill.getAttribute('data-filter') || 'all';
            if (searchInput) renderDevices(currentFilter, (searchInput as HTMLInputElement).value);
        });
    });
});
