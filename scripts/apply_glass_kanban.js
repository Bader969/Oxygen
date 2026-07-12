const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function applyGlassPanelToCards(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // In kanban.html, cards have: bg-black/40 backdrop-blur-md or bg-black/60 backdrop-blur-md
            // Some cards have: bg-black/20 backdrop-blur-xl (columns)
            // Let's replace card backgrounds with glass-panel class
            
            // Card 1 type: bg-black/40 backdrop-blur-md
            content = content.replace(/bg-black\/40\s+backdrop-blur-md/g, 'glass-panel');
            
            // Card 2 type: bg-black/60 backdrop-blur-md
            content = content.replace(/bg-black\/60\s+backdrop-blur-md/g, 'glass-panel');

            // Card in dashboard: bg-black/40 backdrop-blur-md
            // Wait, what about the kanban columns? They use bg-black/20 backdrop-blur-xl
            // Let's make columns glass-panel too? No, columns should be slightly darker/different, but the user specifically asked for "this to the Kanban board also"
            // Let's just make sure cards have glass-panel.

            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Applied glass-panel to cards in ${file}`);
        }
    });
}

applyGlassPanelToCards(rootDir);
applyGlassPanelToCards(srcDir);
