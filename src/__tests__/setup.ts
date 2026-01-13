// Test setup file for Vitest
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Setup Pinia for tests
beforeEach(() => {
  setActivePinia(createPinia())
})

// Global test utilities
config.global.stubs = {
  // Stub Teleport to render content in place during tests
  teleport: true,
}

// Mock Tauri API
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
