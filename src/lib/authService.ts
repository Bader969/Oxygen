import { supabase } from './supabaseClient';

export async function checkAuthSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    if (window.location.pathname !== '/src/login.html') {
      window.location.href = '/src/login.html';
    }
    return null;
  }
  return session.user;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/src/login.html';
}

export async function setupAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      if (window.location.pathname !== '/src/login.html') {
        window.location.href = '/src/login.html';
      }
    }
  });
}

export async function updateProfileData(name: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { name }
  });
  if (error) throw error;
  return data.user;
}

export async function updateProfilePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password
  });
  if (error) throw error;
  return data.user;
}
