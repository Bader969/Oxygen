const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'dashboardLogic.ts');
let content = fs.readFileSync(file, 'utf8');

// Add authService import if not there
if (!content.includes('checkAuthSession')) {
    content = content.replace("import { getRepairs } from './lib/repairService';", "import { getRepairs } from './lib/repairService';\nimport { checkAuthSession } from './lib/authService';");
}

// Update the DOM logic for Income Card
const oldIncomeLogic = "if (elIncome) elIncome.textContent = `$${income.toLocaleString()}`; // Using $ since seed script used $";
const newIncomeLogic = `if (elIncome) elIncome.textContent = \`₺\${income.toLocaleString('tr-TR')}\`; // Using ₺

        // Admin check for Income card
        const user = await checkAuthSession();
        const elIncomeCard = document.getElementById('metric-income-card');
        const isAdmin = user?.user_metadata?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
        if (!isAdmin && elIncomeCard) {
            elIncomeCard.style.display = 'none';
        }`;

content = content.replace(oldIncomeLogic, newIncomeLogic);

// Update Recent Tickets Translation Logic
const oldStatusLogic = `if (ticket.status === 'pending') {
                    statusClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                    statusText = 'Bekliyor';
                } else if (ticket.status === 'in_progress') {
                    statusClass = 'bg-primary/20 text-primary border-primary/30 animate-pulse';
                    statusText = 'Onarımda';
                } else {
                    statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
                    statusText = 'Tamamlandı';
                }`;

// Account for possible encoding issues in the original file
const regexStatusLogic = /if\s*\(ticket\.status\s*===\s*'pending'\)\s*\{[\s\S]*?statusText\s*=\s*'Tamamland';\s*\}/;
const regexStatusLogicAlt = /if\s*\(ticket\.status\s*===\s*'pending'\)\s*\{[\s\S]*?statusText\s*=\s*'Tamamlandı';\s*\}/;

const newStatusLogic = `const lang = localStorage.getItem('appLang') || 'tr';
                const statusLabels = {
                    'tr': { 'pending': 'Bekliyor', 'in_progress': 'Onarımda', 'completed': 'Tamamlandı' },
                    'ar': { 'pending': 'قيد الانتظار', 'in_progress': 'في تقدم', 'completed': 'مكتمل' }
                };
                
                if (ticket.status === 'pending') {
                    statusClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                } else if (ticket.status === 'in_progress') {
                    statusClass = 'bg-primary/20 text-primary border-primary/30 animate-pulse';
                } else {
                    statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
                }
                statusText = statusLabels[lang]?.[ticket.status] || ticket.status;`;

if (content.match(regexStatusLogic)) {
    content = content.replace(regexStatusLogic, newStatusLogic);
} else if (content.match(regexStatusLogicAlt)) {
    content = content.replace(regexStatusLogicAlt, newStatusLogic);
} else {
    // Fallback simple replace
    content = content.replace(oldStatusLogic, newStatusLogic);
}

fs.writeFileSync(file, content);
console.log('dashboardLogic.ts updated');

// Now update index.html to add id="metric-income-card"
const indexFile = path.join(__dirname, '..', 'index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');

const oldCard = '<div class="glass-panel glass-panel-hover rounded-xl p-glass-padding flex flex-col justify-between h-32 relative \r\noverflow-hidden transition-all duration-300">';
const oldCardAlt = '<div class="glass-panel glass-panel-hover rounded-xl p-glass-padding flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300">';

const newCard = '<div id="metric-income-card" class="glass-panel glass-panel-hover rounded-xl p-glass-padding flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300">';

if (indexContent.includes('id="metric-income"')) {
    // We only want to replace the container of metric-income
    // Find metric-income, backtrack to the nearest <div class="glass-panel...">
    const regexCard = /<div class="glass-panel glass-panel-hover[^>]*>([\s\S]*?id="metric-income")/g;
    indexContent = indexContent.replace(regexCard, '<div id="metric-income-card" class="glass-panel glass-panel-hover rounded-xl p-glass-padding flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300">$1');
    fs.writeFileSync(indexFile, indexContent);
    console.log('index.html updated with metric-income-card id');
}

