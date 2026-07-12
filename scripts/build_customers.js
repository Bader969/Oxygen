const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'customers.html');
let content = fs.readFileSync(file, 'utf8');

const mainBlock = `
<main class="flex-1 flex flex-col h-full md:ms-64 relative z-10 w-full overflow-hidden">
    <!-- Header -->
    <header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black/20 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div class="flex items-center gap-4 h-16 pt-8 md:pt-0">
            <button class="md:hidden text-on-surface-variant hover:text-primary transition-colors sidebar-open">
                <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 class="font-headline-md text-headline-md font-medium" data-i18n="dir.customers">Customers Directory</h1>
        </div>
        
        <!-- Search and Filters -->
        <div class="mt-4 flex flex-col gap-4">
            <div class="relative w-full max-w-2xl group">
                <span class="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors z-10">search</span>
                <input type="text" id="customerSearch" class="w-full bg-black/40 backdrop-blur-md border border-primary/20 text-on-surface rounded-full py-3 ps-12 pe-4 focus:outline-none focus:border-primary/60 focus:bg-black/60 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] focus:shadow-[0_0_20px_rgba(227,30,36,0.2)] placeholder-on-surface-variant" data-i18n="dir.searchCust" placeholder="Search by name or phone...">
            </div>
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 filter-pills">
                <button class="px-4 py-1.5 rounded-full border border-primary text-primary bg-primary/10 text-sm whitespace-nowrap hover:bg-primary hover:text-black transition-all active-filter" data-filter="all" data-i18n="dir.filterAll">All</button>
                <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="vip" data-i18n="dir.filterVIP">VIP</button>
                <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="active" data-i18n="dir.filterActive">Active</button>
            </div>
        </div>
    </header>

    <!-- Content Grid -->
    <div class="flex-1 overflow-y-auto px-container-margin py-stack-lg custom-scrollbar">
        <div id="customerGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-stack-lg pb-24">
            <!-- Cards injected via JS -->
        </div>
    </div>
</main>
`;

// Replace main
content = content.replace(/<main[\s\S]*?<\/main>/, mainBlock);

// Replace active nav state in sidebar (optional but nice)
content = content.replace(/class="flex items-center gap-stack-md bg-primary\/20 text-primary border-e-2 border-primary/g, 'class="flex items-center gap-stack-md text-on-surface-variant');
content = content.replace(/href="\/src\/customers.html" class="flex items-center gap-stack-md text-on-surface-variant/g, 'href="/src/customers.html" class="flex items-center gap-stack-md bg-primary/20 text-primary border-e-2 border-primary');


// Add custom JS at the end
const jsInject = `
<script>
const mockCustomers = [
    { id: 'CUS-001', name: 'Sarah Jenkins', phone: '+90 555 123 4567', tickets: 3, status: 'active', tags: ['vip'] },
    { id: 'CUS-002', name: 'Marcus Thorne', phone: '+90 555 987 6543', tickets: 1, status: 'active', tags: [] },
    { id: 'CUS-003', name: 'Elena Rodriguez', phone: '+90 532 444 5566', tickets: 5, status: 'inactive', tags: ['vip'] },
    { id: 'CUS-004', name: 'David Chen', phone: '+90 543 222 1100', tickets: 2, status: 'active', tags: [] },
    { id: 'CUS-005', name: 'Aisha Patel', phone: '+90 505 888 9900', tickets: 1, status: 'inactive', tags: [] },
    { id: 'CUS-006', name: 'James Wilson', phone: '+90 530 111 2233', tickets: 4, status: 'active', tags: ['vip'] },
];

function renderCustomers(filter = 'all', search = '') {
    const grid = document.getElementById('customerGrid');
    grid.innerHTML = '';
    
    let filtered = mockCustomers.filter(c => {
        const matchesFilter = filter === 'all' || (filter === 'active' && c.status === 'active') || (filter === 'vip' && c.tags.includes('vip'));
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        return matchesFilter && matchesSearch;
    });

    filtered.forEach(c => {
        grid.innerHTML += \`
            <div class="glass-panel p-stack-md rounded-xl border border-primary/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(227,30,36,0.2)] transition-all cursor-pointer group">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30">
                            \${c.name.charAt(0)}
                        </div>
                        <div>
                            <h3 class="font-headline-sm text-on-surface group-hover:text-primary transition-colors">\${c.name}</h3>
                            <span class="text-xs text-primary/70">\${c.id}</span>
                        </div>
                    </div>
                    \${c.tags.includes('vip') ? '<span class="material-symbols-outlined text-amber-400 text-[20px]" title="VIP">star</span>' : ''}
                </div>
                <div class="flex items-center gap-2 text-on-surface-variant text-sm mb-2">
                    <span class="material-symbols-outlined text-[16px]">call</span> \${c.phone}
                </div>
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                    <div class="text-sm text-on-surface-variant">
                        <span class="text-primary font-bold">\${c.tickets}</span> Tickets
                    </div>
                    <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
                        <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </div>
        \`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('customerSearch');
    const pills = document.querySelectorAll('.filter-pills button');
    let currentFilter = 'all';

    searchInput.addEventListener('input', (e) => {
        renderCustomers(currentFilter, e.target.value);
    });

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => {
                p.classList.remove('bg-primary/10', 'text-primary', 'border-primary');
                p.classList.add('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            });
            pill.classList.remove('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            pill.classList.add('bg-primary/10', 'text-primary', 'border-primary');
            currentFilter = pill.getAttribute('data-filter');
            renderCustomers(currentFilter, searchInput.value);
        });
    });

    renderCustomers();
});
</script>
</body>
`;

content = content.replace(/<\/body>/, jsInject);

fs.writeFileSync(file, content);
console.log('Built customers.html');
