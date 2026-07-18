import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import CardCanvas from '../components/CardCanvas';
import { findSize } from '../lib/platformSizes';

const STOCK_BG = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60';

const base = (overrides) => ({
  layout: 'dark', align: 'left', color: '#cf1b2b', font: "'Anton',sans-serif",
  headSize: 34, bodySize: 12, bg: STOCK_BG, panX: 50, panY: 50, zoom: 100,
  watermark: 'yoursource', kicker: '', headline: '', bannerLines: '', caption: '', cornerTag: '',
  quoteText: '', quoteAuthor: '', statNumber: '', statLabel: '', statDesc: '',
  sizeId: 'ig-square', ...overrides
});

const GROUPS = [
  {
    label: 'Nepal',
    items: [
      { name: 'Dashain Wishes', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'Wishing you a Dashain filled with joy, blessings, and togetherness.', quoteAuthor: 'Happy Dashain', cornerTag: 'शुभ दशैं', sizeId: 'ig-story' }) },
      { name: 'Tihar / Deepawali', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'May this Tihar light up your life with happiness and prosperity.', quoteAuthor: 'Happy Tihar', cornerTag: 'शुभ तिहार', sizeId: 'ig-portrait' }) },
      { name: 'Teej Wishes', data: base({ layout: 'light', color: '#cf1b2b', font: "'Playfair Display',serif", align: 'center', kicker: 'TEEJ', headline: 'HAPPY TEEJ TO ALL', caption: 'Celebrating strength, devotion, and sisterhood this Teej.', cornerTag: 'शुभ तीज', sizeId: 'ig-square' }) },
      { name: 'Holi Celebration', data: base({ layout: 'stat', color: '#8a2be2', font: "'Poppins',sans-serif", statNumber: 'HOLI', statLabel: 'FESTIVAL OF COLORS', statDesc: 'Wishing you a vibrant and joyful Holi with friends and family.', sizeId: 'ig-square' }) },
      { name: 'Buddha Jayanti', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'Peace comes from within. Do not seek it without.', quoteAuthor: 'Buddha Jayanti', cornerTag: 'बुद्ध जयन्ती', sizeId: 'ig-portrait' }) },
      { name: 'Loktantra Diwas', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'LOKTANTRA DIWAS', headline: 'DEMOCRACY DAY', bannerLines: 'Celebrating the spirit of democracy', caption: 'Honoring the movement that shaped modern Nepal.', cornerTag: 'लोकतन्त्र दिवस', sizeId: 'ig-square' }) },
      { name: 'Janasankhya Diwas', data: base({ layout: 'stat', color: '#0f8a4b', font: "'Poppins',sans-serif", statNumber: '#', statLabel: 'POPULATION DAY', statDesc: 'Raising awareness on population, health, and development.', sizeId: 'ig-square' }) },
      { name: 'Shraddhanjali (In Memoriam)', data: base({ layout: 'quote', color: '#6b6f76', font: "'Playfair Display',serif", align: 'center', quoteText: 'In loving memory — forever in our hearts.', quoteAuthor: 'श्रद्धाञ्जली', cornerTag: 'IN MEMORY', sizeId: 'ig-portrait' }) },
      { name: 'Nepali New Year', data: base({ layout: 'light', color: '#e8b93f', font: "'Oswald',sans-serif", align: 'center', kicker: 'नयाँ वर्ष', headline: 'HAPPY NEW YEAR', caption: 'Wishing you a prosperous new year ahead.', cornerTag: 'शुभ नयाँ वर्ष', sizeId: 'ig-square' }) },
      { name: 'Nepal Match Day', data: base({ layout: 'stat', color: '#cf1b2b', font: "'Poppins',sans-serif", statNumber: 'VS', statLabel: 'MATCH DAY', statDesc: 'Kickoff details and where to watch.', sizeId: 'ig-story' }) }
    ]
  },
  {
    label: 'Worldwide',
    items: [
      { name: 'Breaking News', data: base({ layout: 'dark', color: '#cf1b2b', kicker: 'BREAKING', headline: 'HEADLINE GOES HERE', bannerLines: 'Short supporting line one\nShort supporting line two', caption: 'Add a short descriptive caption here.', cornerTag: 'IN-DEPTH STORY', sizeId: 'ig-square' }) },
      { name: 'Feature Story', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", headSize: 19, kicker: 'FEATURE', headline: 'A LONGER FORM HEADLINE FOR CONTEXT', caption: 'A short body paragraph with more context for the reader.', cornerTag: 'READ MORE', sizeId: 'ig-portrait' }) },
      { name: 'Product Launch', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'NEW', headline: 'INTRODUCING SOMETHING NEW', caption: 'Available now — link in bio.', cornerTag: 'SHOP NOW', sizeId: 'ig-square' }) },
      { name: "We're Hiring", data: base({ layout: 'light', align: 'center', color: '#1a63c9', font: "'Poppins',sans-serif", kicker: 'HIRING', headline: 'JOIN OUR TEAM', caption: 'Open roles — apply through the link in our profile.', cornerTag: 'APPLY NOW', sizeId: 'ig-square' }) },
      { name: 'Event Invite', data: base({ layout: 'dark', align: 'center', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'YOU\'RE INVITED', headline: 'EVENT NAME HERE', bannerLines: 'Date · Time · Location', caption: 'RSVP through the link in bio.', cornerTag: 'SAVE THE DATE', sizeId: 'ig-portrait' }) },
      { name: 'Sale / Promo', data: base({ layout: 'dark', align: 'center', color: '#cf1b2b', font: "'Anton',sans-serif", headSize: 44, kicker: 'LIMITED TIME', headline: '30% OFF', caption: 'Ends this weekend only.', cornerTag: 'SHOP NOW', sizeId: 'ig-square' }) },
      { name: 'Weather Alert', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'WEATHER ALERT', headline: 'CONDITIONS UPDATE', caption: 'Stay safe — details and forecast below.', cornerTag: 'STAY INFORMED', sizeId: 'ig-square' }) },
      { name: 'Motivational Quote', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", quoteText: 'The best time to start was yesterday. The next best time is now.', quoteAuthor: 'Unknown', sizeId: 'ig-square' }) },
      { name: 'Birthday Wishes', data: base({ layout: 'light', align: 'center', color: '#f5a0c8', font: "'Poppins',sans-serif", kicker: 'HAPPY BIRTHDAY', headline: 'WISHING YOU THE BEST', caption: 'Hope your day is as wonderful as you are.', sizeId: 'ig-square' }) },
      { name: 'Anniversary', data: base({ layout: 'light', align: 'center', color: '#8a2be2', font: "'Playfair Display',serif", kicker: 'ANNIVERSARY', headline: 'CELEBRATING YEARS TOGETHER', caption: 'Grateful for every moment.', sizeId: 'ig-square' }) },
      { name: 'World Cup Match Day', data: base({ layout: 'stat', color: '#0f8a4b', font: "'Poppins',sans-serif", statNumber: 'VS', statLabel: 'MATCH DAY', statDesc: 'Kickoff time and where to watch.', sizeId: 'ig-story' }) },
      { name: 'New Year (Global)', data: base({ layout: 'dark', align: 'center', color: '#e8b93f', font: "'Anton',sans-serif", headSize: 44, kicker: 'HAPPY NEW YEAR', headline: '2027', caption: 'Wishing you a bright year ahead.', sizeId: 'ig-square' }) },
      { name: 'Webinar / Workshop', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'FREE WEBINAR', headline: 'TOPIC TITLE HERE', caption: 'Register through the link in bio.', cornerTag: 'REGISTER NOW', sizeId: 'ig-portrait' }) },
      { name: 'Recipe / Food Feature', data: base({ layout: 'light', color: '#f8c498', font: "'Poppins',sans-serif", kicker: 'RECIPE', headline: 'DISH NAME HERE', caption: 'Full recipe and steps in the caption below.', sizeId: 'ig-portrait' }) }
    ]
  }
];

export default function Templates() {
  const router = useRouter();

  function usePreset(item) {
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(item.data));
    router.push('/editor');
  }

  return (
    <Layout>
      <h1 className="page-title">Templates</h1>
      <p className="page-sub">Click a template to load it straight into the Editor, then customize freely. Nepal-specific occasions and worldwide formats, side by side.</p>

      {GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, letterSpacing: '.04em', color: 'var(--gold)', marginBottom: 14 }}>{group.label}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {group.items.map(item => {
              const size = findSize(item.data.sizeId);
              return (
                <div key={item.name} className="card-panel" style={{ cursor: 'pointer', padding: 12 }} onClick={() => usePreset(item)}>
                  <div style={{ transform: 'scale(0.42)', transformOrigin: 'top left', width: 420, height: Math.round(420 * (size.h / size.w)) * 0.42, overflow: 'hidden', marginBottom: 4 }}>
                    <CardCanvas data={{ ...item.data, ratioW: size.w, ratioH: size.h }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 13, margin: '4px 0 2px 0' }}>{item.name}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 11 }}>Click to use</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Layout>
  );
}
