const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'src/kanban.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace any overflow-y-auto that doesn't have no-scrollbar
htmlContent = htmlContent.replace(/overflow-y-auto(?! no-scrollbar)/g, 'overflow-y-auto no-scrollbar');

fs.writeFileSync(htmlPath, htmlContent);
console.log('Added no-scrollbar to all columns');
