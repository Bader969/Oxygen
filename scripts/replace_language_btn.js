const fs = require('fs');
const path = require('path');

const targetFiles = [
    'index.html',
    'src/dashboard.html',
    'src/settings.html',
    'src/new-ticket.html',
    'src/kanban.html',
    'src/qr-scanner.html',
    'src/login.html'
];

const replacement = `<span class="material-symbols-outlined text-primary hover:bg-primary/10 transition-colors cursor-pointer p-2 rounded-full" data-icon="language">language</span>`;

const regex1 = /<button[^>]*>TR\/AR<\/button>/g;

targetFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content.replace(regex1, replacement);
        if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent);
            console.log(`Updated ${file}`);
        }
    }
});
