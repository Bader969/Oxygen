const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'kanban.html');
let content = fs.readFileSync(file, 'utf8');

// The columns currently have: bg-black/20 backdrop-blur-xl
// We change it to: bg-black/10 backdrop-blur-sm
// This removes the heavy blur from the column so the cards can properly blur the animated background behind them.
content = content.replace(/bg-black\/20 backdrop-blur-xl/g, 'bg-black/10 backdrop-blur-[2px]');

fs.writeFileSync(file, content);
console.log('Updated column background in kanban.html');
