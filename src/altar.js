// Digital altar: geometry, limits, and persistence. Pure ESM — no DOM —
// so bun tests cover the same math the browser runs.
//
// Coordinates are fractions of the scene: x and w are fractions of scene
// width, bottom is the fraction from the scene top to the image's bottom
// edge (images stand on the table, so bottoms rest in the table band and
// tops may rise up the wall). This survives window resizes.

export const MAX_IMAGES = 30;
export const TABLE_TOP = 0.60; // bottoms sit just below the surface line
export const TABLE_BOTTOM = 0.99;
export const MIN_W = 0.08;
export const MAX_W = 0.38;
export const MAX_H_FRAC = 0.92; // tallest an image may stand, as scene height

const SLOT_W = [0.20, 0.16, 0.23, 0.18, 0.21, 0.15];
const SLOT_TILT = [-3, 2.5, -2, 3.5, -1.5, 2];

// Deterministic default pose for the nth image: six columns, alternating
// rows so later images tuck slightly behind earlier ones.
export function defaultPose(index) {
  const col = index % 6;
  const row = Math.floor(index / 6);
  return {
    x: 0.03 + col * 0.155,
    w: SLOT_W[col],
    tilt: SLOT_TILT[col],
    bottom: row % 2 === 0 ? 0.90 : 0.84,
  };
}

// Height of an image as a fraction of scene height.
export function heightFrac(wFrac, sceneAspect, imgAspect) {
  return (wFrac * sceneAspect) / imgAspect;
}

// Keep a pose on the table: width within [MIN_W, MAX_W] and short enough
// to stand, bottom inside the table band, left edge inside the scene.
export function clampPose(pose, sceneAspect, imgAspect) {
  const wByH = (MAX_H_FRAC * imgAspect) / sceneAspect;
  const w = Math.min(MAX_W, wByH, Math.max(MIN_W, pose.w));
  const h = heightFrac(w, sceneAspect, imgAspect);
  let bottom = Math.min(TABLE_BOTTOM, Math.max(TABLE_TOP, pose.bottom));
  if (bottom - h < 0.02) bottom = Math.min(TABLE_BOTTOM, 0.02 + h);
  const x = Math.min(1 - w, Math.max(0, pose.x));
  return { x, w, tilt: pose.tilt, bottom };
}

// How many of `incoming` files fit under the 30-image limit.
export function acceptCount(current, incoming) {
  return Math.max(0, Math.min(incoming, MAX_IMAGES - current));
}

export function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- persistence: a tiny async key-value store ----

export function createMemoryStore() {
  const m = new Map();
  return {
    load: async () => [...m.values()],
    save: async (img) => { m.set(img.id, img); },
    remove: async (id) => { m.delete(id); },
    clear: async () => { m.clear(); },
  };
}

// IndexedDB store; any failure (opaque origin, private mode, blocked DB)
// silently degrades to a memory store so the app never breaks.
export function createIdbStore() {
  const fallback = createMemoryStore();
  if (typeof indexedDB === 'undefined') return fallback;
  let ready = null;
  const open = () => {
    if (ready) return ready;
    ready = new Promise((resolve) => {
      try {
        const req = indexedDB.open('altar', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('images')) {
            req.result.createObjectStore('images', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
    return ready;
  };
  const tx = async (mode, fn) => {
    const db = await open();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const t = db.transaction('images', mode);
        const store = t.objectStore('images');
        const r = fn(store);
        if (r) {
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(null);
        } else {
          t.oncomplete = () => resolve(true);
          t.onerror = () => resolve(null);
        }
      } catch { resolve(null); }
    });
  };
  return {
    load: async () => {
      const db = await open();
      if (!db) return fallback.load();
      const all = await tx('readonly', (s) => s.getAll());
      return Array.isArray(all) ? all : fallback.load();
    },
    save: async (img) => {
      const db = await open();
      if (!db) return fallback.save(img);
      await tx('readwrite', (s) => s.put(img));
    },
    remove: async (id) => {
      const db = await open();
      if (!db) return fallback.remove(id);
      await tx('readwrite', (s) => s.delete(id));
    },
    clear: async () => {
      const db = await open();
      if (!db) return fallback.clear();
      await tx('readwrite', (s) => s.clear());
    },
  };
}
