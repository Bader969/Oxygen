import { signInWithPassword, checkAuthSession } from './lib/authService';
import { supabase } from './lib/supabaseClient';

document.addEventListener('DOMContentLoaded', async () => {
    // If already logged in, redirect to dashboard
    const user = await checkAuthSession();
    if (user) {
        window.location.href = '/index.html';
        return;
    }

    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const errorMsg = document.getElementById('error-message') as HTMLDivElement;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        const lang = localStorage.getItem('appLang') || 'tr';
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = lang === 'ar' ? 'جارٍ التحقق...' : 'Doğrulanıyor...';
        submitBtn.disabled = true;

        try {
            await signInWithPassword(emailInput.value, passwordInput.value);
            window.location.href = '/index.html';
        } catch (err: any) {
            let userFriendlyMsg = err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Giriş yapılamadı');
            if (err.message && err.message.includes('Invalid login credentials')) {
                userFriendlyMsg = lang === 'ar' 
                    ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' 
                    : 'E-posta veya şifre hatalı.';
            }
            errorMsg.textContent = userFriendlyMsg;
            errorMsg.classList.remove('hidden');
            (window as any).showToast ? (window as any).showToast(userFriendlyMsg, 'error') : null;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});
