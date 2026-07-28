import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import DropZone from '../components/DropZone';
import useToast from '../components/useToast';
import { readKits, saveKits, getActiveKitId, setActiveKitId, newKitId } from '../lib/brandKits';

export default function Brand() {
  const [kits, setKits] = useState([]);
  const [activeId, setActiveId] = useState('');
  const { toast, ToastEl } = useToast();

  useEffect(() => {
    setKits(readKits());
    setActiveId(getActiveKitId());
  }, []);

  function persist(nextKits, nextActive) {
    setKits(nextKits);
    saveKits(nextKits);
    if (nextActive !== undefined) {
      setActiveId(nextActive);
      setActiveKitId(nextActive);
    }
  }

  function addKit() {
    const kit = { id: newKitId(), name: `Brand ${kits.length + 1}`, logo: '' };
    const next = [...kits, kit];
    persist(next, kits.length === 0 ? kit.id : activeId);
    toast('New brand kit added');
  }

  function updateKit(id, patch) {
    persist(kits.map(k => k.id === id ? { ...k, ...patch } : k));
  }

  function deleteKit(id) {
    const next = kits.filter(k => k.id !== id);
    const nextActive = activeId === id ? (next[0]?.id || '') : activeId;
    persist(next, nextActive);
    toast('Brand kit deleted');
  }

  function onLogoUpload(id, file) {
    const reader = new FileReader();
    reader.onload = ev => updateKit(id, { logo: ev.target.result });
    reader.readAsDataURL(file);
  }

  return (
    <Layout>
      <Eyebrow>Brand Registry</Eyebrow>
      <h1 className="page-title">Brand Kit</h1>
      <p className="page-sub">Set up multiple brand kits — one per client, publication, or campaign — and switch between them. Saved locally in this browser, nothing is uploaded anywhere. The active kit's logo is what appears in the sidebar and, if enabled, on your exported cards.</p>

      <button className="btn" style={{ marginBottom: 20 }} onClick={addKit}>+ New brand kit</button>

      {kits.length === 0 && <p style={{ color: 'var(--rule-light)' }}>No brand kits yet — add one above.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {kits.map(kit => (
          <div key={kit.id} className="card-panel" style={{ border: activeId === kit.id ? '1px solid var(--brass)' : '1px solid var(--rule)' }}>
            <div className="field">
              <label>Logo</label>
              {kit.logo && <img src={kit.logo} alt="logo preview" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block', border: '1px solid var(--rule)' }} />}
              <DropZone label="" accept="image/*" onFile={file => onLogoUpload(kit.id, file)} hint="Drag & drop a logo, or click to choose" />
            </div>
            <div className="field">
              <label>Kit name</label>
              <input type="text" value={kit.name} onChange={e => updateKit(kit.id, { name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className={`btn ${activeId === kit.id ? '' : 'secondary'}`}
                onClick={() => persist(kits, kit.id)}
              >
                {activeId === kit.id ? 'Active' : 'Set active'}
              </button>
              <button className="btn secondary" onClick={() => deleteKit(kit.id)} style={{ color: 'var(--proof-red)' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {ToastEl}
    </Layout>
  );
}
