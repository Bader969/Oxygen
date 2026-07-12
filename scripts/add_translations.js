const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(file, 'utf8');

const trAdditions = `
    'nav.customers': 'Müşteriler',
    'nav.devices': 'Cihazlar',
    'dir.customers': 'Müşteri Rehberi',
    'dir.devices': 'Cihaz Envanteri',
    'dir.searchCust': 'İsim veya telefon ara...',
    'dir.searchDev': 'Cihaz veya IMEI ara...',
    'dir.filterAll': 'Tümü',
    'dir.filterActive': 'Aktif',
    'dir.filterVIP': 'VIP',
    'dir.filterPhones': 'Telefonlar',
    'dir.filterLaptops': 'Laptoplar',
`;

const arAdditions = `
    'nav.customers': 'العملاء',
    'nav.devices': 'الأجهزة',
    'dir.customers': 'دليل العملاء',
    'dir.devices': 'مخزون الأجهزة',
    'dir.searchCust': 'ابحث عن اسم أو هاتف...',
    'dir.searchDev': 'ابحث عن جهاز أو IMEI...',
    'dir.filterAll': 'الكل',
    'dir.filterActive': 'نشط',
    'dir.filterVIP': 'كبار الشخصيات',
    'dir.filterPhones': 'هواتف',
    'dir.filterLaptops': 'حواسيب محمولة',
`;

content = content.replace(/(tr:\s*\{[^}]*)(\},)/, `$1${trAdditions}$2`);
content = content.replace(/(ar:\s*\{[^}]*)(\},)/, `$1${arAdditions}$2`);

fs.writeFileSync(file, content);
console.log('Added translations');
