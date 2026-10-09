import { getRepairByQrHash } from './lib/repairService';
import { playBeepSound } from './lib/settingsManager';
import { openTicketDetailsModal } from './lib/ticketModal';

declare const Html5Qrcode: any;

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
                try { html5QrCode?.resume(); } catch (_) {}
            }
        } catch (err: any) {
            playBeepSound('warn');
            showScanError((lang === 'ar' ? 'خطأ: ' : 'Hata: ') + err.message);
            try { html5QrCode?.resume(); } catch (_) {}
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
        await openTicketDetailsModal(ticket, {
            onClose: () => {
                try { html5QrCode?.resume(); } catch (_) {}
            }
        });
    }
});
