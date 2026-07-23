import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { readProjects, setSchedule } from '../lib/projects';

export default function Calendar() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);

  useEffect(() => { setProjects(readProjects()); }, []);

  const grouped = useMemo(() => {
    const groups = {};
    projects.filter(p => p.scheduledDate && !p.archived).forEach(p => {
      if (!groups[p.scheduledDate]) groups[p.scheduledDate] = [];
      groups[p.scheduledDate].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [projects]);

  const today = new Date().toISOString().slice(0, 10);

  function openProject(p) {
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(p.data));
    router.push('/editor');
  }

  function clearSchedule(id) {
    setSchedule(id, null);
    setProjects(readProjects());
  }

  return (
    <Layout>
      <h1 className="page-title">Publishing Calendar</h1>
      <p className="page-sub">
        A visual list of projects you've marked with a date — a reminder system, nothing more. This app has no connection to any social platform,
        so nothing here posts automatically; it's here so "what am I posting this week" has one place to look. Set dates from the <a href="/projects" style={{ color: 'var(--brass)' }}>Projects</a> page.
      </p>

      {grouped.length === 0 && <p style={{ color: 'var(--rule-light)' }}>Nothing scheduled yet.</p>}

      {grouped.map(([date, items]) => {
        const isPast = date < today;
        const isToday = date === today;
        return (
          <div key={date} style={{ marginBottom: 22 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, marginBottom: 10,
              color: isToday ? 'var(--brass)' : isPast ? 'var(--proof-red)' : 'var(--white)'
            }}>
              {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              {isToday && ' — Today'}
              {isPast && !isToday && ' — Past due'}
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map(p => (
                <div key={p.id} className="card-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                  <span style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => openProject(p)}>{p.name}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn secondary" style={{ fontSize: 10.5 }} onClick={() => openProject(p)}>Open</button>
                    <button className="btn secondary" style={{ fontSize: 10.5 }} onClick={() => clearSchedule(p.id)}>Clear date</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Layout>
  );
}
