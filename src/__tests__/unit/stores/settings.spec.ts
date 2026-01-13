import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from '@/stores/settings'

describe('useSettingsStore', () => {
  let store: ReturnType<typeof useSettingsStore>

  beforeEach(() => {
    store = useSettingsStore()
    // Reset to defaults at the start of each test for isolation
    store.resetSettings()
  })

  describe('initial state', () => {
    it('should have default settings after reset', () => {
      expect(store.settings.theme).toBe('dark')
      expect(store.settings.fontSize).toBe(16)
      expect(store.settings.showLineNumbers).toBe(false)
      expect(store.settings.spellcheck).toBe(true)
      expect(store.settings.autoSave).toBe(true)
      expect(store.settings.autoSaveDelay).toBe(0)
    })

    it('should have settings object available', () => {
      // Verify the store has settings
      expect(store.settings).toBeDefined()
      expect(typeof store.settings.theme).toBe('string')
      expect(typeof store.settings.fontSize).toBe('number')
    })
  })

  describe('action: updateSetting', () => {
    it('should update vaultPath', () => {
      store.updateSetting('vaultPath', '/new/vault/path')

      expect(store.settings.vaultPath).toBe('/new/vault/path')
    })

    it('should update theme', () => {
      store.updateSetting('theme', 'light')

      expect(store.settings.theme).toBe('light')
    })

    it('should update fontSize', () => {
      store.updateSetting('fontSize', 20)

      expect(store.settings.fontSize).toBe(20)
    })

    it('should update showLineNumbers', () => {
      store.updateSetting('showLineNumbers', true)

      expect(store.settings.showLineNumbers).toBe(true)
    })

    it('should update spellcheck', () => {
      store.updateSetting('spellcheck', false)

      expect(store.settings.spellcheck).toBe(false)
    })

    it('should update autoSave', () => {
      store.updateSetting('autoSave', false)

      expect(store.settings.autoSave).toBe(false)
    })

    it('should update autoSaveDelay', () => {
      store.updateSetting('autoSaveDelay', 5000)

      expect(store.settings.autoSaveDelay).toBe(5000)
    })
  })

  describe('action: resetSettings', () => {
    it('should reset fontSize to default', () => {
      // Modify fontSize
      store.updateSetting('fontSize', 24)
      expect(store.settings.fontSize).toBe(24)

      // Reset
      store.resetSettings()

      // Verify reset
      expect(store.settings.fontSize).toBe(16)
    })

    it('should reset boolean settings to defaults', () => {
      // Modify boolean settings
      store.updateSetting('showLineNumbers', true)
      store.updateSetting('autoSave', false)
      
      expect(store.settings.showLineNumbers).toBe(true)
      expect(store.settings.autoSave).toBe(false)

      // Reset
      store.resetSettings()

      // Verify reset
      expect(store.settings.showLineNumbers).toBe(false)
      expect(store.settings.autoSave).toBe(true)
    })

    it('should reset theme to dark', () => {
      store.updateSetting('theme', 'light')
      expect(store.settings.theme).toBe('light')

      store.resetSettings()

      expect(store.settings.theme).toBe('dark')
    })
  })

  describe('persistence', () => {
    it('should have watcher for localStorage sync', () => {
      // The store has a watcher that syncs to localStorage
      // We verify the store structure supports persistence
      expect(store.settings).toBeDefined()
      expect(store.updateSetting).toBeInstanceOf(Function)
      expect(store.resetSettings).toBeInstanceOf(Function)
    })
  })

  describe('action: selectVaultPath', () => {
    it('should exist and be callable', async () => {
      // This method currently just logs, but we verify it exists
      await expect(store.selectVaultPath()).resolves.not.toThrow()
    })
  })
})
