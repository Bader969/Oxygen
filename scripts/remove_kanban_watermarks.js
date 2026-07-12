const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'kanban.html');
let content = fs.readFileSync(file, 'utf8');

// The SVG block is:
// <div class="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
// <svg class="w-72 h-64 fill-white" viewbox="0 0 384 512"><path d="M318.7..."></path></svg>
// </div>

const regex = /<div class="absolute inset-0 flex items-center justify-center opacity-\[0\.03\] pointer-events-none z-0">\s*<svg class="w-72 h-64 fill-white"[^>]*>.*?<\/svg>\s*<\/div>/gs;

content = content.replace(regex, '');
// Also remove the "<!-- Apple Watermark -->" comment if present
content = content.replace(/<!-- Apple Watermark -->\s*/g, '');

fs.writeFileSync(file, content);
console.log('Removed Apple Watermarks from kanban.html');
