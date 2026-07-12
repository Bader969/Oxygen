const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function fixSidebarLayout(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let original = content;

            // Pattern: </div> \s* <a...customers.html...</a> \s* <a...devices.html...</a>
            // We want to capture the </div> and move it after devices.html block
            const regex = /(<\/div>)(\s*<a[^>]*href="[^"]*customers\.html"[^>]*>[\s\S]*?<\/a>\s*<a[^>]*href="[^"]*devices\.html"[^>]*>[\s\S]*?<\/a>)/g;
            
            content = content.replace(regex, '$2\n  $1');

            if (content !== original) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Fixed sidebar layout in ${file}`);
            }
        }
    });
}

fixSidebarLayout(rootDir);
fixSidebarLayout(srcDir);
