import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings } from '@/types'

const defaultSettings: AppSettings = {
  vaultPath: '',
  theme: 'dark',
  fontSize: 16,
  showLineNumbers: false,
  spellcheck: true,
  autoSave: true,
  autoSaveDelay: 0,
}

export const useSettingsStore = defineStore('settings', () => {
  // Load from localStorage if available
  const stored = localStorage.getItem('flownotes-settings')
  const initial = stored ? JSON.parse(stored) : defaultSettings

  // State
  const settings = ref<AppSettings>(initial)

  // Watch for changes and persist
  watch(settings, (newSettings) => {
    localStorage.setItem('flownotes-settings', JSON.stringify(newSettings))
  }, { deep: true })

  // Actions
  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    settings.value[key] = value
  }

  function resetSettings() {
    // Preserve vaultPath when resetting other settings
    const currentVaultPath = settings.value.vaultPath
    settings.value = { ...defaultSettings, vaultPath: currentVaultPath }
  }

  async function selectVaultPath() {
    // In Tauri, this would open a folder picker dialog
    // For now, we'll simulate it
    console.log('Would open folder picker dialog')
  }

  return {
    settings,
    updateSetting,
    resetSettings,
    selectVaultPath,
  }
})
