import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import useToast from '../components/useToast';

const FEEDS_KEY = 'snapstudio:newsfeeds';

// A handful of verified-working feeds so the page isn't blank on a first visit —
// mixed Nepal-focused and global, since that's this product's audience.
const SUGGESTED_FEEDS = [
  { label: 'BBC World News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { label: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/feed' },
  { label: 'Kathmandu Post', url: 'https://kathmandupost.com' },
  { label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' }
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
  const { toast, ToastEl } = useToast();

  useEffect(() => { setFeeds(readFeeds()); }, []);

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

  function addSuggested(url) {
    if (feeds.includes(url)) { toast('Already in your sources'); return; }
    const next = [...feeds, url];
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
    const preset = {
      layout: 'dark',
      kicker: 'NEWS',
      headline: item.title,
      caption: `${item.description ? item.description + ' ' : ''}Via ${item.source}.`,
      cornerTag: `SOURCE: ${item.source.toUpperCase()}`,
      watermark: item.source
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
        {feeds.length === 0 && (
          <div className="field">
            <label>Quick add</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED_FEEDS.map(s => (
                <button key={s.url} type="button" className="btn secondary" style={{ fontSize: 11.5, padding: '6px 10px' }} onClick={() => addSuggested(s.url)}>
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
          <div style={{ display: 'grid', gap: 8 }}>
            {dayItems.map((item, i) => (
              <div key={i} className="card-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, marginBottom: 3 }}>{item.title}</p>
                  <p className="spec-tag">{item.source}{item.link && <> · <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--brass)' }}>Read original</a></>}</p>
                </div>
                <button className="btn secondary" style={{ flexShrink: 0 }} onClick={() => startPost(item)}>Start a post</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {ToastEl}
    </Layout>
  );
}
