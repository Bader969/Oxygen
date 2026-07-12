const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'kanban.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Add specific .kanban-card class to the style block
const kanbanStyle = `
    <style>
        .kanban-card {
            background-color: rgba(15, 15, 15, 0.65) !important; /* Slightly dark base for contrast */
            backdrop-filter: blur(30px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(30px) saturate(150%) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5) !important;
        }
`;

if (!content.includes('.kanban-card {')) {
    content = content.replace('<style>', kanbanStyle);
}

// 2. Replace glass-panel with kanban-card only on the cards inside kanban.html
// The cards are within <div class="glass-panel p-stack-md rounded-lg
content = content.replace(/class="glass-panel p-stack-md/g, 'class="kanban-card p-stack-md');

fs.writeFileSync(file, content);
console.log('Applied specific kanban-card styling to kanban.html');
