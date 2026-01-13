<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen, Plus, FileText } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useFilesStore } from '@/stores/files'
import { useRouter } from 'vue-router'

const settingsStore = useSettingsStore()
const filesStore = useFilesStore()
const router = useRouter()

const isLoading = ref(false)
const error = ref<string | null>(null)

async function openVault() {
  isLoading.value = true
  error.value = null

  try {
    // Use Tauri dialog to pick folder
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Vault Folder',
    })

    if (selected && typeof selected === 'string') {
      settingsStore.updateSetting('vaultPath', selected)
      filesStore.vaultConfig.path = selected
      await filesStore.initVault()
      router.push('/inbox')
    }
  } catch (e) {
    // Fallback for web dev mode
    const path = prompt('Enter vault path (e.g., /Users/you/vault):')
    if (path) {
      settingsStore.updateSetting('vaultPath', path)
      filesStore.vaultConfig.path = path
      await filesStore.initVault()
      router.push('/inbox')
    }
  } finally {
    isLoading.value = false
  }
}

async function createVault() {
  isLoading.value = true
  error.value = null

  try {
    // Use Tauri dialog to pick folder for new vault
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Folder for New Vault',
    })

    if (selected && typeof selected === 'string') {
      await createVaultStructure(selected)
      settingsStore.updateSetting('vaultPath', selected)
      filesStore.vaultConfig.path = selected
      await filesStore.initVault()
      router.push('/inbox')
    }
  } catch (e) {
    // Fallback for web dev mode
    const path = prompt('Enter path for new vault (e.g., /Users/you/my-vault):')
    if (path) {
      await createVaultStructure(path)
      settingsStore.updateSetting('vaultPath', path)
      filesStore.vaultConfig.path = path
      await filesStore.initVault()
      router.push('/inbox')
    }
  } finally {
    isLoading.value = false
  }
}

async function createVaultStructure(basePath: string) {
  try {
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs')
    
    const folders = [
      '00 - Inbox',
      '01 - Projects',
      '02 - Tasks/Next Actions',
      '02 - Tasks/Waiting For',
      '02 - Tasks/Someday Maybe',
      '03 - Notes',
      '04 - Daily',
      '05 - Areas',
      '06 - Templates',
      'Archive',
    ]

    for (const folder of folders) {
      await mkdir(`${basePath}/${folder}`, { recursive: true })
    }

    // Create README
    await writeTextFile(`${basePath}/README.md`, `# My Vault

Welcome to your new FlowNotes vault!

## Folder Structure

- **00 - Inbox** — Quick capture, unprocessed items
- **01 - Projects** — Active projects
- **02 - Tasks** — Tasks organized by status
- **03 - Notes** — Your knowledge base
- **04 - Daily** — Daily notes
- **05 - Areas** — Areas of life
- **06 - Templates** — Note templates
- **Archive** — Completed items
`)

    // Create area files
    const areas = ['Work', 'Health', 'Learning', 'Home']
    for (const area of areas) {
      await writeTextFile(`${basePath}/05 - Areas/${area}.md`, `---
type: area
created: ${new Date().toISOString().split('T')[0]}
---

# ${area}

## Description

## Goals
`)
    }
  } catch (e) {
    console.log('Could not create vault structure via Tauri, using mock mode')
  }
}

async function useDemoMode() {
  settingsStore.updateSetting('vaultPath', 'demo')
  filesStore.vaultConfig.path = 'demo'
  await filesStore.initVault()
  router.push('/inbox')
}
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-surface-dark">
    <div class="max-w-md w-full mx-4">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
          <FileText class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-gray-100">FlowNotes</h1>
        <p class="text-gray-500 mt-2">GTD + Zettelkasten for your local files</p>
      </div>

      <!-- Error message -->
      <div 
        v-if="error" 
        class="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm"
      >
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <button 
          class="w-full btn bg-accent hover:bg-accent-hover text-white py-4 text-lg"
          :disabled="isLoading"
          @click="openVault"
        >
          <FolderOpen class="w-5 h-5" />
          Open Existing Vault
        </button>

        <button 
          class="w-full btn-secondary py-4 text-lg"
          :disabled="isLoading"
          @click="createVault"
        >
          <Plus class="w-5 h-5" />
          Create New Vault
        </button>

        <div class="relative py-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-border"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="px-4 bg-surface-dark text-gray-500 text-sm">or</span>
          </div>
        </div>

        <button 
          class="w-full btn-ghost py-3 text-gray-400"
          @click="useDemoMode"
        >
          Try Demo Mode
        </button>
      </div>

      <!-- Info -->
      <p class="text-center text-xs text-gray-600 mt-8">
        FlowNotes works with local markdown files.<br>
        Your data stays on your computer.
      </p>
    </div>
  </div>
</template>
