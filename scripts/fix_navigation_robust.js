const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function fixNavigationRobust(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let original = content;

            // Find href="#" followed by <span class="material-symbols-outlined">icon_name</span>
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*dashboard\s*<\/span>)/g, 'href="/index.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*confirmation_number\s*<\/span>)/g, 'href="/src/new-ticket.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*qr_code_scanner\s*<\/span>)/g, 'href="/src/qr-scanner.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*view_kanban\s*<\/span>)/g, 'href="/src/kanban.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*settings\s*<\/span>)/g, 'href="/src/settings.html"$1');
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*>\s*logout\s*<\/span>)/g, 'href="/src/login.html"$1');

            // also fix bottom nav
            content = content.replace(/href="#"([^>]*>\s*<span[^>]*data-icon="dashboard")/g, 'href="/index.html"$1');

            if (content !== original) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Fixed navigation links robustly in ${file}`);
            }
        }
    });
}

fixNavigationRobust(rootDir);
fixNavigationRobust(srcDir);
