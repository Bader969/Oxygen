import { getRepairs, deleteRepair, updateRepair, markRepairDelivered } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { dictionary, applyTranslation } from './lib/i18n';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';

let repairsList: any[] = [];

function renderMetricsAndTickets() {
    // Calculate Metrics
    const openRepairs = repairsList.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    const readyRepairs = repairsList.filter(r => r.status === 'completed' || r.status === 'ready_for_pickup').length;
    
    const income = repairsList
        .filter(r => (r.status === 'completed' || r.status === 'ready_for_pickup') && r.cost)
        .reduce((sum, r) => sum + (r.cost || 0), 0);

    // Update DOM
    const elOpen = document.getElementById('metric-open');
    const elReady = document.getElementById('metric-ready');
    const elIncome = document.getElementById('metric-income');
    
    if (elOpen) elOpen.textContent = openRepairs.toString();
    if (elReady) elReady.textContent = readyRepairs.toString();
    if (elIncome) elIncome.textContent = `₺${income.toLocaleString('tr-TR')}`;

    // Populate Recent Tickets
    const recentList = document.getElementById('recent-tickets-list');
    if (recentList) {
        recentList.innerHTML = '';
        const recent = repairsList.slice(0, 3);
        
        const lang = localStorage.getItem('appLang') || 'tr';
        const statusLabels: Record<string, Record<string, string>> = {
            'tr': { 'pending': 'Bekliyor', 'in_progress': 'Onarımda', 'quality_check': 'Kalite Kontrol', 'ready_for_pickup': 'Teslimata Hazır', 'completed': 'Tamamlandı' },
            'ar': { 'pending': 'قيد الانتظار', 'in_progress': 'قيد الإصلاح', 'quality_check': 'فحص الجودة', 'ready_for_pickup': 'جاهز للتسليم', 'completed': 'مكتمل' }
        };

        recent.forEach(ticket => {
            let statusClass = '';
            let icon = 'smartphone';
            
            if (ticket.device_model.toLowerCase().includes('mac') || ticket.device_model.toLowerCase().includes('laptop')) {
                icon = 'laptop_mac';
            } else if (ticket.device_model.toLowerCase().includes('pad') || ticket.device_model.toLowerCase().includes('tablet')) {
                icon = 'tablet_mac';
            } else if (ticket.device_model.toLowerCase().includes('watch')) {
                icon = 'watch';
            }
            
            if (ticket.status === 'pending') {
                statusClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            } else if (ticket.status === 'in_progress') {
                statusClass = 'bg-primary/20 text-primary border-primary/30 animate-pulse';
            } else if (ticket.status === 'quality_check') {
                statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            } else if (ticket.status === 'ready_for_pickup') {
                statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
            } else {
                statusClass = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            }
            const statusText = statusLabels[lang]?.[ticket.status] || ticket.status;

            const isExpress = ticket.priority === 'express';
            const isOverdue = ticket.estimated_completion && new Date(ticket.estimated_completion).getTime() < Date.now() && ticket.status !== 'ready_for_pickup' && ticket.status !== 'completed';
            let extraBadges = '';
            if (isExpress) extraBadges += `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded-full">⚡</span>`;
            if (isOverdue) extraBadges += `<span class="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">⚠️</span>`;

            const row = `
            <div class="recent-ticket-row flex items-center justify-between p-4 bg-black/20 rounded-lg border border-primary/5 hover:border-primary/20 transition-colors cursor-pointer" data-id="${ticket.id}">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-sm" data-icon="${icon}">${icon}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="font-headline-sm text-body-lg text-on-surface truncate flex items-center gap-1.5">
                            <span>${ticket.device_model} - ${ticket.issue_description}</span>
                            ${extraBadges}
                        </p>
                        <p class="font-label-caps text-label-caps text-on-surface-variant uppercase">TKT-${ticket.id.substring(0,6)} • Just now</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 md:gap-4 shrink-0 ms-2">
                    <span class="px-2.5 py-1 font-label-caps text-[11px] md:text-label-caps rounded-full backdrop-blur-md border whitespace-nowrap ${statusClass}">${statusText}</span>
                    <button class="text-on-surface-variant hover:text-primary transition-colors hidden md:block"><span class="material-symbols-outlined" data-icon="chevron_right">chevron_right</span></button>
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
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        repairsList = await getRepairs();
        renderMetricsAndTickets();

        // Get user session details and render dynamic localized greeting
        const user = await checkAuthSession();
        let userName = 'Technician';
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

        dictionary['tr']['dash.welcome'] = `${trGreeting} ${userName}`;
        dictionary['ar']['dash.welcome'] = `${arGreeting} ${userName}`;

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
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'رمز القفل / PIN' : 'Ekran Kilidi / PIN'}</label>
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
                            <option value="0" ${repair.warranty_months === 0 ? 'selected' : ''}>0 Ay</option>
                            <option value="1" ${repair.warranty_months === 1 ? 'selected' : ''}>1 Ay</option>
                            <option value="3" ${repair.warranty_months === 3 || !repair.warranty_months ? 'selected' : ''}>3 Ay</option>
                            <option value="6" ${repair.warranty_months === 6 ? 'selected' : ''}>6 Ay</option>
                            <option value="12" ${repair.warranty_months === 12 ? 'selected' : ''}>12 Ay</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'ملاحظات الفني (داخلية)' : 'Teknisyen Notları (Dahili)'}</label>
                    <textarea id="ticket-tech-notes" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary/50 focus:outline-none h-14 resize-none">${repair.technician_notes || ''}</textarea>
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

