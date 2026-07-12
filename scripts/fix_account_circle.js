const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const rootDir = path.join(__dirname, '..');

// Helper to replace account circle in a dir
function wrapAccountCircle(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            content = content.replace(
                /<span class="material-symbols-outlined text-primary hover:bg-primary\/10 transition-colors cursor-pointer p-2 rounded-full" data-icon="account_circle">account_circle<\/span>/g,
                '<a href="/src/profile.html" class="flex"><span class="material-symbols-outlined text-primary hover:bg-primary/10 transition-colors cursor-pointer p-2 rounded-full" data-icon="account_circle">account_circle</span></a>'
            );
            fs.writeFileSync(path.join(dir, file), content);
        }
    });
}

wrapAccountCircle(srcDir);
wrapAccountCircle(rootDir);
console.log('Wrapped account_circle in anchor tags');
