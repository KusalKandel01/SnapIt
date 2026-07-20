const KITS_KEY = 'snapstudio:brandkits';
const ACTIVE_KEY = 'snapstudio:activeKit';
const LEGACY_KEY = 'snapstudio:brand'; // pre-Phase-6 single-kit format

function migrateLegacyIfNeeded() {
  try {
    const existing = localStorage.getItem(KITS_KEY);
    if (existing) return; // already migrated / already multi-kit
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (legacy && (legacy.logo || legacy.name)) {
      const kit = { id: 'kit-legacy', name: legacy.name || 'My Brand', logo: legacy.logo || '' };
      localStorage.setItem(KITS_KEY, JSON.stringify([kit]));
      localStorage.setItem(ACTIVE_KEY, kit.id);
    }
  } catch (e) {}
}

export function readKits() {
  migrateLegacyIfNeeded();
  try { return JSON.parse(localStorage.getItem(KITS_KEY) || '[]'); } catch (e) { return []; }
}

export function saveKits(kits) {
  try { localStorage.setItem(KITS_KEY, JSON.stringify(kits)); } catch (e) {}
}

export function getActiveKitId() {
  migrateLegacyIfNeeded();
  try { return localStorage.getItem(ACTIVE_KEY) || ''; } catch (e) { return ''; }
}

export function setActiveKitId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) {}
}

export function getActiveKit() {
  const kits = readKits();
  const activeId = getActiveKitId();
  return kits.find(k => k.id === activeId) || kits[0] || null;
}

export function newKitId() {
  return `kit-${Date.now()}`;
}
