const fs = require('fs');
const path = require('path');

const targetFiles = [
    'index.html',
    'src/dashboard.html'
];

const replacement = `<span class="material-symbols-outlined text-primary hover:bg-primary/10 transition-colors cursor-pointer p-2 rounded-full" data-icon="language">language</span>`;

targetFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Find double occurrences and replace with single
        let newContent = content.replace(new RegExp(replacement.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '\\s*' + replacement.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), replacement);
        
        if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent);
            console.log(`Removed duplicate in ${file}`);
        }
    }
});
