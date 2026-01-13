import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Index storage structure - simple area-based counters like JIRA
interface IndexState {
  // Counters by area: { "WORK": 15, "HOME": 3, "GENERAL": 5 }
  counters: Record<string, number>
  // Map of file paths to their index IDs (permanent)
  pathToId: Record<string, string>
}

const defaultState: IndexState = {
  counters: {},
  pathToId: {},
}

export const useIndexingStore = defineStore('indexing', () => {
  // Load from localStorage
  const stored = localStorage.getItem('flownotes-indexing')
  const initial: IndexState = stored ? JSON.parse(stored) : { ...defaultState }

  // State
  const counters = ref<Record<string, number>>(initial.counters)
  const pathToId = ref<Record<string, string>>(initial.pathToId)

  // Persist to localStorage
  function persist() {
    localStorage.setItem('flownotes-indexing', JSON.stringify({
      counters: counters.value,
      pathToId: pathToId.value,
    }))
  }

  watch([counters, pathToId], persist, { deep: true })

  /**
   * Generate a unique ID for an item
   * Format: AREA-NUMBER (e.g., WORK-1, HOME-42, GENERAL-5)
   * Same sequence for tasks, notes, projects - all within area
   */
  function generateId(area?: string): string {
    // Use area as prefix, or GENERAL if no area
    const prefix = area ? area.toUpperCase() : 'GENERAL'

    // Get next counter for this area
    const currentCount = counters.value[prefix] || 0
    const nextCount = currentCount + 1
    counters.value[prefix] = nextCount

    return `${prefix}-${nextCount}`
  }

  /**
   * Register a file with an ID (permanent - doesn't change)
   */
  function registerFile(path: string, id: string) {
    pathToId.value[path] = id
  }

  /**
   * Get ID for a file path
   */
  function getIdForPath(path: string): string | undefined {
    return pathToId.value[path]
  }

  /**
   * Remove file from index (on delete)
   */
  function unregisterFile(path: string) {
    delete pathToId.value[path]
  }

  /**
   * Update file path (on rename/move) - ID stays the same
   */
  function updateFilePath(oldPath: string, newPath: string) {
    const id = pathToId.value[oldPath]
    if (id) {
      delete pathToId.value[oldPath]
      pathToId.value[newPath] = id
    }
  }

  /**
   * Reset all indexing data
   */
  function reset() {
    counters.value = {}
    pathToId.value = {}
  }

  return {
    counters,
    pathToId,
    generateId,
    registerFile,
    getIdForPath,
    unregisterFile,
    updateFilePath,
    reset,
  }
})
