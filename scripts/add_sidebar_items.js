const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    path.join(__dirname, '..', 'src', 'profile.html'),
    path.join(__dirname, '..', 'src', 'qr-scanner.html')
];

const navItems = `
  <a class="flex items-center gap-stack-md text-on-surface-variant px-glass-padding py-stack-md hover:bg-white/5 transition-all" href="/src/customers.html">
  <span class="material-symbols-outlined" data-icon="groups">groups</span>
  <span class="sidebar-text whitespace-nowrap transition-opacity duration-300"><span data-i18n="nav.customers" class="font-label-caps text-label-caps">Customers</span></span>
  </a>
  <a class="flex items-center gap-stack-md text-on-surface-variant px-glass-padding py-stack-md hover:bg-white/5 transition-all" href="/src/devices.html">
  <span class="material-symbols-outlined" data-icon="devices">devices</span>
  <span class="sidebar-text whitespace-nowrap transition-opacity duration-300"><span data-i18n="nav.devices" class="font-label-caps text-label-caps">Devices</span></span>
  </a>
`;

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('nav.customers')) {
        // Just find the block that ends the flex-1 list.
        // It usually is followed by <div class="mt-auto or <!-- Settings -->
        const regex = /(<\/a>\s*<\/div>\s*<div class="mt-auto)/;
        if (content.match(regex)) {
            content = content.replace(regex, '</a>\n' + navItems + '\n  </div>\n  <div class="mt-auto');
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        } else {
            // Try another regex:
            // Find the last </a> inside the flex-1 div
            const regex2 = /(<span data-i18n="nav\.kanban"[^>]*>.*?<\/span><\/span>\s*<\/a>\s*)(?=<\/div>\s*<div class="mt-auto)/;
            if (content.match(regex2)) {
                content = content.replace(regex2, '$1' + navItems);
                fs.writeFileSync(file, content);
                console.log(`Updated ${file} (regex2)`);
            } else {
                console.log(`Could not find anchor point in ${file}`);
            }
        }
    }
});
