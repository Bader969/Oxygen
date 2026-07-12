const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function updateLogoText(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // Add data-i18n="app.subtitle" to the logo subtitle
            content = content.replace(/<p class="([^"]*)">Repair Management<\/p>/, '<p data-i18n="app.subtitle" class="$1 whitespace-normal">Repair Management</p>');
            
            // Allow the sidebar text for the logo to wrap so it fits
            content = content.replace(/<div class="sidebar-text whitespace-nowrap([^"]*)">\s*<h1/g, '<div class="sidebar-text whitespace-normal$1">\n            <h1');

            // Widen the sidebar from w-64 to w-72 (288px) to fit the text better
            content = content.replace(/w-64/g, 'w-72');

            // Update main/header padding from md:ps-[17.5rem] to md:ps-[19.5rem] (312px)
            content = content.replace(/md:ps-\[17\.?5?rem\]/g, 'md:ps-[19.5rem]');
            
            // Wait, what about index.html? It has md:ps-[17rem] on header
            content = content.replace(/md:ps-\[17rem\]/g, 'md:ps-[19.5rem]');

            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Updated ${file}`);
        }
    });
}

updateLogoText(rootDir);
updateLogoText(srcDir);
