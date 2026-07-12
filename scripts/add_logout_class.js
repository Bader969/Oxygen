const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const files = [
    path.join(rootDir, 'index.html'),
    path.join(srcDir, 'customers.html'),
    path.join(srcDir, 'devices.html'),
    path.join(srcDir, 'kanban.html'),
    path.join(srcDir, 'new-ticket.html'),
    path.join(srcDir, 'qr-scanner.html'),
    path.join(srcDir, 'settings.html'),
    path.join(srcDir, 'profile.html'),
    path.join(srcDir, 'login.html') // Just in case, though login probably doesn't have sidebar logout
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Find the <a> tag that contains href="/src/login.html" or href="/login.html"
    // and make sure it has the btn-logout class
    // We can use a regex to capture <a ... href=".../login.html" ...>
    const regex = /<a\s+([^>]*href=["'](?:\/src)?\/login\.html["'][^>]*)>/gi;

    content = content.replace(regex, (match, p1) => {
        // If it already has class, add btn-logout to the class attribute
        if (p1.includes('class=')) {
            // Check if btn-logout is already there
            if (p1.includes('btn-logout')) {
                return match;
            }
            // Replace class="value" with class="value btn-logout"
            return `<a ${p1.replace(/class=(["'])(.*?)\1/gi, 'class=$1$2 btn-logout$1')}>`;
        } else {
            // Otherwise, add class="btn-logout"
            return `<a class="btn-logout" ${p1}>`;
        }
    });

    fs.writeFileSync(file, content);
    console.log(`Processed logout class for ${path.basename(file)}`);
});
