const fs = require('fs');
const path = require('path');

const i18nFile = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nFile, 'utf8');

// Add to Turkish
const trKeys = `
    'table.customer': 'Müşteri',
    'table.contact': 'İletişim',
    'table.status': 'Durum',
    'table.tickets': 'Talepler',
    'table.device': 'Cihaz',
    'table.owner': 'Sahibi',
    'table.serial': 'Seri / IMEI',
    'table.action': 'İşlem',
    'action.history': 'Geçmiş',
    'status.vip': 'VIP',
    'status.active': 'Aktif',
    'status.inactive': 'Pasif',
    'settings.role': 'Teknisyen',`;
i18nContent = i18nContent.replace("'settings.role': 'Teknisyen',", trKeys);

// Add to Arabic
const arKeys = `
    'table.customer': 'العميل',
    'table.contact': 'جهة الاتصال',
    'table.status': 'الحالة',
    'table.tickets': 'التذاكر',
    'table.device': 'الجهاز',
    'table.owner': 'المالك',
    'table.serial': 'الرقم التسلسلي / IMEI',
    'table.action': 'إجراء',
    'action.history': 'التاريخ',
    'status.vip': 'كبار الشخصيات',
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    'settings.role': 'فني',`;
i18nContent = i18nContent.replace("'settings.role': 'فني',", arKeys);

fs.writeFileSync(i18nFile, i18nContent);

const replaceInFile = (filename, replacements) => {
    const file = path.join(__dirname, '..', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    replacements.forEach(r => {
        content = content.replace(new RegExp(r.old, 'g'), r.new);
    });

    fs.writeFileSync(file, content);
}

// Customers replacements
replaceInFile('src/customers.html', [
    { old: 'Customer</div>', new: 'Customer</div>'.replace('Customer', '<span data-i18n="table.customer">Customer</span>') },
    { old: 'Contact</div>', new: 'Contact</div>'.replace('Contact', '<span data-i18n="table.contact">Contact</span>') },
    { old: 'Status</div>', new: 'Status</div>'.replace('Status', '<span data-i18n="table.status">Status</span>') },
    { old: 'Tickets</div>', new: 'Tickets</div>'.replace('Tickets', '<span data-i18n="table.tickets">Tickets</span>') },
    { old: 'Action</div>', new: 'Action</div>'.replace('Action', '<span data-i18n="table.action">Action</span>') },
    // Fix mock statuses in JS
    { old: "\\$\\{c.status\\}", new: '<span data-i18n="status.${c.status.toLowerCase()}">${c.status}</span>' },
    { old: 'Tickets: ', new: '<span data-i18n="table.tickets">Tickets</span>: ' }
]);

// Devices replacements
replaceInFile('src/devices.html', [
    { old: 'Device</div>', new: 'Device</div>'.replace('Device', '<span data-i18n="table.device">Device</span>') },
    { old: 'Owner</div>', new: 'Owner</div>'.replace('Owner', '<span data-i18n="table.owner">Owner</span>') },
    { old: 'Serial / IMEI</div>', new: 'Serial / IMEI</div>'.replace('Serial / IMEI', '<span data-i18n="table.serial">Serial / IMEI</span>') },
    { old: 'Action</div>', new: 'Action</div>'.replace('Action', '<span data-i18n="table.action">Action</span>') },
    { old: 'History\n', new: '<span data-i18n="action.history">History</span>\n' }
]);

console.log('Done mapping tables.');
