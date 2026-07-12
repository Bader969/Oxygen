const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

const injectCode = `<script>
    (function() {
        var lang = localStorage.getItem('appLang') || 'tr';
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.classList.add('i18n-loading');
    })();
</script>
<style>
    html.i18n-loading [data-i18n] { visibility: hidden; }
</style>`;

function fixI18nFlash(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            let modified = false;

            if (!content.includes('i18n-loading')) {
                // Insert right after <head>
                content = content.replace(/<head[^>]*>/, `$&` + '\n' + injectCode);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(path.join(dir, file), content);
                console.log(`Fixed i18n flash in ${file}`);
            }
        }
    });
}

fixI18nFlash(rootDir);
fixI18nFlash(srcDir);
