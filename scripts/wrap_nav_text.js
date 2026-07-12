const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function wrapNavText(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // Look for <span data-i18n="nav..."> inside <a ...> inside <nav ...>
            // A more robust way: wrap any span inside <nav ... fixed ...> that isn't a material-symbol
            // Since this is hard with regex, we can just do it in JS on the client side in nav.ts!
            // That's much safer.
        }
    });
}
