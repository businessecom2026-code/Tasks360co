import '@testing-library/jest-dom/vitest'

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  get length() { return Object.keys(storage).length; },
  key: (i: number) => Object.keys(storage)[i] ?? null,
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
let _onLine = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => _onLine,
  configurable: true,
});
(globalThis as Record<string, unknown>).__setOnLine = (v: boolean) => { _onLine = v; };
