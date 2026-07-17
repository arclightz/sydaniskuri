import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

const storage = new Map<string, string>();
const memoryStorage: Storage = {
  get length() { return storage.size; },
  clear() { storage.clear(); },
  getItem(key) { return storage.get(key) ?? null; },
  key(index) { return [...storage.keys()][index] ?? null; },
  removeItem(key) { storage.delete(key); },
  setItem(key, value) { storage.set(key, String(value)); },
};

Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => cleanup());
