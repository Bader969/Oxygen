import { checkAuthSession, setupAuthListener, signOut } from './lib/authService';
import { getLang, setLang } from './lib/i18n';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Protection
    setupAuthListener();
    const user = await checkAuthSession();
    
    if (user) {
        const isHardcodedAdmin = user.email === 'admin@oxygen.com';
        const role = isHardcodedAdmin ? 'admin' : (user.user_metadata?.role || 'technician');
        
        // Settings page restriction
        if (window.location.pathname.includes('settings.html') && role !== 'admin') {
            window.location.href = '/index.html';
            return;
        }

        // Show/hide admin-only links depending on role
        document.querySelectorAll('.admin-only').forEach(el => {
            if (role === 'admin') {
                (el as HTMLElement).style.display = 'flex';
            } else {
                (el as HTMLElement).style.display = 'none';
            }
        });
    }

    // 2. Navigation Mapping
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

    const links = document.querySelectorAll('a');
    links.forEach(link => {
        // Intercept Logout
        if (link.classList.contains('btn-logout')) {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut();
            });
            return;
        }

        // Apply Mapping
        const iconSpan = link.querySelector('.material-symbols-outlined');
        if (iconSpan) {
            const iconName = iconSpan.getAttribute('data-icon') || iconSpan.textContent?.trim() || '';
            if (navMapping[iconName]) {
                link.href = navMapping[iconName];
            }
        }
    });

    // Back buttons
    const allBtns = document.querySelectorAll('button');
    allBtns.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        const iconSpan = btn.querySelector('.material-symbols-outlined');
        const iconName = iconSpan ? (iconSpan.getAttribute('data-icon') || iconSpan.textContent?.trim() || '') : '';
        
        if (text === 'arrow_back' || iconName === 'arrow_back') {
            btn.addEventListener('click', () => {
                window.history.back();
            });
        }
        
        if (iconName === 'language' || text === 'language') {
            btn.addEventListener('click', () => {
                const current = getLang();
                setLang(current === 'tr' ? 'ar' : 'tr');
            });
        }
    });

    // Language Toggle Icons
    const langIcons = document.querySelectorAll('[data-icon="language"]');
    langIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const current = getLang();
            setLang(current === 'tr' ? 'ar' : 'tr');
        });
    });

    // 4. Sidebar Collapsible Logic
    const sidebarState = localStorage.getItem('sidebarState') || 'expanded';
    const body = document.body;
    
    // Inject CSS for collapsed state
    if (!document.getElementById('sidebar-styles')) {
        const style = document.createElement('style');
        style.id = 'sidebar-styles';
        style.textContent = `
            /* Smooth transitions */
            nav.fixed { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            header, main { transition: padding-inline-start 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            
            /* Collapsed State */
            body.sidebar-collapsed nav.fixed {
                width: 6rem !important; /* 96px */
            }
            body.sidebar-collapsed nav.fixed .sidebar-text,
            body.sidebar-collapsed nav.fixed a span:not(.material-symbols-outlined) {
                opacity: 0;
                pointer-events: none;
                position: absolute;
                left: -9999px;
            }
            
            /* Center icons and logo when collapsed */
            body.sidebar-collapsed nav.fixed a,
            body.sidebar-collapsed nav.fixed .brand-container > div {
                justify-content: center !important;
                padding-inline: 0 !important;
                margin-inline: auto !important;
            }
            
            body.sidebar-collapsed header,
            body.sidebar-collapsed main {
                padding-inline-start: 7rem !important; /* 112px */
            }
            @media (max-width: 767px) {
                body.sidebar-collapsed header,
                body.sidebar-collapsed main {
                    padding-inline-start: 1.25rem !important; /* Default on mobile */
                }
            }
            
            /* RTL Mirroring for Chevron */
            html[dir="rtl"] .sidebar-toggle span {
                transform: scaleX(-1);
            }
        `;
        document.head.appendChild(style);
    }

    if (sidebarState === 'collapsed') {
        body.classList.add('sidebar-collapsed');
    }

    const toggleBtns = document.querySelectorAll('.sidebar-toggle');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            body.classList.toggle('sidebar-collapsed');
            const isCollapsed = body.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
            
            // Toggle icon (chevron_left vs chevron_right)
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = isCollapsed ? 'chevron_right' : 'chevron_left';
            }
        });
        
        // Initial icon state
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon && body.classList.contains('sidebar-collapsed')) {
            icon.textContent = 'chevron_right';
        }
    });
});
