<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import EditorPanel from '@/components/layout/EditorPanel.vue'
import SearchModal from '@/components/shared/SearchModal.vue'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const route = useRoute()

// Show sidebar only when vault is open (not on welcome screen)
const showSidebar = computed(() => {
  return route.name !== 'welcome' && settingsStore.settings.vaultPath
})

// Focus backdrop when Quick Capture opens for Escape to work
watch(() => uiStore.quickCaptureOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      // Focus the input inside the modal
      const input = document.querySelector('.quick-capture-input') as HTMLInputElement
      input?.focus()
    })
  }
})

// Apply theme on mount and when settings change
function applyTheme(theme: string) {
  const root = document.documentElement
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', isDark)
    root.classList.toggle('light', !isDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
  }
}

// Watch for theme changes
watch(() => settingsStore.settings.theme, (newTheme) => {
  applyTheme(newTheme)
}, { immediate: true })

// Global keyboard shortcuts
function handleGlobalKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl + K for search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    uiStore.openSearch()
  }
  
  // Escape to close modals (check in priority order)
  if (e.key === 'Escape') {
    if (uiStore.searchOpen) {
      uiStore.closeSearch()
      e.preventDefault()
    } else if (uiStore.quickCaptureOpen) {
      uiStore.closeQuickCapture()
      e.preventDefault()
    } else if (uiStore.editorOpen) {
      uiStore.closeEditor()
      e.preventDefault()
    }
  }
}

onMounted(async () => {
  applyTheme(settingsStore.settings.theme)
  document.addEventListener('keydown', handleGlobalKeydown)
  
  // Initialize vault if path is already set (e.g., after page refresh)
  if (settingsStore.settings.vaultPath) {
    filesStore.vaultConfig.path = settingsStore.settings.vaultPath
    await filesStore.initVault()
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settingsStore.settings.theme === 'system') {
      applyTheme('system')
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface-dark">
    <!-- Sidebar (only when vault is open) -->
    <Sidebar v-if="showSidebar" />

    <!-- Main content area -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Title bar drag region (for Tauri) -->
      <div 
        v-if="showSidebar"
        class="h-8 bg-surface-dark drag flex items-center px-4 border-b border-border/50"
      >
        <span class="text-xs text-gray-500 no-drag">FlowNotes</span>
      </div>

      <!-- Router view -->
      <div class="flex-1 overflow-hidden no-drag" style="-webkit-app-region: no-drag;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Editor panel (slide-over) with backdrop -->
    <template v-if="uiStore.editorOpen">
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 z-30"
        style="background-color: rgba(0, 0, 0, 0.3);"
        @click="uiStore.closeEditor()"
    />
      <!-- Panel -->
      <EditorPanel @close="uiStore.closeEditor()" />
    </template>

    <!-- Quick capture modal -->
    <Teleport to="body">
        <div 
          v-if="uiStore.quickCaptureOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-24"
        style="background-color: rgba(0, 0, 0, 0.5);"
          @click.self="uiStore.closeQuickCapture()"
        >
        <div 
          class="w-full max-w-xl mx-4 bg-surface rounded-xl shadow-2xl border border-border animate-scale-in"
          @click.stop
        >
          <div class="flex items-center justify-between p-4 border-b border-border">
            <h3 class="text-lg font-medium text-gray-100">Quick Capture</h3>
            <button 
              class="btn-ghost btn-icon btn-sm"
              @click="uiStore.closeQuickCapture()"
            >
              <span class="text-gray-400">✕</span>
            </button>
          </div>
            <div class="p-4">
              <input
                type="text"
                placeholder="Quick capture..."
              class="input text-lg quick-capture-input"
                autofocus
                @keydown.enter="uiStore.saveQuickCapture($event)"
              @keydown.escape.stop="uiStore.closeQuickCapture()"
              />
            <p class="text-xs text-gray-500 mt-2">Press Enter to save, Escape to cancel</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Search modal -->
    <SearchModal />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
