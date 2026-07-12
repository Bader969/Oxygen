const fs = require('fs');
const path = require('path');

// 1. Update HTML
const htmlPath = path.join(__dirname, '..', 'src/qr-scanner.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace close button with a working anchor back button
htmlContent = htmlContent.replace(
    /<button class="w-12 h-12 rounded-full bg-black\/40 backdrop-blur-xl border border-primary\/20 flex items-center justify-center text-on-surface hover:bg-primary\/10 hover:border-primary\/50 transition-all shadow-\[0_0_15px_-3px_rgba\(227,30,36,0\.1\)\]">\s*<span class="material-symbols-outlined" data-icon="close">close<\/span>\s*<\/button>/g,
    `<a href="/index.html" class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-primary/20 flex items-center justify-center text-on-surface hover:bg-primary/10 hover:border-primary/50 transition-all shadow-[0_0_15px_-3px_rgba(227,30,36,0.1)]">
        <span class="material-symbols-outlined" data-icon="close">close</span>
    </a>`
);

// Inject html5-qrcode library
if (!htmlContent.includes('html5-qrcode')) {
    htmlContent = htmlContent.replace(
        '<!-- Simulated Camera Background -->',
        `<script src="https://unpkg.com/html5-qrcode"></script>\n<!-- Live Camera Background -->`
    );
}

// Replace the simulated background with a real camera feed container
htmlContent = htmlContent.replace(
    /<div class="absolute inset-0 bg-black\/60 z-0">\s*<div class="absolute inset-0 bg-cover bg-center[^>]*><\/div>\s*<div class="absolute inset-0 bg-gradient-to-b from-black\/80 via-transparent to-black\/80"><\/div>\s*<\/div>/,
    `<div class="absolute inset-0 bg-black z-0 overflow-hidden">
        <div id="reader" class="absolute inset-0 w-full h-full object-cover"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>
    </div>`
);

fs.writeFileSync(htmlPath, htmlContent);
console.log('Updated qr-scanner.html');

// 2. Update Logic
const logicPath = path.join(__dirname, '..', 'src/scannerLogic.ts');
const logicContent = `import { getRepairByQrHash } from './lib/repairService';

declare const Html5Qrcode: any;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Manual Input Hookup
    const container = document.querySelector('.absolute.bottom-12');
    if (container) {
        const testInputHtml = \`
        <div class="mt-4 flex flex-col items-center w-full z-50">
            <input type="text" id="manual-hash" data-i18n="scanner.paste" placeholder="Paste QR Hash here" class="w-full bg-black/80 border border-primary/30 rounded-lg px-4 py-3 text-center text-on-surface mb-2 focus:border-primary outline-none backdrop-blur-md">
            <button id="lookup-btn" data-i18n="scanner.lookup" class="w-full bg-primary text-on-primary rounded-lg px-4 py-3 hover:bg-primary/90 transition-colors font-bold shadow-[0_0_15px_rgba(227,30,36,0.3)]">Lookup Ticket</button>
        </div>
        \`;
        
        // Remove old manual input if exists to prevent duplication
        const existing = document.getElementById('manual-hash');
        if (!existing) {
            container.querySelector('.bg-black\\\\/40')?.insertAdjacentHTML('beforeend', testInputHtml);
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
                alert(\`Ticket Found!\\n\\nID: \${ticket.id}\\nDevice: \${ticket.device_model}\\nStatus: \${ticket.status}\\nCost: $\${ticket.cost || 0}\`);
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
`;

fs.writeFileSync(logicPath, logicContent);
console.log('Updated scannerLogic.ts');
