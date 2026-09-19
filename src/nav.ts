import { checkAuthSession, setupAuthListener, signOut } from './lib/authService';
import { getLang, setLang, dictionary } from './lib/i18n';

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
    // ── 1. Eye-Friendly Static Background & Global UI Styles ──────────────
    if (!document.getElementById('oxygen-theme-styles')) {
        const themeStyle = document.createElement('style');
        themeStyle.id = 'oxygen-theme-styles';
        themeStyle.textContent = `
            /* Calming, eye-friendly, static dark background (Zero GPU/battery strain) */
            body {
                background-color: #0d0e10 !important;
                background-image: 
                    radial-gradient(circle at 15% 15%, rgba(227, 30, 36, 0.06) 0%, transparent 45%),
                    radial-gradient(circle at 85% 85%, rgba(255, 180, 171, 0.03) 0%, transparent 45%),
                    radial-gradient(circle at 50% 50%, rgba(18, 20, 22, 0.7) 0%, #0d0e10 100%) !important;
                background-attachment: fixed !important;
                color: #e2e2e2 !important;
                -webkit-font-smoothing: antialiased;
            }

            /* Consistent Glass Panel styling with high readability */
            .glass-panel {
                background-color: rgba(20, 22, 24, 0.85) !important;
                backdrop-filter: blur(24px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(24px) saturate(140%) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6) !important;
            }

            /* Interactive button micro-feedback */
            button:active:not(:disabled), a:active:not([href="#"]) {
                transform: scale(0.97);
                transition: transform 0.1s ease;
            }

            /* Accessible input focus */
            input:focus, textarea:focus, select:focus {
                outline: none !important;
                border-color: rgba(227, 30, 36, 0.6) !important;
                box-shadow: 0 0 0 1px rgba(227, 30, 36, 0.3) !important;
            }
        `;
        document.head.appendChild(themeStyle);
    }

    // ── 2. Auth Protection ────────────────────────────────────────────────
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

    // ── 6. Sidebar Collapsible (Desktop) ──────────────────────────────────
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

    // ── 7. Global Mobile Responsive CSS ───────────────────────────────────
    if (!document.getElementById('mobile-responsive-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-responsive-styles';
        style.textContent = `
            :root {
                --safe-bottom: env(safe-area-inset-bottom, 0px);
                --safe-top: env(safe-area-inset-top, 0px);
                --bottom-nav-h: 4.5rem;
            }

            @media (max-width: 767px) {
                main {
                    padding-bottom: calc(var(--bottom-nav-h) + 1rem + var(--safe-bottom)) !important;
                }
                header.fixed, header.sticky {
                    padding-top: max(0.5rem, var(--safe-top));
                }
            }

            #mobile-bottom-nav {
                display: none;
                position: fixed;
                bottom: 0;
                inset-inline: 0;
                z-index: 60;
                background: rgba(13, 14, 16, 0.92);
                backdrop-filter: blur(24px) saturate(160%);
                -webkit-backdrop-filter: blur(24px) saturate(160%);
                border-top: 1px solid rgba(227, 30, 36, 0.2);
                padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
                padding-top: 0.5rem;
                box-shadow: 0 -10px 30px -10px rgba(0,0,0,0.7);
            }
            @media (max-width: 767px) {
                #mobile-bottom-nav { display: flex; }
            }

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

            #more-sheet-overlay {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 70;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(6px);
            }
            #more-sheet-overlay.open { display: block; }
            #more-sheet {
                position: fixed;
                bottom: 0;
                inset-inline: 0;
                z-index: 71;
                background: #111214;
                border-top: 1px solid rgba(227,30,36,0.25);
                border-radius: 20px 20px 0 0;
                padding: 1rem 1.25rem;
                padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
                transform: translateY(100%);
                transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 -20px 60px rgba(0,0,0,0.8);
            }
            #more-sheet.open { transform: translateY(0); }

            @media (max-width: 767px) {
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
                .grid-cols-4 { grid-template-columns: repeat(2, 1fr) !important; }
                .glass-panel { max-width: 100%; }
                table { font-size: 0.75rem; }
                .fixed.inset-0 > div[class*="max-w"] {
                    max-width: calc(100vw - 2rem) !important;
                    margin: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ── 8. Mobile Bottom Navigation Bar Injection ─────────────────────────
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
