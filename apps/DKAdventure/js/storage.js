import { SAVE_KEY, createDefaultSave } from './constants.js';

function loadSave() {
  const defaults = createDefaultSave();

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      unlocked: Array.isArray(parsed.unlocked) ? [...parsed.unlocked] : [...defaults.unlocked],
      completed: Array.isArray(parsed.completed) ? [...parsed.completed] : [...defaults.completed],
      inventory: {
        ...defaults.inventory,
        ...(parsed.inventory ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

export function createSaveStore() {
  const data = loadSave();

  return {
    data,
    persist() {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    },
    clear() {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    },
  };
}