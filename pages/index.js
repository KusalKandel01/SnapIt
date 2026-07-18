import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <h1 className="page-title">Snap Studio</h1>
      <p className="page-sub">Build branded social graphics for every platform, export or copy instantly, and keep your logo and colors consistent across everything you make.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        <Link href="/editor" style={{ textDecoration: 'none' }}>
          <div className="card-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>Open Editor</h3>
            <p style={{ color: 'var(--rule-light)', fontSize: 13, lineHeight: 1.5 }}>Build a card from scratch, pick a platform size, export as PNG/JPEG or copy to clipboard.</p>
          </div>
        </Link>
        <Link href="/templates" style={{ textDecoration: 'none' }}>
          <div className="card-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>Browse Templates</h3>
            <p style={{ color: 'var(--rule-light)', fontSize: 13, lineHeight: 1.5 }}>Start from a ready-made style — breaking news, feature story, and more.</p>
          </div>
        </Link>
        <Link href="/brand" style={{ textDecoration: 'none' }}>
          <div className="card-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>Brand Kit</h3>
            <p style={{ color: 'var(--rule-light)', fontSize: 13, lineHeight: 1.5 }}>Import your logo and set your brand name — shows up in the sidebar everywhere.</p>
          </div>
        </Link>
      </div>
    </Layout>
  );
}
