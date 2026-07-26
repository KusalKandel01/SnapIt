import { useEffect, useState } from 'react';
import { supabase, isCloudConfigured } from '../lib/supabaseClient';
import { syncFromCloud } from '../lib/projects';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isCloudConfigured());

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
      if (data.session?.user) syncFromCloud();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_IN') syncFromCloud();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email, password) {
    if (!supabase) return { error: 'Cloud sync is not configured on this deployment.' };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message };
  }

  async function signIn(email, password) {
    if (!supabase) return { error: 'Cloud sync is not configured on this deployment.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return { user, loading, signUp, signIn, signOut, cloudConfigured: isCloudConfigured() };
}
