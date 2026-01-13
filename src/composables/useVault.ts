import { ref, computed } from 'vue'
import { useFilesStore } from '@/stores/files'
import type { VaultFile, Task, Project, Note } from '@/types'

export function useVault() {
  const filesStore = useFilesStore()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadVault(path: string) {
    isLoading.value = true
    error.value = null

    try {
      filesStore.vaultConfig.path = path
      // In Tauri, this would call the Rust backend
      // const files = await invoke('read_vault', { vaultPath: path })
      await filesStore.initVault()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load vault'
    } finally {
      isLoading.value = false
    }
  }

  function getTasksByArea(area: string): Task[] {
    return filesStore.tasks.filter(t => t.frontmatter.area === area)
  }

  function getProjectsByArea(area: string): Project[] {
    return filesStore.projects.filter(p => p.frontmatter.area === area)
  }

  function getTasksForProject(projectName: string): Task[] {
    return filesStore.tasks.filter(t => 
      t.frontmatter.project?.includes(projectName)
    )
  }

  function getRelatedNotes(file: VaultFile): Note[] {
    // Find notes that link to this file
    const fileName = file.name
    return filesStore.notes.filter(n => 
      n.content.includes(`[[${fileName}]]`)
    )
  }

  function getBacklinks(file: VaultFile): VaultFile[] {
    // Find all files that link to this file
    const fileName = file.name
    return Array.from(filesStore.files.values()).filter(f => 
      f.path !== file.path && f.content.includes(`[[${fileName}]]`)
    )
  }

  const stats = computed(() => ({
    totalFiles: filesStore.files.size,
    inboxCount: filesStore.inboxFiles.length,
    tasksCount: filesStore.tasks.length,
    projectsCount: filesStore.projects.length,
    notesCount: filesStore.notes.length,
  }))

  return {
    isLoading,
    error,
    loadVault,
    getTasksByArea,
    getProjectsByArea,
    getTasksForProject,
    getRelatedNotes,
    getBacklinks,
    stats,
  }
}
