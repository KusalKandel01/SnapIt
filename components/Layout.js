import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/editor', label: 'Editor' },
  { href: '/templates', label: 'Templates' },
  { href: '/brand', label: 'Brand Kit' }
];

export default function Layout({ children }) {
  const router = useRouter();
  const [brand, setBrand] = useState({ logo: '', name: 'Snap Studio' });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('snapstudio:brand') || '{}');
      setBrand(b => ({ ...b, ...saved }));
    } catch (e) {}
  }, []);

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="brand">
          {brand.logo ? <img src={brand.logo} alt="logo" /> : <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--accent)' }} />}
          <span>{brand.name || 'Snap Studio'}</span>
        </div>
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
