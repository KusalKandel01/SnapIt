import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import CardCanvas from '../components/CardCanvas';
import { findSize } from '../lib/platformSizes';
import { getDisplayDims } from '../lib/dims';

// Two verified, freely-licensed Unsplash photos (Unsplash License — free for
// commercial use). Templates that don't need a specific photo use an empty
// bg, which CardCanvas renders as a solid color panel instead — this is why
// the gallery no longer looks like the same photo copy-pasted everywhere.
const PHOTO_NEWSPAPER = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60';
const PHOTO_SKYLINE = 'https://images.unsplash.com/photo-1497968978037-599ea9980d60?w=800&q=60';

const base = (overrides) => ({
  layout: 'dark', align: 'left', color: '#cf1b2b', font: "'Anton',sans-serif",
  headSize: 34, bodySize: 12, bg: '', panX: 50, panY: 50, zoom: 100,
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
      { name: 'Holi Celebration', data: base({ layout: 'dark', align: 'center', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'FESTIVAL OF COLORS', headline: 'HAPPY HOLI', caption: 'Wishing you a vibrant and joyful Holi with friends and family.', cornerTag: 'होली', sizeId: 'ig-square' }) },
      { name: 'Buddha Jayanti', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'Peace comes from within. Do not seek it without.', quoteAuthor: 'Buddha Jayanti', cornerTag: 'बुद्ध जयन्ती', sizeId: 'ig-portrait' }) },
      { name: 'Loktantra Diwas', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", bg: PHOTO_SKYLINE, kicker: 'LOKTANTRA DIWAS', headline: 'DEMOCRACY DAY', bannerLines: 'Celebrating the spirit of democracy', caption: 'Honoring the movement that shaped modern Nepal.', cornerTag: 'लोकतन्त्र दिवस', sizeId: 'ig-square' }) },
      { name: 'Janasankhya Diwas', data: base({ layout: 'stat', color: '#0f8a4b', font: "'Poppins',sans-serif", statNumber: '#', statLabel: 'POPULATION DAY', statDesc: 'Raising awareness on population, health, and development.', sizeId: 'ig-square' }) },
      { name: 'Shraddhanjali (In Memoriam)', data: base({ layout: 'quote', color: '#6b6f76', font: "'Playfair Display',serif", align: 'center', quoteText: 'In loving memory — forever in our hearts.', quoteAuthor: 'श्रद्धाञ्जली', cornerTag: 'IN MEMORY', sizeId: 'ig-portrait' }) },
      { name: 'Nepali New Year', data: base({ layout: 'light', color: '#e8b93f', font: "'Oswald',sans-serif", align: 'center', kicker: 'नयाँ वर्ष', headline: 'HAPPY NEW YEAR', caption: 'Wishing you a prosperous new year ahead.', cornerTag: 'शुभ नयाँ वर्ष', sizeId: 'ig-square' }) },
      { name: 'Nepal Match Day', data: base({ layout: 'stat', color: '#cf1b2b', font: "'Poppins',sans-serif", statNumber: 'VS', statLabel: 'MATCH DAY', statDesc: 'Kickoff details and where to watch.', sizeId: 'ig-story' }) },
      { name: 'Grand Opening (Nepal)', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'ग्रान्ड ओपनिंग', headline: 'NOW OPEN', caption: 'Visit us — details and location below.', cornerTag: 'शुभ उद्घाटन', sizeId: 'ig-square' }) },
      { name: 'Election / Voting Reminder', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'निर्वाचन', headline: 'YOUR VOTE MATTERS', caption: 'Polling details and dates below.', cornerTag: 'मतदान गर्नुहोस्', sizeId: 'ig-square' }) },
      { name: 'Nepali Wedding Invite', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'Together with their families, request the honor of your presence.', quoteAuthor: 'विवाह निमन्त्रणा', cornerTag: 'शुभ विवाह', sizeId: 'ig-portrait' }) },
      { name: 'School Admission Open', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'भर्ना खुल्ला', headline: 'ADMISSIONS OPEN', caption: 'Enroll now — seats are limited.', cornerTag: 'सम्पर्क गर्नुहोस्', sizeId: 'ig-square' })},
      { name: 'Constitution Day', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'संविधान दिवस', headline: 'CONSTITUTION DAY', caption: 'Honoring the founding document of the federal republic.', cornerTag: 'सम्विधान दिवस', sizeId: 'ig-square' }) },
      { name: 'Earthquake Safety Alert', data: base({ layout: 'dark', color: '#9c3b3b', font: "'Oswald',sans-serif", kicker: 'SAFETY ALERT', headline: 'EARTHQUAKE PREPAREDNESS', caption: 'Know your evacuation route and emergency contacts.', cornerTag: 'सुरक्षित रहनुहोस्', sizeId: 'ig-square' }) },
      { name: 'Monsoon / Flood Alert', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'वर्षा सूचना', headline: 'MONSOON ALERT', caption: 'Stay updated on local flood and landslide warnings.', cornerTag: 'सतर्क रहनुहोस्', sizeId: 'ig-square' }) },
      { name: 'Nepal Tourism Promo', data: base({ layout: 'light', color: '#0f8a4b', font: "'Playfair Display',serif", bg: PHOTO_SKYLINE, kicker: 'VISIT NEPAL', headline: 'DESTINATION NAME HERE', caption: 'Discover the heart of the Himalayas.', sizeId: 'ig-portrait' }) },
      { name: 'Local Business Spotlight', data: base({ layout: 'light', color: '#e8b93f', font: "'Poppins',sans-serif", kicker: 'व्यापार', headline: 'BUSINESS NAME HERE', caption: 'Supporting local — visit us today.', sizeId: 'ig-square' }) },
      { name: 'Nepal Budget / Policy Update', data: base({ layout: 'stat', color: '#1a63c9', font: "'Poppins',sans-serif", statNumber: '₹', statLabel: 'BUDGET HIGHLIGHT', statDesc: 'Key figures from the latest national budget.', sizeId: 'ig-square' }) },
      { name: 'Teacher\u2019s Day', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", align: 'center', quoteText: 'Honoring the teachers who shape our future.', quoteAuthor: 'Happy Teacher\u2019s Day', cornerTag: 'शिक्षक दिवस', sizeId: 'ig-square' }) },
      { name: 'Nepal Job Vacancy', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'जागिर खुल्ला', headline: 'VACANCY ANNOUNCEMENT', caption: 'Apply before the deadline — details below.', cornerTag: 'आवेदन दिनुहोस्', sizeId: 'ig-square' }) }
    ]
  },
  {
    label: 'Worldwide',
    items: [
      { name: 'Breaking News', data: base({ layout: 'dark', color: '#cf1b2b', bg: PHOTO_NEWSPAPER, kicker: 'BREAKING', headline: 'HEADLINE GOES HERE', bannerLines: 'Short supporting line one\nShort supporting line two', caption: 'Add a short descriptive caption here.', cornerTag: '', sizeId: 'ig-square' }) },
      { name: 'Feature Story', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", bg: PHOTO_NEWSPAPER, headSize: 19, kicker: 'FEATURE', headline: 'A LONGER FORM HEADLINE FOR CONTEXT', caption: 'A short body paragraph with more context for the reader.', cornerTag: 'READ MORE', sizeId: 'ig-portrait' }) },
      { name: 'Product Launch', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'NEW', headline: 'INTRODUCING SOMETHING NEW', caption: 'Available now — link in bio.', cornerTag: 'SHOP NOW', sizeId: 'ig-square' }) },
      { name: "We're Hiring", data: base({ layout: 'light', align: 'center', color: '#1a63c9', font: "'Poppins',sans-serif", kicker: 'HIRING', headline: 'JOIN OUR TEAM', caption: 'Open roles — apply through the link in our profile.', cornerTag: 'APPLY NOW', sizeId: 'ig-square' }) },
      { name: 'Event Invite', data: base({ layout: 'dark', align: 'center', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: "YOU'RE INVITED", headline: 'EVENT NAME HERE', bannerLines: 'Date · Time · Location', caption: 'RSVP through the link in bio.', cornerTag: 'SAVE THE DATE', sizeId: 'ig-portrait' }) },
      { name: 'Sale / Promo', data: base({ layout: 'dark', align: 'center', color: '#cf1b2b', font: "'Anton',sans-serif", headSize: 44, kicker: 'LIMITED TIME', headline: '30% OFF', caption: 'Ends this weekend only.', cornerTag: 'SHOP NOW', sizeId: 'ig-square' }) },
      { name: 'Weather Alert', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", bg: PHOTO_SKYLINE, kicker: 'WEATHER ALERT', headline: 'CONDITIONS UPDATE', caption: 'Stay safe — details and forecast below.', cornerTag: 'STAY INFORMED', sizeId: 'ig-square' }) },
      { name: 'Motivational Quote', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", quoteText: 'The best time to start was yesterday. The next best time is now.', quoteAuthor: 'Unknown', sizeId: 'ig-square' }) },
      { name: 'Birthday Wishes', data: base({ layout: 'light', align: 'center', color: '#f5a0c8', font: "'Poppins',sans-serif", kicker: 'HAPPY BIRTHDAY', headline: 'WISHING YOU THE BEST', caption: 'Hope your day is as wonderful as you are.', sizeId: 'ig-square' }) },
      { name: 'Anniversary', data: base({ layout: 'light', align: 'center', color: '#8a2be2', font: "'Playfair Display',serif", kicker: 'ANNIVERSARY', headline: 'CELEBRATING YEARS TOGETHER', caption: 'Grateful for every moment.', sizeId: 'ig-square' }) },
      { name: 'World Cup Match Day', data: base({ layout: 'stat', color: '#0f8a4b', font: "'Poppins',sans-serif", statNumber: 'VS', statLabel: 'MATCH DAY', statDesc: 'Kickoff time and where to watch.', sizeId: 'ig-story' }) },
      { name: 'New Year (Global)', data: base({ layout: 'dark', align: 'center', color: '#e8b93f', font: "'Anton',sans-serif", headSize: 44, kicker: 'HAPPY NEW YEAR', headline: '2027', caption: 'Wishing you a bright year ahead.', sizeId: 'ig-square' }) },
      { name: 'Webinar / Workshop', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'FREE WEBINAR', headline: 'TOPIC TITLE HERE', caption: 'Register through the link in bio.', cornerTag: 'REGISTER NOW', sizeId: 'ig-portrait' }) },
      { name: 'Recipe / Food Feature', data: base({ layout: 'light', color: '#f8c498', font: "'Poppins',sans-serif", bg: PHOTO_NEWSPAPER, kicker: 'RECIPE', headline: 'DISH NAME HERE', caption: 'Full recipe and steps in the caption below.', sizeId: 'ig-portrait' }) },
      { name: 'Weekly Roundup', data: base({ layout: 'light', color: '#1a63c9', font: "'Oswald',sans-serif", kicker: 'THIS WEEK', headline: 'TOP STORIES OF THE WEEK', caption: 'A quick recap of what mattered.', sizeId: 'ig-portrait' }) },
      { name: 'Poll / Ask the Audience', data: base({ layout: 'dark', align: 'center', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'POLL', headline: 'WHAT DO YOU THINK?', caption: 'Vote in the poll — link in bio.', sizeId: 'ig-square' }) },
      { name: 'Milestone Celebration', data: base({ layout: 'stat', color: '#e8b93f', font: "'Poppins',sans-serif", statNumber: '10K', statLabel: 'MILESTONE REACHED', statDesc: 'Thank you for being part of this journey.', sizeId: 'ig-square' }) },
      { name: 'Behind the Scenes', data: base({ layout: 'light', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'BEHIND THE SCENES', headline: 'HOW WE MADE IT', caption: 'A look at the process.', sizeId: 'ig-portrait' }) },
      { name: 'Customer Testimonial', data: base({ layout: 'quote', color: '#0f8a4b', font: "'Playfair Display',serif", quoteText: 'This exceeded every expectation I had.', quoteAuthor: 'Customer Name', sizeId: 'ig-square' }) },
      { name: 'Deadline Reminder', data: base({ layout: 'dark', align: 'center', color: '#9c3b3b', font: "'Anton',sans-serif", headSize: 38, kicker: 'LAST CHANCE', headline: 'DEADLINE TODAY', caption: 'Don\u2019t miss out — act now.', cornerTag: 'ACT NOW', sizeId: 'ig-square' }) },
      { name: 'FAQ / Did You Know', data: base({ layout: 'light', color: '#1a63c9', font: "'Poppins',sans-serif", kicker: 'DID YOU KNOW?', headline: 'INTERESTING FACT HERE', caption: 'A quick, shareable fact.', sizeId: 'ig-square' }) },
      { name: 'Press Release', data: base({ layout: 'dark', color: '#1a63c9', font: "'Oswald',sans-serif", bg: PHOTO_NEWSPAPER, kicker: 'PRESS RELEASE', headline: 'HEADLINE GOES HERE', caption: 'Official statement and details below.', cornerTag: 'READ MORE', sizeId: 'ig-square' }) },
      { name: 'Award / Recognition', data: base({ layout: 'quote', color: '#e8b93f', font: "'Playfair Display',serif", quoteText: 'Recognized for outstanding achievement.', quoteAuthor: 'Award Name, Year', sizeId: 'ig-square' }) },
      { name: 'Volunteer Call-Out', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'VOLUNTEERS NEEDED', headline: 'JOIN US THIS WEEKEND', caption: 'Sign up through the link in bio.', cornerTag: 'SIGN UP', sizeId: 'ig-square' }) },
      { name: 'Graduation', data: base({ layout: 'light', align: 'center', color: '#1a63c9', font: "'Playfair Display',serif", kicker: 'GRADUATION', headline: 'CLASS OF THE YEAR', caption: 'Congratulations on this milestone.', sizeId: 'ig-square' }) },
      { name: 'Retirement', data: base({ layout: 'quote', color: '#8f6c30', font: "'Playfair Display',serif", quoteText: 'Thank you for the years of dedication and hard work.', quoteAuthor: 'Happy Retirement', sizeId: 'ig-square' }) },
      { name: 'Grand Opening', data: base({ layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", kicker: 'GRAND OPENING', headline: 'WE ARE NOW OPEN', caption: 'Come visit us — details below.', cornerTag: 'VISIT US', sizeId: 'ig-square' }) },
      { name: 'Podcast Episode', data: base({ layout: 'dark', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'NEW EPISODE', headline: 'EPISODE TITLE HERE', bannerLines: 'Out now on all platforms', caption: 'Listen wherever you get your podcasts.', sizeId: 'ig-square' }) },
      { name: 'Book Launch', data: base({ layout: 'light', color: '#1a63c9', font: "'Playfair Display',serif", kicker: 'NEW RELEASE', headline: 'BOOK TITLE HERE', caption: 'Available now — link in bio.', cornerTag: 'GET YOUR COPY', sizeId: 'ig-portrait' }) },
      { name: 'Charity Fundraiser', data: base({ layout: 'stat', color: '#9c3b3b', font: "'Poppins',sans-serif", statNumber: '$0', statLabel: 'RAISED SO FAR', statDesc: 'Every contribution helps — link in bio to donate.', sizeId: 'ig-square' }) },
      { name: 'Concert / Music Event', data: base({ layout: 'dark', align: 'center', color: '#8a2be2', font: "'Poppins',sans-serif", kicker: 'LIVE MUSIC', headline: 'ARTIST / BAND NAME', bannerLines: 'Date · Venue · Time', caption: 'Tickets available now.', cornerTag: 'GET TICKETS', sizeId: 'ig-portrait' }) },
      { name: 'Public Health Advisory', data: base({ layout: 'dark', color: '#3e6259', font: "'Oswald',sans-serif", kicker: 'HEALTH ADVISORY', headline: 'IMPORTANT UPDATE', caption: 'Details and guidance from health officials below.', cornerTag: 'STAY SAFE', sizeId: 'ig-square' }) }
    ]
  }
];

export default function Templates() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS
      .map(g => ({ ...g, items: g.items.filter(it => it.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [query]);

  const totalCount = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const shownCount = filteredGroups.reduce((n, g) => n + g.items.length, 0);

  function usePreset(item) {
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(item.data));
    router.push('/editor');
  }

  return (
    <Layout>
      <Eyebrow>Template Library</Eyebrow>
      <h1 className="page-title">Templates</h1>
      <p className="page-sub">Click a template to load it straight into the Editor, then customize freely. Nepal-specific occasions and worldwide formats, side by side.</p>

      <div className="field" style={{ maxWidth: 360, marginBottom: 24 }}>
        <label htmlFor="template-search">Search templates</label>
        <input id="template-search" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. birthday, breaking, dashain..." />
        {query && <p className="spec-tag" style={{ marginTop: 6 }}>{shownCount} of {totalCount} templates match</p>}
      </div>

      {filteredGroups.length === 0 && (
        <p style={{ color: 'var(--rule-light)' }}>No templates match &ldquo;{query}&rdquo;.</p>
      )}

      {filteredGroups.map(group => (
        <div key={group.label} style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--brass)', marginBottom: 14 }}>{group.label}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 18 }}>
            {group.items.map(item => {
              const size = findSize(item.data.sizeId);
              // Same clamp math CardCanvas uses internally, then scaled down —
              // previously these two used different formulas, which is why
              // thumbnails overflowed their boxes.
              const { w: fullW, h: fullH } = getDisplayDims(size.w, size.h);
              const scale = 0.4;
              return (
                <div key={item.name} className="card-panel" style={{ cursor: 'pointer', padding: 12 }} onClick={() => usePreset(item)}>
                  <div style={{ width: fullW * scale, height: fullH * scale, overflow: 'hidden', marginBottom: 8, borderRadius: 2 }}>
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                      <CardCanvas data={{ ...item.data, ratioW: size.w, ratioH: size.h }} />
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, margin: '0 0 2px 0' }}>{item.name}</h3>
                  <p className="spec-tag">{size.w}×{size.h}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Layout>
  );
}
