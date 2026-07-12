const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'customers.html');
let content = fs.readFileSync(file, 'utf8');

// Replace everything inside <main>
const newMain = `
<main class="flex-1 flex flex-col h-full md:ms-64 relative z-10 w-full overflow-hidden">
    <!-- Header -->
    <header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black/20 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div class="flex items-center gap-4 h-16 pt-8 md:pt-0">
            <button class="md:hidden text-on-surface-variant hover:text-primary transition-colors sidebar-open">
                <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 class="font-headline-md text-headline-md font-medium" data-i18n="dir.customers">Customers Directory</h1>
        </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto px-container-margin py-stack-lg custom-scrollbar">
        <!-- List Container -->
        <div class="glass-panel rounded-2xl border border-primary/10 overflow-hidden flex flex-col h-full max-h-[800px]">
            <!-- List Header (Search & Filters) -->
            <div class="p-stack-md border-b border-primary/10 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-2 overflow-x-auto no-scrollbar filter-pills">
                    <button class="px-4 py-1.5 rounded-full border border-primary text-primary bg-primary/10 text-sm whitespace-nowrap hover:bg-primary hover:text-black transition-all active-filter" data-filter="all" data-i18n="dir.filterAll">All</button>
                    <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="vip" data-i18n="dir.filterVIP">VIP</button>
                    <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="active" data-i18n="dir.filterActive">Active</button>
                </div>
                <div class="relative w-full md:w-80 group">
                    <span class="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors z-10 text-[20px]">search</span>
                    <input type="text" id="customerSearch" class="w-full bg-black/40 border border-primary/20 text-on-surface rounded-full py-2 ps-10 pe-4 focus:outline-none focus:border-primary/60 focus:bg-black/60 transition-all placeholder-on-surface-variant text-sm" data-i18n="dir.searchCust" placeholder="Search by name or phone...">
                </div>
            </div>
            
            <!-- Table Header -->
            <div class="hidden md:grid grid-cols-12 gap-4 px-stack-md py-3 border-b border-primary/10 text-xs font-label-caps text-on-surface-variant uppercase tracking-wider bg-black/40">
                <div class="col-span-4">Customer</div>
                <div class="col-span-3">Contact</div>
                <div class="col-span-2">Status</div>
                <div class="col-span-2 text-center">Tickets</div>
                <div class="col-span-1 text-end">Action</div>
            </div>

            <!-- List Body -->
            <div id="customerList" class="flex-1 overflow-y-auto custom-scrollbar flex flex-col divide-y divide-primary/5">
                <!-- Rows injected via JS -->
            </div>
        </div>
    </div>
</main>
`;

content = content.replace(/<main[\s\S]*?<\/main>/, newMain);

// Replace JS logic
const newJs = `
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
    const list = document.getElementById('customerList');
    list.innerHTML = '';
    
    let filtered = mockCustomers.filter(c => {
        const matchesFilter = filter === 'all' || (filter === 'active' && c.status === 'active') || (filter === 'vip' && c.tags.includes('vip'));
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        return matchesFilter && matchesSearch;
    });

    filtered.forEach(c => {
        const statusColor = c.status === 'active' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-on-surface-variant border-white/10 bg-black/20';
        list.innerHTML += \`
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer">
                <!-- Customer Name & Avatar -->
                <div class="col-span-4 flex items-center gap-3">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30 group-hover:scale-110 transition-transform">
                        \${c.name.charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">\${c.name}</h3>
                            \${c.tags.includes('vip') ? '<span class="material-symbols-outlined text-amber-400 text-[16px]" title="VIP">star</span>' : ''}
                        </div>
                        <span class="text-xs text-primary/70 truncate block">\${c.id}</span>
                    </div>
                </div>
                
                <!-- Contact (Mobile hidden/reformatted) -->
                <div class="col-span-3 flex items-center gap-2 text-sm text-on-surface-variant mt-2 md:mt-0">
                    <span class="material-symbols-outlined text-[16px] text-primary/70 md:hidden">call</span>
                    \${c.phone}
                </div>
                
                <!-- Status -->
                <div class="col-span-2 mt-2 md:mt-0">
                    <span class="px-2.5 py-1 rounded-full text-xs border \${statusColor} uppercase tracking-wider inline-block">
                        \${c.status}
                    </span>
                </div>
                
                <!-- Tickets -->
                <div class="col-span-2 md:text-center mt-2 md:mt-0 text-sm text-on-surface-variant">
                    <span class="md:hidden font-bold">Tickets: </span>
                    <span class="text-primary font-bold">\${c.tickets}</span>
                </div>
                
                <!-- Action -->
                <div class="col-span-1 md:text-end mt-4 md:mt-0">
                    <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
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

content = content.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, newJs);

fs.writeFileSync(file, content);
console.log('Built customers list view');
