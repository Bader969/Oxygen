const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const files = [
    path.join(rootDir, 'index.html'),
    path.join(srcDir, 'customers.html'),
    path.join(srcDir, 'devices.html'),
    path.join(srcDir, 'kanban.html'),
    path.join(srcDir, 'new-ticket.html'),
    path.join(srcDir, 'qr-scanner.html'),
    path.join(srcDir, 'settings.html'),
    path.join(srcDir, 'profile.html'),
    path.join(srcDir, 'login.html')
];

// 1. Modify the HTML files to make the settings link hidden by default and add the "admin-only" class.
// Also hide the metric-income-card by default on index.html.
files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Make Settings link hidden by default
    // Target: <a class="... href="/src/settings.html" ...> or similar
    // We want to add style="display: none;" and class "admin-only"
    const settingsLinkRegex = /<a\s+([^>]*href=["'](?:\/src)?\/settings\.html["'][^>]*)>/gi;
    content = content.replace(settingsLinkRegex, (match, p1) => {
        let updatedP1 = p1;
        // Add style="display: none;"
        if (updatedP1.includes('style=')) {
            updatedP1 = updatedP1.replace(/style=(["'])(.*?)\1/gi, 'style=$1$2; display: none;$1');
        } else {
            updatedP1 += ' style="display: none;"';
        }
        // Add admin-only to class
        if (updatedP1.includes('class=')) {
            if (!updatedP1.includes('admin-only')) {
                updatedP1 = updatedP1.replace(/class=(["'])(.*?)\1/gi, 'class=$1$2 admin-only$1');
            }
        } else {
            updatedP1 += ' class="admin-only"';
        }
        return `<a ${updatedP1}>`;
    });

    // For index.html, hide the metric-income-card by default
    if (file.endsWith('index.html')) {
        content = content.replace(
            /id="metric-income-card"\s+class="([^"]*)"/i,
            'id="metric-income-card" class="$1" style="display: none;"'
        );
    }

    fs.writeFileSync(file, content);
    console.log(`Hidden admin elements by default in ${path.basename(file)}`);
});

// 2. Update nav.ts to show admin-only links only for admins
const navFile = path.join(srcDir, 'nav.ts');
let navContent = fs.readFileSync(navFile, 'utf8');

const oldRoleCheck = `        // Hide settings links for non-admins
        if (role !== 'admin') {
            document.querySelectorAll('a, button, div').forEach(el => {
                const icon = el.querySelector('.material-symbols-outlined');
                if (icon && (icon.getAttribute('data-icon') === 'settings' || icon.textContent?.trim() === 'settings')) {
                    (el as HTMLElement).style.display = 'none';
                }
            });
        }`;

const newRoleCheck = `        // Show/hide admin-only links depending on role
        document.querySelectorAll('.admin-only').forEach(el => {
            if (role === 'admin') {
                (el as HTMLElement).style.display = 'flex';
            } else {
                (el as HTMLElement).style.display = 'none';
            }
        });`;

navContent = navContent.replace(oldRoleCheck, newRoleCheck);
fs.writeFileSync(navFile, navContent);
console.log('nav.ts updated with non-flicker role check.');

// 3. Update dashboardLogic.ts to show/hide the income card properly
const dbLogicFile = path.join(srcDir, 'dashboardLogic.ts');
let dbLogicContent = fs.readFileSync(dbLogicFile, 'utf8');

const oldIncomeCheck = `        if (!isAdmin && elIncomeCard) {
            elIncomeCard.style.display = 'none';
        }`;

const newIncomeCheck = `        if (elIncomeCard) {
            if (isAdmin) {
                elIncomeCard.style.display = 'flex';
            } else {
                elIncomeCard.style.display = 'none';
            }
        }`;

dbLogicContent = dbLogicContent.replace(oldIncomeCheck, newIncomeCheck);
fs.writeFileSync(dbLogicFile, dbLogicContent);
console.log('dashboardLogic.ts updated with non-flicker income check.');
