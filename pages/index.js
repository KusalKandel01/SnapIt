import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import Icon from '../components/Icon';
import { readProjects } from '../lib/projects';

const DESTINATIONS = [
  { href: '/editor', label: 'Editor', desc: 'Build a card, pick a platform size, export or copy instantly.', icon: 'chart' },
  { href: '/templates', label: 'Templates', desc: '53 starting points — Nepal-specific occasions and worldwide formats.', icon: 'duplicate' },
  { href: '/projects', label: 'Projects', desc: 'Every saved project — searchable, duplicable, schedulable.', icon: 'eye' },
  { href: '/calendar', label: 'Calendar', desc: 'A local reminder ledger for what\u2019s posting when.', icon: 'up' },
  { href: '/news', label: 'News Digest', desc: 'Real headlines from RSS feeds you choose, credited to the source.', icon: 'sparkle' },
  { href: '/media', label: 'Media Library', desc: 'Upload once, reuse across every project.', icon: 'map' },
  { href: '/brand', label: 'Brand Kit', desc: 'Multiple named logo/brand kits, switch anytime.', icon: 'lock' }
];

export default function Home() {
  const [stats, setStats] = useState({ projects: 0, scheduled: 0 });

  useEffect(() => {
    const all = readProjects();
    setStats({
      projects: all.filter(p => !p.archived).length,
      scheduled: all.filter(p => p.scheduledDate && !p.archived).length
    });
  }, []);

  return (
    <Layout>
      <Eyebrow>Workspace Overview</Eyebrow>

      <div className="proof-frame" style={{ background: 'var(--ink-2)', border: '1px solid var(--rule)', marginBottom: 40, padding: '44px 34px' }}>
        <div className="cm-tr" />
        <div className="cm-bl" />
        <div className="proof-stamp">SNAP STUDIO</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 40, color: 'var(--white)', margin: '10px 0 12px 0', maxWidth: 560 }}>
          Build the proof. Ship the post.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--rule-light)', maxWidth: 480, marginBottom: 22 }}>
          Branded social graphics for every platform, sized right the first time — with your logo and colors carried through everything you make.
        </p>
        <div style={{ display: 'flex', gap: 28, fontFamily: 'var(--font-mono)' }}>
          <div>
            <div style={{ fontSize: 26, color: 'var(--brass)' }}>{stats.projects}</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rule-light)' }}>Active projects</div>
          </div>
          <div>
            <div style={{ fontSize: 26, color: 'var(--brass)' }}>{stats.scheduled}</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rule-light)' }}>Scheduled</div>
          </div>
          <div>
            <div style={{ fontSize: 26, color: 'var(--brass)' }}>53</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rule-light)' }}>Templates</div>
          </div>
        </div>
      </div>

      <div className="page-eyebrow" style={{ marginBottom: 16 }}>Everywhere to go</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {DESTINATIONS.map(d => (
          <Link key={d.href} href={d.href} style={{ textDecoration: 'none' }}>
            <div className="card-panel" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon name={d.icon} size={15} color="var(--brass)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, margin: 0, color: 'var(--white)' }}>{d.label}</h3>
              </div>
              <p style={{ color: 'var(--rule-light)', fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{d.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
