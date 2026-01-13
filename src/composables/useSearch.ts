import { ref, computed } from 'vue'
import { useFilesStore } from '@/stores/files'
import type { VaultFile } from '@/types'

export interface SearchResult {
  file: VaultFile
  score: number
  matches: {
    type: 'title' | 'content' | 'tag'
    text: string
    highlight: [number, number][]
  }[]
}

export function useSearch() {
  const filesStore = useFilesStore()
  const query = ref('')
  const isSearching = ref(false)

  const results = computed<SearchResult[]>(() => {
    if (!query.value || query.value.length < 2) {
      return []
    }

    const searchTerm = query.value.toLowerCase()
    const allFiles = Array.from(filesStore.files.values())
    const scored: SearchResult[] = []

    for (const file of allFiles) {
      let score = 0
      const matches: SearchResult['matches'] = []

      // Check title match (highest priority)
      const titleLower = file.name.toLowerCase()
      if (titleLower.includes(searchTerm)) {
        score += 10
        const startIndex = titleLower.indexOf(searchTerm)
        matches.push({
          type: 'title',
          text: file.name,
          highlight: [[startIndex, startIndex + searchTerm.length]],
        })
      }

      // Check tag match
      const tags = file.frontmatter.tags || []
      for (const tag of tags) {
        if (tag.toLowerCase().includes(searchTerm)) {
          score += 5
          matches.push({
            type: 'tag',
            text: tag,
            highlight: [[0, tag.length]],
          })
        }
      }

      // Check content match
      const contentLower = file.content.toLowerCase()
      if (contentLower.includes(searchTerm)) {
        // Count occurrences
        const occurrences = (contentLower.match(new RegExp(searchTerm, 'g')) || []).length
        score += occurrences

        // Find context around first match
        const firstIndex = contentLower.indexOf(searchTerm)
        const start = Math.max(0, firstIndex - 50)
        const end = Math.min(file.content.length, firstIndex + searchTerm.length + 50)
        const context = file.content.slice(start, end)
        
        matches.push({
          type: 'content',
          text: (start > 0 ? '...' : '') + context + (end < file.content.length ? '...' : ''),
          highlight: [[firstIndex - start + (start > 0 ? 3 : 0), firstIndex - start + searchTerm.length + (start > 0 ? 3 : 0)]],
        })
      }

      if (score > 0) {
        scored.push({ file, score, matches })
      }
    }

    // Sort by score (descending)
    return scored.sort((a, b) => b.score - a.score).slice(0, 20)
  })

  function setQuery(newQuery: string) {
    query.value = newQuery
  }

  function clearSearch() {
    query.value = ''
  }

  /**
   * Fuzzy match for autocomplete
   */
  function fuzzyMatch(text: string, pattern: string): boolean {
    const textLower = text.toLowerCase()
    const patternLower = pattern.toLowerCase()
    
    let patternIdx = 0
    for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIdx]) {
        patternIdx++
      }
    }
    
    return patternIdx === patternLower.length
  }

  /**
   * Get file suggestions for wikilink autocomplete
   */
  function getFileSuggestions(partial: string): VaultFile[] {
    if (!partial) {
      return Array.from(filesStore.files.values()).slice(0, 10)
    }

    const partialLower = partial.toLowerCase()
    
    return Array.from(filesStore.files.values())
      .filter(file => 
        file.name.toLowerCase().includes(partialLower) ||
        fuzzyMatch(file.name, partial)
      )
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStartsWith = a.name.toLowerCase().startsWith(partialLower)
        const bStartsWith = b.name.toLowerCase().startsWith(partialLower)
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, 10)
  }

  return {
    query,
    results,
    isSearching,
    setQuery,
    clearSearch,
    fuzzyMatch,
    getFileSuggestions,
  }
}
