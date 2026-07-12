const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

const newGlass = `.glass-panel {
            background-color: rgba(24, 26, 27, 0.7) !important;
            backdrop-filter: blur(40px) saturate(200%) !important;
            -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4) !important;
        }`;

const newInputGlass = `.input-glass {
            background-color: rgba(0, 0, 0, 0.5) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-top: 1px solid rgba(0, 0, 0, 0.3) !important;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }`;

function updateGlassCSS(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // Regex to match the entire .glass-panel block
            content = content.replace(/\.glass-panel\s*\{[^}]+\}/g, newGlass);
            content = content.replace(/\.input-glass\s*\{[^}]+\}/g, newInputGlass);

            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Updated CSS in ${file}`);
        }
    });
}

updateGlassCSS(rootDir);
updateGlassCSS(srcDir);
