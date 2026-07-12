const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const fixLayout = (filename, titleKey, titleFallback) => {
    const file = path.join(srcDir, filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // 1. Update TopNavBar title to be page-specific instead of Overview
    content = content.replace(
        `<span data-i18n="header.overview" class="font-headline-sm text-headline-sm text-on-surface hidden md:block">Overview</span>`,
        `<span data-i18n="${titleKey}" class="font-headline-sm text-headline-sm text-on-surface hidden md:block">${titleFallback}</span>`
    );

    // 2. Adjust main tag padding to clear the top bar on both mobile and desktop (pt-[5rem] md:pt-[5rem])
    content = content.replace(
        /class="flex-1 flex flex-col h-\[100dvh\] pt-\[4rem\] md:pt-4 md:ps-\[19.5rem\] relative z-10 w-full overflow-hidden"/i,
        'class="flex-1 flex flex-col h-[100dvh] pt-[5rem] md:pt-[5rem] md:ps-[19.5rem] relative z-10 w-full overflow-hidden"'
    );

    // 3. Hide the inner header on desktop so it doesn't duplicate the top bar
    content = content.replace(
        /<header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black\/20 backdrop-blur-xl border-b border-primary\/10 shadow-\[0_4px_30px_rgba\(0,0,0,0.1\)\]">/i,
        `<header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black/20 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] md:hidden">`
    );

    fs.writeFileSync(file, content);
    console.log(`Fixed overlap and headers in ${filename}`);
};

fixLayout('devices.html', 'dir.devices', 'Device Inventory');
fixLayout('customers.html', 'dir.customers', 'Customers Directory');
