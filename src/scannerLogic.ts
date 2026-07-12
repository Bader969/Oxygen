import { getRepairByQrHash } from './lib/repairService';

declare const Html5Qrcode: any;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Manual Input Hookup
    const container = document.querySelector('.absolute.bottom-12');
    if (container) {
        const testInputHtml = `
        <div class="mt-4 flex flex-col items-center w-full z-50">
            <input type="text" id="manual-hash" data-i18n="scanner.paste" placeholder="Paste QR Hash here" class="w-full bg-black/80 border border-primary/30 rounded-lg px-4 py-3 text-center text-on-surface mb-2 focus:border-primary outline-none backdrop-blur-md">
            <button id="lookup-btn" data-i18n="scanner.lookup" class="w-full bg-primary text-on-primary rounded-lg px-4 py-3 hover:bg-primary/90 transition-colors font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]">Lookup Ticket</button>
        </div>
        `;
        
        // Remove old manual input if exists to prevent duplication
        const existing = document.getElementById('manual-hash');
        if (!existing) {
            container.querySelector('.bg-black\\/40')?.insertAdjacentHTML('beforeend', testInputHtml);
        }

        document.getElementById('lookup-btn')?.addEventListener('click', () => handleScan());
    }

    let isScanning = false;

    async function handleScan(hashValue?: string) {
        if (isScanning) return;
        
        const hash = hashValue || (document.getElementById('manual-hash') as HTMLInputElement).value;
        if (!hash) return;
        
        isScanning = true;
        
        try {
            const ticket = await getRepairByQrHash(hash);
            if (ticket) {
                alert(`Ticket Found!\n\nID: ${ticket.id}\nDevice: ${ticket.device_model}\nStatus: ${ticket.status}\nCost: $${ticket.cost || 0}`);
            } else {
                alert('Invalid QR Code or Ticket not found.');
            }
        } catch (err: any) {
            alert('Error looking up ticket: ' + err.message);
        } finally {
            isScanning = false;
        }
    }

    // 2. Camera QR Scanner Initialization
    try {
        const html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

        // We want to use the back camera (environment)
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText: string, decodedResult: any) => {
                // When a QR code is detected, auto-lookup
                handleScan(decodedText);
            },
            (errorMessage: string) => {
                // parse error, ignore it (happens every frame when no QR code is found)
            }
        ).catch((err: any) => {
            console.warn("Camera initialization failed. User might have denied permissions or no camera exists.", err);
        });
    } catch (e) {
        console.error("html5-qrcode failed to load.", e);
    }
});
