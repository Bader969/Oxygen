import { getStaffUsers, adminUpdateUserRole, adminDeleteUser } from './lib/repairService';
import { checkAuthSession } from './lib/authService';
import { supabaseUrl, supabaseAnonKey } from './lib/supabaseClient';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthSession();
    if (!user) return;

    // Populate profile details
    const currentName = user.user_metadata?.name || user.email?.split('@')[0] || 'Technician';
    document.getElementById('profile-display-name')!.textContent = currentName;
    document.getElementById('profile-email')!.textContent = user.email || 'Unknown';

    // Populate Edit Form Inputs
    const editNameInput = document.getElementById('edit-display-name') as HTMLInputElement;
    if (editNameInput) editNameInput.value = user.user_metadata?.name || '';

    // Handle profile update form submission
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('update-profile-btn') as HTMLButtonElement;
            const statusDiv = document.getElementById('update-status') as HTMLDivElement;
            const newDisplayName = (document.getElementById('edit-display-name') as HTMLInputElement).value.trim();
            const newPassword = (document.getElementById('edit-password') as HTMLInputElement).value;

            btn.disabled = true;
            const lang = localStorage.getItem('appLang') || 'tr';
            btn.textContent = lang === 'ar' ? 'جاري التحديث...' : (lang === 'tr' ? 'Güncelleniyor...' : 'Updating...');
            statusDiv.classList.remove('hidden', 'text-emerald-400', 'text-error');

            try {
                const { updateProfileData, updateProfilePassword } = await import('./lib/authService');
                
                if (newDisplayName && newDisplayName !== (user.user_metadata?.name || '')) {
                    await updateProfileData(newDisplayName);
                    user.user_metadata = { ...user.user_metadata, name: newDisplayName };
                    document.getElementById('profile-display-name')!.textContent = newDisplayName;
                }

                if (newPassword) {
                    if (newPassword.length < 6) {
                        throw new Error(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Şifre en az 6 karakter olmalıdır.');
                    }
                    await updateProfilePassword(newPassword);
                    (document.getElementById('edit-password') as HTMLInputElement).value = '';
                }

                statusDiv.textContent = lang === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profil başarıyla güncellendi!';
                statusDiv.classList.add('text-emerald-400');
                statusDiv.classList.remove('hidden');

            } catch (err: any) {
                statusDiv.textContent = err.message;
                statusDiv.classList.add('text-error');
                statusDiv.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.textContent = lang === 'ar' ? 'تحديث البيانات' : 'Bilgileri Güncelle';
            }
        });
    }
    
    // Check role from metadata or hardcoded admin email
    const isHardcodedAdmin = user.email === 'admin@oxygen.com';
    const role = isHardcodedAdmin ? 'admin' : (user.user_metadata?.role || 'technician');
    const roleBadge = document.getElementById('profile-role')!;
    
    if (role === 'admin') {
        const lang = localStorage.getItem('appLang') || 'tr';
        roleBadge.textContent = lang === 'ar' ? 'مسؤول' : (lang === 'tr' ? 'Yönetici' : 'Administrator');
        roleBadge.setAttribute('data-i18n', 'profile.adminText');
        roleBadge.className = 'inline-block bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider';
        
        // Show admin section
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.classList.remove('hidden');
        }
        
        // Show user directory section
        const userDirSection = document.getElementById('user-directory-section');
        if (userDirSection) {
            userDirSection.classList.remove('hidden');
        }
        loadUserDirectory(user);
    } else {
        const lang = localStorage.getItem('appLang') || 'tr';
        roleBadge.textContent = lang === 'ar' ? 'فني' : (lang === 'tr' ? 'Teknisyen' : 'Technician');
        roleBadge.setAttribute('data-i18n', 'profile.techText');
        roleBadge.className = 'inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider';
    }

    // Handle User Creation
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('create-user-btn') as HTMLButtonElement;
            const statusDiv = document.getElementById('create-status') as HTMLDivElement;
            const email = (document.getElementById('new-user-email') as HTMLInputElement).value;
            const password = (document.getElementById('new-user-password') as HTMLInputElement).value;
            const newRole = (document.getElementById('new-user-role') as HTMLSelectElement).value;
            
            btn.disabled = true;
            const lang = localStorage.getItem('appLang') || 'tr';
            btn.textContent = lang === 'ar' ? 'جاري الإنشاء...' : (lang === 'tr' ? 'Oluşturuluyor...' : 'Creating...');
            statusDiv.classList.remove('hidden', 'text-emerald-400', 'text-error');
            
            try {
                // Using standard fetch instead of supabase client to avoid overwriting current session!
                const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        data: { role: newRole }
                    })
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.msg || data.error_description || 'Failed to create user');
                }
                
                const lang = localStorage.getItem('appLang') || 'tr';
                if (lang === 'ar') {
                    statusDiv.textContent = `تم إنشاء المستخدم ${email} بنجاح كـ ${newRole === 'admin' ? 'مسؤول' : 'فني'}!`;
                } else if (lang === 'tr') {
                    statusDiv.textContent = `Kullanıcı ${email}, başarıyla ${newRole === 'admin' ? 'Yönetici' : 'Teknisyen'} olarak oluşturuldu!`;
                } else {
                    statusDiv.textContent = `User ${email} created successfully as ${newRole}!`;
                }
                statusDiv.classList.add('text-emerald-400');
                (createForm as HTMLFormElement).reset();
                
            } catch (err: any) {
                statusDiv.textContent = err.message;
                statusDiv.classList.add('text-error');
            } finally {
                btn.disabled = false;
                const lang = localStorage.getItem('appLang') || 'tr';
                btn.textContent = lang === 'ar' ? 'إنشاء مستخدم' : (lang === 'tr' ? 'Kullanıcı Oluştur' : 'Create User');
            }
        });
    }

    // Handle Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { signOut } = await import('./lib/authService');
            await signOut();
        });
    }
});

async function loadUserDirectory(currentUser: any) {
    const userListContainer = document.getElementById('user-list');
    if (!userListContainer) return;
    userListContainer.innerHTML = '';
    
    try {
        const staffUsers = await getStaffUsers();
        const currentLang = localStorage.getItem('appLang') || 'tr';
        
        staffUsers.forEach((u: any) => {
            const uId = u.id;
            const isSelf = u.email === currentUser.email;
            const disabledAttr = isSelf ? 'disabled' : '';
            const selfBadge = isSelf ? ` (${currentLang === 'ar' ? 'أنت' : 'Sen'})` : '';
            
            const row = document.createElement('div');
            row.className = 'py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4';
            row.innerHTML = `
                <div>
                    <div class="font-bold text-on-surface">${u.email}${selfBadge}</div>
                    <div class="text-xs text-on-surface-variant">${new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <div class="flex items-center gap-2">
                    <select class="role-select bg-surface-container/50 border border-primary/20 rounded px-2 py-1 text-xs text-on-surface" data-id="${uId}" ${disabledAttr}>
                        <option value="technician" ${u.role === 'technician' ? 'selected' : ''}>${currentLang === 'ar' ? 'فني' : 'Teknisyen'}</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${currentLang === 'ar' ? 'مسؤول' : 'Yönetici'}</option>
                    </select>
                    <button class="delete-user-btn bg-error/10 hover:bg-error/30 text-error px-3 py-1 rounded text-xs" data-id="${uId}" ${disabledAttr}>
                        ${currentLang === 'ar' ? 'حذف' : 'Sil'}
                    </button>
                </div>
            `;
            userListContainer.appendChild(row);
        });

        // Wire up event listeners
        userListContainer.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const targetId = (select as HTMLElement).dataset.id!;
                const newRole = (e.target as HTMLSelectElement).value;
                try {
                    await adminUpdateUserRole(targetId, newRole);
                    await loadUserDirectory(currentUser);
                } catch (err: any) {
                    alert('Error: ' + err.message);
                }
            });
        });

        userListContainer.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetId = (btn as HTMLElement).dataset.id!;
                const lang = localStorage.getItem('appLang') || 'tr';
                const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Bu kullanıcıyı silmek istediğinize emin misiniz?';
                if (confirm(confirmMsg)) {
                    try {
                        await adminDeleteUser(targetId);
                        await loadUserDirectory(currentUser);
                    } catch (err: any) {
                        alert('Error: ' + err.message);
                    }
                }
            });
        });

    } catch (err) {
        console.error('Failed to load user directory', err);
    }
}
