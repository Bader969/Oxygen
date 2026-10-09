import './style.css';
import { checkAuthSession, setupAuthListener, signOut } from './lib/authService';
import { getLang, setLang, dictionary, applyTranslation } from './lib/i18n';

// Automatically apply translation on every single page where nav.ts is included
applyTranslation();

// ── Global Toast System ──────────────────────────────────────────────────
declare global {
    interface Window {
        showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    }
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    let container = document.getElementById('oxygen-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'oxygen-toast-container';
        container.className = 'fixed top-5 start-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    const colorMap = {
        success: 'border-emerald-500/40 bg-black/85 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
        error: 'border-red-500/40 bg-black/85 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
        info: 'border-primary/40 bg-black/85 text-on-surface shadow-[0_0_20px_rgba(227,30,36,0.25)]'
    };

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-2xl transition-all duration-300 transform -translate-y-4 opacity-0 text-xs font-semibold max-w-full ${colorMap[type]}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-base shrink-0">${iconMap[type]}</span>
        <span class="flex-1 leading-snug break-words">${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('-translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss after 3.2s
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

if (typeof window !== 'undefined') {
    window.showToast = showToast;
}

document.addEventListener('DOMContentLoaded', async () => {
    applyTranslation();

    // ── 2. Auth Protection ────────────────────────────────────────────────
    setupAuthListener();
    const user = await checkAuthSession();
    let isAdmin = false;

    if (user) {
        const isHardcodedAdmin = user.email === 'admin@oxygen.com';
        const role = isHardcodedAdmin ? 'admin' : (user.user_metadata?.role || 'technician');
        isAdmin = role === 'admin';

        if ((window.location.pathname.includes('settings.html') || window.location.pathname.includes('admin.html')) && !isAdmin) {
            window.location.href = '/index.html';
            return;
        }

        document.querySelectorAll('.admin-only').forEach(el => {
            (el as HTMLElement).style.display = isAdmin ? 'flex' : 'none';
        });
    }

    // ── 3. Navigation Mapping (All Modules) ────────────────────────────────
    const navMapping: Record<string, string> = {
        'dashboard': '/index.html',
        'home': '/index.html',
        'confirmation_number': '/src/new-ticket.html',
        'list_alt': '/src/new-ticket.html',
        'qr_code_scanner': '/src/qr-scanner.html',
        'center_focus_weak': '/src/qr-scanner.html',
        'view_kanban': '/src/kanban.html',
        'view_column': '/src/kanban.html',
        'groups': '/src/customers.html',
        'devices': '/src/devices.html',
        'admin_panel_settings': '/src/admin.html',
        'shield_person': '/src/admin.html',
        'settings': '/src/settings.html',
        'account_circle': '/src/profile.html'
    };

    document.querySelectorAll('a').forEach(link => {
        if (link.classList.contains('btn-logout')) {
            link.addEventListener('click', async (e) => { e.preventDefault(); await signOut(); });
            return;
        }
        const iconSpan = link.querySelector('.material-symbols-outlined');
        if (iconSpan) {
            const iconName = iconSpan.getAttribute('data-icon') || iconSpan.textContent?.trim() || '';
            if (navMapping[iconName]) link.href = navMapping[iconName];
        }
    });

    // ── 4. Unified Button Handlers (No Event Bubbling Glitches) ────────────
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Language toggle (single debounced handler)
        const langTrigger = target.closest('[data-action="toggle-lang"], [data-icon="language"]') ||
            (target.closest('button')?.querySelector('.material-symbols-outlined')?.textContent?.trim() === 'language' ? target.closest('button') : null);

        if (langTrigger) {
            e.preventDefault();
            e.stopPropagation();
            const current = getLang();
            const next = current === 'tr' ? 'ar' : 'tr';
            setLang(next);
            showToast(next === 'ar' ? 'تم تحويل اللغة إلى العربية' : 'Türkçe diline geçildi', 'info');
            setTimeout(() => {
                window.location.reload();
            }, 200);
            return;
        }

        // Back button
        const backTrigger = target.closest('button');
        if (backTrigger) {
            const iconSpan = backTrigger.querySelector('.material-symbols-outlined');
            const iconName = iconSpan ? (iconSpan.getAttribute('data-icon') || iconSpan.textContent?.trim() || '') : '';
            if (iconName === 'arrow_back') {
                e.preventDefault();
                window.history.back();
            }
        }
    });

    // ── 5. Global Modal Dismissal (Backdrop Click & Escape Key) ───────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open custom modal
            const openModals = document.querySelectorAll('.fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-50');
            openModals.forEach(m => {
                const closeBtn = m.querySelector('#close-modal, #cancel-btn, button:has(.material-symbols-outlined)') as HTMLElement;
                if (closeBtn) closeBtn.click();
                else m.remove();
            });

            // Close more sheet
            const sheet = document.getElementById('more-sheet');
            const overlay = document.getElementById('more-sheet-overlay');
            if (sheet && overlay && overlay.classList.contains('open')) {
                sheet.classList.remove('open');
                setTimeout(() => overlay.classList.remove('open'), 300);
            }
        }
    });

    // Backdrop click dismiss for modal overlays
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('fixed') && target.classList.contains('inset-0') && target.classList.contains('backdrop-blur-md')) {
            const closeBtn = target.querySelector('#close-modal') as HTMLElement;
            if (closeBtn) closeBtn.click();
            else target.remove();
        }
    });

    const sidebarState = localStorage.getItem('sidebarState') || 'expanded';
    if (sidebarState === 'collapsed') document.body.classList.add('sidebar-collapsed');

    document.querySelectorAll('.sidebar-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
            const collapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebarState', collapsed ? 'collapsed' : 'expanded');
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
        });
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon && document.body.classList.contains('sidebar-collapsed')) icon.textContent = 'chevron_right';
    });

    // ── 7. Mobile Bottom Navigation Bar Injection ─────────────────────────
    injectMobileBottomNav(isAdmin);
});

function injectMobileBottomNav(isAdmin: boolean) {
    if (document.getElementById('mobile-bottom-nav')) return;

    const path = window.location.pathname;
    const lang = getLang();

    const isActive = (hrefs: string[]) => hrefs.some(h =>
        path === h || path.endsWith(h.replace(/^\//, ''))
    );

    const labels: Record<string, [string, string]> = {
        dashboard:  ['Kontrol', 'الرئيسية'],
        ticket:     ['Talep',   'تذكرة'],
        scanner:    ['Tara',    'مسح'],
        kanban:     ['Kanban',  'كانبان'],
        more:       ['Daha',    'المزيد'],
    };
    const t = (k: string) => labels[k][lang === 'ar' ? 1 : 0];

    const tabs = [
        { icon: 'dashboard',        label: t('dashboard'), href: '/index.html',           active: isActive(['/index.html', '/', '/src/dashboard.html']) },
        { icon: 'confirmation_number', label: t('ticket'), href: '/src/new-ticket.html',  active: isActive(['/src/new-ticket.html']) },
        { icon: 'qr_code_scanner',  label: t('scanner'),   href: '/src/qr-scanner.html', active: isActive(['/src/qr-scanner.html']) },
        { icon: 'view_kanban',      label: t('kanban'),    href: '/src/kanban.html',      active: isActive(['/src/kanban.html']) },
        { icon: 'apps',             label: t('more'),      href: '#',                     active: false, isMore: true },
    ];

    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.innerHTML = tabs.map(tab => `
        <${tab.isMore ? 'button' : 'a'}
            ${tab.isMore ? 'id="more-btn" type="button"' : `href="${tab.href}"`}
            class="mob-nav-item ${tab.active ? 'active' : ''}">
            <span class="material-symbols-outlined mob-icon" ${tab.active ? 'style="font-variation-settings:\'FILL\' 1"' : ''}>${tab.icon}</span>
            <span class="mob-label">${tab.label}</span>
        </${tab.isMore ? 'button' : 'a'}>
    `).join('');

    document.body.appendChild(nav);

    const moreLabels: Record<string, [string, string]> = {
        customers: ['Müşteriler', 'العملاء'],
        devices:   ['Cihazlar',   'الأجهزة'],
        profile:   ['Profilim',   'ملفي الشخصي'],
        admin:     ['Yönetici Paneli', 'لوحة المسؤول'],
        settings:  ['Ayarlar',    'الإعدادات'],
        logout:    ['Çıkış Yap',  'تسجيل الخروج'],
    };
    const mt = (k: string) => moreLabels[k][lang === 'ar' ? 1 : 0];

    const moreItems = [
        { icon: 'groups',        label: mt('customers'), href: '/src/customers.html' },
        { icon: 'devices',       label: mt('devices'),   href: '/src/devices.html' },
        { icon: 'account_circle',label: mt('profile'),   href: '/src/profile.html' },
        ...(isAdmin ? [
            { icon: 'admin_panel_settings', label: mt('admin'), href: '/src/admin.html' },
            { icon: 'settings', label: mt('settings'), href: '/src/settings.html' }
        ] : []),
        { icon: 'logout',        label: mt('logout'),    href: '#', isLogout: true },
    ];

    const overlay = document.createElement('div');
    overlay.id = 'more-sheet-overlay';

    const sheet = document.createElement('div');
    sheet.id = 'more-sheet';
    sheet.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-on-surface-variant uppercase tracking-widest">${lang === 'ar' ? 'القائمة' : 'Menü'}</span>
            <button id="close-sheet" class="text-on-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="grid grid-cols-3 gap-3">
            ${moreItems.map(item => `
                <${item.isLogout ? 'button type="button" id="sheet-logout-btn"' : `a href="${item.href}"`}
                    class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 transition-all ${item.isLogout ? 'text-error' : 'text-on-surface'}">
                    <span class="material-symbols-outlined text-2xl">${item.icon}</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">${item.label}</span>
                </${item.isLogout ? 'button' : 'a'}>
            `).join('')}
        </div>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const openSheet = () => {
        overlay.classList.add('open');
        requestAnimationFrame(() => sheet.classList.add('open'));
    };
    const closeSheet = () => {
        sheet.classList.remove('open');
        setTimeout(() => overlay.classList.remove('open'), 320);
    };

    document.getElementById('more-btn')?.addEventListener('click', openSheet);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
    sheet.querySelector('#close-sheet')?.addEventListener('click', closeSheet);
    sheet.querySelector('#sheet-logout-btn')?.addEventListener('click', async () => {
        closeSheet();
        await signOut();
    });
}
