// A "project" here is a full snapshot of the Editor's `data` object, saved
// under a name the user picks — distinct from useAutosave's continuous
// draft (which only tracks the CURRENT card) and version history (which
// only tracks that one project's past states).
//
// Cloud sync design: every function here stays SYNCHRONOUS and keeps
// localStorage as the immediate source of truth — the UI never waits on
// a network round-trip to render your projects. When signed in and cloud
// sync is configured, each mutation ALSO fires a best-effort async write to
// Supabase in the background. If that fails (offline, not signed in, cloud
// not configured), localStorage already has the change — nothing is lost,
// nothing blocks. `syncFromCloud()` pulls the cloud state down on sign-in
// so a second device picks up what the first one saved.

import { supabase, isCloudConfigured } from './supabaseClient';

const KEY = 'snapstudio:projects';

export function readProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

function writeProjects(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

async function cloudUpsert(project) {
  if (!isCloudConfigured()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('projects').upsert({
      id: project.id,
      user_id: user.id,
      name: project.name,
      data: project.data,
      tags: project.tags || [],
      scheduled_date: project.scheduledDate,
      archived: !!project.archived
    });
  } catch (e) { /* best-effort — localStorage already has it */ }
}

async function cloudDelete(ids) {
  if (!isCloudConfigured()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('projects').delete().in('id', ids).eq('user_id', user.id);
  } catch (e) { /* best-effort */ }
}

// Pulls every project the signed-in user owns down from Supabase and
// merges into localStorage — cloud version wins on conflict (simple
// last-write-wins by updatedAt), matching entries are left alone.
export async function syncFromCloud() {
  if (!isCloudConfigured()) return { synced: 0 };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { synced: 0 };
    const { data: rows, error } = await supabase.from('projects').select('*').eq('user_id', user.id);
    if (error || !rows) return { synced: 0, error: error?.message };

    const local = readProjects();
    const localById = new Map(local.map(p => [p.id, p]));

    rows.forEach(row => {
      const remoteUpdatedAt = new Date(row.updated_at).getTime();
      const existing = localById.get(row.id);
      if (!existing || remoteUpdatedAt > existing.updatedAt) {
        localById.set(row.id, {
          id: row.id, name: row.name, data: row.data, tags: row.tags || [],
          scheduledDate: row.scheduled_date, archived: row.archived,
          createdAt: new Date(row.created_at).getTime(), updatedAt: remoteUpdatedAt
        });
      }
    });

    writeProjects([...localById.values()]);
    return { synced: rows.length };
  } catch (e) {
    return { synced: 0, error: String(e) };
  }
}

export function saveProject({ id, name, data, tags = [], scheduledDate = null, archived = false }) {
  const list = readProjects();
  const now = Date.now();
  const existingIdx = id ? list.findIndex(p => p.id === id) : -1;
  let project;

  if (existingIdx >= 0) {
    project = { ...list[existingIdx], name, data, tags, scheduledDate, archived, updatedAt: now };
    list[existingIdx] = project;
  } else {
    project = {
      id: `project-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name, data, tags, scheduledDate, archived,
      createdAt: now, updatedAt: now
    };
    list.push(project);
  }
  writeProjects(list);
  cloudUpsert(project);
  return project;
}

export function deleteProject(id) {
  writeProjects(readProjects().filter(p => p.id !== id));
  cloudDelete([id]);
}

export function duplicateProject(id) {
  const list = readProjects();
  const src = list.find(p => p.id === id);
  if (!src) return null;
  const now = Date.now();
  const copy = { ...src, id: `project-${now}-${Math.random().toString(36).slice(2, 7)}`, name: `${src.name} (copy)`, createdAt: now, updatedAt: now };
  list.push(copy);
  writeProjects(list);
  cloudUpsert(copy);
  return copy;
}

export function setArchived(id, archived) {
  const list = readProjects();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx].archived = archived;
  list[idx].updatedAt = Date.now();
  writeProjects(list);
  cloudUpsert(list[idx]);
}

export function bulkSetArchived(ids, archived) {
  const idSet = new Set(ids);
  const now = Date.now();
  const list = readProjects().map(p => idSet.has(p.id) ? { ...p, archived, updatedAt: now } : p);
  writeProjects(list);
  list.filter(p => idSet.has(p.id)).forEach(cloudUpsert);
}

export function bulkDelete(ids) {
  const idSet = new Set(ids);
  writeProjects(readProjects().filter(p => !idSet.has(p.id)));
  cloudDelete(ids);
}

export function setSchedule(id, scheduledDate) {
  const list = readProjects();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx].scheduledDate = scheduledDate;
  list[idx].updatedAt = Date.now();
  writeProjects(list);
  cloudUpsert(list[idx]);
}

export function getRecentProjects(n = 5) {
  return readProjects()
    .filter(p => !p.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, n);
}
