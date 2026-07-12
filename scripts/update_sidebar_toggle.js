const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function injectSidebarToggle(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // Replace the logo and title container
            const logoRegex = /<div class="px-glass-padding mb-stack-lg flex items-center gap-stack-md">\s*<img([^>]*)>\s*<div>\s*<h1([^>]*)>(.*?)<\/h1>\s*<p([^>]*)>(.*?)<\/p>\s*<\/div>\s*<\/div>/;
            
            if (logoRegex.test(content)) {
                content = content.replace(logoRegex, `
<div class="px-glass-padding mb-stack-lg flex items-center justify-between">
    <div class="flex items-center gap-stack-md overflow-hidden">
        <img$1 class="w-10 h-10 min-w-[2.5rem] rounded-full object-cover border border-primary/30 shrink-0">
        <div class="sidebar-text whitespace-nowrap transition-opacity duration-300">
            <h1$2>$3</h1>
            <p$4>$5</p>
        </div>
    </div>
    <button class="sidebar-toggle text-on-surface-variant hover:text-primary transition-colors shrink-0">
        <span class="material-symbols-outlined">menu_open</span>
    </button>
</div>
                `.trim());
                
                // Also wrap all a tag text in .sidebar-text
                // Find all <span data-i18n="nav.something">
                content = content.replace(/(<span data-i18n="nav.[^"]*"[^>]*>.*?<\/span>)/g, '<span class="sidebar-text whitespace-nowrap transition-opacity duration-300">$1</span>');
                
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Updated ${file}`);
            }
        }
    });
}

injectSidebarToggle(rootDir);
injectSidebarToggle(srcDir);
