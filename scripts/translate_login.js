const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const i18nFile = path.join(srcDir, 'lib', 'i18n.ts');
const loginHtmlFile = path.join(srcDir, 'login.html');
const loginLogicFile = path.join(srcDir, 'loginLogic.ts');

// 1. Update i18n.ts with the translations
let i18nContent = fs.readFileSync(i18nFile, 'utf8');

const trTranslations = `
    'login.testing': 'Test kimlik bilgileri: admin@oxygen.com / password123 kullanın.',
    'settings.role': 'Teknisyen',`;

const arTranslations = `
    'login.testing': 'بيانات اعتماد الاختبار: استخدم admin@oxygen.com / password123.',
    'settings.role': 'فني',`;

i18nContent = i18nContent.replace("'settings.role': 'Teknisyen',", trTranslations);
i18nContent = i18nContent.replace("'settings.role': 'فني',", arTranslations);

fs.writeFileSync(i18nFile, i18nContent);
console.log('i18n.ts updated successfully.');

// 2. Update login.html
let htmlContent = fs.readFileSync(loginHtmlFile, 'utf8');

// Add Floating Language Toggle Button in top corner of screen
const languageToggleBtn = `
    <!-- Floating Language Toggle -->
    <div class="fixed top-6 end-6 z-50">
        <button data-icon="language" class="flex items-center justify-center bg-black/40 border border-primary/20 hover:border-primary/50 text-primary rounded-full p-3 hover:bg-black/60 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,180,171,0.2)]">
            <span class="material-symbols-outlined text-[20px]">language</span>
        </button>
    </div>
`;

// Insert the language toggle right after body opening tag
htmlContent = htmlContent.replace(
    /<body([^>]*)>/i,
    `<body$1>${languageToggleBtn}`
);

// Add data-i18n tags to page elements
// Logo Header
htmlContent = htmlContent.replace(
    `<h1 class="font-headline-lg text-headline-lg text-primary text-center">Oxygen</h1>`,
    `<h1 data-i18n="app.title" class="font-headline-lg text-headline-lg text-primary text-center">Oxygen</h1>`
);

// Email Address label
htmlContent = htmlContent.replace(
    `<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Email Address</label>`,
    `<label data-i18n="login.email" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Email Address</label>`
);

// Password label
htmlContent = htmlContent.replace(
    `<label class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Password</label>`,
    `<label data-i18n="login.password" class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Password</label>`
);

// Sign In Button (preserving layout and icon)
htmlContent = htmlContent.replace(
    /<button type="submit" id="submit-btn" class="([^"]*)">\s*Sign In\s*<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward<\/span>\s*<\/button>/i,
    `<button type="submit" id="submit-btn" class="$1">
                    <span data-i18n="login.signin">Sign In</span>
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward</span>
                </button>`
);

// Testing Credentials text
htmlContent = htmlContent.replace(
    /<p class="font-body-md text-on-surface-variant text-center mt-6">\s*Testing credentials: Use `admin@oxygen\.com` \/ `password123`\.\s*<\/p>/i,
    `<p data-i18n="login.testing" class="font-body-md text-on-surface-variant text-center mt-6">
            Testing credentials: Use \`admin@oxygen.com\` / \`password123\`.
        </p>`
);

// Inject nav.ts script before loginLogic.ts so it hooks up the toggle click listener!
htmlContent = htmlContent.replace(
    `<script type="module" src="/src/loginLogic.ts"></script>`,
    `<script type="module" src="/src/nav.ts"></script>\n    <script type="module" src="/src/loginLogic.ts"></script>`
);

fs.writeFileSync(loginHtmlFile, htmlContent);
console.log('login.html updated successfully.');
