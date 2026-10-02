import { getRepairByQrHash, updateRepair, deleteRepair, markRepairDelivered } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { sendWhatsAppNotification } from './lib/whatsappUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';
import { playBeepSound } from './lib/settingsManager';

declare const Html5Qrcode: any;

function getStatusLabel(status: string, lang: string) {
    if (status === 'pending')          return lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor';
    if (status === 'in_progress')      return lang === 'ar' ? 'قيد الإصلاح'  : 'Onarımda';
    if (status === 'quality_check')    return lang === 'ar' ? 'فحص الجودة'   : 'Kalite Kontrol';
    if (status === 'ready_for_pickup') return lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır';
    if (status === 'completed')        return lang === 'ar' ? 'تم التسليم'   : 'Teslim Edildi';
    return status;
}

function getStatusColor(status: string) {
    if (status === 'pending')          return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    if (status === 'in_progress')      return 'text-primary bg-primary/20 border-primary/30';
    if (status === 'quality_check')    return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (status === 'ready_for_pickup') return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (status === 'completed')        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    return 'text-on-surface-variant';
}

let html5QrCode: any = null;
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('appLang') || 'tr';

    // ── Manual Hash Input ──────────────────────────────────────────────────
    const lookupBtn = document.getElementById('lookup-btn');
    const manualInput = document.getElementById('manual-hash') as HTMLInputElement;

    lookupBtn?.addEventListener('click', () => handleScan());
    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleScan();
    });

    // ── Camera Initialization ──────────────────────────────────────────────
    try {
        html5QrCode = new Html5Qrcode('reader');
        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText: string) => { handleScan(decodedText); },
            () => { /* per-frame errors ignored */ }
        ).catch((err: any) => {
            console.warn('Camera init failed:', err);
        });
    } catch (e) {
        console.error('html5-qrcode failed to load:', e);
    }

    // ── Torch / Flashlight Toggle ──────────────────────────────────────────
    let isTorchOn = false;
    const torchBtn = document.getElementById('toggle-torch-btn');
    torchBtn?.addEventListener('click', async () => {
        try {
            isTorchOn = !isTorchOn;
            await html5QrCode?.applyVideoConstraints({
                advanced: [{ torch: isTorchOn }]
            });
            torchBtn.classList.toggle('text-amber-400', isTorchOn);
            torchBtn.classList.toggle('bg-amber-400/20', isTorchOn);
        } catch (_) {
            console.warn('Torch not supported on this device/camera.');
        }
    });

    // ── Handle Scan ────────────────────────────────────────────────────────
    async function handleScan(hashValue?: string) {
        if (isScanning) return;
        isScanning = true;

        // Extract just the hash if a full URL was scanned (e.g. https://…/scan?hash=XXXX)
        let hash = hashValue || (document.getElementById('manual-hash') as HTMLInputElement)?.value?.trim();
        if (!hash) { isScanning = false; return; }

        // Strip URL wrapper if present
        try {
            const url = new URL(hash);
            const fromParam = url.searchParams.get('hash') || url.searchParams.get('qr') || url.pathname.split('/').pop();
            if (fromParam) hash = fromParam;
        } catch (_) { /* not a URL – use as-is */ }

        // Pause camera while modal is open
        try { await html5QrCode?.pause(true); } catch (_) {}

        // Flash scanner border green for visual feedback
        const reader = document.getElementById('reader');
        if (reader) {
            reader.style.outline = '4px solid #10b981';
            setTimeout(() => { reader.style.outline = ''; }, 1200);
        }

        try {
            const ticket = await getRepairByQrHash(hash);
            if (ticket) {
                playBeepSound('scan');
                await openTicketModal(ticket);
            } else {
                playBeepSound('warn');
                showScanError(lang === 'ar' ? 'رمز QR غير صالح أو التذكرة غير موجودة.' : 'Geçersiz QR kodu veya talep bulunamadı.');
            }
        } catch (err: any) {
            playBeepSound('warn');
            showScanError((lang === 'ar' ? 'خطأ: ' : 'Hata: ') + err.message);
        } finally {
            isScanning = false;
        }
    }

    function showScanError(msg: string) {
        const existing = document.getElementById('scan-error-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'scan-error-toast';
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-error/90 text-black font-bold px-6 py-3 rounded-xl shadow-lg text-sm text-center backdrop-blur-md transition-all';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // ── Interactive Ticket Modal ───────────────────────────────────────────
    async function openTicketModal(ticket: any) {
        const user = await checkAuthSession();
        const isHardcodedAdmin = user?.email === 'admin@oxygen.com';
        const isAdmin = isHardcodedAdmin || user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
        const lang = localStorage.getItem('appLang') || 'tr';
        const isAr = lang === 'ar';
        const shortId = ticket.id.split('-')[0].toUpperCase();
        const statusColor = getStatusColor(ticket.status);

        const formatIsoForInput = (iso?: string | null) => {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        const deleteBtnHtml = isAdmin ? `
            <button type="button" id="delete-ticket-btn" class="w-full bg-error/10 hover:bg-error text-error hover:text-black border border-error/30 font-bold py-2.5 px-4 rounded-lg transition-all duration-300 mt-1 text-xs">
                ${isAr ? 'حذف التذكرة' : 'Talebi Sil'}
            </button>` : '';

        const handoverBtnHtml = (ticket.status === 'ready_for_pickup') ? `
            <button type="button" id="scan-handover-btn" class="w-full bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/40 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">verified</span>
                ${isAr ? 'تسليم الجهاز للعميل (أرشفة التذكرة)' : 'Müşteriye Teslim Et & Arşivle'}
            </button>
        ` : '';

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6';
        modal.innerHTML = `
          <div class="glass-panel p-5 sm:p-7 rounded-2xl flex flex-col gap-3 text-start max-w-lg w-full relative max-h-[92vh] overflow-y-auto no-scrollbar">
            <!-- Header -->
            <div class="flex items-center justify-between pb-2 border-b border-primary/20">
                <div>
                    <h2 class="text-xl font-bold text-primary">#TKT-${shortId}</h2>
                    <span class="text-xs px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColor}">
                        ${getStatusLabel(ticket.status, lang)}
                    </span>
                </div>
                <button type="button" id="scan-close-x" class="text-on-surface-variant hover:text-primary p-1">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Customer Bar with Call & WhatsApp -->
            <div class="bg-black/40 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                <div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'العميل' : 'Müşteri'}</div>
                    <div class="font-bold text-on-surface text-sm">${ticket.customers?.name || 'Unknown'}</div>
                    <div class="text-xs text-on-surface-variant">${ticket.customers?.phone || '—'}</div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${ticket.customers?.phone ? `
                    <a href="tel:${ticket.customers.phone}" class="p-2 rounded-lg bg-surface-container hover:bg-primary/20 text-primary transition-colors" title="Ara">
                        <span class="material-symbols-outlined text-[18px]">call</span>
                    </a>
                    <button type="button" id="scan-wa-btn" class="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 transition-colors" title="WhatsApp">
                        <span class="material-symbols-outlined text-[18px]">chat</span>
                    </button>` : ''}
                </div>
            </div>

            <!-- Form -->
            <form id="scanner-ticket-form" class="flex flex-col gap-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الجهاز' : 'Cihaz'}</label>
                        <input type="text" id="scan-ticket-device" required value="${ticket.device_model || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'رمز قفل الشاشة' : 'Ekran Kilidi (PIN)'}</label>
                        <input type="text" id="scan-ticket-passcode" value="${ticket.device_passcode || ''}" placeholder="${isAr ? 'بدون رمز' : 'Şifresiz'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الأولوية' : 'Öncelik'}</label>
                        <select id="scan-ticket-priority" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="normal" ${ticket.priority === 'normal' || !ticket.priority ? 'selected' : ''}>${isAr ? 'عادي' : 'Normal'}</option>
                            <option value="express" ${ticket.priority === 'express' ? 'selected' : ''}>${isAr ? '⚡ سريع (عاجل)' : '⚡ Ekspres (Acil)'}</option>
                            <option value="low" ${ticket.priority === 'low' ? 'selected' : ''}>${isAr ? 'منخفض' : 'Düşük'}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'موعد التسليم المتوقع' : 'Teslimat Hedefi'}</label>
                        <input type="datetime-local" id="scan-ticket-deadline" value="${formatIsoForInput(ticket.estimated_completion)}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'وصف المشكلة' : 'Sorun Açıklaması'}</label>
                    <textarea id="scan-ticket-issue" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none h-16 resize-none">${ticket.issue_description || ''}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'حالة الجهاز عند الاستلام' : 'Cihaz Kabul Durumu'}</label>
                        <input type="text" id="scan-ticket-condition" value="${ticket.intake_condition || ''}" placeholder="${isAr ? 'خدوش، صدمات...' : 'Çizik, darbe vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الملحقات المستلمة' : 'Alınan Aksesuarlar'}</label>
                        <input type="text" id="scan-ticket-accessories" value="${ticket.accessories || ''}" placeholder="${isAr ? 'شريحة، شاحن...' : 'SIM, kılıf vb.'}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="flex flex-col gap-1 relative sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الحالة' : 'Durum'}</label>
                        <input type="text" id="scan-status-display" readonly value="${getStatusLabel(ticket.status, lang)}" data-value="${ticket.status}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none cursor-pointer">
                        <div id="scan-status-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-surface-container-high/95 backdrop-blur-xl border border-primary/20 rounded-lg hidden z-50 max-h-48 overflow-y-auto divide-y divide-white/5 shadow-lg no-scrollbar">
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="pending">${isAr ? 'قيد الانتظار' : 'Bekliyor'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="in_progress">${isAr ? 'قيد الإصلاح' : 'Onarımda'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="quality_check">${isAr ? 'فحص الجودة' : 'Kalite Kontrol'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="ready_for_pickup">${isAr ? 'جاهز للتسليم' : 'Teslimata Hazır'}</div>
                            <div class="px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-xs" data-val="completed">${isAr ? 'تم التسليم (الأرشيف)' : 'Teslim Edildi'}</div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'المبلغ (₺)' : 'Ücret (₺)'}</label>
                        <input type="number" id="scan-ticket-cost" step="0.01" value="${ticket.cost || ''}" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-1">
                        <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'الضمان' : 'Garanti'}</label>
                        <select id="scan-ticket-warranty" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none">
                            <option value="0" ${ticket.warranty_months === 0 ? 'selected' : ''}>${isAr ? 'بدون ضمان' : 'Garanti Yok'}</option>
                            <option value="1" ${ticket.warranty_months === 1 ? 'selected' : ''}>${isAr ? 'شهر واحد' : '1 Ay'}</option>
                            <option value="3" ${ticket.warranty_months === 3 || !ticket.warranty_months ? 'selected' : ''}>${isAr ? '3 أشهر' : '3 Ay'}</option>
                            <option value="6" ${ticket.warranty_months === 6 ? 'selected' : ''}>${isAr ? '6 أشهر' : '6 Ay'}</option>
                            <option value="12" ${ticket.warranty_months === 12 ? 'selected' : ''}>${isAr ? '12 شهر' : '12 Ay'}</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${isAr ? 'ملاحظات الخبير (داخلية)' : 'Uzman Notları (Dahili)'}</label>
                    <textarea id="scan-ticket-notes" class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary/50 focus:outline-none h-14 resize-none" placeholder="${isAr ? 'تشخيص الخبير، قطع الغيار، الرقم التسلسلي...' : 'Uzman teşhisleri, yapılan işlemler, değişen parça seri no vb.'}">${ticket.technician_notes || ''}</textarea>
                </div>

                ${handoverBtnHtml}

                <div class="grid grid-cols-2 gap-2 mt-2">
                    <button type="button" id="scan-print-receipt-btn" class="bg-primary/20 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs">
                        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                        ${isAr ? 'طباعة الإيصال' : 'Makbuz Yazdır'}
                    </button>
                    <button type="button" id="scan-view-qr" class="bg-surface-container hover:bg-white/10 text-on-surface border border-white/10 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs">
                        <span class="material-symbols-outlined text-[16px]">qr_code_2</span>
                        ${isAr ? 'عرض QR' : 'QR Göster'}
                    </button>
                </div>

                <div class="flex gap-2 mt-1">
                    <button type="button" id="scan-close-modal" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">${isAr ? 'إغلاق' : 'Kapat'}</button>
                    <button type="submit" class="w-1/2 btn-primary py-3 rounded-xl font-bold">${isAr ? 'حفظ التعديلات' : 'Kaydet'}</button>
                </div>
                ${deleteBtnHtml}
            </form>
          </div>`;

        document.body.appendChild(modal);

        // Status dropdown
        const statusDisplay    = modal.querySelector('#scan-status-display') as HTMLInputElement;
        const statusSuggestions = modal.querySelector('#scan-status-suggestions') as HTMLDivElement;
        statusDisplay?.addEventListener('click', (e) => { e.stopPropagation(); statusSuggestions?.classList.toggle('hidden'); });
        statusSuggestions?.querySelectorAll('div').forEach(item => {
            item.addEventListener('click', () => {
                statusDisplay.value = item.textContent || '';
                statusDisplay.setAttribute('data-value', item.getAttribute('data-val')!);
                statusSuggestions.classList.add('hidden');
            });
        });
        document.addEventListener('click', (e) => {
            if (e.target !== statusDisplay && !statusSuggestions?.contains(e.target as HTMLElement)) {
                statusSuggestions?.classList.add('hidden');
            }
        });

        // Close → resume camera
        const closeAndResume = () => {
            modal.remove();
            try { html5QrCode?.resume(); } catch (_) {}
        };
        modal.querySelector('#scan-close-modal')?.addEventListener('click', closeAndResume);
        modal.querySelector('#scan-close-x')?.addEventListener('click', closeAndResume);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAndResume();
        });

        // WhatsApp notification
        modal.querySelector('#scan-wa-btn')?.addEventListener('click', () => {
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

        // Handover to customer button
        modal.querySelector('#scan-handover-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr 
                ? `هل تؤكد تسليم الجهاز (${ticket.device_model}) للعميل وأرشفة التذكرة؟` 
                : `${ticket.device_model} cihazı müşteriye teslim edilsin ve talep arşivlendi olarak işaretlensin mi?`;
            if (confirm(confirmMsg)) {
                try {
                    await markRepairDelivered(ticket.id);
                    (window as any).showToast ? (window as any).showToast(isAr ? 'تم تسليم الجهاز وأرشفة التذكرة' : 'Cihaz teslim edildi ve talep arşivlendi', 'success') : null;
                    closeAndResume();
                } catch (err: any) {
                    const errMsg = 'Error: ' + (err?.message || err);
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        // Print receipt
        modal.querySelector('#scan-print-receipt-btn')?.addEventListener('click', async () => {
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

        // Save
        modal.querySelector('#scanner-ticket-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = modal.querySelector('[type="submit"]') as HTMLButtonElement;
            submitBtn.disabled = true;
            submitBtn.textContent = isAr ? 'جاري الحفظ...' : 'Kaydediliyor...';

            const deviceModel       = (modal.querySelector('#scan-ticket-device') as HTMLInputElement).value;
            const issueDescription  = (modal.querySelector('#scan-ticket-issue') as HTMLTextAreaElement).value;
            const status            = statusDisplay.getAttribute('data-value')!;
            const costVal           = (modal.querySelector('#scan-ticket-cost') as HTMLInputElement).value;
            const cost              = costVal ? parseFloat(costVal) : undefined;
            const priority          = (modal.querySelector('#scan-ticket-priority') as HTMLSelectElement).value as any;
            const deadlineVal       = (modal.querySelector('#scan-ticket-deadline') as HTMLInputElement).value;
            const estimatedCompletion = deadlineVal ? new Date(deadlineVal).toISOString() : null;
            const devicePasscode    = (modal.querySelector('#scan-ticket-passcode') as HTMLInputElement).value.trim();
            const intakeCondition   = (modal.querySelector('#scan-ticket-condition') as HTMLInputElement).value.trim();
            const accessories       = (modal.querySelector('#scan-ticket-accessories') as HTMLInputElement).value.trim();
            const warrantyMonths    = parseInt((modal.querySelector('#scan-ticket-warranty') as HTMLSelectElement).value, 10);
            const technicianNotes   = (modal.querySelector('#scan-ticket-notes') as HTMLTextAreaElement).value.trim();

            try {
                await updateRepair(ticket.id, { 
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
                const successMsg = isAr ? '✓ تم الحفظ بنجاح!' : '✓ Başarıyla kaydedildi!';
                (window as any).showToast ? (window as any).showToast(successMsg, 'success') : null;
                setTimeout(closeAndResume, 1000);
            } catch (err: any) {
                const errMsg = (isAr ? 'خطأ: ' : 'Hata: ') + err.message;
                submitBtn.disabled = false;
                submitBtn.textContent = isAr ? 'حفظ التعديلات' : 'Kaydet';
                (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
            }
        });

        // Delete (admin only)
        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذه التذكرة؟' : 'Bu talebi silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticket.id);
                    (window as any).showToast ? (window as any).showToast(isAr ? 'تم حذف التذكرة' : 'Talep silindi', 'info') : null;
                    closeAndResume();
                } catch (err: any) {
                    const errMsg = (isAr ? 'خطأ في الحذف: ' : 'Silme hatası: ') + err.message;
                    (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
                }
            }
        });

        // View QR Code overlay
        modal.querySelector('#scan-view-qr')?.addEventListener('click', async () => {
            try {
                const qrUrl = await generateQrCodeDataUrl(ticket.qr_hash);
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6';
                overlay.innerHTML = `
                  <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
                    <h2 class="text-2xl font-bold text-primary">#TKT-${shortId}</h2>
                    <div class="bg-white p-4 rounded-xl shadow-lg">
                        <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded">
                    </div>
                    <p class="font-mono text-xs text-on-surface-variant break-all">${ticket.qr_hash}</p>
                    <button id="close-qr-overlay" class="mt-2 bg-primary text-black font-bold py-3 px-8 rounded-xl w-full">
                        ${isAr ? 'إغلاق' : 'Kapat'}
                    </button>
                  </div>`;
                document.body.appendChild(overlay);
                overlay.querySelector('#close-qr-overlay')?.addEventListener('click', () => overlay.remove());
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.remove();
                });
            } catch (err: any) {
                const errMsg = 'QR error: ' + (err?.message || err);
                (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
            }
        });
    }
});
