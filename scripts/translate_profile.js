const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const i18nFile = path.join(srcDir, 'lib', 'i18n.ts');
const profileHtmlFile = path.join(srcDir, 'profile.html');
const profileLogicFile = path.join(srcDir, 'profileLogic.ts');

// 1. Update i18n.ts with the translations
let i18nContent = fs.readFileSync(i18nFile, 'utf8');

const trTranslations = `
    'profile.title': 'Profilim',
    'profile.details': 'Hesap Detayları',
    'profile.email': 'E-posta',
    'profile.role': 'Rol',
    'profile.admin': 'Yeni Kullanıcı Ekle',
    'profile.adminDesc': 'Yönetici olarak kısıtlı teknisyen hesapları oluşturabilirsiniz. Teknisyenler talep oluşturabilir ve düzenleyebilir, ancak Ayarlar veya kullanıcı yönetimine erişemezler.',
    'profile.emailPlaceholder': 'Çalışan E-postası',
    'profile.passwordPlaceholder': 'Geçici Şifre',
    'profile.roleTech': 'Teknisyen (Kısıtlı)',
    'profile.roleAdmin': 'Yönetici (Tam Yetki)',
    'profile.createUserBtn': 'Kullanıcı Oluştur',
    'profile.signOutBtn': 'Çıkış Yap',
    'profile.loading': 'Yükleniyor...',
    'profile.adminText': 'Yönetici',
    'profile.techText': 'Teknisyen',
    'settings.role': 'Teknisyen',`;

const arTranslations = `
    'profile.title': 'ملفي الشخصي',
    'profile.details': 'تفاصيل الحساب',
    'profile.email': 'البريد الإلكتروني',
    'profile.role': 'الدور',
    'profile.admin': 'إضافة مستخدم جديد',
    'profile.adminDesc': 'بصفتك مسؤولاً، يمكنك إنشاء حسابات فنيين مقيدة. يمكن للفنيين إنشاء التذاكر وتعديلها، ولكن لا يمكنهم الوصول إلى الإعدادات أو إدارة المستخدمين.',
    'profile.emailPlaceholder': 'البريد الإلكتروني للموظف',
    'profile.passwordPlaceholder': 'كلمة المرور المؤقتة',
    'profile.roleTech': 'فني (مقيد)',
    'profile.roleAdmin': 'مسؤول (وصول كامل)',
    'profile.createUserBtn': 'إنشاء مستخدم',
    'profile.signOutBtn': 'تسجيل الخروج',
    'profile.loading': 'جاري التحميل...',
    'profile.adminText': 'مسؤول',
    'profile.techText': 'فني',
    'settings.role': 'فني',`;

i18nContent = i18nContent.replace("'settings.role': 'Teknisyen',", trTranslations);
i18nContent = i18nContent.replace("'settings.role': 'فني',", arTranslations);

fs.writeFileSync(i18nFile, i18nContent);
console.log('i18n.ts updated successfully.');


// 2. Update profile.html to separate text from icons and add data-i18n tags
let htmlContent = fs.readFileSync(profileHtmlFile, 'utf8');

// Title
htmlContent = htmlContent.replace(
    `<span data-i18n="profile.title" class="font-headline-sm text-headline-sm text-on-surface">My Profile</span>`,
    `<span data-i18n="profile.title" class="font-headline-sm text-headline-sm text-on-surface">My Profile</span>` // already fine
);

// Account Details header
htmlContent = htmlContent.replace(
    /<h2 data-i18n="profile.details" class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">\s*<span class="material-symbols-outlined">person<\/span>\s*Account Details\s*<\/h2>/i,
    `<h2 class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">
                    <span class="material-symbols-outlined">person</span>
                    <span data-i18n="profile.details">Account Details</span>
                </h2>`
);

// Labels
htmlContent = htmlContent.replace(
    `<label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Email</label>`,
    `<label data-i18n="profile.email" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Email</label>`
);
htmlContent = htmlContent.replace(
    `<label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Role</label>`,
    `<label data-i18n="profile.role" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Role</label>`
);

// Loading spans
htmlContent = htmlContent.replace(
    `<div id="profile-email" class="font-body-md text-on-surface">Loading...</div>`,
    `<div id="profile-email" data-i18n="profile.loading" class="font-body-md text-on-surface">Loading...</div>`
);
htmlContent = htmlContent.replace(
    `<div id="profile-role" class="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Loading...</div>`,
    `<div id="profile-role" data-i18n="profile.loading" class="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Loading...</div>`
);

// Add New User header
htmlContent = htmlContent.replace(
    /<h2 data-i18n="profile.admin" class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">\s*<span class="material-symbols-outlined">admin_panel_settings<\/span>\s*Add New User\s*<\/h2>/i,
    `<h2 class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">
                    <span class="material-symbols-outlined">admin_panel_settings</span>
                    <span data-i18n="profile.admin">Add New User</span>
                </h2>`
);

// Admin description paragraph
htmlContent = htmlContent.replace(
    `<p class="text-sm text-on-surface-variant mb-2">As an Admin, you can create restricted technician accounts. Technicians can create and edit tickets, but cannot access Settings or user management.</p>`,
    `<p data-i18n="profile.adminDesc" class="text-sm text-on-surface-variant mb-2">As an Admin, you can create restricted technician accounts. Technicians can create and edit tickets, but cannot access Settings or user management.</p>`
);

// Form Inputs
htmlContent = htmlContent.replace(
    `<input type="email" id="new-user-email" placeholder="Employee Email" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">`,
    `<input type="email" id="new-user-email" data-i18n="[placeholder]profile.emailPlaceholder" placeholder="Employee Email" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">`
);
htmlContent = htmlContent.replace(
    `<input type="password" id="new-user-password" placeholder="Temporary Password" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">`,
    `<input type="password" id="new-user-password" data-i18n="[placeholder]profile.passwordPlaceholder" placeholder="Temporary Password" required class="w-full bg-surface-container/50 border border-primary/20 rounded-lg px-4 py-3 text-on-surface focus:border-primary/50 focus:outline-none transition-colors">`
);

// Note: i18n translation of inputs using [placeholder] requires that our applyTranslation function supports input placeholder translations.
// Let's check how applyTranslation does it:
// if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
//     (el as HTMLInputElement).placeholder = dictionary[currentLang][key];
// }
// Ah! It doesn't use [placeholder] prefix! It just checks the key and applies it directly if it's an INPUT.
// So we just need: data-i18n="profile.emailPlaceholder" without [placeholder]! Let's correct this.
htmlContent = htmlContent.replace(
    /data-i18n="\[placeholder\]profile\.emailPlaceholder"/g,
    `data-i18n="profile.emailPlaceholder"`
);
htmlContent = htmlContent.replace(
    /data-i18n="\[placeholder\]profile\.passwordPlaceholder"/g,
    `data-i18n="profile.passwordPlaceholder"`
);

// Options
htmlContent = htmlContent.replace(
    `<option value="technician">Technician (Restricted)</option>`,
    `<option value="technician" data-i18n="profile.roleTech">Technician (Restricted)</option>`
);
htmlContent = htmlContent.replace(
    `<option value="admin">Administrator (Full Access)</option>`,
    `<option value="admin" data-i18n="profile.roleAdmin">Administrator (Full Access)</option>`
);

// Create Button
htmlContent = htmlContent.replace(
    `<button type="submit" id="create-user-btn" class="mt-2 w-full bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-[0_0_15px_-5px_rgba(227,30,36,0.2)] hover:shadow-[0_0_20px_-5px_rgba(227,30,36,0.6)]">
                            Create User
                        </button>`,
    `<button type="submit" id="create-user-btn" data-i18n="profile.createUserBtn" class="mt-2 w-full bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-[0_0_15px_-5px_rgba(227,30,36,0.2)] hover:shadow-[0_0_20px_-5px_rgba(227,30,36,0.6)]">
                            Create User
                        </button>`
);

// Sign Out button
htmlContent = htmlContent.replace(
    /<button id="logout-btn" class="flex items-center gap-2 bg-error\/10 hover:bg-error\/20 text-error border border-error\/20 px-6 py-3 rounded-lg font-bold transition-all shadow-\[0_0_15px_-5px_rgba\(255,180,171,0.2\)\] hover:shadow-\[0_0_20px_-5px_rgba\(255,180,171,0.4\)\]">\s*<span class="material-symbols-outlined text-\[20px\]">logout<\/span>\s*Sign Out\s*<\/button>/i,
    `<button id="logout-btn" class="flex items-center gap-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_-5px_rgba(255,180,171,0.2)] hover:shadow-[0_0_20px_-5px_rgba(255,180,171,0.4)]">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    <span data-i18n="profile.signOutBtn">Sign Out</span>
                </button>`
);

fs.writeFileSync(profileHtmlFile, htmlContent);
console.log('profile.html updated successfully.');


// 3. Update profileLogic.ts to translate the dynamic text updates
let logicContent = fs.readFileSync(profileLogicFile, 'utf8');

// replace dynamic textContent sets with language-aware text or data-i18n tagging
logicContent = logicContent.replace(
    `roleBadge.textContent = 'Administrator';`,
    `const lang = localStorage.getItem('appLang') || 'tr';
        roleBadge.textContent = lang === 'ar' ? 'مسؤول' : (lang === 'tr' ? 'Yönetici' : 'Administrator');
        roleBadge.setAttribute('data-i18n', 'profile.roleAdminText');`
);

logicContent = logicContent.replace(
    `roleBadge.textContent = 'Technician';`,
    `const lang = localStorage.getItem('appLang') || 'tr';
        roleBadge.textContent = lang === 'ar' ? 'فني' : (lang === 'tr' ? 'Teknisyen' : 'Technician');
        roleBadge.setAttribute('data-i18n', 'profile.roleTechText');`
);

// We need to add 'profile.roleAdminText' and 'profile.roleTechText' to i18n.ts
// Wait, in my i18n keys I used 'profile.adminText' and 'profile.techText'. Let's rename or keep them consistent.
// I will change the logic content to use the keys I defined: 'profile.adminText' and 'profile.techText'
logicContent = logicContent.replace('profile.roleAdminText', 'profile.adminText');
logicContent = logicContent.replace('profile.roleTechText', 'profile.techText');

// Translate Form Button "Creating..." / "Create User"
logicContent = logicContent.replace(
    `btn.textContent = 'Creating...';`,
    `const lang = localStorage.getItem('appLang') || 'tr';
            btn.textContent = lang === 'ar' ? 'جاري الإنشاء...' : (lang === 'tr' ? 'Oluşturuluyor...' : 'Creating...');`
);
logicContent = logicContent.replace(
    `btn.textContent = 'Create User';`,
    `const lang = localStorage.getItem('appLang') || 'tr';
                btn.textContent = lang === 'ar' ? 'إنشاء مستخدم' : (lang === 'tr' ? 'Kullanıcı Oluştur' : 'Create User');`
);

// Translate Success Status text
logicContent = logicContent.replace(
    `statusDiv.textContent = \`User \${email} created successfully as \${newRole}!\`;`,
    `const lang = localStorage.getItem('appLang') || 'tr';
                if (lang === 'ar') {
                    statusDiv.textContent = \`تم إنشاء المستخدم \${email} بنجاح كـ \${newRole === 'admin' ? 'مسؤول' : 'فني'}!\`;
                } else if (lang === 'tr') {
                    statusDiv.textContent = \`Kullanıcı \${email}, başarıyla \${newRole === 'admin' ? 'Yönetici' : 'Teknisyen'} olarak oluşturuldu!\`;
                } else {
                    statusDiv.textContent = \`User \${email} created successfully as \${newRole}!\`;
                }`
);

fs.writeFileSync(profileLogicFile, logicContent);
console.log('profileLogic.ts updated successfully.');
