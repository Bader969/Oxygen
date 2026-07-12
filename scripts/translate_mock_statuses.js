const fs = require('fs');
const path = require('path');

const i18nFile = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nFile, 'utf8');

// Add status translations to TR
i18nContent = i18nContent.replace("'kanban.updating': 'Güncelleniyor...',", "'kanban.updating': 'Güncelleniyor...',\n    'status.pending': 'Bekliyor',\n    'status.in_progress': 'Onarımda',\n    'status.completed': 'Tamamlandı',");

// Add status translations to AR
i18nContent = i18nContent.replace("'kanban.updating': 'جاري التحديث...',", "'kanban.updating': 'جاري التحديث...',\n    'status.pending': 'قيد المراجعة',\n    'status.in_progress': 'قيد الإصلاح',\n    'status.completed': 'مكتمل',");

fs.writeFileSync(i18nFile, i18nContent);
console.log('Added status keys to i18n.ts');

const replaceInFile = (filename) => {
    const file = path.join(__dirname, '..', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Replace the exact spans with data-i18n injected
    // For pending:
    content = content.replace(
        /<span class="px-3 py-1 bg-yellow-500\/20 text-yellow-300 font-label-caps text-label-caps rounded-full backdrop-blur-md border border-yellow-500\/30">Bekliyor<\/span>/g,
        '<span data-i18n="status.pending" class="px-3 py-1 bg-yellow-500/20 text-yellow-300 font-label-caps text-label-caps rounded-full backdrop-blur-md border border-yellow-500/30">Bekliyor</span>'
    );
    // For in_progress:
    content = content.replace(
        /<span class="px-3 py-1 bg-primary\/20 text-primary font-label-caps text-label-caps rounded-full backdrop-blur-md border border-primary\/30 animate-pulse">Onarımda<\/span>/g,
        '<span data-i18n="status.in_progress" class="px-3 py-1 bg-primary/20 text-primary font-label-caps text-label-caps rounded-full backdrop-blur-md border border-primary/30 animate-pulse">Onarımda</span>'
    );
    // For completed:
    content = content.replace(
        /<span class="px-3 py-1 bg-green-500\/20 text-green-400 font-label-caps text-label-caps rounded-full backdrop-blur-md border border-green-500\/30">Tamamlandı<\/span>/g,
        '<span data-i18n="status.completed" class="px-3 py-1 bg-green-500/20 text-green-400 font-label-caps text-label-caps rounded-full backdrop-blur-md border border-green-500/30">Tamamlandı</span>'
    );

    // Also some might have "Tamamland" due to encoding glitches?
    // Let's use regex that allows for slight variations just in case
    content = content.replace(
        /<span class="([^"]*)">Bekliyor<\/span>/g,
        '<span data-i18n="status.pending" class="$1">Bekliyor</span>'
    );
    content = content.replace(
        /<span class="([^"]*)">Onarımda<\/span>/g,
        '<span data-i18n="status.in_progress" class="$1">Onarımda</span>'
    );
    content = content.replace(
        /<span class="([^"]*)">Tamamlandı<\/span>/g,
        '<span data-i18n="status.completed" class="$1">Tamamlandı</span>'
    );
    
    // And in case of the glitchy i encoding
    content = content.replace(
        /<span class="([^"]*)">Tamamland.<\/span>/g,
        '<span data-i18n="status.completed" class="$1">Tamamlandı</span>'
    );
    content = content.replace(
        /<span class="([^"]*)">Onar.mda<\/span>/g,
        '<span data-i18n="status.in_progress" class="$1">Onarımda</span>'
    );

    fs.writeFileSync(file, content);
    console.log('Replaced statuses in ' + filename);
}

replaceInFile('index.html');
replaceInFile('src/devices.html');
