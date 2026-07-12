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

targetFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content;

        // 1. RTL Support: replace left, right, padding, border logic with logical properties
        newContent = newContent.replace(/\bleft-0\b/g, 'start-0');
        newContent = newContent.replace(/\bright-0\b/g, 'end-0');
        newContent = newContent.replace(/\bborder-r\b/g, 'border-e');
        newContent = newContent.replace(/\bborder-r-2\b/g, 'border-e-2');
        newContent = newContent.replace(/\bmd:pl-\[/g, 'md:ps-[');
        newContent = newContent.replace(/\bpl-\b/g, 'ps-');
        newContent = newContent.replace(/\bpr-\b/g, 'pe-');
        newContent = newContent.replace(/\bml-\b/g, 'ms-');
        newContent = newContent.replace(/\bmr-\b/g, 'me-');

        // 2. Z-Index fix for TopHeader vs Sidebar overlap
        // We want the sidebar <nav> to be z-50 and top <header> to be z-40
        // Find sidebar:
        newContent = newContent.replace(/(<nav[^>]*hidden md:flex[^>]*)\bz-40\b/g, '$1z-50');
        // Find header:
        newContent = newContent.replace(/(<header[^>]*)\bz-50\b/g, '$1z-40');

        if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent);
            console.log(`Updated ${file} for RTL and Z-index fixes`);
        }
    }
});
