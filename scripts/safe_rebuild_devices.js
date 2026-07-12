const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'devices.html');
let content = fs.readFileSync(file, 'utf8');

const newMain = `
<main class="flex-1 flex flex-col h-full md:ms-64 relative z-10 w-full overflow-hidden">
    <!-- Header -->
    <header class="w-full flex-none pt-safe pb-stack-sm px-container-margin z-40 bg-black/20 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div class="flex items-center gap-4 h-16 pt-8 md:pt-0">
            <button class="md:hidden text-on-surface-variant hover:text-primary transition-colors sidebar-open">
                <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 class="font-headline-md text-headline-md font-medium" data-i18n="dir.devices">Device Inventory</h1>
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
                    <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="phone" data-i18n="dir.filterPhones">Phones</button>
                    <button class="px-4 py-1.5 rounded-full border border-primary/30 text-on-surface-variant bg-black/20 text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-all" data-filter="laptop" data-i18n="dir.filterLaptops">Laptops</button>
                </div>
                <div class="relative w-full md:w-80 group">
                    <span class="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors z-10 text-[20px]">search</span>
                    <input type="text" id="deviceSearch" class="w-full bg-black/40 border border-primary/20 text-on-surface rounded-full py-2 ps-10 pe-4 focus:outline-none focus:border-primary/60 focus:bg-black/60 transition-all placeholder-on-surface-variant text-sm" data-i18n="dir.searchDev" placeholder="Search by device or IMEI...">
                </div>
            </div>
            
            <!-- Table Header -->
            <div class="hidden md:grid grid-cols-12 gap-4 px-stack-md py-3 border-b border-primary/10 text-xs font-label-caps text-on-surface-variant uppercase tracking-wider bg-black/40">
                <div class="col-span-4">Device</div>
                <div class="col-span-3">Owner</div>
                <div class="col-span-3">Serial / IMEI</div>
                <div class="col-span-2 text-end">Action</div>
            </div>

            <!-- List Body -->
            <div id="deviceList" class="flex-1 overflow-y-auto custom-scrollbar flex flex-col divide-y divide-primary/5">
                <!-- Rows injected via JS -->
            </div>
        </div>
    </div>
</main>
`;

content = content.replace(/<main[\s\S]*?<\/main>/, newMain);

const newJs = `
<script>
const mockDevices = [
    { id: 'DEV-892', brand: 'Apple', model: 'iPhone 14 Pro', type: 'phone', imei: '358911002233445', owner: 'Sarah Jenkins', icon: 'smartphone' },
    { id: 'DEV-893', brand: 'Samsung', model: 'Galaxy S23', type: 'phone', imei: '352211009988776', owner: 'Marcus Thorne', icon: 'smartphone' },
    { id: 'DEV-894', brand: 'Apple', model: 'MacBook Pro M2', type: 'laptop', imei: 'C02FF1QMDQ4T', owner: 'Elena Rodriguez', icon: 'laptop_mac' },
    { id: 'DEV-895', brand: 'Google', model: 'Pixel 7 Pro', type: 'phone', imei: '355522003344556', owner: 'David Chen', icon: 'smartphone' },
    { id: 'DEV-896', brand: 'Dell', model: 'XPS 15', type: 'laptop', imei: '5B7P4J3', owner: 'Aisha Patel', icon: 'laptop_windows' },
];

function renderDevices(filter = 'all', search = '') {
    const list = document.getElementById('deviceList');
    if (!list) return;
    list.innerHTML = '';
    
    let filtered = mockDevices.filter(d => {
        const matchesFilter = filter === 'all' || d.type === filter;
        const matchesSearch = d.model.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase()) || d.imei.includes(search) || d.owner.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    filtered.forEach(d => {
        list.innerHTML += \`
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 px-stack-md py-4 hover:bg-white/5 transition-colors items-center group cursor-pointer">
                <!-- Device -->
                <div class="col-span-4 flex items-center gap-3">
                    <div class="w-10 h-10 shrink-0 rounded-xl bg-black/40 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[24px]">\${d.icon}</span>
                    </div>
                    <div class="min-w-0">
                        <h3 class="font-headline-sm text-on-surface truncate group-hover:text-primary transition-colors text-base">\${d.brand} \${d.model}</h3>
                        <span class="text-xs text-primary/70 truncate block">\${d.id}</span>
                    </div>
                </div>
                
                <!-- Owner -->
                <div class="col-span-3 flex items-center gap-2 text-sm text-on-surface-variant mt-2 md:mt-0">
                    <span class="material-symbols-outlined text-[16px] text-primary/70 md:hidden">person</span>
                    \${d.owner}
                </div>
                
                <!-- IMEI -->
                <div class="col-span-3 mt-2 md:mt-0">
                    <span class="font-mono text-xs text-on-surface-variant px-2 py-1 bg-black/20 rounded border border-white/5">
                        \${d.imei}
                    </span>
                </div>
                
                <!-- Action -->
                <div class="col-span-2 flex items-center justify-between md:justify-end gap-2 mt-4 md:mt-0">
                    <button class="hidden md:flex items-center gap-1 text-xs text-primary hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-[14px]">history</span> History
                    </button>
                    <button class="w-8 h-8 rounded-full bg-black/40 border border-primary/30 inline-flex items-center justify-center hover:bg-primary hover:text-black transition-colors text-primary">
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

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderDevices(currentFilter, e.target.value);
        });
    }

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => {
                p.classList.remove('bg-primary/10', 'text-primary', 'border-primary');
                p.classList.add('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            });
            pill.classList.remove('bg-black/20', 'text-on-surface-variant', 'border-primary/30');
            pill.classList.add('bg-primary/10', 'text-primary', 'border-primary');
            currentFilter = pill.getAttribute('data-filter');
            if (searchInput) renderDevices(currentFilter, searchInput.value);
        });
    });

    renderDevices();
});
</script>
</body>
`;

// Append JS safely
content = content.replace(/<\/body>/, newJs);

// Fix active state in sidebar
content = content.replace(/class="flex items-center gap-stack-md bg-primary\/20 text-primary border-e-2 border-primary/g, 'class="flex items-center gap-stack-md text-on-surface-variant');
content = content.replace(/href="\/src\/devices.html" class="flex items-center gap-stack-md text-on-surface-variant/g, 'href="/src/devices.html" class="flex items-center gap-stack-md bg-primary/20 text-primary border-e-2 border-primary');

fs.writeFileSync(file, content);
console.log('Built devices list view safely');
