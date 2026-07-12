const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function fixSidebarFlash(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let modified = false;

            // 1. Add .preload CSS
            if (!content.includes('.preload * {')) {
                const styleInject = `.preload * { transition: none !important; }\n        .glass-panel`;
                content = content.replace('.glass-panel', styleInject);
                modified = true;
            }

            // 2. Add preload to body class
            if (content.includes('<body class="') && !content.includes('preload"')) {
                content = content.replace('<body class="', '<body class="preload ');
                modified = true;
            }

            // 3. Add the removal script
            if (!content.includes("document.body.classList.remove('preload')")) {
                const removalScript = `\n<script>window.addEventListener('load', () => { setTimeout(() => { document.body.classList.remove('preload'); }, 50); });</script>`;
                content = content.replace("document.body.classList.add('sidebar-collapsed');</script>", "document.body.classList.add('sidebar-collapsed');</script>" + removalScript);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Fixed sidebar flash in ${file}`);
            }
        }
    });
}

fixSidebarFlash(rootDir);
fixSidebarFlash(srcDir);
