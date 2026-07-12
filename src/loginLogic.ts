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
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Authenticating...';
        submitBtn.disabled = true;

        try {
            await signInWithPassword(emailInput.value, passwordInput.value);
            window.location.href = '/index.html';
        } catch (err: any) {
            // Auto-signup logic for testing
            if (err.message.includes('Invalid login credentials')) {
                try {
                    submitBtn.innerHTML = 'Creating Test Account...';
                    const { error: signUpErr } = await supabase.auth.signUp({
                        email: emailInput.value,
                        password: passwordInput.value
                    });
                    if (signUpErr) throw signUpErr;
                    window.location.href = '/index.html';
                } catch (signUpErr2: any) {
                    errorMsg.textContent = signUpErr2.message;
                    errorMsg.classList.remove('hidden');
                }
            } else {
                errorMsg.textContent = err.message || 'Failed to login';
                errorMsg.classList.remove('hidden');
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});
