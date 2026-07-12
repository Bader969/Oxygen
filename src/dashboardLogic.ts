import { getRepairs, deleteRepair, updateRepair } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { dictionary, applyTranslation } from './lib/i18n';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const repairs = await getRepairs();
        
        // Calculate Metrics
        const openRepairs = repairs.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
        const readyRepairs = repairs.filter(r => r.status === 'completed' || r.status === 'ready_for_pickup').length;
        
        // Simple income calculation: sum of cost of completed repairs
        // In a real app, you'd filter by today's date
        const income = repairs
            .filter(r => (r.status === 'completed' || r.status === 'ready_for_pickup') && r.cost)
            .reduce((sum, r) => sum + (r.cost || 0), 0);

        // Update DOM
        const elOpen = document.getElementById('metric-open');
        const elReady = document.getElementById('metric-ready');
        const elIncome = document.getElementById('metric-income');
        
        if (elOpen) elOpen.textContent = openRepairs.toString();
        if (elReady) elReady.textContent = readyRepairs.toString();
        if (elIncome) elIncome.textContent = `₺${income.toLocaleString('tr-TR')}`; // Using ₺

        // Get user session details and render dynamic localized greeting
        const user = await checkAuthSession();
        let userName = 'Technician';
        if (user) {
            if (user.user_metadata?.name && user.user_metadata.name.trim() !== '') {
                // Prefer the saved display name
                userName = user.user_metadata.name.trim();
            } else if (user.email) {
                // Fall back to capitalised email prefix
                const emailPrefix = user.email.split('@')[0];
                userName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            }
        }

        const hours = new Date().getHours();

        // Build the time-of-day greeting phrase for EACH language
        let trGreeting: string;
        if (hours >= 5 && hours < 12) {
            trGreeting = 'Günaydın,';
        } else if (hours >= 12 && hours < 17) {
            trGreeting = 'Tünaydın,';
        } else {
            trGreeting = 'İyi akşamlar,';
        }

        const arGreeting = (hours >= 5 && hours < 12) ? 'صباح الخير،' : 'مساء الخير،';

        // Inject personalised greeting into BOTH dictionary entries so the
        // language-toggle (applyTranslation) always re-renders the correct one
        dictionary['tr']['dash.welcome'] = `${trGreeting} ${userName}`;
        dictionary['ar']['dash.welcome'] = `${arGreeting} ${userName}`;

        // Restore data-i18n so applyTranslation keeps control of this element
        const elWelcome = document.getElementById('welcome-greeting');
        if (elWelcome) {
            elWelcome.setAttribute('data-i18n', 'dash.welcome');
        }

        // Re-run translation to render the greeting in the active language
        applyTranslation();

        // Admin check for Income card
        const elIncomeCard = document.getElementById('metric-income-card');
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
        if (elIncomeCard) {
            if (isAdmin) {
                elIncomeCard.style.display = 'flex';
            } else {
                elIncomeCard.style.display = 'none';
            }
        }

        // Populate Recent Tickets
        const recentList = document.getElementById('recent-tickets-list');
        if (recentList) {
            recentList.innerHTML = '';
            // Get 3 most recent
            const recent = repairs.slice(0, 3);
            
            recent.forEach(ticket => {
                let statusClass = '';
                let statusText = '';
                let icon = 'smartphone';
                
                if (ticket.device_model.toLowerCase().includes('mac') || ticket.device_model.toLowerCase().includes('laptop')) {
                    icon = 'laptop_mac';
                } else if (ticket.device_model.toLowerCase().includes('pad') || ticket.device_model.toLowerCase().includes('tablet')) {
                    icon = 'tablet_mac';
                } else if (ticket.device_model.toLowerCase().includes('watch')) {
                    icon = 'watch';
                }
                
                const lang = localStorage.getItem('appLang') || 'tr';
                const statusLabels = {
                    'tr': { 'pending': 'Bekliyor', 'in_progress': 'Onarımda', 'quality_check': 'Kalite Kontrol', 'ready_for_pickup': 'Teslimata Hazır' },
                    'ar': { 'pending': 'قيد الانتظار', 'in_progress': 'قيد الإصلاح', 'quality_check': 'فحص الجودة', 'ready_for_pickup': 'جاهز للتسليم' }
                };
                
                if (ticket.status === 'pending') {
                    statusClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                } else if (ticket.status === 'in_progress') {
                    statusClass = 'bg-primary/20 text-primary border-primary/30 animate-pulse';
                } else if (ticket.status === 'quality_check') {
                    statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                } else {
                    statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
                }
                statusText = statusLabels[lang]?.[ticket.status] || ticket.status;

                const row = `
                <div class="recent-ticket-row flex items-center justify-between p-4 bg-black/20 rounded-lg border border-primary/5 hover:border-primary/20 transition-colors cursor-pointer" data-id="${ticket.id}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined text-sm" data-icon="${icon}">${icon}</span>
                        </div>
                        <div>
                            <p class="font-headline-sm text-body-lg text-on-surface line-clamp-1">${ticket.device_model} - ${ticket.issue_description}</p>
                            <p class="font-label-caps text-label-caps text-on-surface-variant uppercase">TKT-${ticket.id.substring(0,6)} • Just now</p>
                        </div>
                    </div>
                    <div class="hidden md:flex items-center gap-4">
                        <span class="px-3 py-1 font-label-caps text-label-caps rounded-full backdrop-blur-md border ${statusClass}">${statusText}</span>
                        <button class="text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined" data-icon="chevron_right">chevron_right</span></button>
                    </div>
                </div>
                `;
                recentList.insertAdjacentHTML('beforeend', row);
            });

            // Wire up recent ticket clicks
            document.querySelectorAll('.recent-ticket-row').forEach(row => {
                row.addEventListener('click', () => {
                    const ticketId = row.getAttribute('data-id')!;
                    openTicketModal(ticketId);
                });
            });
        }
    } catch (err) {
        console.error('Failed to load dashboard metrics', err);
    }
});

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
          <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-sm w-full relative">
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
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الحالة' : 'Durum'}</label>
                    <select id="ticket-status" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors appearance-none">
                        ${statusOptions}
                    </select>
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
            const status = (modal.querySelector('#ticket-status') as HTMLSelectElement).value;
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
