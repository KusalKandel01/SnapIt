import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const COMMANDS = [
  { label: 'Go to Dashboard', href: '/' },
  { label: 'Go to Editor', href: '/editor' },
  { label: 'Go to Templates', href: '/templates' },
  { label: 'Go to Projects', href: '/projects' },
  { label: 'Go to Publishing Calendar', href: '/calendar' },
  { label: 'Go to News Digest', href: '/news' },
  { label: 'Go to Media Library', href: '/media' },
  { label: 'Go to Brand Kit', href: '/brand' }
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => { if (open) { setQuery(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  function go(cmd) {
    if (!cmd) return;
    router.push(cmd.href);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(filtered[activeIdx]); }
  }

  if (!open) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '90vw', background: 'var(--ink-2)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
          onKeyDown={onKeyDown}
          placeholder="Type a command or page name…"
          style={{ width: '100%', background: 'var(--ink)', border: 'none', borderBottom: '1px solid var(--rule)', color: 'var(--ink-text)', padding: '14px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--rule-light)' }}>No matches</div>}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.href}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => go(cmd)}
              style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', background: i === activeIdx ? 'var(--ink)' : 'transparent', color: i === activeIdx ? 'var(--brass)' : 'var(--ink-text)' }}
            >
              {cmd.label}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--rule)', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--rule-light)' }}>
          ↑↓ navigate · ↵ select · esc close
        </div>
      </div>
    </div>
  );
}
