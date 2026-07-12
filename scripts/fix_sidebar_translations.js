const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const files = [
    path.join(rootDir, 'index.html'),
    path.join(srcDir, 'kanban.html'),
    path.join(srcDir, 'new-ticket.html'),
    path.join(srcDir, 'qr-scanner.html'),
    path.join(srcDir, 'settings.html'),
    path.join(srcDir, 'login.html')
];

// we already know customers.html and devices.html have some data-i18n, but maybe they are duplicated?
// <span data-i18n="nav.dashboard" class="font-label-caps text-label-caps" data-i18n="nav.dashboard">Dashboard</span>
// Yes, they had duplicates in my previous output. Let's fix them all cleanly.

files.push(path.join(srcDir, 'customers.html'));
files.push(path.join(srcDir, 'devices.html'));

const mappings = [
    { text: '>Dashboard</span>', i18n: 'nav.dashboard' },
    { text: '>Tickets</span>', i18n: 'nav.tickets' },
    { text: '>QR Scanner</span>', i18n: 'nav.scanner' },
    { text: '>Kanban</span>', i18n: 'nav.kanban' },
    { text: '>Settings</span>', i18n: 'nav.settings' },
    { text: '>Logout</span>', i18n: 'nav.logout' }
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    mappings.forEach(m => {
        // Find spans that have the text but NO data-i18n
        // Example: <span class="font-label-caps text-label-caps">Dashboard</span>
        // Be careful not to replace it if it already has data-i18n.
        // Regex: <span([^>]*)>(Dashboard|Tickets|...)<\/span>
        // Only if $1 does not contain data-i18n
        const regex = new RegExp(`<span([^>]*)>${m.text.replace('>', '').replace('</span>', '')}</span>`, 'g');
        content = content.replace(regex, (match, p1) => {
            if (p1.includes('data-i18n')) {
                // If it already has data-i18n but duplicated, let's clean it up
                const cleanP1 = p1.replace(/\s*data-i18n="[^"]+"/g, '');
                return `<span${cleanP1} data-i18n="${m.i18n}">${m.text.replace('>', '').replace('</span>', '')}</span>`;
            }
            return `<span${p1} data-i18n="${m.i18n}">${m.text.replace('>', '').replace('</span>', '')}</span>`;
        });
    });

    fs.writeFileSync(file, content);
    console.log(`Updated ${path.basename(file)}`);
});
