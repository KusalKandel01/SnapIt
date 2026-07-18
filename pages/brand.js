import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
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

  function onLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBrand(b => ({ ...b, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function save() {
    localStorage.setItem('snapstudio:brand', JSON.stringify(brand));
    toast('Brand kit saved — visible in the sidebar now');
  }

  return (
    <Layout>
      <h1 className="page-title">Brand Kit</h1>
      <p className="page-sub">Import your logo and set your brand name. Saved locally in this browser — nothing is uploaded anywhere.</p>

      <div className="card-panel" style={{ maxWidth: 460 }}>
        <div className="field">
          <label>Logo</label>
          {brand.logo && <img src={brand.logo} alt="logo preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block' }} />}
          <input type="file" accept="image/*" onChange={onLogoUpload} />
        </div>
        <div className="field">
          <label>Brand name</label>
          <input type="text" value={brand.name} onChange={e => setBrand(b => ({ ...b, name: e.target.value }))} />
        </div>
        <button className="btn" onClick={save}>Save brand kit</button>
      </div>
      {ToastEl}
    </Layout>
  );
}
