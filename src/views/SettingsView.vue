<script setup lang="ts">
import { ref } from 'vue'
import { Settings, FolderOpen, Palette, Type, Save, RotateCcw, LogOut } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useFilesStore } from '@/stores/files'
import { useRouter } from 'vue-router'

const settingsStore = useSettingsStore()
const filesStore = useFilesStore()
const router = useRouter()

const vaultPath = ref(settingsStore.settings.vaultPath)
const theme = ref(settingsStore.settings.theme)
const fontSize = ref(settingsStore.settings.fontSize)
const autoSave = ref(settingsStore.settings.autoSave)
const spellcheck = ref(settingsStore.settings.spellcheck)

// Apply theme immediately when changed
function setTheme(newTheme: 'dark' | 'light' | 'system') {
  theme.value = newTheme
  settingsStore.updateSetting('theme', newTheme)
}

// Apply toggle settings immediately
function toggleAutoSave() {
  autoSave.value = !autoSave.value
  settingsStore.updateSetting('autoSave', autoSave.value)
}

function toggleSpellcheck() {
  spellcheck.value = !spellcheck.value
  settingsStore.updateSetting('spellcheck', spellcheck.value)
}

function updateFontSize(newSize: number) {
  fontSize.value = newSize
  settingsStore.updateSetting('fontSize', newSize)
}

async function selectVaultFolder() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Vault Folder',
    })

    if (selected && typeof selected === 'string') {
      vaultPath.value = selected
      settingsStore.updateSetting('vaultPath', selected)
      filesStore.vaultConfig.path = selected
      await filesStore.initVault()
    }
  } catch (e) {
    const path = prompt('Enter vault path:', vaultPath.value)
    if (path) {
      vaultPath.value = path
      settingsStore.updateSetting('vaultPath', path)
      filesStore.vaultConfig.path = path
      await filesStore.initVault()
    }
  }
}

function closeVault() {
  settingsStore.updateSetting('vaultPath', '')
  filesStore.files.clear()
  router.push('/')
}

function saveSettings() {
  settingsStore.updateSetting('vaultPath', vaultPath.value)
  settingsStore.updateSetting('theme', theme.value)
  settingsStore.updateSetting('fontSize', fontSize.value)
  settingsStore.updateSetting('autoSave', autoSave.value)
  settingsStore.updateSetting('spellcheck', spellcheck.value)
}

function resetSettings() {
  if (confirm('Reset all settings to default?')) {
    settingsStore.resetSettings()
    vaultPath.value = settingsStore.settings.vaultPath
    theme.value = settingsStore.settings.theme
    fontSize.value = settingsStore.settings.fontSize
    autoSave.value = settingsStore.settings.autoSave
    spellcheck.value = settingsStore.settings.spellcheck
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
          <Settings class="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-100">Settings</h1>
          <p class="text-sm text-gray-500">
            Configure FlowNotes
          </p>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl space-y-8">
        <!-- Vault section -->
        <section class="card">
          <h2 class="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <FolderOpen class="w-5 h-5 text-gray-400" />
            Vault
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">
                Vault Location
              </label>
              <div class="flex gap-2">
                <input 
                  v-model="vaultPath"
                  type="text"
                  placeholder="/path/to/vault"
                  class="input flex-1"
                  readonly
                />
                <button 
                  class="btn-secondary"
                  @click="selectVaultFolder"
                >
                  Browse
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Select the folder containing your markdown files
              </p>
            </div>

            <div class="pt-4 border-t border-border">
              <button 
                class="btn-ghost text-danger hover:bg-danger/10"
                @click="closeVault"
              >
                <LogOut class="w-4 h-4" />
                Close Vault
              </button>
              <p class="text-xs text-gray-500 mt-1">
                Close current vault and return to welcome screen
              </p>
            </div>
          </div>
        </section>

        <!-- Appearance section -->
        <section class="card">
          <h2 class="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Palette class="w-5 h-5 text-gray-400" />
            Appearance
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">
                Theme
              </label>
              <div class="flex gap-2">
                <button 
                  class="px-4 py-2 rounded-lg border transition-colors"
                  :class="theme === 'dark' ? 'border-accent bg-accent/20 text-gray-100' : 'border-border text-gray-400'"
                  @click="setTheme('dark')"
                >
                  Dark
                </button>
                <button 
                  class="px-4 py-2 rounded-lg border transition-colors"
                  :class="theme === 'light' ? 'border-accent bg-accent/20 text-gray-100' : 'border-border text-gray-400'"
                  @click="setTheme('light')"
                >
                  Light
                </button>
                <button 
                  class="px-4 py-2 rounded-lg border transition-colors"
                  :class="theme === 'system' ? 'border-accent bg-accent/20 text-gray-100' : 'border-border text-gray-400'"
                  @click="setTheme('system')"
                >
                  System
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Editor section -->
        <section class="card">
          <h2 class="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Type class="w-5 h-5 text-gray-400" />
            Editor
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">
                Font Size: {{ fontSize }}px
              </label>
              <input 
                :value="fontSize"
                type="range"
                min="12"
                max="24"
                class="w-full accent-accent"
                @input="updateFontSize(Number(($event.target as HTMLInputElement).value))"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-100">Auto Save</p>
                <p class="text-xs text-gray-500">Automatically save changes</p>
              </div>
              <button 
                class="w-12 h-6 rounded-full transition-colors"
                :class="autoSave ? 'bg-accent' : 'bg-surface-dark'"
                @click="toggleAutoSave"
              >
                <span 
                  class="block w-5 h-5 bg-white rounded-full shadow transition-transform"
                  :class="autoSave ? 'translate-x-6' : 'translate-x-0.5'"
                />
              </button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-100">Spell Check</p>
                <p class="text-xs text-gray-500">Highlight spelling errors</p>
              </div>
              <button 
                class="w-12 h-6 rounded-full transition-colors"
                :class="spellcheck ? 'bg-accent' : 'bg-surface-dark'"
                @click="toggleSpellcheck"
              >
                <span 
                  class="block w-5 h-5 bg-white rounded-full shadow transition-transform"
                  :class="spellcheck ? 'translate-x-6' : 'translate-x-0.5'"
                />
              </button>
            </div>
          </div>
        </section>

        <!-- Actions -->
        <div class="flex gap-3">
          <button 
            class="btn-primary"
            @click.stop="saveSettings"
          >
            <Save class="w-4 h-4" />
            Save Settings
          </button>
          <button 
            class="btn-secondary"
            @click.stop="resetSettings"
          >
            <RotateCcw class="w-4 h-4" />
            Reset to Default
          </button>
        </div>

        <!-- About -->
        <section class="card">
          <h2 class="text-lg font-semibold text-gray-100 mb-2">About</h2>
          <p class="text-gray-500 text-sm">
            FlowNotes v0.1.0<br>
            A GTD + Notes desktop app built with Tauri and Vue.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
