const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function fixNavigation(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let original = content;

            // Dashboard
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="dashboard")/, '$1/index.html$2');
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="dashboard")/, '$1/index.html$2'); // Mobile usually exists too

            // Tickets (new-ticket.html)
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="confirmation_number")/, '$1/src/new-ticket.html$2');

            // QR Scanner
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="qr_code_scanner")/, '$1/src/qr-scanner.html$2');

            // Kanban
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="view_kanban")/, '$1/src/kanban.html$2');

            // Settings
            content = content.replace(/(<a[^>]*href=")#[^"]*("[^>]*>\s*<span[^>]*data-icon="settings")/, '$1/src/settings.html$2');

            // Logout (Wait, logout button might have different structure, let's just do a simple replacement if it has btn-logout)
            content = content.replace(/(<a[^>]*class="[^"]*btn-logout[^"]*"[^>]*href=")#[^"]*"/, '$1/src/login.html"');

            // Also check for mobile bottom nav which might have data-icon inside a slightly different structure
            // Example: <a class="..." href="#"><span data-icon="dashboard">...
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="dashboard")/g, 'href="/index.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="confirmation_number")/g, 'href="/src/new-ticket.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="qr_code_scanner")/g, 'href="/src/qr-scanner.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="view_kanban")/g, 'href="/src/kanban.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="settings")/g, 'href="/src/settings.html"$1');
            content = content.replace(/href="#"([^>]*class="[^"]*btn-logout[^"]*")/g, 'href="/src/login.html"$1');

            if (content !== original) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Fixed navigation links in ${file}`);
            }
        }
    });
}

fixNavigation(rootDir);
fixNavigation(srcDir);
