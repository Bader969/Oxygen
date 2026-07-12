const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function updateSidebarDesign(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // 1. Remove the old toggle button
            content = content.replace(/<button class="sidebar-toggle[^>]*>\s*<span class="material-symbols-outlined">menu_open<\/span>\s*<\/button>/g, '');
            
            // 2. Increase logo size. Currently it is: w-10 h-10 min-w-[2.5rem]
            // We'll change it to w-14 h-14 min-w-[3.5rem]
            content = content.replace(/class="([^"]*?)w-10 h-10 min-w-\[2\.5rem\]([^"]*?)"/g, 'class="$1w-12 h-12 min-w-[3rem]$2"');
            
            // 3. Add the brand-container class to the logo div to help with CSS centering
            content = content.replace(/<div class="px-glass-padding mb-stack-lg flex items-center justify-between">/, '<div class="brand-container relative px-glass-padding mb-stack-lg flex items-center justify-between">');
            
            // 4. Inject the floating modern toggle button just inside the nav
            // Find <nav ...> and append the button right after
            if (content.includes('<nav class="hidden md:flex')) {
                // Remove existing floating toggle if any (for idempotency)
                content = content.replace(/<!-- Floating Toggle -->[\s\S]*?<\/button>/, '');
                
                content = content.replace(/(<nav[^>]*>)/, `$1\n<!-- Floating Toggle -->\n<button class="sidebar-toggle absolute top-10 end-[-14px] w-7 h-7 rounded-full bg-primary/20 backdrop-blur-md border border-primary text-primary flex items-center justify-center shadow-[0_0_10px_rgba(255,180,171,0.3)] hover:bg-primary hover:text-black hover:scale-110 transition-all z-[60]">\n    <span class="material-symbols-outlined text-[18px]">chevron_left</span>\n</button>`);
            }

            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Updated design in ${file}`);
        }
    });
}

updateSidebarDesign(rootDir);
updateSidebarDesign(srcDir);
