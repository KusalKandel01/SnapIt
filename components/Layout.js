import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getActiveKit } from '../lib/brandKits';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/editor', label: 'Editor' },
  { href: '/templates', label: 'Templates' },
  { href: '/news', label: 'News Digest' },
  { href: '/media', label: 'Media Library' },
  { href: '/brand', label: 'Brand Kit' }
];

export default function Layout({ children }) {
  const router = useRouter();
  const [brand, setBrand] = useState({ logo: '', name: 'Snap Studio' });

  useEffect(() => {
    const active = getActiveKit();
    if (active) setBrand({ logo: active.logo, name: active.name });
  }, [router.pathname]);

  return (
    <div className="app-shell">
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
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
