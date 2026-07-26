import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getActiveKit } from '../lib/brandKits';
import CommandPalette from './CommandPalette';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/editor', label: 'Editor' },
  { href: '/templates', label: 'Templates' },
  { href: '/projects', label: 'Projects' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/news', label: 'News Digest' },
  { href: '/media', label: 'Media Library' },
  { href: '/brand', label: 'Brand Kit' },
  { href: '/login', label: 'Account' }
];

export default function Layout({ children }) {
  const router = useRouter();
  const [brand, setBrand] = useState({ logo: '', name: 'Snap Studio' });

  useEffect(() => {
    const active = getActiveKit();
    if (active) setBrand({ logo: active.logo, name: active.name });
  }, [router.pathname]);

  const pageLabel = NAV.find(n => n.href === router.pathname)?.label;
  const pageTitle = pageLabel && pageLabel !== 'Dashboard' ? `${pageLabel} — Snap Studio` : 'Snap Studio';

  return (
    <div className="app-shell">
      <Head><title>{pageTitle}</title></Head>
      <nav className="nav">
        <div className="brand">
          {brand.logo ? <img src={brand.logo} alt="logo" /> : <div style={{ width: 28, height: 28, borderRadius: 3, background: 'var(--brass)' }} />}
          <span>{brand.name || 'Snap Studio'}</span>
        </div>
        <div className="nav-label">Workspace</div>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={router.pathname === item.href ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--rule-light)' }}>
          ⌘K / Ctrl+K to jump anywhere
        </div>
      </nav>
      <main className="main">{children}</main>
      <CommandPalette />
    </div>
  );
}
