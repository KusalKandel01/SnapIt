// A "project" here is a full snapshot of the Editor's `data` object, saved
// under a name the user picks — distinct from useAutosave's continuous
// draft (which only tracks the CURRENT card) and version history (which
// only tracks that one project's past states). This is what makes "Monday
// news card" and "Dashain post" two separate, independently resumable
// things instead of one draft overwriting the other.

const KEY = 'snapstudio:projects';

export function readProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

function writeProjects(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

export function saveProject({ id, name, data, tags = [], scheduledDate = null, archived = false }) {
  const list = readProjects();
  const now = Date.now();
  const existingIdx = id ? list.findIndex(p => p.id === id) : -1;

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], name, data, tags, scheduledDate, archived, updatedAt: now };
    writeProjects(list);
    return list[existingIdx];
  }

  const project = {
    id: `project-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name, data, tags, scheduledDate, archived,
    createdAt: now, updatedAt: now
  };
  list.push(project);
  writeProjects(list);
  return project;
}

export function deleteProject(id) {
  writeProjects(readProjects().filter(p => p.id !== id));
}

export function duplicateProject(id) {
  const list = readProjects();
  const src = list.find(p => p.id === id);
  if (!src) return null;
  const now = Date.now();
  const copy = { ...src, id: `project-${now}-${Math.random().toString(36).slice(2, 7)}`, name: `${src.name} (copy)`, createdAt: now, updatedAt: now };
  list.push(copy);
  writeProjects(list);
  return copy;
}

export function setArchived(id, archived) {
  const list = readProjects();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx].archived = archived;
  list[idx].updatedAt = Date.now();
  writeProjects(list);
}

export function setSchedule(id, scheduledDate) {
  const list = readProjects();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx].scheduledDate = scheduledDate;
  list[idx].updatedAt = Date.now();
  writeProjects(list);
}

export function getRecentProjects(n = 5) {
  return readProjects()
    .filter(p => !p.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, n);
}
