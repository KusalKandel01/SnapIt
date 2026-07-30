import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import DropZone from '../components/DropZone';
import useToast from '../components/useToast';
import { addMedia, listMedia, deleteMedia, isIndexedDBAvailable } from '../lib/mediaLibrary';

export default function Media() {
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(true);
  const { toast, ToastEl } = useToast();

  async function refresh() {
    try { setItems(await listMedia()); } catch (e) { toast('Could not load your media library'); }
  }

  useEffect(() => {
    setAvailable(isIndexedDBAvailable());
    if (isIndexedDBAvailable()) refresh();
  }, []);

  function onUpload(file) {
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        await addMedia({ name: file.name, dataUrl: ev.target.result });
        toast('Added to your library');
        refresh();
      } catch (e) {
        toast('Could not save that file — it may be too large');
      }
    };
    reader.readAsDataURL(file);
  }

  async function onDelete(id) {
    if (!confirm('Remove this from your media library? This can\u2019t be undone.')) return;
    await deleteMedia(id);
    toast('Removed from library');
    refresh();
  }

  function copyDataUrl(dataUrl) {
    navigator.clipboard?.writeText(dataUrl).then(() => toast('Copied — paste into the Editor\u2019s image URL field'));
  }

  if (!available) {
    return (
      <Layout>
        <Eyebrow>Asset Vault</Eyebrow>
        <h1 className="page-title">Media Library</h1>
        <p className="page-sub">Your browser doesn't support IndexedDB, so the media library can't run here. Everything else in the app still works — you can still upload photos directly in the Editor, they just won't be saved to a reusable library.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Eyebrow>Asset Vault</Eyebrow>
      <h1 className="page-title">Media Library</h1>
      <p className="page-sub">Upload photos once, reuse them across every project. Stored in this browser (IndexedDB, not the 5-10MB localStorage ceiling other features use) — nothing is uploaded anywhere.</p>

      <div style={{ maxWidth: 420, marginBottom: 24 }}>
        <DropZone label="Add to library" accept="image/*" onFile={onUpload} hint="Drag & drop a photo, or click to choose" />
      </div>

      {items.length === 0 && <p style={{ color: 'var(--rule-light)' }}>No media yet — add your first photo above.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
        {items.map(item => (
          <div key={item.id} className="card-panel" style={{ padding: 8 }}>
            <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 4, marginBottom: 6, display: 'block' }} />
            <p className="spec-tag" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{item.name}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <button className="btn secondary" style={{ fontSize: 10, padding: '5px 4px' }} onClick={() => copyDataUrl(item.dataUrl)}>Copy</button>
              <button className="btn secondary" style={{ fontSize: 10, padding: '5px 4px', color: 'var(--proof-red)' }} onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {ToastEl}
    </Layout>
  );
}
