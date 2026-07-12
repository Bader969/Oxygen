import { checkAuthSession, setupAuthListener, signOut } from './lib/authService';
import { getLang, setLang, dictionary } from './lib/i18n';

document.addEventListener('DOMContentLoaded', async () => {
    // ── 1. Auth Protection ────────────────────────────────────────────────
    setupAuthListener();
    const user = await checkAuthSession();
    let isAdmin = false;

    if (user) {
        const isHardcodedAdmin = user.email === 'admin@oxygen.com';
        const role = isHardcodedAdmin ? 'admin' : (user.user_metadata?.role || 'technician');
        isAdmin = role === 'admin';

        if (window.location.pathname.includes('settings.html') && !isAdmin) {
            window.location.href = '/index.html';
            return;
        }

        document.querySelectorAll('.admin-only').forEach(el => {
            (el as HTMLElement).style.display = isAdmin ? 'flex' : 'none';
        });
    }

    // ── 2. Navigation Mapping ─────────────────────────────────────────────
    const navMapping: Record<string, string> = {
        'dashboard': '/index.html',
        'home': '/index.html',
        'confirmation_number': '/src/new-ticket.html',
        'list_alt': '/src/new-ticket.html',
        'qr_code_scanner': '/src/qr-scanner.html',
        'center_focus_weak': '/src/qr-scanner.html',
        'view_kanban': '/src/kanban.html',
        'view_column': '/src/kanban.html',
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

    // ── 3. Button Wiring ──────────────────────────────────────────────────
    document.querySelectorAll('button').forEach(btn => {
        const iconSpan = btn.querySelector('.material-symbols-outlined');
        const iconName = iconSpan ? (iconSpan.getAttribute('data-icon') || iconSpan.textContent?.trim() || '') : '';
        if (iconName === 'arrow_back') btn.addEventListener('click', () => window.history.back());
        if (iconName === 'language' || iconName === 'translate') {
            btn.addEventListener('click', () => { const c = getLang(); setLang(c === 'tr' ? 'ar' : 'tr'); });
        }
    });

    document.querySelectorAll('[data-icon="language"]').forEach(icon => {
        icon.addEventListener('click', () => { const c = getLang(); setLang(c === 'tr' ? 'ar' : 'tr'); });
    });

    // ── 4. Sidebar Collapsible (Desktop) ──────────────────────────────────
    if (!document.getElementById('sidebar-styles')) {
        const style = document.createElement('style');
        style.id = 'sidebar-styles';
        style.textContent = `
            nav.fixed { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            header, main { transition: padding-inline-start 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            body.sidebar-collapsed nav.fixed { width: 6rem !important; }
            body.sidebar-collapsed nav.fixed .sidebar-text,
            body.sidebar-collapsed nav.fixed a span:not(.material-symbols-outlined) {
                opacity: 0; pointer-events: none; position: absolute; left: -9999px;
            }
            body.sidebar-collapsed nav.fixed a,
            body.sidebar-collapsed nav.fixed .brand-container > div {
                justify-content: center !important;
                padding-inline: 0 !important;
                margin-inline: auto !important;
            }
            body.sidebar-collapsed header, body.sidebar-collapsed main {
                padding-inline-start: 7rem !important;
            }
            @media (max-width: 767px) {
                body.sidebar-collapsed header, body.sidebar-collapsed main {
                    padding-inline-start: 1.25rem !important;
                }
            }
            html[dir="rtl"] .sidebar-toggle span { transform: scaleX(-1); }
        `;
        document.head.appendChild(style);
    }

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

    // ── 5. Global Mobile Responsive CSS ───────────────────────────────────
    if (!document.getElementById('mobile-responsive-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-responsive-styles';
        style.textContent = `
            /* Safe area support for all modern phones (notch, gesture bar) */
            :root {
                --safe-bottom: env(safe-area-inset-bottom, 0px);
                --safe-top: env(safe-area-inset-top, 0px);
                --bottom-nav-h: 4.5rem;
            }

            /* Ensure pages have enough bottom padding to clear the bottom nav */
            @media (max-width: 767px) {
                main {
                    padding-bottom: calc(var(--bottom-nav-h) + 1rem + var(--safe-bottom)) !important;
                }
                /* Fix top header to not overlap content on modern phones */
                header.fixed, header.sticky {
                    padding-top: max(0.5rem, var(--safe-top));
                }
            }

            /* Mobile bottom nav */
            #mobile-bottom-nav {
                display: none;
                position: fixed;
                bottom: 0;
                inset-inline: 0;
                z-index: 60;
                background: rgba(10, 10, 12, 0.85);
                backdrop-filter: blur(20px) saturate(150%);
                -webkit-backdrop-filter: blur(20px) saturate(150%);
                border-top: 1px solid rgba(227, 30, 36, 0.15);
                padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
                padding-top: 0.5rem;
                box-shadow: 0 -10px 30px -10px rgba(0,0,0,0.5);
            }
            @media (max-width: 767px) {
                #mobile-bottom-nav { display: flex; }
            }

            /* Bottom nav item */
            .mob-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2px;
                flex: 1;
                padding: 4px 2px;
                cursor: pointer;
                text-decoration: none;
                color: #9ca3af;
                transition: color 0.2s, transform 0.15s;
                -webkit-tap-highlight-color: transparent;
                border-radius: 12px;
            }
            .mob-nav-item:active { transform: scale(0.92); }
            .mob-nav-item.active {
                color: #e31e24;
            }
            .mob-nav-item .mob-icon {
                font-size: 24px;
                line-height: 1;
                transition: transform 0.2s;
            }
            .mob-nav-item.active .mob-icon {
                background: rgba(227,30,36,0.15);
                border-radius: 10px;
                padding: 2px 14px;
                transform: translateY(-2px);
            }
            .mob-nav-item .mob-label {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                line-height: 1;
            }

            /* More Sheet overlay */
            #more-sheet-overlay {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 70;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
            }
            #more-sheet-overlay.open { display: block; }
            #more-sheet {
                position: fixed;
                bottom: 0;
                inset-inline: 0;
                z-index: 71;
                background: #111214;
                border-top: 1px solid rgba(227,30,36,0.2);
                border-radius: 20px 20px 0 0;
                padding: 1rem 1.25rem;
                padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
                transform: translateY(100%);
                transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 -20px 60px rgba(0,0,0,0.7);
            }
            #more-sheet.open { transform: translateY(0); }

            /* Mobile-specific table improvements */
            @media (max-width: 767px) {
                /* Kanban: single column horizontal scroll on mobile */
                #kanban-board-view {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                    scroll-snap-type: x mandatory;
                    gap: 1rem !important;
                    padding-inline: 1rem;
                }
                #kanban-board-view > div {
                    min-width: 280px !important;
                    max-width: 85vw !important;
                    scroll-snap-align: start;
                    flex-shrink: 0;
                }
                /* Fix grid-cols overflow on smaller screens */
                .grid-cols-4 { grid-template-columns: repeat(2, 1fr) !important; }
                /* Ensure bento cards don't overflow */
                .glass-panel { max-width: 100%; }
                /* Fix long text overflow in tables */
                table { font-size: 0.75rem; }
                /* Full-width modals on mobile */
                .fixed.inset-0 > div[class*="max-w"] {
                    max-width: calc(100vw - 2rem) !important;
                    margin: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ── 6. Mobile Bottom Navigation Bar ──────────────────────────────────
    injectMobileBottomNav(isAdmin);
});

function injectMobileBottomNav(isAdmin: boolean) {
    if (document.getElementById('mobile-bottom-nav')) return;

    const path = window.location.pathname;
    const lang = getLang();

    const isActive = (hrefs: string[]) => hrefs.some(h =>
        path === h || path.endsWith(h.replace(/^\//, ''))
    );

    // Labels per language
    const labels: Record<string, [string, string]> = {
        dashboard:  ['Kontrol', 'الرئيسية'],
        ticket:     ['Talep',   'تذكرة'],
        scanner:    ['Tara',    'مسح'],
        kanban:     ['Kanban',  'كانبان'],
        more:       ['Daha',    'المزيد'],
    };
    const t = (k: string) => labels[k][lang === 'ar' ? 1 : 0];

    const tabs = [
        { icon: 'dashboard',        label: t('dashboard'), href: '/index.html',           active: isActive(['/index.html', '/']) },
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

    // ── More Sheet ────────────────────────────────────────────────────────
    const moreLabels: Record<string, [string, string]> = {
        customers: ['Müşteriler', 'العملاء'],
        devices:   ['Cihazlar',   'الأجهزة'],
        profile:   ['Profilim',   'ملفي الشخصي'],
        settings:  ['Ayarlar',    'الإعدادات'],
        logout:    ['Çıkış Yap',  'تسجيل الخروج'],
    };
    const mt = (k: string) => moreLabels[k][lang === 'ar' ? 1 : 0];

    const moreItems = [
        { icon: 'groups',        label: mt('customers'), href: '/src/customers.html' },
        { icon: 'devices',       label: mt('devices'),   href: '/src/devices.html' },
        { icon: 'account_circle',label: mt('profile'),   href: '/src/profile.html' },
        ...(isAdmin ? [{ icon: 'settings', label: mt('settings'), href: '/src/settings.html' }] : []),
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

    // Wire More button
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
