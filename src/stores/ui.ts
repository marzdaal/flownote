import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VaultFile, ViewType } from '@/types'
import { useFilesStore } from './files'

export const useUiStore = defineStore('ui', () => {
  // State
  const currentView = ref<ViewType>('inbox')
  const editorOpen = ref(false)
  const editorFile = ref<VaultFile | null>(null)
  const quickCaptureOpen = ref(false)
  const sidebarCollapsed = ref(false)
  const searchQuery = ref('')
  const searchOpen = ref(false)

  // Selected filters
  const selectedArea = ref<string | null>(null)
  const selectedProject = ref<string | null>(null)

  // Computed
  const isEditing = computed(() => editorOpen.value && editorFile.value !== null)

  // Actions
  function setView(view: ViewType) {
    currentView.value = view
  }

  function openEditor(file: VaultFile) {
    editorFile.value = file
    editorOpen.value = true
  }

  function closeEditor() {
    editorOpen.value = false
    editorFile.value = null
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openQuickCapture() {
    quickCaptureOpen.value = true
  }

  function closeQuickCapture() {
    quickCaptureOpen.value = false
  }

  async function saveQuickCapture(event: Event) {
    const input = event.target as HTMLInputElement
    const text = input.value.trim()
    
    if (!text) {
      closeQuickCapture()
      return
    }

    const filesStore = useFilesStore()
    await filesStore.createFile(
      filesStore.vaultConfig.folders.inbox,
      text,
      `# ${text}\n\n`,
      { created: new Date().toISOString().split('T')[0] }
    )

    input.value = ''
    closeQuickCapture()
  }

  function openSearch() {
    searchOpen.value = true
  }

  function closeSearch() {
    searchOpen.value = false
    searchQuery.value = ''
  }

  function setFilter(type: 'area' | 'project', value: string | null) {
    if (type === 'area') {
      selectedArea.value = value
    } else {
      selectedProject.value = value
    }
  }

  function clearFilters() {
    selectedArea.value = null
    selectedProject.value = null
  }

  return {
    // State
    currentView,
    editorOpen,
    editorFile,
    quickCaptureOpen,
    sidebarCollapsed,
    searchQuery,
    searchOpen,
    selectedArea,
    selectedProject,

    // Computed
    isEditing,

    // Actions
    setView,
    openEditor,
    closeEditor,
    toggleSidebar,
    openQuickCapture,
    closeQuickCapture,
    saveQuickCapture,
    openSearch,
    closeSearch,
    setFilter,
    clearFilters,
  }
})
