const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'src/lib/i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Insert TR placeholders
i18nContent = i18nContent.replace(
    "'ticket.create': 'Talep Oluştur',",
    "'ticket.create': 'Talep Oluştur',\n    'ticket.namePlaceholder': 'Müşteri adını girin',\n    'ticket.phonePlaceholder': '+90 555 000 0000',\n    'ticket.brandPlaceholder': 'örn. Apple',\n    'ticket.modelPlaceholder': 'örn. iPhone 13',\n    'ticket.imei': 'IMEI / Seri Numarası',\n    'ticket.imeiPlaceholder': 'IMEI tara veya yaz',\n    'ticket.issuePlaceholder': 'Sorunu açıklayın...',\n    'ticket.pricePlaceholder': '0.00',"
);

// Insert AR placeholders
i18nContent = i18nContent.replace(
    "'ticket.create': 'إنشاء التذكرة',",
    "'ticket.create': 'إنشاء التذكرة',\n    'ticket.namePlaceholder': 'أدخل اسم العميل',\n    'ticket.phonePlaceholder': '+971 55 000 0000',\n    'ticket.brandPlaceholder': 'مثال: أبل',\n    'ticket.modelPlaceholder': 'مثال: أيفون 13',\n    'ticket.imei': 'IMEI / الرقم التسلسلي',\n    'ticket.imeiPlaceholder': 'امسح أو اكتب IMEI',\n    'ticket.issuePlaceholder': 'صف المشكلة...',\n    'ticket.pricePlaceholder': '0.00',"
);

fs.writeFileSync(i18nPath, i18nContent);
console.log('Updated i18n.ts');

const htmlPath = path.join(__dirname, '..', 'src/new-ticket.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Back button fix
htmlContent = htmlContent.replace(
    /<button class="w-10 h-10 flex items-center justify-center rounded-full glass-panel text-on-surface-variant hover:text-primary transition-colors">\s*<span class="material-symbols-outlined"[^>]*>arrow_back<\/span>\s*<\/button>/g,
    '<a href="/index.html" class="w-10 h-10 flex items-center justify-center rounded-full glass-panel text-on-surface-variant hover:text-primary transition-colors">\n<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 0;">arrow_back</span>\n</a>'
);

// Tags
const tagMap = [
    { search: '<h1 class="font-headline-sm text-headline-sm text-on-background">New Ticket</h1>', replace: '<h1 data-i18n="ticket.title" class="font-headline-sm text-headline-sm text-on-background">New Ticket</h1>' },
    { search: '<p class="font-label-caps text-label-caps text-on-surface-variant uppercase">Create Repair Entry</p>', replace: '<p data-i18n="ticket.subtitle" class="font-label-caps text-label-caps text-on-surface-variant uppercase">Create Repair Entry</p>' },
    { search: 'Customer Info\n            </h2>', replace: 'Customer Info\n            <span data-i18n="ticket.customerInfo" class="hidden"></span></h2>' }, // Actually better to replace the text node
    { search: 'Device Info\n            </h2>', replace: 'Device Info\n            <span data-i18n="ticket.deviceInfo" class="hidden"></span></h2>' },
    { search: 'Repair Details\n            </h2>', replace: 'Repair Details\n            <span data-i18n="ticket.repairDetails" class="hidden"></span></h2>' },
    
    // Labels
    { search: 'Name (İsim/الاسم)</label>', replace: 'Name</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Name</label>', replace: '<label data-i18n="ticket.fullName" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Name</label>' },
    
    { search: 'Phone (Telefon/الهاتف)</label>', replace: 'Phone</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Phone</label>', replace: '<label data-i18n="ticket.phone" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Phone</label>' },
    
    { search: 'Brand (Marka)</label>', replace: 'Brand</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Brand</label>', replace: '<label data-i18n="ticket.brand" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Brand</label>' },
    
    { search: 'Model (Model)</label>', replace: 'Model</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Model</label>', replace: '<label data-i18n="ticket.model" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Model</label>' },
    
    { search: 'IMEI / Serial Number</label>', replace: 'IMEI / Serial Number</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">IMEI / Serial Number</label>', replace: '<label data-i18n="ticket.imei" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">IMEI / Serial Number</label>' },
    
    { search: 'Issue Description</label>', replace: 'Issue Description</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Issue Description</label>', replace: '<label data-i18n="ticket.issue" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Issue Description</label>' },
    
    { search: 'Estimated Price ($)</label>', replace: 'Estimated Price</label>' },
    { search: '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Estimated Price</label>', replace: '<label data-i18n="ticket.estCost" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Estimated Price</label>' },

    // Placeholders
    { search: 'placeholder="Enter customer name"', replace: 'data-i18n="ticket.namePlaceholder" placeholder="Enter customer name"' },
    { search: 'placeholder="+1 (555) 000-0000"', replace: 'data-i18n="ticket.phonePlaceholder" placeholder="+1 (555) 000-0000"' },
    { search: 'placeholder="e.g. Apple"', replace: 'data-i18n="ticket.brandPlaceholder" placeholder="e.g. Apple"' },
    { search: 'placeholder="e.g. iPhone 13"', replace: 'data-i18n="ticket.modelPlaceholder" placeholder="e.g. iPhone 13"' },
    { search: 'placeholder="Scan or type IMEI"', replace: 'data-i18n="ticket.imeiPlaceholder" placeholder="Scan or type IMEI"' },
    { search: 'placeholder="Describe the problem..."', replace: 'data-i18n="ticket.issuePlaceholder" placeholder="Describe the problem..."' },
    { search: 'placeholder="0.00"', replace: 'data-i18n="ticket.pricePlaceholder" placeholder="0.00"' },
];

tagMap.forEach(item => {
    htmlContent = htmlContent.replace(item.search, item.replace);
});

// Headers have text mixed with icons, let's fix them with regex
htmlContent = htmlContent.replace(/>\s*Customer Info\s*<\/h2>/g, '><span data-i18n="ticket.customerInfo">Customer Info</span></h2>');
htmlContent = htmlContent.replace(/>\s*Device Info\s*<\/h2>/g, '><span data-i18n="ticket.deviceInfo">Device Info</span></h2>');
htmlContent = htmlContent.replace(/>\s*Repair Details\s*<\/h2>/g, '><span data-i18n="ticket.repairDetails">Repair Details</span></h2>');
htmlContent = htmlContent.replace(/>\s*Create Ticket\s*<\/button>/g, '><span data-i18n="ticket.create">Create Ticket</span></button>');

fs.writeFileSync(htmlPath, htmlContent);
console.log('Updated new-ticket.html');
