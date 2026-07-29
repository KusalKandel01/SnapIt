import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import Icon from '../components/Icon';
import useToast from '../components/useToast';

const FEEDS_KEY = 'snapstudio:newsfeeds';

// Researched, not guessed: every URL here was checked against the outlet's
// own documented feed path. Where a source's exact /feed path couldn't be
// confirmed with confidence, the homepage URL is used instead and the
// API's auto-discovery finds the real feed — safer than shipping a URL
// that might quietly 404 six months from now.
const FEED_REGIONS = [
  {
    region: 'Nepal & South Asia',
    sources: [
      { label: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/feed' },
      { label: 'Kathmandu Post', url: 'https://kathmandupost.com' },
      { label: 'Setopati', url: 'https://en.setopati.com' },
      { label: 'Times of India — World', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms' },
      { label: 'Dawn (Pakistan)', url: 'https://www.dawn.com' },
      { label: 'Dhaka Tribune (Bangladesh)', url: 'https://www.dhakatribune.com' }
    ]
  },
  {
    region: 'Global Wire Services',
    sources: [
      { label: 'BBC World News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { label: 'CNN World', url: 'http://rss.cnn.com/rss/edition_world.rss' },
      { label: 'The Guardian — World', url: 'https://www.theguardian.com/world/rss' },
      { label: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' }
    ]
  },
  {
    region: 'Europe',
    sources: [
      { label: 'DW (Germany)', url: 'https://rss.dw.com/rdf/rss-en-top' },
      { label: 'France 24', url: 'https://www.france24.com/en/rss' },
      { label: 'Euronews', url: 'https://www.euronews.com/rss' }
    ]
  },
  {
    region: 'East & Southeast Asia',
    sources: [
      { label: 'South China Morning Post', url: 'https://www.scmp.com/rss/91/feed' },
      { label: 'Channel News Asia', url: 'https://www.channelnewsasia.com' },
      { label: 'NHK World (Japan)', url: 'https://www3.nhk.or.jp/nhkworld' }
    ]
  },
  {
    region: 'Middle East',
    sources: [
      { label: 'Al Arabiya', url: 'https://english.alarabiya.net' },
      { label: 'Jerusalem Post', url: 'https://www.jpost.com' }
    ]
  },
  {
    region: 'Africa',
    sources: [
      { label: 'AllAfrica', url: 'https://allafrica.com' },
      { label: 'News24 (South Africa)', url: 'https://www.news24.com' },
      { label: 'Africanews', url: 'https://www.africanews.com' }
    ]
  },
  {
    region: 'Americas & Oceania',
    sources: [
      { label: 'ABC News (Australia)', url: 'https://www.abc.net.au/news' },
      { label: 'CBC (Canada)', url: 'https://www.cbc.ca/webfeed/rss/rss-world' },
      { label: 'MercoPress (South America)', url: 'https://en.mercopress.com' }
    ]
  }
];

function readFeeds() {
  try { return JSON.parse(localStorage.getItem(FEEDS_KEY) || '[]'); } catch (e) { return []; }
}
function saveFeeds(feeds) {
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds)); } catch (e) {}
}

function dayKey(dateStr) {
  if (!dateStr) return 'Undated';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Undated';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function News() {
  const router = useRouter();
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [brokenImages, setBrokenImages] = useState(() => new Set());
  const [showBrowser, setShowBrowser] = useState(true);
  const { toast, ToastEl } = useToast();

  useEffect(() => {
    const saved = readFeeds();
    setFeeds(saved);
    if (saved.length > 0) setShowBrowser(false);
  }, []);

  function addFeed(e) {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;
    try { new URL(newFeedUrl.trim()); } catch (err) { toast('That doesn\u2019t look like a valid URL'); return; }
    const next = [...feeds, newFeedUrl.trim()];
    setFeeds(next);
    saveFeeds(next);
    setNewFeedUrl('');
  }

  function removeFeed(url) {
    const next = feeds.filter(f => f !== url);
    setFeeds(next);
    saveFeeds(next);
  }

  async function fetchDigest(feedList) {
    const list = feedList || feeds;
    if (list.length === 0) { toast('Add at least one RSS feed URL first'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/news?feeds=${encodeURIComponent(list.join(','))}`);
      const json = await res.json();
      setItems(json.items || []);
      setErrors(json.errors || []);

      // The API auto-detects real feed URLs when a homepage was pasted instead.
      // Quietly upgrade the saved list to the resolved URL so future refreshes
      // skip the discovery step and go straight to the fast path.
      if (json.resolved?.length) {
        const next = list.map(f => {
          const hit = json.resolved.find(r => r.requested === f);
          return hit ? hit.actual : f;
        });
        setFeeds(next);
        saveFeeds(next);
      }

      if (json.errors?.length) toast(`${json.errors.length} feed(s) failed to load`);
      else toast(`${json.items?.length || 0} headlines loaded`);
    } catch (err) {
      toast('Could not load the digest — check your connection');
    }
    setLoading(false);
  }

  function addSuggested(urls) {
    const list = Array.isArray(urls) ? urls : [urls];
    const fresh = list.filter(u => !feeds.includes(u));
    if (fresh.length === 0) { toast('Already in your sources'); return; }
    const next = [...feeds, ...fresh];
    setFeeds(next);
    saveFeeds(next);
    fetchDigest(next);
  }

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const key = dayKey(item.pubDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  function startPost(item) {
    // Pre-fills the Editor with the headline as a starting point and the
    // source credited in the caption + corner tag — this is the whole
    // point: fast start, attribution intact, not a rewritten disguise.
    // When the feed included a real image, it becomes the card background
    // directly — the card lands in the Editor fully built, image and all,
    // ready to pick a platform size and export, not just text.
    const preset = {
      layout: 'dark',
      kicker: 'NEWS',
      headline: item.title,
      caption: `${item.description ? item.description + ' ' : ''}Via ${item.source}.`,
      cornerTag: `SOURCE: ${item.source.toUpperCase()}`,
      watermark: item.source,
      ...(item.image ? { mediaType: 'image', bg: `/api/image-proxy?url=${encodeURIComponent(item.image)}` } : {})
    };
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(preset));
    sessionStorage.setItem('snapstudio:newsSourceLink', item.link || '');
    router.push('/editor');
  }

  return (
    <Layout>
      <Eyebrow>Wire Room</Eyebrow>
      <h1 className="page-title">News Digest</h1>
      <p className="page-sub">
        Pulls real headlines from RSS feeds you choose — publishers expose RSS specifically for this kind of use, unlike scraping a site's rendered pages.
        Every headline keeps its source. Starting a post from one pre-fills the Editor with credit built in — write your own take, don't disguise theirs as yours.
      </p>

      <div className="card-panel" style={{ maxWidth: 560, marginBottom: 24 }}>
        <div className="field">
          <label htmlFor="feed-url">Add a source</label>
          <form onSubmit={addFeed} style={{ display: 'flex', gap: 6 }}>
            <input id="feed-url" type="text" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="https://example.com or its /feed URL" />
            <button className="btn secondary" type="submit">Add</button>
          </form>
          <p style={{ fontSize: 11, color: 'var(--rule-light)', margin: '6px 0 0 0' }}>
            Paste a site's homepage and we'll look for its real feed automatically — no need to hunt down the exact <code>/feed</code> or <code>/rss</code> URL yourself.
          </p>
        </div>
        <div className="field">
          <button
            type="button"
            onClick={() => setShowBrowser(v => !v)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--rule-light)', fontWeight: 500, cursor: 'pointer' }}>Browse sources by region {feeds.length > 0 && <span style={{ color: 'var(--rule-light)', fontWeight: 400, textTransform: 'none' }}>({feeds.length} added)</span>}</span>
            <span style={{ color: 'var(--brass)', fontSize: 13 }}>{showBrowser ? '▾' : '▸'}</span>
          </button>
          {showBrowser && (
            <>
              <p style={{ fontSize: 11, color: 'var(--rule-light)', margin: '8px 0 8px 0' }}>
                A researched starting set — mixed wire services and regional outlets, so headlines aren't coming from just one place or one part of the world.
              </p>
              {FEED_REGIONS.map(group => {
                const remaining = group.sources.filter(s => !feeds.includes(s.url));
                return (
                  <div key={group.region} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--brass)' }}>{group.region}</span>
                      {remaining.length > 1 && (
                        <button type="button" onClick={() => addSuggested(remaining.map(s => s.url))} style={{ background: 'none', border: 'none', color: 'var(--brass)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>
                          + add all ({remaining.length})
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.sources.map(s => {
                        const added = feeds.includes(s.url);
                        return (
                          <button
                            key={s.url}
                            type="button"
                            className="btn secondary"
                            disabled={added}
                            style={{ fontSize: 11.5, padding: '6px 10px', opacity: added ? 0.5 : 1 }}
                            onClick={() => addSuggested(s.url)}
                          >
                            {added ? '✓ ' : '+ '}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        {feeds.length > 0 && (
          <div className="field">
            <label>Your sources ({feeds.length})</label>
            {feeds.map(f => (
              <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 11.5, color: 'var(--rule-light)' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f}</span>
                <button onClick={() => removeFeed(f)} style={{ background: 'none', border: 'none', color: 'var(--proof-red)', cursor: 'pointer', marginLeft: 8 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <button className="btn" onClick={() => fetchDigest()} disabled={loading} style={{ width: '100%' }}>{loading ? 'Loading…' : 'Refresh digest'}</button>
        {errors.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontSize: 10.5, color: 'var(--proof-red)', marginBottom: 6, wordBreak: 'break-word' }}>
                <strong>{e.feed}</strong><br />{e.error}
              </p>
            ))}
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0 && (
        <p style={{ color: 'var(--rule-light)' }}>No headlines loaded yet. Add a feed above and click "Refresh digest."</p>
      )}

      {Object.entries(grouped).map(([day, dayItems]) => (
        <div key={day} style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--brass)', marginBottom: 10 }}>{day}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {dayItems.map((item, i) => (
              <div
                key={i}
                className="card-panel"
                role="button"
                tabIndex={0}
                onClick={() => startPost(item)}
                onKeyDown={e => { if (e.key === 'Enter') startPost(item); }}
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                title="Open this headline in the Editor"
              >
                <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--ink-2)', overflow: 'hidden', flexShrink: 0 }}>
                  {item.image && !brokenImages.has(item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={() => setBrokenImages(prev => new Set(prev).add(item.image))}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="sparkle" size={18} color="var(--rule)" />
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>{item.title}</p>
                  {item.description && (
                    <p style={{ fontSize: 11.5, color: 'var(--rule-light)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                    <p className="spec-tag" style={{ margin: 0 }}>
                      {item.source}
                      {item.link && (
                        <> · <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--brass)' }} onClick={e => e.stopPropagation()}>Original</a></>
                      )}
                    </p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--brass)' }}>
                      Open in Editor →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {ToastEl}
    </Layout>
  );
}
