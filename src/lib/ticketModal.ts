import { getRepairs, updateRepair, deleteRepair, markRepairDelivered } from './repairService';
import { checkAuthSession } from './authService';
import { generateQrCodeDataUrl } from './qrUtils';
import { sendWhatsAppNotification } from './whatsappUtils';
import { openReceiptPreviewModal } from './receiptPrinter';
import { getStatusLabel, getStatusMeta } from './statusConfig';
import { calculateWorkshopPayment } from './cashRegister';

export interface TicketModalOptions {
    onUpdate?: (updatedTicket: any) => void;
    onDelete?: (ticketId: string) => void;
    onHandover?: (ticketId: string) => void;
    onClose?: () => void;
}

export async function openTicketDetailsModal(
    ticketOrId: any,
    options: TicketModalOptions = {}
) {
    try {
        let repair = typeof ticketOrId === 'string' ? null : ticketOrId;
        const ticketId = typeof ticketOrId === 'string' ? ticketOrId : ticketOrId?.id;

        if (!repair || !repair.customers) {
            const allRepairs = await getRepairs();
            repair = allRepairs.find((r: any) => r.id === ticketId);
            if (!repair) {
                const msg = 'Ticket not found';
                (window as any).showToast ? (window as any).showToast(msg, 'error') : alert(msg);
                return;
            }
        }

        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

        const lang = localStorage.getItem('appLang') || 'tr';
        const isAr = lang === 'ar';
        const shortId = (repair.id || '').split('-')[0].toUpperCase();

        const formatIsoForInput = (iso?: string | null) => {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        // Extract deposit if present
        let depositVal = typeof repair.deposit === 'number' ? repair.deposit : 0;
        if (!depositVal && repair.technician_notes) {
            const match = repair.technician_notes.match(/\[KAPORA:\s*₺?([\d.]+)/i);
            if (match && match[1]) {
                depositVal = parseFloat(match[1]) || 0;
            }
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-150';

        const statusOptions = `
            <option value="pending" ${repair.status === 'pending' ? 'selected' : ''}>${getStatusLabel('pending', lang)}</option>
            <option value="in_progress" ${repair.status === 'in_progress' ? 'selected' : ''}>${getStatusLabel('in_progress', lang)}</option>
            <option value="quality_check" ${repair.status === 'quality_check' ? 'selected' : ''}>${getStatusLabel('quality_check', lang)}</option>
            <option value="ready_for_pickup" ${repair.status === 'ready_for_pickup' ? 'selected' : ''}>${getStatusLabel('ready_for_pickup', lang)}</option>
            <option value="completed" ${repair.status === 'completed' ? 'selected' : ''}>${getStatusLabel('completed', lang)}</option>
        `;

        const deleteBtnHtml = isAdmin ? `
            <button type="button" id="delete-ticket-btn" class="w-full bg-error/10 hover:bg-error text-error hover:text-black border border-error/30 font-bold py-2.5 px-4 rounded-xl transition-all duration-200 mt-1 text-xs">
                ${isAr ? 'حذف التذكرة' : 'Talebi Sil'}
            </button>
        ` : '';

        const handoverBtnHtml = (repair.status === 'ready_for_pickup') ? `
            <button type="button" id="modal-handover-btn" class="w-full bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/40 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span class="material-symbols-outlined">verified</span>
                ${isAr ? 'تسليم الجهاز للعميل (أرشفة التذكرة)' : 'Müşteriye Teslim Et & Arşivle'}
            </button>
        ` : '';

        const curStatusMeta = getStatusMeta(repair.status);

        modal.innerHTML = `
          <div class="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col gap-4 text-start max-w-xl w-full relative max-h-[92vh] overflow-y-auto no-scrollbar border border-white/10 shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3.5 border-b border-primary/20">
                <div class="flex items-center gap-3">
                    <h2 class="text-2xl font-bold text-primary font-mono">#TKT-${shortId}</h2>
                    <span class="px-3 py-1 rounded-full text-xs font-bold border ${curStatusMeta.badgeClass}">
                        ${getStatusLabel(repair.status, lang)}
                    </span>
                </div>
                <button type="button" id="close-modal-x" class="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>

            <!-- Customer Bar -->
            <div class="bg-black/50 rounded-xl p-3.5 border border-white/10 flex items-center justify-between">
                <div>
                    <div class="text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'العميل' : 'Müşteri'}</div>
                    <div class="font-bold text-on-surface text-base mt-0.5">${repair.customers?.name || (isAr ? 'عميل غير مسجل' : 'Kayıtsız Müşteri')}</div>
                    <div class="text-sm text-on-surface-variant font-mono mt-0.5">${repair.customers?.phone || '—'}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${repair.customers?.phone ? `
                    <a href="tel:${repair.customers.phone}" class="p-2.5 rounded-xl bg-surface-container hover:bg-primary/20 text-primary transition-colors border border-white/5" title="Ara">
                        <span class="material-symbols-outlined text-[20px]">call</span>
                    </a>
                    <button type="button" id="modal-wa-btn" class="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 transition-colors border border-emerald-500/30" title="WhatsApp">
                        <span class="material-symbols-outlined text-[20px]">chat</span>
                    </button>` : ''}
                </div>
            </div>

            <!-- Form -->
            <form id="modal-ticket-form" class="flex flex-col gap-3.5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'الجهاز' : 'Cihaz'}</label>
                        <input type="text" id="ticket-device" required value="${repair.device_model || ''}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'رمز قفل الشاشة' : 'Ekran Kilidi (PIN)'}</label>
                        <input type="text" id="ticket-passcode" value="${repair.device_passcode || ''}" placeholder="${isAr ? 'بدون رمز' : 'Şifresiz'}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none font-mono transition-colors">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'الأولوية' : 'Öncelik'}</label>
                        <select id="ticket-priority" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                            <option value="normal" ${repair.priority === 'normal' || !repair.priority ? 'selected' : ''}>${isAr ? 'عادي' : 'Normal'}</option>
                            <option value="express" ${repair.priority === 'express' ? 'selected' : ''}>${isAr ? '⚡ سريع (عاجل)' : '⚡ Ekspres (Acil)'}</option>
                            <option value="low" ${repair.priority === 'low' ? 'selected' : ''}>${isAr ? 'منخفض' : 'Düşük'}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'موعد التسليم المتوقع' : 'Teslimat Hedefi'}</label>
                        <input type="datetime-local" id="ticket-deadline" value="${formatIsoForInput(repair.estimated_completion)}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'وصف المشكلة' : 'Sorun Açıklaması'}</label>
                    <textarea id="ticket-issue" required class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none h-20 resize-none transition-colors">${repair.issue_description || ''}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'حالة الجهاز عند الاستلام' : 'Cihaz Kabul Durumu'}</label>
                        <input type="text" id="ticket-condition" value="${repair.intake_condition || ''}" placeholder="${isAr ? 'خدوش، صدمات...' : 'Çizik, darbe vb.'}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'الملحقات المستلمة' : 'Alınan Aksesuarlar'}</label>
                        <input type="text" id="ticket-accessories" value="${repair.accessories || ''}" placeholder="${isAr ? 'شريحة، كفر...' : 'SIM, kılıf vb.'}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div class="flex flex-col gap-1.5 sm:col-span-1">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'الحالة' : 'Durum'}</label>
                        <select id="ticket-status" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-1">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'المبلغ الإجمالي (₺)' : 'Toplam Ücret (₺)'}</label>
                        <input type="number" id="ticket-cost" step="0.01" value="${repair.cost || ''}" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none font-mono font-bold transition-colors">
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-1">
                        <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'الضمان' : 'Garanti'}</label>
                        <select id="ticket-warranty" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-base text-on-surface focus:border-primary focus:outline-none transition-colors">
                            <option value="0" ${repair.warranty_months === 0 ? 'selected' : ''}>${isAr ? 'بدون ضمان' : 'Garanti Yok'}</option>
                            <option value="1" ${repair.warranty_months === 1 ? 'selected' : ''}>${isAr ? 'شهر واحد' : '1 Ay'}</option>
                            <option value="3" ${repair.warranty_months === 3 || !repair.warranty_months ? 'selected' : ''}>${isAr ? '3 أشهر' : '3 Ay'}</option>
                            <option value="6" ${repair.warranty_months === 6 ? 'selected' : ''}>${isAr ? '6 أشهر' : '6 Ay'}</option>
                            <option value="12" ${repair.warranty_months === 12 ? 'selected' : ''}>${isAr ? '12 شهر' : '12 Ay'}</option>
                        </select>
                    </div>
                </div>

                <!-- Finances Bar: Kapora & Remaining -->
                <div class="grid grid-cols-2 gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-xs text-emerald-400 uppercase tracking-wider font-bold">${isAr ? 'العربون / المقبوض (₺)' : 'Alınan Kapora (₺)'}</label>
                        <input type="number" id="ticket-deposit" step="0.01" value="${depositVal || 0}" class="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-lg text-emerald-300 font-mono font-bold focus:border-emerald-500 focus:outline-none transition-colors">
                    </div>
                    <div class="flex flex-col gap-1.5 justify-center">
                        <div class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'المتبقي عند التسليم' : 'Kalan Bakiye'}</div>
                        <div id="ticket-remaining-display" class="font-mono text-2xl font-black text-amber-400">₺${Math.max(0, (repair.cost || 0) - depositVal).toFixed(2)}</div>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-bold">${isAr ? 'ملاحظات الخبير (داخلية)' : 'Uzman Notları (Dahili)'}</label>
                    <textarea id="ticket-tech-notes" class="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none h-16 resize-none transition-colors" placeholder="${isAr ? 'تشخيص الخبير، قطع الغيار، الرقم التسلسلي...' : 'Uzman teşhisleri, kullanılan parçalar, iç durum vb.'}">${repair.technician_notes || ''}</textarea>
                </div>

                ${handoverBtnHtml}

                <div class="grid grid-cols-2 gap-2.5 mt-1">
                    <button type="button" id="modal-print-receipt-btn" class="bg-primary/15 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                        <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                        ${isAr ? 'طباعة الإيصال' : 'Makbuz Yazdır'}
                    </button>
                    <button type="button" id="view-qr-btn" class="bg-surface-container hover:bg-white/10 text-on-surface border border-white/10 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                        <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
                        ${isAr ? 'عرض QR' : 'QR Göster'}
                    </button>
                </div>

                <div class="flex gap-2.5 mt-2">
                    <button type="button" id="close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3.5 rounded-xl font-bold hover:bg-white/5 transition-colors text-base">${isAr ? 'إلغاء' : 'İptal'}</button>
                    <button type="submit" class="w-1/2 bg-primary hover:bg-primary/90 text-black py-3.5 rounded-xl font-bold transition-all text-base shadow-[0_0_15px_rgba(227,30,36,0.3)]">${isAr ? 'حفظ التعديلات' : 'Kaydet'}</button>
                </div>
                ${deleteBtnHtml}
            </form>
          </div>
        `;

        document.body.appendChild(modal);

        const closeModalFn = () => {
            modal.remove();
            options.onClose?.();
        };
        modal.querySelector('#close-modal')?.addEventListener('click', closeModalFn);
        modal.querySelector('#close-modal-x')?.addEventListener('click', closeModalFn);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModalFn();
        });

        // Dynamic Remaining calculation
        const costInput = modal.querySelector('#ticket-cost') as HTMLInputElement;
        const depositInput = modal.querySelector('#ticket-deposit') as HTMLInputElement;
        const remainingDisplay = modal.querySelector('#ticket-remaining-display') as HTMLElement;
        const recalcRemaining = () => {
            const c = parseFloat(costInput.value) || 0;
            const d = parseFloat(depositInput.value) || 0;
            const payment = calculateWorkshopPayment(c, d);
            remainingDisplay.textContent = `₺${payment.remaining.toFixed(2)}`;
        };
        costInput?.addEventListener('input', recalcRemaining);
        depositInput?.addEventListener('input', recalcRemaining);

        // WhatsApp direct action
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
                    options.onClose?.();
                    repair.status = 'completed';
                    repair.completed_at = new Date().toISOString();
                    options.onHandover?.(ticketId);
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
            const dep = parseFloat(depositInput.value) || 0;
            const total = parseFloat(costInput.value) || repair.cost || 0;
            await openReceiptPreviewModal({
                ticketId: repair.id,
                qrHash: repair.qr_hash || repair.id,
                customerName: repair.customers?.name || 'Customer',
                customerPhone: repair.customers?.phone,
                deviceModel: repair.device_model,
                issueDescription: repair.issue_description,
                cost: total,
                deposit: dep,
                remainingCost: Math.max(0, total - dep),
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

        // Delete ticket
        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذه التذكرة؟' : 'Bu talebi silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticketId);
                    modal.remove();
                    options.onClose?.();
                    options.onDelete?.(ticketId);
                    const msg = isAr ? 'تم حذف التذكرة' : 'Talep başarıyla silindi';
                    (window as any).showToast ? (window as any).showToast(msg, 'info') : null;
                } catch (err: any) {
                    const errMsg = 'Error deleting ticket: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        // QR Code overlay
        modal.querySelector('#view-qr-btn')?.addEventListener('click', async () => {
            try {
                const qrUrl = await generateQrCodeDataUrl(repair.qr_hash || repair.id);
                const qrOverlay = document.createElement('div');
                qrOverlay.className = 'fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6';
                qrOverlay.innerHTML = `
                  <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
                    <h2 class="text-2xl font-bold text-primary font-mono">#TKT-${shortId}</h2>
                    <div class="bg-white p-4 rounded-xl shadow-lg">
                        <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded" />
                    </div>
                    <p class="font-mono text-xs text-on-surface-variant mt-2 break-all">${repair.qr_hash || repair.id}</p>
                    <button id="close-qr-overlay" class="mt-4 bg-primary hover:bg-primary/90 text-black w-full py-3 rounded-xl font-bold transition-all">${isAr ? 'إغلاق' : 'Kapat'}</button>
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

        // Form submit / save
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
            let technicianNotes = (modal.querySelector('#ticket-tech-notes') as HTMLTextAreaElement).value.trim();
            const deposit = parseFloat(depositInput.value) || 0;

            // Preserve kapora tag in tech notes
            if (deposit > 0) {
                if (technicianNotes.includes('[KAPORA:')) {
                    technicianNotes = technicianNotes.replace(/\[KAPORA:\s*₺?[\d.]+\]/i, `[KAPORA: ₺${deposit.toFixed(2)}]`);
                } else {
                    technicianNotes = `[KAPORA: ₺${deposit.toFixed(2)}] ${technicianNotes}`.trim();
                }
            }

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
                options.onClose?.();

                repair.device_model = deviceModel;
                repair.issue_description = issueDescription;
                repair.status = status;
                if (cost !== undefined) repair.cost = cost;
                repair.priority = priority;
                repair.estimated_completion = estimatedCompletion;
                repair.device_passcode = devicePasscode;
                repair.intake_condition = intakeCondition;
                repair.accessories = accessories;
                repair.warranty_months = warrantyMonths;
                repair.technician_notes = technicianNotes;
                repair.deposit = deposit;

                options.onUpdate?.(repair);
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
