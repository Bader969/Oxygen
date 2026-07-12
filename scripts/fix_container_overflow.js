const fs = require('fs');
const path = require('path');

const fixContainer = (filename) => {
    const file = path.join(__dirname, '..', 'src', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Replace the main tag classes
    const oldMain = '<main class="flex-1 flex flex-col h-full md:ms-64 relative z-10 w-full overflow-hidden">';
    // Use padding-start instead of margin-start so w-full doesn't overflow.
    // Also add mobile padding top for the hamburger menu, and h-[100dvh] for reliable mobile height.
    const newMain = '<main class="flex-1 flex flex-col h-[100dvh] pt-[4rem] md:pt-4 md:ps-[19.5rem] relative z-10 w-full overflow-hidden">';

    if (content.includes(oldMain)) {
        content = content.replace(oldMain, newMain);
        fs.writeFileSync(file, content);
        console.log(`Fixed container in ${filename}`);
    } else {
        // If it was already partially fixed or different, use regex
        content = content.replace(/<main class="[^"]*md:ms-64[^"]*"/, '<main class="flex-1 flex flex-col h-[100dvh] pt-[4rem] md:pt-4 md:ps-[19.5rem] relative z-10 w-full overflow-hidden"');
        fs.writeFileSync(file, content);
        console.log(`Regex fixed container in ${filename}`);
    }
};

fixContainer('customers.html');
fixContainer('devices.html');
