const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(file, 'utf8');

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

// Only add if not there
if (!content.includes("'nav.customers': 'العملاء'")) {
    // Find the end of the ar dictionary.
    // The safest way is to find the LAST 'settings.logoutDesc': '...' block
    const match = content.match(/'settings\.logoutDesc': '[^']+',/g);
    if (match && match.length >= 2) {
        const arLogoutDesc = match[1]; // The second one is Arabic
        content = content.replace(arLogoutDesc, arLogoutDesc + '\\n' + arAdditions);
        fs.writeFileSync(file, content);
        console.log('Added Arabic translations');
    } else {
        console.log('Could not find anchor');
    }
}
