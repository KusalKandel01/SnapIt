// A small, consistent icon set — thin-stroke line icons matching the
// print-proof design language (brass/mono aesthetic), replacing the emoji
// (👁🔒⧉📊🗺️✨) that were scattered through the Editor. Emoji render
// differently per OS/font and read as generic "AI app" — a deliberate,
// consistent icon set is part of the site actually having an identity.

const paths = {
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18 M10.6 10.6a3 3 0 0 0 4.2 4.2 M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a17.5 17.5 0 0 1-4.1 4.5 M6.1 6.1A17.6 17.6 0 0 0 1 11s4 7 11 7a10.6 10.6 0 0 0 4.4-.9',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 7.4-2',
  duplicate: 'M9 9h11v11H9z M5 15V4h11',
  chart: 'M4 20V10 M11 20V4 M18 20v-7',
  map: 'M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z M9 3v16 M15 5v16',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6'
};

export default function Icon({ name, size = 14, color = 'currentColor', strokeWidth = 1.8 }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d={d} />
    </svg>
  );
}
