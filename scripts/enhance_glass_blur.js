const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function enhanceGlassBlur(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let modified = false;

            // Update blur(40px) to blur(80px) and background opacity 0.7 to 0.8
            if (content.includes('blur(40px)')) {
                content = content.replace(/blur\(40px\)/g, 'blur(80px)');
                modified = true;
            }
            if (content.includes('rgba(24, 26, 27, 0.7)')) {
                content = content.replace(/rgba\(24, 26, 27, 0\.7\)/g, 'rgba(24, 26, 27, 0.85)');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Enhanced glass blur in ${file}`);
            }
        }
    });
}

enhanceGlassBlur(rootDir);
enhanceGlassBlur(srcDir);
