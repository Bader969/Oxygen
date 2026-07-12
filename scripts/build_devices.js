const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'devices.html');
let content = fs.readFileSync(file, 'utf8');

const mainBlock = `
<main class="flex-1 flex flex-col h-full md:ms-64 relative z-10 w-full overflow-hidden">
    <!-- Header -->
    <header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black/20 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div class="flex items-center gap-4 h-16 pt-8 md:pt-0">
            <button class="md:hidden text-on-surface-variant hover:text-primary transition-colors sidebar-open">
                <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 class="font-headline-md text-headline-md font-medium" data-i18n="dir.devices">Device Inventory</h1>
        </div>
        
        <!-- Search and Filters -->
        <div class="mt-4 flex flex-col gap-4">
            <div class="relative w-full max-w-2xl group">
                <span class="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors z-10">search</span>
                <input type="text" id="deviceSearch" class="w-full bg-black/40 backdrop-blur-md border border-primary/20 text-on-surface rounded-full py-3 ps-12 pe-4 focus:outline-none focus:border-primary/60 focus:bg-black/60 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] focus:shadow-[0_0_20px_rgba(227,30,36,0.2)] placeholder-on-surface-variant" data-i18n="dir.searchDev" placeholder="Search by device or IMEI...">
            </div>
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 filter-pills">
                <button class="px-4 py-1.5 rounded-full border border-primary text-primary bg-primary/10 text-sm whitespace-nowrap hover:bg-primary hover:text-black transition-all active-filter" data-filter="all" data-i18n="dir.filterAll">All</button>
                <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="phone" data-i18n="dir.filterPhones">Phones</button>
                <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="laptop" data-i18n="dir.filterLaptops">Laptops</button>
            </div>
        </div>
    </header>

    <!-- Content Grid -->
    <div class="flex-1 overflow-y-auto px-container-margin py-stack-lg custom-scrollbar">
        <div id="deviceGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-stack-lg pb-24">
            <!-- Cards injected via JS -->
        </div>
    </div>
</main>
`;

// Replace main
content = content.replace(/<main[\s\S]*?<\/main>/, mainBlock);

// Replace active nav state in sidebar
content = content.replace(/class="flex items-center gap-stack-md bg-primary\/20 text-primary border-e-2 border-primary/g, 'class="flex items-center gap-stack-md text-on-surface-variant');
content = content.replace(/href="\/src\/devices.html" class="flex items-center gap-stack-md text-on-surface-variant/g, 'href="/src/devices.html" class="flex items-center gap-stack-md bg-primary/20 text-primary border-e-2 border-primary');


// Add custom JS at the end
const jsInject = `
<script>
const mockDevices = [
    { id: 'DEV-892', brand: 'Apple', model: 'iPhone 14 Pro', type: 'phone', imei: '358911002233445', owner: 'Sarah Jenkins', icon: 'smartphone' },
    { id: 'DEV-893', brand: 'Samsung', model: 'Galaxy S23', type: 'phone', imei: '352211009988776', owner: 'Marcus Thorne', icon: 'smartphone' },
    { id: 'DEV-894', brand: 'Apple', model: 'MacBook Pro M2', type: 'laptop', imei: 'C02FF1QMDQ4T', owner: 'Elena Rodriguez', icon: 'laptop_mac' },
    { id: 'DEV-895', brand: 'Google', model: 'Pixel 7 Pro', type: 'phone', imei: '355522003344556', owner: 'David Chen', icon: 'smartphone' },
    { id: 'DEV-896', brand: 'Dell', model: 'XPS 15', type: 'laptop', imei: '5B7P4J3', owner: 'Aisha Patel', icon: 'laptop_windows' },
];

function renderDevices(filter = 'all', search = '') {
    const grid = document.getElementById('deviceGrid');
    grid.innerHTML = '';
    
    let filtered = mockDevices.filter(d => {
        const matchesFilter = filter === 'all' || d.type === filter;
        const matchesSearch = d.model.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase()) || d.imei.includes(search) || d.owner.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    filtered.forEach(d => {
        grid.innerHTML += \`
            <div class="glass-panel p-stack-md rounded-xl border border-primary/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(227,30,36,0.2)] transition-all cursor-pointer group">
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 shrink-0 rounded-xl bg-black/40 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[28px]">\${d.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors">\${d.brand} \${d.model}</h3>
                        <p class="text-xs text-on-surface-variant truncate">\${d.id}</p>
                    </div>
                </div>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm text-on-surface-variant bg-black/20 p-2 rounded-lg border border-white/5">
                        <span class="material-symbols-outlined text-[16px] text-primary/70">person</span>
                        <span class="truncate">\${d.owner}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-on-surface-variant bg-black/20 p-2 rounded-lg border border-white/5">
                        <span class="material-symbols-outlined text-[16px] text-primary/70">pin</span>
                        <span class="truncate font-mono text-xs">\${d.imei}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                    <button class="flex items-center gap-1 text-sm text-primary hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-[16px]">history</span> History
                    </button>
                    <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
                        <span class="material-symbols-outlined text-[18px]">build</span>
                    </button>
                </div>
            </div>
        \`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('deviceSearch');
    const pills = document.querySelectorAll('.filter-pills button');
    let currentFilter = 'all';

    searchInput.addEventListener('input', (e) => {
        renderDevices(currentFilter, e.target.value);
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
            renderDevices(currentFilter, searchInput.value);
        });
    });

    renderDevices();
});
</script>
</body>
`;

content = content.replace(/<\/body>/, jsInject);

fs.writeFileSync(file, content);
console.log('Built devices.html');
