import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import { useAuth } from '../components/useAuth';
import useToast from '../components/useToast';

export default function Login() {
  const router = useRouter();
  const { user, signIn, signUp, signOut, cloudConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const { toast, ToastEl } = useToast();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (error) toast(error);
    else if (mode === 'signup') toast('Check your email to confirm your account, then sign in.');
    else { toast('Signed in'); router.push('/projects'); }
  }

  if (!cloudConfigured) {
    return (
      <Layout>
        <Eyebrow>Cloud Sync</Eyebrow>
        <h1 className="page-title">Account</h1>
        <p className="page-sub">Cloud sync isn't configured on this deployment yet. The app works fully without it — everything saves locally in your browser. To enable accounts and cross-device sync, see the "Cloud Sync (Supabase)" section in README.md.</p>
      </Layout>
    );
  }

  if (user) {
    return (
      <Layout>
        <Eyebrow>Cloud Sync</Eyebrow>
        <h1 className="page-title">Account</h1>
        <p className="page-sub">Signed in as <strong style={{ color: 'var(--brass)' }}>{user.email}</strong>. Your projects now sync to the cloud — open them from any device you sign into.</p>
        <button className="btn secondary" onClick={async () => { await signOut(); toast('Signed out'); }}>Sign out</button>
        {ToastEl}
      </Layout>
    );
  }

  return (
    <Layout>
      <Eyebrow>Cloud Sync</Eyebrow>
      <h1 className="page-title">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
      <p className="page-sub">Sign in to sync your Projects library across devices. Everything still works signed-out — this is optional, not required.</p>
      <form onSubmit={submit} className="card-panel" style={{ maxWidth: 380 }}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginBottom: 10 }}>{busy ? '...' : mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
        <button type="button" className="btn secondary" style={{ width: '100%' }} onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
      {ToastEl}
    </Layout>
  );
}
