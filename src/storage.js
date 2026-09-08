// storage.js — localStorage persistence with safe defaults & corruption recovery
const STORAGE_KEY = 'skypuff_save_v1';

const DEFAULT_SAVE = Object.freeze({
  bestHeight: 0,
  totalStars: 0,
  perfectsBest: 0,
  unlockedSkins: ['classic'],
  selectedSkin: 'classic',
  tutorialSeen: false,
  sfxOn: true,
  musicOn: true,
});

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function sanitize(raw) {
  const out = { ...DEFAULT_SAVE };
  if (!raw || typeof raw !== 'object') return out;

  if (isFiniteNumber(raw.bestHeight) && raw.bestHeight >= 0) out.bestHeight = raw.bestHeight;
  if (isFiniteNumber(raw.totalStars) && raw.totalStars >= 0) out.totalStars = Math.floor(raw.totalStars);
  if (isFiniteNumber(raw.perfectsBest) && raw.perfectsBest >= 0) out.perfectsBest = Math.floor(raw.perfectsBest);
  if (Array.isArray(raw.unlockedSkins) && raw.unlockedSkins.every((s) => typeof s === 'string')) {
    out.unlockedSkins = Array.from(new Set(['classic', ...raw.unlockedSkins]));
  }
  if (typeof raw.selectedSkin === 'string') out.selectedSkin = raw.selectedSkin;
  if (typeof raw.tutorialSeen === 'boolean') out.tutorialSeen = raw.tutorialSeen;
  if (typeof raw.sfxOn === 'boolean') out.sfxOn = raw.sfxOn;
  if (typeof raw.musicOn === 'boolean') out.musicOn = raw.musicOn;

  if (!out.unlockedSkins.includes(out.selectedSkin)) out.selectedSkin = 'classic';
  return out;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return sanitize(parsed);
  } catch (err) {
    // Corrupted or inaccessible storage — recover safely with defaults.
    console.warn('SkyPuff: save data was corrupted, resetting to defaults.', err);
    return { ...DEFAULT_SAVE };
  }
}

export function saveSave(data) {
  try {
    const clean = sanitize(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  } catch (err) {
    console.warn('SkyPuff: unable to persist save data.', err);
    return sanitize(data);
  }
}

export { DEFAULT_SAVE };
