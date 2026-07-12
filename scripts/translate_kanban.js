const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'src/kanban.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace column headers with data-i18n span wrapper
htmlContent = htmlContent.replace(/>\s*New Tickets\s*<\/h2>/g, '><span data-i18n="kanban.new">New Tickets</span></h2>');
htmlContent = htmlContent.replace(/>\s*In Progress\s*<\/h2>/g, '><span data-i18n="kanban.progress">In Progress</span></h2>');
htmlContent = htmlContent.replace(/>\s*Quality Check\s*<\/h2>/g, '><span data-i18n="kanban.quality">Quality Check</span></h2>');
htmlContent = htmlContent.replace(/>\s*Ready for Pickup\s*<\/h2>/g, '><span data-i18n="kanban.ready">Ready for Pickup</span></h2>');

fs.writeFileSync(htmlPath, htmlContent);
console.log('Updated kanban.html with i18n tags');
