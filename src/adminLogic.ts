import { checkAuthSession } from './lib/authService';
import { supabaseUrl, supabaseAnonKey } from './lib/supabaseClient';
import { 
    getStaffUsersExtended, 
    adminUpdateUserDetails, 
    adminResetUserPassword, 
    adminDeleteUser 
} from './lib/repairService';
import { getLang, dictionary, applyTranslation } from './lib/i18n';

interface StaffUser {
    id: string;
    email: string;
    name?: string;
    role: string;
    permissions?: string[];
    created_at: string;
}

let currentUser: any = null;
let allStaffUsers: StaffUser[] = [];
let currentFilter: string = 'all';
let searchQuery: string = '';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Session check & Admin validation
    currentUser = await checkAuthSession();
    if (!currentUser) {
        window.location.href = '/src/login.html';
        return;
    }

    const isHardcodedAdmin = currentUser.email === 'admin@oxygen.com';
    const userRole = isHardcodedAdmin ? 'admin' : (currentUser.user_metadata?.role || 'technician');
    
    if (userRole !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    // 2. Initialize UI & Event Listeners
    setupModals();
    setupFiltersAndSearch();
    setupForms();

    // 3. Load Staff Data
    await loadStaffData();
});

/**
 * Loads staff user data from Supabase RPC with fallback
 */
async function loadStaffData() {
    try {
        const users = await getStaffUsersExtended();
        allStaffUsers = (users || []).map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name || (u.raw_user_meta_data?.name) || u.email?.split('@')[0] || 'Personel',
            role: u.role || (u.raw_user_meta_data?.role) || 'technician',
            permissions: u.permissions || (u.raw_user_meta_data?.permissions) || getDefaultPermissions(u.role || 'technician'),
            created_at: u.created_at
        }));

        updateKpiCards();
        renderUsers();
    } catch (err: any) {
        console.error('Failed to load staff users:', err);
        const lang = getLang();
        const msg = lang === 'ar' ? 'تعذر تحميل قائمة الموظفين' : 'Kullanıcı listesi yüklenemedi';
        if (window.showToast) window.showToast(msg, 'error');
    }
}

/**
 * Computes default permissions array based on role
 */
function getDefaultPermissions(role: string): string[] {
    switch (role) {
        case 'admin':
            return ['manage_workshop', 'view_finances', 'manage_settings', 'delete_records', 'manage_staff'];
        case 'technician':
            return ['manage_workshop'];
        case 'reception':
            return ['manage_workshop', 'view_finances'];
        case 'viewer':
            return [];
        default:
            return ['manage_workshop'];
    }
}

/**
 * Updates the 4 KPI cards with counts
 */
function updateKpiCards() {
    const totalStaff = allStaffUsers.length;
    const admins = allStaffUsers.filter(u => u.role === 'admin').length;
    const experts = allStaffUsers.filter(u => u.role === 'technician').length;
    const reception = allStaffUsers.filter(u => u.role === 'reception').length;

    const elTotal = document.getElementById('stat-total-staff');
    const elAdmins = document.getElementById('stat-total-admins');
    const elExperts = document.getElementById('stat-total-experts');
    const elReception = document.getElementById('stat-total-reception');

    if (elTotal) elTotal.textContent = totalStaff.toString();
    if (elAdmins) elAdmins.textContent = admins.toString();
    if (elExperts) elExperts.textContent = experts.toString();
    if (elReception) elReception.textContent = reception.toString();
}

/**
 * Filters and renders users into table and mobile cards
 */
function renderUsers() {
    const lang = getLang();
    const query = searchQuery.trim().toLowerCase();

    const filtered = allStaffUsers.filter(u => {
        const matchesFilter = currentFilter === 'all' || u.role === currentFilter;
        const matchesQuery = !query || 
            u.email.toLowerCase().includes(query) ||
            (u.name && u.name.toLowerCase().includes(query)) ||
            u.role.toLowerCase().includes(query);
        return matchesFilter && matchesQuery;
    });

    const tbody = document.getElementById('users-table-body');
    const mobileList = document.getElementById('users-mobile-list');
    const noUsersFound = document.getElementById('no-users-found');

    if (!tbody || !mobileList) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        mobileList.innerHTML = '';
        if (noUsersFound) noUsersFound.classList.remove('hidden');
        return;
    }

    if (noUsersFound) noUsersFound.classList.add('hidden');

    // Desktop Table Rendering
    tbody.innerHTML = filtered.map(u => {
        const isSelf = u.email === currentUser.email;
        const isMainAdmin = u.email === 'admin@oxygen.com';
        const roleBadge = renderRoleBadge(u.role, lang);
        const permsHtml = renderPermissionsPills(u.permissions || [], lang);
        const initials = getInitials(u.name || u.email);
        const selfTag = isSelf ? `<span class="ms-1.5 px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[11px] font-bold tracking-wide">${lang === 'ar' ? 'أنت' : 'Sen'}</span>` : '';
        const createdDate = new Date(u.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="py-4 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-white/10 border border-primary/25 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                            ${initials}
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center">
                                <span class="font-bold text-on-surface text-[15px]">${escapeHtml(u.name || u.email.split('@')[0])}</span>
                                ${selfTag}
                            </div>
                            <span class="text-xs text-on-surface-variant font-mono">${escapeHtml(u.email)}</span>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-4">
                    ${roleBadge}
                </td>
                <td class="py-4 px-4">
                    <div class="flex flex-wrap gap-1 max-w-xs">
                        ${permsHtml}
                    </div>
                </td>
                <td class="py-4 px-4 text-center">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>${lang === 'ar' ? 'نشط' : 'Aktif'}</span>
                    </span>
                </td>
                <td class="py-4 px-4 text-on-surface-variant text-xs font-mono">
                    ${createdDate}
                </td>
                <td class="py-4 px-4 text-end">
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        <button class="edit-btn p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-on-surface-variant hover:text-amber-300 transition-colors" data-id="${u.id}" title="${lang === 'ar' ? 'تعديل' : 'Düzenle'}">
                            <span class="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button class="pwd-btn p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 text-on-surface-variant hover:text-blue-300 transition-colors" data-id="${u.id}" title="${lang === 'ar' ? 'تحديث كلمة المرور' : 'Şifre'}">
                            <span class="material-symbols-outlined text-lg">key</span>
                        </button>
                        <button class="delete-btn p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 transition-colors ${isSelf || isMainAdmin ? 'opacity-30 cursor-not-allowed' : ''}" data-id="${u.id}" ${isSelf || isMainAdmin ? 'disabled' : ''} title="${lang === 'ar' ? 'حذف' : 'Sil'}">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Mobile Cards Rendering
    mobileList.innerHTML = filtered.map(u => {
        const isSelf = u.email === currentUser.email;
        const isMainAdmin = u.email === 'admin@oxygen.com';
        const roleBadge = renderRoleBadge(u.role, lang);
        const permsHtml = renderPermissionsPills(u.permissions || [], lang);
        const initials = getInitials(u.name || u.email);
        const selfTag = isSelf ? `<span class="ms-1.5 px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[11px] font-bold tracking-wide">${lang === 'ar' ? 'أنت' : 'Sen'}</span>` : '';

        return `
            <div class="glass-panel p-4 rounded-2xl flex flex-col gap-3.5 border border-white/10">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-white/10 border border-primary/25 flex items-center justify-center font-bold text-base text-primary shrink-0">
                            ${initials}
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center">
                                <span class="font-bold text-on-surface text-[15px]">${escapeHtml(u.name || u.email.split('@')[0])}</span>
                                ${selfTag}
                            </div>
                            <span class="text-xs text-on-surface-variant font-mono break-all">${escapeHtml(u.email)}</span>
                        </div>
                    </div>
                    ${roleBadge}
                </div>

                <div class="flex flex-wrap gap-1.5 pt-1">
                    ${permsHtml}
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                    <span class="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>${lang === 'ar' ? 'نشط' : 'Aktif'}</span>
                    </span>

                    <div class="flex items-center gap-2">
                        <button class="edit-btn inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-on-surface font-semibold text-xs transition-colors" data-id="${u.id}">
                            <span class="material-symbols-outlined text-base text-amber-400">edit</span>
                            <span>${lang === 'ar' ? 'تعديل' : 'Düzenle'}</span>
                        </button>
                        <button class="pwd-btn inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-blue-500/20 text-on-surface font-semibold text-xs transition-colors" data-id="${u.id}">
                            <span class="material-symbols-outlined text-base text-blue-400">key</span>
                            <span>${lang === 'ar' ? 'كلمة المرور' : 'Şifre'}</span>
                        </button>
                        <button class="delete-btn p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 transition-colors ${isSelf || isMainAdmin ? 'opacity-30 cursor-not-allowed' : ''}" data-id="${u.id}" ${isSelf || isMainAdmin ? 'disabled' : ''} title="${lang === 'ar' ? 'حذف' : 'Sil'}">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach row button events
    wireUserActionButtons();
}

/**
 * Returns formatted role badge HTML
 */
function renderRoleBadge(role: string, lang: string): string {
    switch (role) {
        case 'admin':
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold whitespace-nowrap">
                    <span class="material-symbols-outlined text-sm">admin_panel_settings</span>
                    <span>${lang === 'ar' ? 'مسؤول' : 'Yönetici'}</span>
                </span>
            `;
        case 'technician':
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap">
                    <span class="material-symbols-outlined text-sm">engineering</span>
                    <span>${lang === 'ar' ? 'خبير فني' : 'Teknik Uzman'}</span>
                </span>
            `;
        case 'reception':
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold whitespace-nowrap">
                    <span class="material-symbols-outlined text-sm">support_agent</span>
                    <span>${lang === 'ar' ? 'استقبال' : 'Resepsiyon'}</span>
                </span>
            `;
        case 'viewer':
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold whitespace-nowrap">
                    <span class="material-symbols-outlined text-sm">visibility</span>
                    <span>${lang === 'ar' ? 'مراقب' : 'Gözlemci'}</span>
                </span>
            `;
        default:
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-on-surface border border-white/10 text-xs font-bold whitespace-nowrap">
                    <span>${escapeHtml(role)}</span>
                </span>
            `;
    }
}

/**
 * Returns small permission pill tags
 */
function renderPermissionsPills(perms: string[], lang: string): string {
    if (!perms || perms.length === 0) {
        return `<span class="text-[11px] text-on-surface-variant italic">${lang === 'ar' ? 'بدون صلاحيات خاصة' : 'Özel yetki yok'}</span>`;
    }

    const labels: Record<string, { tr: string; ar: string; color: string }> = {
        manage_workshop: { tr: '🛠️ Onarım', ar: '🛠️ إصلاح', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
        view_finances: { tr: '💰 Kasa', ar: '💰 المالية', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
        manage_settings: { tr: '⚙️ Ayarlar', ar: '⚙️ الإعدادات', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
        delete_records: { tr: '🗑️ Silme', ar: '🗑️ الحذف', color: 'bg-red-500/10 text-red-300 border-red-500/20' },
        manage_staff: { tr: '👥 Personel', ar: '👥 الموظفون', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' }
    };

    return perms.map(p => {
        const item = labels[p];
        if (!item) return '';
        const text = lang === 'ar' ? item.ar : item.tr;
        return `<span class="px-2 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap ${item.color}">${text}</span>`;
    }).join('');
}

/**
 * Helper to wire up edit, password reset, and delete actions
 */
function wireUserActionButtons() {
    // Edit Buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = (btn as HTMLElement).dataset.id;
            const target = allStaffUsers.find(u => u.id === userId);
            if (target) openEditUserModal(target);
        });
    });

    // Password Reset Buttons
    document.querySelectorAll('.pwd-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = (btn as HTMLElement).dataset.id;
            const target = allStaffUsers.find(u => u.id === userId);
            if (target) openResetPasswordModal(target);
        });
    });

    // Delete Buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = (btn as HTMLElement).dataset.id;
            const target = allStaffUsers.find(u => u.id === userId);
            if (target) openDeleteUserModal(target);
        });
    });
}

/**
 * Setup search and role filter pills
 */
function setupFiltersAndSearch() {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value;
            renderUsers();
        });
    }

    const filterBtns = document.querySelectorAll('.role-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-primary/20', 'text-primary', 'border-primary/40');
                b.classList.add('bg-white/5', 'text-on-surface-variant', 'border-white/5');
            });

            btn.classList.add('active', 'bg-primary/20', 'text-primary', 'border-primary/40');
            btn.classList.remove('bg-white/5', 'text-on-surface-variant', 'border-white/5');

            currentFilter = (btn as HTMLElement).dataset.filter || 'all';
            renderUsers();
        });
    });
}

/**
 * Setup modals visibility and close handlers
 */
function setupModals() {
    // Open Add User
    document.getElementById('open-add-user-btn')?.addEventListener('click', () => {
        openModal('add-user-modal');
        // Auto-generate a password on modal opening for convenience
        const pwdInput = document.getElementById('add-user-password') as HTMLInputElement;
        if (pwdInput && !pwdInput.value) {
            pwdInput.value = generateSecurePassword();
        }
    });

    // Close handlers
    document.getElementById('close-add-modal-btn')?.addEventListener('click', () => closeModal('add-user-modal'));
    document.getElementById('cancel-add-modal-btn')?.addEventListener('click', () => closeModal('add-user-modal'));

    document.getElementById('close-edit-modal-btn')?.addEventListener('click', () => closeModal('edit-user-modal'));
    document.getElementById('cancel-edit-modal-btn')?.addEventListener('click', () => closeModal('edit-user-modal'));

    document.getElementById('close-reset-modal-btn')?.addEventListener('click', () => closeModal('reset-pwd-modal'));
    document.getElementById('cancel-reset-modal-btn')?.addEventListener('click', () => closeModal('reset-pwd-modal'));

    document.getElementById('cancel-delete-modal-btn')?.addEventListener('click', () => closeModal('delete-user-modal'));

    // Password Generators
    document.getElementById('generate-pwd-btn')?.addEventListener('click', () => {
        const input = document.getElementById('add-user-password') as HTMLInputElement;
        if (input) input.value = generateSecurePassword();
    });

    document.getElementById('reset-generate-pwd-btn')?.addEventListener('click', () => {
        const input = document.getElementById('reset-new-password') as HTMLInputElement;
        if (input) input.value = generateSecurePassword();
    });

    // Copy Password Buttons
    document.getElementById('copy-pwd-btn')?.addEventListener('click', () => {
        const val = (document.getElementById('add-user-password') as HTMLInputElement)?.value;
        if (val) copyToClipboard(val);
    });

    document.getElementById('reset-copy-pwd-btn')?.addEventListener('click', () => {
        const val = (document.getElementById('reset-new-password') as HTMLInputElement)?.value;
        if (val) copyToClipboard(val);
    });
}

/**
 * Setup form submissions (Add, Edit, Reset Password, Delete)
 */
function setupForms() {
    // 1. Add User Form
    const addForm = document.getElementById('add-user-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lang = getLang();
            const btn = document.getElementById('submit-add-user-btn') as HTMLButtonElement;
            const name = (document.getElementById('add-user-name') as HTMLInputElement).value.trim();
            const email = (document.getElementById('add-user-email') as HTMLInputElement).value.trim();
            const password = (document.getElementById('add-user-password') as HTMLInputElement).value;
            const role = (document.getElementById('add-user-role') as HTMLSelectElement).value;

            if (password.length < 6) {
                const msg = lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Şifre en az 6 karakter olmalıdır';
                if (window.showToast) window.showToast(msg, 'error');
                return;
            }

            // Gather granular permissions
            const permissions: string[] = [];
            if ((document.getElementById('perm-workshop') as HTMLInputElement)?.checked) permissions.push('manage_workshop');
            if ((document.getElementById('perm-finances') as HTMLInputElement)?.checked) permissions.push('view_finances');
            if ((document.getElementById('perm-settings') as HTMLInputElement)?.checked) permissions.push('manage_settings');
            if ((document.getElementById('perm-delete') as HTMLInputElement)?.checked) permissions.push('delete_records');
            if ((document.getElementById('perm-staff') as HTMLInputElement)?.checked) permissions.push('manage_staff');

            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>${lang === 'ar' ? 'جاري الإنشاء...' : 'Oluşturuluyor...'}</span>`;

            try {
                // Call Supabase auth signup directly using anonKey to avoid terminating active admin session
                const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        data: {
                            name,
                            role,
                            permissions
                        }
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.msg || data.error_description || (lang === 'ar' ? 'فشل إنشاء المستخدم' : 'Kullanıcı oluşturulamadı'));
                }

                const toastMsg = lang === 'ar' ? `تم إنشاء المستخدم ${email} بنجاح` : `Kullanıcı ${email} başarıyla oluşturuldu!`;
                if (window.showToast) window.showToast(toastMsg, 'success');

                (addForm as HTMLFormElement).reset();
                closeModal('add-user-modal');
                await loadStaffData();

            } catch (err: any) {
                console.error('Error creating user:', err);
                if (window.showToast) window.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<span data-i18n="admin.createSubmitBtn">${lang === 'ar' ? 'حفظ المستخدم' : 'Kullanıcıyı Kaydet'}</span>`;
            }
        });
    }

    // 2. Edit User Form
    const editForm = document.getElementById('edit-user-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lang = getLang();
            const btn = document.getElementById('submit-edit-user-btn') as HTMLButtonElement;
            const targetId = (document.getElementById('edit-user-id') as HTMLInputElement).value;
            const name = (document.getElementById('edit-user-name') as HTMLInputElement).value.trim();
            const role = (document.getElementById('edit-user-role') as HTMLSelectElement).value;

            const permissions: string[] = [];
            if ((document.getElementById('edit-perm-workshop') as HTMLInputElement)?.checked) permissions.push('manage_workshop');
            if ((document.getElementById('edit-perm-finances') as HTMLInputElement)?.checked) permissions.push('view_finances');
            if ((document.getElementById('edit-perm-settings') as HTMLInputElement)?.checked) permissions.push('manage_settings');
            if ((document.getElementById('edit-perm-delete') as HTMLInputElement)?.checked) permissions.push('delete_records');
            if ((document.getElementById('edit-perm-staff') as HTMLInputElement)?.checked) permissions.push('manage_staff');

            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>${lang === 'ar' ? 'جاري التحديث...' : 'Güncelleniyor...'}</span>`;

            try {
                await adminUpdateUserDetails(targetId, { role, name, permissions });
                
                const toastMsg = lang === 'ar' ? 'تم تحديث بيانات المستخدم وصلاحياته بنجاح' : 'Kullanıcı bilgileri ve yetkileri başarıyla güncellendi!';
                if (window.showToast) window.showToast(toastMsg, 'success');

                closeModal('edit-user-modal');
                await loadStaffData();

            } catch (err: any) {
                console.error('Error updating user:', err);
                if (window.showToast) window.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<span data-i18n="admin.saveChangesBtn">${lang === 'ar' ? 'حفظ التعديلات' : 'Değişiklikleri Kaydet'}</span>`;
            }
        });
    }

    // 3. Reset Password Form
    const resetForm = document.getElementById('reset-pwd-form');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lang = getLang();
            const btn = document.getElementById('submit-reset-pwd-btn') as HTMLButtonElement;
            const targetId = (document.getElementById('reset-pwd-user-id') as HTMLInputElement).value;
            const newPassword = (document.getElementById('reset-new-password') as HTMLInputElement).value;

            if (newPassword.length < 6) {
                const msg = lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Şifre en az 6 karakter olmalıdır';
                if (window.showToast) window.showToast(msg, 'error');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>${lang === 'ar' ? 'جاري التحديث...' : 'Güncelleniyor...'}</span>`;

            try {
                await adminResetUserPassword(targetId, newPassword);
                const toastMsg = lang === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Şifre başarıyla güncellendi!';
                if (window.showToast) window.showToast(toastMsg, 'success');

                closeModal('reset-pwd-modal');
            } catch (err: any) {
                console.error('Error resetting password:', err);
                if (window.showToast) window.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<span data-i18n="admin.savePwdBtn">${lang === 'ar' ? 'تحديث كلمة المرور' : 'Şifreyi Güncelle'}</span>`;
            }
        });
    }

    // 4. Confirm Delete User Button
    const confirmDeleteBtn = document.getElementById('confirm-delete-user-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const lang = getLang();
            const targetId = (document.getElementById('delete-user-id') as HTMLInputElement).value;
            const targetUser = allStaffUsers.find(u => u.id === targetId);

            if (!targetUser) return;

            // Security guard rails
            if (targetUser.email === currentUser.email) {
                const msg = lang === 'ar' ? 'لا يمكنك حذف حسابك الشخصي!' : 'Kendi hesabınızı silemezsiniz!';
                if (window.showToast) window.showToast(msg, 'error');
                closeModal('delete-user-modal');
                return;
            }

            if (targetUser.email === 'admin@oxygen.com') {
                const msg = lang === 'ar' ? 'لا يمكن حذف حساب المسؤول الرئيسي!' : 'Ana yönetici hesabı silinemez!';
                if (window.showToast) window.showToast(msg, 'error');
                closeModal('delete-user-modal');
                return;
            }

            confirmDeleteBtn.setAttribute('disabled', 'true');
            confirmDeleteBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>${lang === 'ar' ? 'جاري الحذف...' : 'Siliniyor...'}</span>`;

            try {
                await adminDeleteUser(targetId);
                const toastMsg = lang === 'ar' ? 'تم حذف المستخدم من النظام بنجاح' : 'Kullanıcı sistemden başarıyla silindi!';
                if (window.showToast) window.showToast(toastMsg, 'info');

                closeModal('delete-user-modal');
                await loadStaffData();
            } catch (err: any) {
                console.error('Error deleting user:', err);
                if (window.showToast) window.showToast(err.message, 'error');
            } finally {
                confirmDeleteBtn.removeAttribute('disabled');
                confirmDeleteBtn.innerHTML = `<span data-i18n="admin.confirmDeleteBtn">${lang === 'ar' ? 'نعم، احذف' : 'Evet, Sil'}</span>`;
            }
        });
    }
}

/**
 * Opens edit modal and binds user data
 */
function openEditUserModal(user: StaffUser) {
    (document.getElementById('edit-user-id') as HTMLInputElement).value = user.id;
    (document.getElementById('edit-user-name') as HTMLInputElement).value = user.name || '';
    (document.getElementById('edit-modal-target-email') as HTMLElement).textContent = user.email;
    (document.getElementById('edit-user-role') as HTMLSelectElement).value = user.role || 'technician';

    const perms = user.permissions || getDefaultPermissions(user.role);
    (document.getElementById('edit-perm-workshop') as HTMLInputElement).checked = perms.includes('manage_workshop');
    (document.getElementById('edit-perm-finances') as HTMLInputElement).checked = perms.includes('view_finances');
    (document.getElementById('edit-perm-settings') as HTMLInputElement).checked = perms.includes('manage_settings');
    (document.getElementById('edit-perm-delete') as HTMLInputElement).checked = perms.includes('delete_records');
    (document.getElementById('edit-perm-staff') as HTMLInputElement).checked = perms.includes('manage_staff');

    openModal('edit-user-modal');
}

/**
 * Opens reset password modal
 */
function openResetPasswordModal(user: StaffUser) {
    (document.getElementById('reset-pwd-user-id') as HTMLInputElement).value = user.id;
    (document.getElementById('reset-pwd-target-email') as HTMLElement).textContent = user.email;
    const input = document.getElementById('reset-new-password') as HTMLInputElement;
    if (input) input.value = generateSecurePassword();

    openModal('reset-pwd-modal');
}

/**
 * Opens delete user confirmation modal
 */
function openDeleteUserModal(user: StaffUser) {
    (document.getElementById('delete-user-id') as HTMLInputElement).value = user.id;
    (document.getElementById('delete-target-email') as HTMLElement).textContent = `${user.name ? `${user.name} (${user.email})` : user.email}`;

    openModal('delete-user-modal');
}

/**
 * Helper modal transition functions
 */
function openModal(id: string) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
    });
}

function closeModal(id: string) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

/**
 * Secure password generator
 */
function generateSecurePassword(): string {
    const charsUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const charsLower = 'abcdefghijkmnopqrstuvwxyz';
    const charsNum = '23456789';
    const charsSpecial = '!@#$%^&*';

    let pwd = '';
    pwd += charsUpper[Math.floor(Math.random() * charsUpper.length)];
    pwd += charsLower[Math.floor(Math.random() * charsLower.length)];
    pwd += charsNum[Math.floor(Math.random() * charsNum.length)];
    pwd += charsSpecial[Math.floor(Math.random() * charsSpecial.length)];

    const all = charsUpper + charsLower + charsNum + charsSpecial;
    for (let i = 4; i < 12; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle characters
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Copy to clipboard utility with toast
 */
async function copyToClipboard(text: string) {
    const lang = getLang();
    try {
        await navigator.clipboard.writeText(text);
        const msg = lang === 'ar' ? 'تم نسخ كلمة المرور إلى الحافظة' : 'Şifre panoya kopyalandı!';
        if (window.showToast) window.showToast(msg, 'info');
    } catch {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        const msg = lang === 'ar' ? 'تم نسخ كلمة المرور' : 'Şifre kopyalandı';
        if (window.showToast) window.showToast(msg, 'info');
    }
}

/**
 * Extracts initials from name or email
 */
function getInitials(str: string): string {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
}

/**
 * Basic HTML escaping to prevent XSS
 */
function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
