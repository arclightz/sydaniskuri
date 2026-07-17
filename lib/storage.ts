const memory = new Map<string, string>();

const serverStorage: Storage = {
  get length() { return memory.size; },
  clear() { memory.clear(); },
  getItem(key) { return memory.get(key) ?? null; },
  key(index) { return [...memory.keys()][index] ?? null; },
  removeItem(key) { memory.delete(key); },
  setItem(key, value) { memory.set(key, String(value)); },
};

export function getLocalStorage(): Storage {
  return typeof window === "undefined" ? serverStorage : window.localStorage;
}
