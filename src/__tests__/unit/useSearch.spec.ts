import { describe, it, expect, beforeEach } from 'vitest'
import { useSearch } from '@/composables/useSearch'
import { useFilesStore } from '@/stores/files'
import type { VaultFile } from '@/types'

describe('useSearch', () => {
  let filesStore: ReturnType<typeof useFilesStore>

  // Helper to create mock files
  const createMockFile = (overrides: Partial<VaultFile> = {}): VaultFile => ({
    path: 'test/path.md',
    name: 'Test File',
    content: 'Test content',
    frontmatter: {},
    folder: 'test',
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    filesStore = useFilesStore()
  })

  describe('fuzzyMatch', () => {
    it('should match exact substring', () => {
      const { fuzzyMatch } = useSearch()

      expect(fuzzyMatch('Hello World', 'World')).toBe(true)
      expect(fuzzyMatch('Hello World', 'hello')).toBe(true) // case insensitive
    })

    it('should match fuzzy pattern', () => {
      const { fuzzyMatch } = useSearch()

      expect(fuzzyMatch('Hello World', 'hwd')).toBe(true)
      expect(fuzzyMatch('MyProjectFile', 'mpf')).toBe(true)
    })

    it('should not match if characters out of order', () => {
      const { fuzzyMatch } = useSearch()

      expect(fuzzyMatch('abc', 'cba')).toBe(false)
    })

    it('should handle empty pattern', () => {
      const { fuzzyMatch } = useSearch()

      expect(fuzzyMatch('Hello', '')).toBe(true)
    })

    it('should handle empty text', () => {
      const { fuzzyMatch } = useSearch()

      expect(fuzzyMatch('', 'hello')).toBe(false)
    })
  })

  describe('results computed', () => {
    it('should return empty array for short queries', () => {
      const { setQuery, results } = useSearch()

      setQuery('a')

      expect(results.value).toEqual([])
    })

    it('should search by title match', () => {
      // Add files to store
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'Important Task',
        content: 'Some content',
      }))
      filesStore.files.set('file2.md', createMockFile({
        path: 'file2.md',
        name: 'Another File',
        content: 'Different content',
      }))

      const { setQuery, results } = useSearch()

      setQuery('Important')

      expect(results.value).toHaveLength(1)
      expect(results.value[0].file.name).toBe('Important Task')
      expect(results.value[0].matches.some(m => m.type === 'title')).toBe(true)
    })

    it('should search by content match', () => {
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'Note One',
        content: 'This contains searchterm in the body',
      }))
      filesStore.files.set('file2.md', createMockFile({
        path: 'file2.md',
        name: 'Note Two',
        content: 'Nothing here',
      }))

      const { setQuery, results } = useSearch()

      setQuery('searchterm')

      expect(results.value).toHaveLength(1)
      expect(results.value[0].file.name).toBe('Note One')
      expect(results.value[0].matches.some(m => m.type === 'content')).toBe(true)
    })

    it('should search by tag match', () => {
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'Tagged Note',
        content: 'Content',
        frontmatter: { tags: ['work', 'urgent'] },
      }))

      const { setQuery, results } = useSearch()

      setQuery('urgent')

      expect(results.value).toHaveLength(1)
      expect(results.value[0].matches.some(m => m.type === 'tag')).toBe(true)
    })

    it('should rank title matches higher than content matches', () => {
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'Test File',
        content: 'No match here',
      }))
      filesStore.files.set('file2.md', createMockFile({
        path: 'file2.md',
        name: 'Another',
        content: 'Contains test in content',
      }))

      const { setQuery, results } = useSearch()

      setQuery('test')

      expect(results.value).toHaveLength(2)
      // Title match should come first (higher score)
      expect(results.value[0].file.name).toBe('Test File')
    })

    it('should be case insensitive', () => {
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'UPPERCASE',
        content: 'lowercase content',
      }))

      const { setQuery, results } = useSearch()

      setQuery('uppercase')

      expect(results.value).toHaveLength(1)
    })

    it('should limit results to 20', () => {
      // Add 25 files that match
      for (let i = 0; i < 25; i++) {
        filesStore.files.set(`file${i}.md`, createMockFile({
          path: `file${i}.md`,
          name: `Matching File ${i}`,
          content: 'searchable content',
        }))
      }

      const { setQuery, results } = useSearch()

      setQuery('Matching')

      expect(results.value.length).toBeLessThanOrEqual(20)
    })

    it('should include highlight positions in content matches', () => {
      filesStore.files.set('file1.md', createMockFile({
        path: 'file1.md',
        name: 'Note',
        content: 'Some text with keyword in it',
      }))

      const { setQuery, results } = useSearch()

      setQuery('keyword')

      const contentMatch = results.value[0]?.matches.find(m => m.type === 'content')
      expect(contentMatch?.highlight).toBeDefined()
      expect(contentMatch?.highlight.length).toBeGreaterThan(0)
    })
  })

  describe('setQuery and clearSearch', () => {
    it('should update query value', () => {
      const { query, setQuery } = useSearch()

      setQuery('test query')

      expect(query.value).toBe('test query')
    })

    it('should clear query', () => {
      const { query, setQuery, clearSearch } = useSearch()

      setQuery('test query')
      clearSearch()

      expect(query.value).toBe('')
    })
  })

  describe('getFileSuggestions', () => {
    beforeEach(() => {
      filesStore.files.set('project1.md', createMockFile({
        path: 'project1.md',
        name: 'Project Alpha',
      }))
      filesStore.files.set('project2.md', createMockFile({
        path: 'project2.md',
        name: 'Project Beta',
      }))
      filesStore.files.set('task1.md', createMockFile({
        path: 'task1.md',
        name: 'Task One',
      }))
      filesStore.files.set('note1.md', createMockFile({
        path: 'note1.md',
        name: 'Note About Something',
      }))
    })

    it('should return matching files for partial name', () => {
      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('Project')

      expect(suggestions).toHaveLength(2)
      expect(suggestions.every(s => s.name.includes('Project'))).toBe(true)
    })

    it('should return all files (limited) when no partial provided', () => {
      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(10)
    })

    it('should prioritize prefix matches', () => {
      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('Pro')

      // Project files should come first as they start with "Pro"
      expect(suggestions[0].name.startsWith('Project')).toBe(true)
    })

    it('should limit suggestions to 10', () => {
      // Add more files
      for (let i = 0; i < 15; i++) {
        filesStore.files.set(`test${i}.md`, createMockFile({
          path: `test${i}.md`,
          name: `Test File ${i}`,
        }))
      }

      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('Test')

      expect(suggestions.length).toBeLessThanOrEqual(10)
    })

    it('should be case insensitive', () => {
      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('project')

      expect(suggestions).toHaveLength(2)
    })

    it('should use fuzzy matching as fallback', () => {
      const { getFileSuggestions } = useSearch()

      const suggestions = getFileSuggestions('pa') // Should match "Project Alpha" via fuzzy

      expect(suggestions.some(s => s.name === 'Project Alpha')).toBe(true)
    })
  })
})
