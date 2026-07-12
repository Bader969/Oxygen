import { getRepairByQrHash, updateRepair, deleteRepair } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { generateQrCodeDataUrl } from './lib/qrUtils';

declare const Html5Qrcode: any;

function getStatusLabel(status: string, lang: string) {
    if (status === 'pending')          return lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor';
    if (status === 'in_progress')      return lang === 'ar' ? 'قيد الإصلاح'  : 'Onarımda';
    if (status === 'quality_check')    return lang === 'ar' ? 'فحص الجودة'   : 'Kalite Kontrol';
    if (status === 'ready_for_pickup') return lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır';
    return status;
}

function getStatusColor(status: string) {
    if (status === 'pending')          return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    if (status === 'in_progress')      return 'text-primary bg-primary/20 border-primary/30';
    if (status === 'quality_check')    return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (status === 'ready_for_pickup') return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    return 'text-on-surface-variant';
}

let html5QrCode: any = null;
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('appLang') || 'tr';

    // ── Manual Hash Input ──────────────────────────────────────────────────
    const container = document.querySelector('.absolute.bottom-12');
    if (container) {
        const existing = document.getElementById('manual-hash');
        if (!existing) {
            container.querySelector('.bg-black\\/40')?.insertAdjacentHTML('beforeend', `
            <div class="mt-4 flex flex-col items-center w-full z-50">
                <input type="text" id="manual-hash"
                    data-i18n="scanner.paste"
                    placeholder="${lang === 'ar' ? 'الصق هاش QR هنا' : 'QR Hash kodunu buraya yapıştırın'}"
                    class="w-full bg-black/80 border border-primary/30 rounded-lg px-4 py-3 text-center text-on-surface mb-2 focus:border-primary outline-none backdrop-blur-md">
                <button id="lookup-btn"
                    data-i18n="scanner.lookup"
                    class="w-full bg-primary text-on-primary rounded-lg px-4 py-3 hover:bg-primary/90 transition-colors font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]">
                    ${lang === 'ar' ? 'استعلام عن التذكرة' : 'Talep Sorgula'}
                </button>
            </div>`);
        }
        document.getElementById('lookup-btn')?.addEventListener('click', () => handleScan());
    }

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
                await openTicketModal(ticket);
            } else {
                showScanError(lang === 'ar' ? 'رمز QR غير صالح أو التذكرة غير موجودة.' : 'Geçersiz QR kodu veya talep bulunamadı.');
            }
        } catch (err: any) {
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
        const shortId = ticket.id.split('-')[0].toUpperCase();
        const statusColor = getStatusColor(ticket.status);

        const deleteBtnHtml = isAdmin ? `
            <button type="button" id="delete-ticket-btn" class="w-full bg-error/10 hover:bg-error text-error hover:text-black border border-error/30 font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2">
                ${lang === 'ar' ? 'حذف التذكرة' : 'Talebi Sil'}
            </button>` : '';

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';
        modal.innerHTML = `
          <div class="glass-panel p-8 rounded-2xl flex flex-col gap-4 text-start max-w-sm w-full relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <!-- Header -->
            <div class="flex items-center justify-between mb-1">
                <div>
                    <h2 class="text-2xl font-bold text-primary">#TKT-${shortId}</h2>
                    <span class="text-xs px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColor}">
                        ${getStatusLabel(ticket.status, lang)}
                    </span>
                </div>
                <span class="material-symbols-outlined text-primary text-4xl">qr_code_scanner</span>
            </div>

            <!-- Customer & Device summary -->
            <div class="grid grid-cols-2 gap-3 bg-black/30 rounded-xl p-4 border border-white/5">
                <div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">${lang === 'ar' ? 'العميل' : 'Müşteri'}</div>
                    <div class="text-sm font-bold text-on-surface">${ticket.customers?.name || 'Unknown'}</div>
                </div>
                <div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">${lang === 'ar' ? 'الهاتف' : 'Telefon'}</div>
                    <div class="text-sm font-bold text-on-surface">${ticket.customers?.phone || '—'}</div>
                </div>
            </div>

            <!-- Edit Form -->
            <form id="scanner-ticket-form" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الجهاز' : 'Cihaz'}</label>
                    <input type="text" id="scan-ticket-device" required value="${ticket.device_model}"
                        class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'وصف المشكلة' : 'Sorun Açıklaması'}</label>
                    <textarea id="scan-ticket-issue" required
                        class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors h-20 resize-none">${ticket.issue_description}</textarea>
                </div>
                <div class="flex flex-col gap-1 relative">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'الحالة' : 'Durum'}</label>
                    <input type="text" id="scan-status-display" readonly
                        value="${getStatusLabel(ticket.status, lang)}"
                        data-value="${ticket.status}"
                        class="w-full bg-black/40 border border-primary/20 rounded-lg px-4 py-3 text-on-surface cursor-pointer focus:outline-none">
                    <div id="scan-status-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-surface-container-high/95 backdrop-blur-xl border border-primary/20 rounded-lg hidden z-50 shadow-lg no-scrollbar divide-y divide-white/5">
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="pending">${lang === 'ar' ? 'قيد الانتظار' : 'Bekliyor'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="in_progress">${lang === 'ar' ? 'قيد الإصلاح' : 'Onarımda'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="quality_check">${lang === 'ar' ? 'فحص الجودة' : 'Kalite Kontrol'}</div>
                        <div class="px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors" data-val="ready_for_pickup">${lang === 'ar' ? 'جاهز للتسليم' : 'Teslimata Hazır'}</div>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${lang === 'ar' ? 'التكلفة (₺)' : 'Maliyet (₺)'}</label>
                    <input type="number" id="scan-ticket-cost" step="0.01" value="${ticket.cost || ''}"
                        class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">
                </div>

                <div id="scan-modal-status" class="hidden text-xs text-center font-bold rounded-lg py-2 px-3"></div>

                <!-- Actions -->
                <div class="flex gap-2 mt-2">
                    <button type="button" id="scan-close-modal"
                        class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-lg font-bold hover:bg-white/5 transition-colors">
                        ${lang === 'ar' ? 'إغلاق' : 'Kapat'}
                    </button>
                    <button type="submit"
                        class="w-1/2 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 rounded-lg transition-all duration-300">
                        ${lang === 'ar' ? 'حفظ' : 'Kaydet'}
                    </button>
                </div>
                <button type="button" id="scan-view-qr"
                    class="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2.5 rounded-lg transition-all text-sm">
                    ${lang === 'ar' ? 'عرض رمز QR' : 'QR Kodunu Göster'}
                </button>
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

        // Save
        modal.querySelector('#scanner-ticket-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = modal.querySelector('#scan-modal-status') as HTMLElement;
            const submitBtn = modal.querySelector('[type="submit"]') as HTMLButtonElement;
            submitBtn.disabled = true;
            submitBtn.textContent = lang === 'ar' ? 'جاري الحفظ...' : 'Kaydediliyor...';

            const deviceModel       = (modal.querySelector('#scan-ticket-device') as HTMLInputElement).value;
            const issueDescription  = (modal.querySelector('#scan-ticket-issue') as HTMLTextAreaElement).value;
            const status            = statusDisplay.getAttribute('data-value')!;
            const costVal           = (modal.querySelector('#scan-ticket-cost') as HTMLInputElement).value;
            const cost              = costVal ? parseFloat(costVal) : undefined;

            try {
                await updateRepair(ticket.id, { deviceModel, issueDescription, status, cost });
                statusEl.textContent = lang === 'ar' ? '✓ تم الحفظ بنجاح!' : '✓ Başarıyla kaydedildi!';
                statusEl.className   = 'text-xs text-center font-bold rounded-lg py-2 px-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
                statusEl.classList.remove('hidden');
                setTimeout(closeAndResume, 1200);
            } catch (err: any) {
                statusEl.textContent = (lang === 'ar' ? 'خطأ: ' : 'Hata: ') + err.message;
                statusEl.className   = 'text-xs text-center font-bold rounded-lg py-2 px-3 text-error bg-error/10 border border-error/20';
                statusEl.classList.remove('hidden');
                submitBtn.disabled   = false;
                submitBtn.textContent = lang === 'ar' ? 'حفظ' : 'Kaydet';
            }
        });

        // Delete (admin only)
        modal.querySelector('#delete-ticket-btn')?.addEventListener('click', async () => {
            const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذه التذكرة؟' : 'Bu talebi silmek istediğinize emin misiniz?';
            if (confirm(confirmMsg)) {
                try {
                    await deleteRepair(ticket.id);
                    closeAndResume();
                } catch (err: any) {
                    alert((lang === 'ar' ? 'خطأ في الحذف: ' : 'Silme hatası: ') + err.message);
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
                  <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
                    <h2 class="text-2xl font-bold text-primary">#TKT-${shortId}</h2>
                    <div class="bg-white p-4 rounded-xl shadow-lg">
                        <img src="${qrUrl}" alt="QR Code" class="w-48 h-48 rounded">
                    </div>
                    <p class="font-mono text-xs text-on-surface-variant break-all">${ticket.qr_hash}</p>
                    <button id="close-qr-overlay" class="mt-2 bg-primary text-black font-bold py-3 px-8 rounded-xl w-full">
                        ${lang === 'ar' ? 'إغلاق' : 'Kapat'}
                    </button>
                  </div>`;
                document.body.appendChild(overlay);
                overlay.querySelector('#close-qr-overlay')?.addEventListener('click', () => overlay.remove());
            } catch (err: any) {
                alert('QR error: ' + err.message);
            }
        });
    }
});
