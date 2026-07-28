import { useState } from 'react';

const EMOJI_SET = [
  '😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👏',
  '🙌','🔥','💯','⭐','✨','🎉','❤️','💔','🚨','📢',
  '📌','✅','❌','⚠️','🗳️','🏆','⚽','🏏','🎬','🎵',
  '🍜','🎂','🎓','💰','📈','📉','🌦️','☀️','🌧️','❄️',
  '🇳🇵','🌍','🕉️','🪔','🎊','🙏','💡','📍','🕒','❤️‍🔥'
];

export default function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn secondary"
        onClick={() => setOpen(o => !o)}
        aria-label="Insert emoji"
        aria-expanded={open}
        style={{ padding: '4px 8px', fontSize: 14 }}
      >
        😊
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
            background: 'var(--ink-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
            padding: 8, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, width: 260
          }}
        >
          {EMOJI_SET.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onSelect(e); setOpen(false); }}
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 4, borderRadius: 4 }}
              onMouseOver={ev => ev.currentTarget.style.background = 'var(--rule)'}
              onMouseOut={ev => ev.currentTarget.style.background = 'none'}
              aria-label={`Insert ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
