import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import DropZone from '../components/DropZone';
import useToast from '../components/useToast';

export default function Brand() {
  const [brand, setBrand] = useState({ logo: '', name: 'Snap Studio' });
  const { toast, ToastEl } = useToast();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('snapstudio:brand') || '{}');
      setBrand(b => ({ ...b, ...saved }));
    } catch (e) {}
  }, []);

  function onLogoUpload(file) {
    const reader = new FileReader();
    reader.onload = ev => setBrand(b => ({ ...b, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function save() {
    localStorage.setItem('snapstudio:brand', JSON.stringify(brand));
    toast('Brand kit saved — visible in the sidebar and on your cards now');
  }

  return (
    <Layout>
      <h1 className="page-title">Brand Kit</h1>
      <p className="page-sub">Import your logo and set your brand name. Saved locally in this browser — nothing is uploaded anywhere. Once saved, enable &ldquo;Show logo on card&rdquo; in the Editor's Canvas section to have it appear on your exports.</p>

      <div className="card-panel" style={{ maxWidth: 460 }}>
        <div className="field">
          <label>Logo</label>
          {brand.logo && <img src={brand.logo} alt="logo preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block', border: '1px solid var(--rule)' }} />}
          <DropZone label="" accept="image/*" onFile={onLogoUpload} hint="Drag & drop your logo here, or click to choose" />
        </div>
        <div className="field">
          <label htmlFor="brand-name">Brand name</label>
          <input id="brand-name" type="text" value={brand.name} onChange={e => setBrand(b => ({ ...b, name: e.target.value }))} />
        </div>
        <button className="btn" onClick={save}>Save brand kit</button>
      </div>
      {ToastEl}
    </Layout>
  );
}
