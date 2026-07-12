const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(file, 'utf8');

// Replacements
const mappings = [
    { old: '<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-gradient-primary">Günaydın, Technician</h2>', new: '<h2 data-i18n="dash.welcome" class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-gradient-primary">Günaydın, Technician</h2>' },
    { old: '<p class="font-body-md text-body-md text-on-surface-variant mt-1">Here is the current status of the repair floor.</p>', new: '<p data-i18n="dash.subtitle" class="font-body-md text-body-md text-on-surface-variant mt-1">Here is the current status of the repair floor.</p>' },
    { old: '<span class="font-label-caps text-label-caps">Açık Onarımlar</span>', new: '<span data-i18n="dash.openRepairs" class="font-label-caps text-label-caps">Açık Onarımlar</span>' },
    { old: '<span class="font-label-caps text-label-caps">Teslimata Hazır</span>', new: '<span data-i18n="dash.ready" class="font-label-caps text-label-caps">Teslimata Hazır</span>' },
    { old: '<span class="font-label-caps text-label-caps">Garanti Talepleri</span>', new: '<span data-i18n="dash.warranty" class="font-label-caps text-label-caps">Garanti Talepleri</span>' },
    { old: '<span class="font-label-caps text-label-caps">Günlük Gelir</span>', new: '<span data-i18n="dash.income" class="font-label-caps text-label-caps">Günlük Gelir</span>' },
    { old: '<h3 class="font-headline-sm text-headline-sm text-on-surface">Recent Tickets / Son Talepler</h3>', new: '<h3 data-i18n="dash.recent" class="font-headline-sm text-headline-sm text-on-surface">Recent Tickets / Son Talepler</h3>' },
    { old: '<button class="font-label-caps text-label-caps text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 transition-colors">Tümünü Gör</button>', new: '<button data-i18n="dash.seeAll" class="font-label-caps text-label-caps text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 transition-colors">Tümünü Gör</button>' }
];

mappings.forEach(m => {
    content = content.replace(m.old, m.new);
});

fs.writeFileSync(file, content);
console.log('index.html dashboard i18n tags restored.');
