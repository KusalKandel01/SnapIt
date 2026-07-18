import { useEffect, useRef, useState } from 'react';

const KEY = 'snapstudio:history';
const MAX_VERSIONS = 40;

function readHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

export function useAutosave(data, skip) {
  const [history, setHistory] = useState([]);
  const debounceRef = useRef(null);
  const lastSavedRef = useRef('');

  useEffect(() => { setHistory(readHistory()); }, []);

  useEffect(() => {
    if (skip) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const serialized = JSON.stringify(data);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;
      const entry = { ts: Date.now(), data };
      const next = [entry, ...readHistory()].slice(0, MAX_VERSIONS);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        setHistory(next);
      } catch (e) { /* storage full or blocked — silently skip, editing still works */ }
    }, 800);
    return () => clearTimeout(debounceRef.current);
  }, [data, skip]);

  function restore(ts) {
    const found = history.find(h => h.ts === ts);
    return found ? found.data : null;
  }

  function formatTs(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  return { history, restore, formatTs };
}
