const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

const perfectBrandContainer = `
<!-- Brand -->
<div class="brand-container relative px-glass-padding mb-stack-lg flex items-center justify-between">
    <div class="flex items-center gap-stack-md overflow-hidden">
        <img alt="Oxygen Logo" class="w-12 h-12 min-w-[3rem] rounded-full object-cover border border-primary/30 shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLFZrha7fL9vSiwCCcD4Dnbc4NlfqkvIYvJtkkdPA3gCQCtrfefOjh5QQz8sL75YuFYLlmGbbeOj6rgRJXl1VSEN1SyiLUQSQFOVzKGAypvzhKQJhEmEWlK-FbJgcHZodVM5NEZQSftAelcrnP862JO6w7BnzunB3AwAxO6JjLOpHHFNt7y6Wfcsq05l1SMQOjpPPJqa0VTCdd0mBOkvOrpEXz3FANm0jWCOIjWfuMeQSzZtl3GV__tEIGL9qcoO_qWgg" />
        <div class="sidebar-text whitespace-normal transition-opacity duration-300">
            <h1 data-i18n="app.title" class="font-headline-sm text-headline-sm font-bold text-primary">Oxygen</h1>
            <p data-i18n="app.subtitle" class="font-label-caps text-label-caps text-on-surface-variant whitespace-normal">Repair Management</p>
        </div>
    </div>
</div>
`;

function unifyBrandContainers(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');

            // Find where the brand container starts
            const brandStart = content.indexOf('<div class="brand-container');
            if (brandStart !== -1) {
                // Find where the main tabs/links start
                let nextSection = content.indexOf('<div class="flex-1 flex flex-col', brandStart);
                let mainTabs = content.indexOf('<!-- Main Tabs -->', brandStart);
                
                let endIdx = nextSection;
                if (mainTabs !== -1 && mainTabs < nextSection) {
                    endIdx = mainTabs;
                }
                
                // If we found the bounds, replace the whole block
                if (endIdx !== -1) {
                    const before = content.substring(0, brandStart);
                    const after = content.substring(endIdx);
                    
                    // Note: ensure we don't accidentally remove the floating toggle if it's outside!
                    // Wait, the floating toggle is inserted directly after <nav ...> and before <div class="brand-container">
                    // We only replace from <div class="brand-container to the endIdx.
                    
                    content = before + perfectBrandContainer.trim() + '\n' + after;
                    fs.writeFileSync(filePath, content);
                    console.log('Unified ' + file);
                }
            }
        }
    });
}

unifyBrandContainers(rootDir);
unifyBrandContainers(srcDir);
