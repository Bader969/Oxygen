const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function injectTransitions(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // 1. Add View Transitions API meta tag to <head>
            if (!content.includes('<meta name="view-transition"')) {
                content = content.replace(/<head>/, '<head>\n<meta name="view-transition" content="same-origin" />');
            }
            
            // 2. Add global fade-in CSS
            if (!content.includes('animation: pageFade')) {
                const styleToInject = `
    <style>
        @keyframes pageFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        main { animation: pageFade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    </style>
                `.trim();
                content = content.replace(/<\/head>/, `    ${styleToInject}\n</head>`);
            }
            
            // 3. Prevent FOUC: Add blocking inline script immediately after <body>
            if (!content.includes("localStorage.getItem('sidebarState') === 'collapsed'")) {
                content = content.replace(/(<body[^>]*>)/, `$1\n<script>if(localStorage.getItem('sidebarState') === 'collapsed') document.body.classList.add('sidebar-collapsed');</script>`);
            }
            
            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Injected transitions into ${file}`);
        }
    });
}

injectTransitions(rootDir);
injectTransitions(srcDir);
