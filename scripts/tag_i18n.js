const fs = require('fs');

const files = [
    'index.html', 
    'src/new-ticket.html', 
    'src/kanban.html', 
    'src/qr-scanner.html', 
    'src/login.html'
];

const dict = {
    'Dashboard': 'nav.dashboard',
    'Tickets': 'nav.tickets',
    'QR Scanner': 'nav.scanner',
    'Kanban': 'nav.kanban',
    'Board': 'nav.kanban',
    'Settings': 'nav.settings',
    'Logout': 'nav.logout'
};

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');

        // Add class to logout links for easier interception
        content = content.replace(/<a([^>]*)>\s*<span[^>]*data-icon="logout"[^>]*>logout<\/span>\s*<span[^>]*>Logout<\/span>\s*<\/a>/g, '<a$1 class="btn-logout" href="#">\n<span class="material-symbols-outlined" data-icon="logout">logout</span>\n<span data-i18n="nav.logout" class="font-label-caps text-label-caps">Logout</span>\n</a>');

        // Tag navigation spans
        for (const [text, key] of Object.entries(dict)) {
            const regex = new RegExp(`>\\s*${text}\\s*</span`, 'g');
            content = content.replace(regex, ` data-i18n="${key}">${text}</span`);
        }

        // Add script tag to bottom of body if not exists
        if (!content.includes('i18n.ts')) {
            content = content.replace(/<\/body>/, '    <script type="module">\n      import { applyTranslation } from "/src/lib/i18n.ts";\n      applyTranslation();\n    </script>\n</body>');
        }

        fs.writeFileSync(f, content);
    }
});
console.log('Successfully tagged HTML files');
