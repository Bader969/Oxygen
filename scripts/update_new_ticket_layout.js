const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const newTicketHtmlPath = path.join(__dirname, '..', 'src', 'new-ticket.html');

let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
let newTicketHtml = fs.readFileSync(newTicketHtmlPath, 'utf8');

// Extract the SideNavBar and TopNavBar from index.html
const navStart = indexHtml.indexOf('<!-- SideNavBar (Web) -->');
const headerEnd = indexHtml.indexOf('</header>') + '</header>'.length;
const globalNavAndHeader = indexHtml.substring(navStart, headerEnd);

// In new-ticket.html, remove the existing header and ambient glow
newTicketHtml = newTicketHtml.replace(/<div class="ambient-glow"><\/div>/, '');
newTicketHtml = newTicketHtml.replace(/<!-- Header Section -->[\s\S]*?<\/header>/, globalNavAndHeader);

// Update <main> class to include the margin for the sidebar
newTicketHtml = newTicketHtml.replace(
    /<main class="flex-1 px-container-margin py-stack-md flex flex-col gap-stack-lg max-w-2xl mx-auto w-full">/,
    '<main class="pt-[5rem] pb-[6rem] md:pb-stack-lg px-container-margin md:ps-[17.5rem] w-full min-h-screen flex flex-col gap-stack-lg max-w-4xl mx-auto">'
);

// We should also add a title inside the main area since we removed the custom header
const titleHtml = `
<div class="mb-stack-lg flex items-center gap-4">
    <a href="/index.html" class="w-10 h-10 flex items-center justify-center rounded-full glass-panel text-on-surface-variant hover:text-primary transition-colors">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">arrow_back</span>
    </a>
    <div>
        <h1 data-i18n="ticket.title" class="font-headline-sm text-headline-sm text-on-background">New Ticket</h1>
        <p data-i18n="ticket.subtitle" class="font-label-caps text-label-caps text-on-surface-variant uppercase">Create Repair Entry</p>
    </div>
</div>
`;
newTicketHtml = newTicketHtml.replace(/<main[^>]*>/, `$&` + titleHtml);

// Remove the old BottomNavBar since the global layout has the SideNavBar
newTicketHtml = newTicketHtml.replace(/<!-- BottomNavBar[\s\S]*?<\/nav>/, '');

// Ensure nav.ts is loaded
if (!newTicketHtml.includes('/src/nav.ts')) {
    newTicketHtml = newTicketHtml.replace(/<\/body>/, '<script type="module" src="/src/nav.ts"></script>\n</body>');
}

fs.writeFileSync(newTicketHtmlPath, newTicketHtml);
console.log('Successfully injected global layout into new-ticket.html');
