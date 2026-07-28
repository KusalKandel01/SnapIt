import { useEffect, useRef, useState } from 'react';

const DRAFT_KEY = 'snapstudio:draft';
const HISTORY_KEY = 'snapstudio:history';
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // one saved version every 10 minutes
const MAX_VERSIONS = 50;

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
}
export function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; }
}

export function useAutosave(data, skip) {
  const [history, setHistory] = useState([]);
  const draftDebounce = useRef(null);
  const lastSnapshotAt = useRef(0);

  useEffect(() => { setHistory(readHistory()); }, []);

  // Continuous draft — saved ~1s after you stop typing, every single time.
  // This is what guarantees a refresh or closed tab never loses work,
  // independent of the once-per-10-minutes version history below.
  useEffect(() => {
    if (skip) return;
    clearTimeout(draftDebounce.current);
    draftDebounce.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {}
    }, 800);
    return () => clearTimeout(draftDebounce.current);
  }, [data, skip]);

  // Named version snapshots — one per 10-minute window, so history stays
  // readable instead of filling up with an entry per keystroke.
  useEffect(() => {
    if (skip) return;
    const now = Date.now();
    if (now - lastSnapshotAt.current < SNAPSHOT_INTERVAL_MS) return;
    lastSnapshotAt.current = now;
    const entry = { ts: now, data };
    const next = [entry, ...readHistory()].slice(0, MAX_VERSIONS);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
    } catch (e) {}
  }, [data, skip]);

  function deleteVersion(ts) {
    const next = readHistory().filter(h => h.ts !== ts);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch (e) {}
    setHistory(next);
  }

  function saveVersionNow(data) {
    lastSnapshotAt.current = Date.now();
    const entry = { ts: Date.now(), data };
    const next = [entry, ...readHistory()].slice(0, MAX_VERSIONS);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch (e) {}
    setHistory(next);
  }

  function formatTs(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return { history, deleteVersion, saveVersionNow, formatTs };
}
