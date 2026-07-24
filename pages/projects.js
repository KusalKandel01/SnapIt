import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import useToast from '../components/useToast';
import { readProjects, deleteProject, duplicateProject, setArchived, setSchedule, bulkSetArchived, bulkDelete } from '../lib/projects';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Projects() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const { toast, ToastEl } = useToast();

  function refresh() { setProjects(readProjects()); }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter(p => showArchived || !p.archived)
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects, query, showArchived]);

  // Clear stale selections whenever the filter changes what's visible
  useEffect(() => { setSelected(new Set()); }, [query, showArchived]);

  function openProject(p) {
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(p.data));
    sessionStorage.setItem('snapstudio:openProjectId', p.id);
    router.push('/editor');
  }

  function onDuplicate(id) { duplicateProject(id); refresh(); toast('Project duplicated'); }
  function onDelete(id) { if (confirm('Delete this project? This can\u2019t be undone.')) { deleteProject(id); refresh(); toast('Project deleted'); } }
  function onArchive(id, archived) { setArchived(id, archived); refresh(); toast(archived ? 'Archived' : 'Restored from archive'); }
  function onScheduleChange(id, dateStr) { setSchedule(id, dateStr || null); refresh(); }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));
  }

  function bulkArchive(archived) {
    bulkSetArchived([...selected], archived);
    refresh();
    toast(`${selected.size} project(s) ${archived ? 'archived' : 'restored'}`);
    setSelected(new Set());
  }
  function bulkDeleteSelected() {
    if (!confirm(`Delete ${selected.size} project(s)? This can\u2019t be undone.`)) return;
    bulkDelete([...selected]);
    refresh();
    toast(`${selected.size} project(s) deleted`);
    setSelected(new Set());
  }

  return (
    <Layout>
      <h1 className="page-title">Projects</h1>
      <p className="page-sub">Every project you save from the Editor lives here — searchable, duplicable, and schedulable. This is a local reminder calendar (mark a date, get a visual list) — it does not auto-post anywhere.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or tag" style={{ maxWidth: 280 }} />
        <label className="checkline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--rule-light)' }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Show archived
        </label>
        {filtered.length > 0 && (
          <label className="checkline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--rule-light)', marginLeft: 'auto' }}>
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /> Select all ({filtered.length})
          </label>
        )}
      </div>

      {selected.size > 0 && (
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', border: '1px solid var(--brass)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--brass)' }}>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="btn secondary" style={{ fontSize: 11 }} onClick={() => bulkArchive(true)}>Archive</button>
            <button className="btn secondary" style={{ fontSize: 11 }} onClick={() => bulkArchive(false)}>Restore</button>
            <button className="btn secondary" style={{ fontSize: 11, color: 'var(--proof-red)' }} onClick={bulkDeleteSelected}>Delete</button>
            <button className="btn secondary" style={{ fontSize: 11 }} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {filtered.length === 0 && <p style={{ color: 'var(--rule-light)' }}>No projects yet — save one from the Editor's "Save to Projects" button.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.id} className="card-panel" style={{ opacity: p.archived ? 0.6 : 1, position: 'relative', border: selected.has(p.id) ? '1px solid var(--brass)' : '1px solid var(--rule)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ marginTop: 4 }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, margin: 0, cursor: 'pointer', flex: 1 }} onClick={() => openProject(p)}>{p.name}</h3>
            </div>
            <p className="spec-tag" style={{ marginBottom: 10, marginLeft: 24 }}>Updated {formatDate(p.updatedAt)}</p>
            <div className="field" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 9.5 }}>Schedule reminder</label>
              <input type="date" value={p.scheduledDate || ''} onChange={e => onScheduleChange(p.id, e.target.value)} style={{ fontSize: 12, padding: '6px 8px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button className="btn secondary" style={{ fontSize: 10.5 }} onClick={() => openProject(p)}>Open</button>
              <button className="btn secondary" style={{ fontSize: 10.5 }} onClick={() => onDuplicate(p.id)}>Duplicate</button>
              <button className="btn secondary" style={{ fontSize: 10.5 }} onClick={() => onArchive(p.id, !p.archived)}>{p.archived ? 'Restore' : 'Archive'}</button>
              <button className="btn secondary" style={{ fontSize: 10.5, color: 'var(--proof-red)' }} onClick={() => onDelete(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {ToastEl}
    </Layout>
  );
}
