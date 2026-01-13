import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import type { VaultFile } from '@/types'

describe('useUiStore', () => {
  let store: ReturnType<typeof useUiStore>
  let filesStore: ReturnType<typeof useFilesStore>

  const createMockFile = (): VaultFile => ({
    path: 'test/file.md',
    name: 'Test File',
    content: '# Test\n\nContent',
    frontmatter: {},
    folder: 'test',
    createdAt: new Date(),
    modifiedAt: new Date(),
  })

  beforeEach(() => {
    store = useUiStore()
    filesStore = useFilesStore()
  })

  describe('initial state', () => {
    it('should have default values', () => {
      expect(store.currentView).toBe('inbox')
      expect(store.editorOpen).toBe(false)
      expect(store.editorFile).toBeNull()
      expect(store.quickCaptureOpen).toBe(false)
      expect(store.sidebarCollapsed).toBe(false)
      expect(store.searchQuery).toBe('')
      expect(store.searchOpen).toBe(false)
      expect(store.selectedArea).toBeNull()
      expect(store.selectedProject).toBeNull()
    })
  })

  describe('computed: isEditing', () => {
    it('should return true when editor is open with file', () => {
      store.editorOpen = true
      store.editorFile = createMockFile()

      expect(store.isEditing).toBe(true)
    })

    it('should return false when editor is closed', () => {
      store.editorOpen = false
      store.editorFile = createMockFile()

      expect(store.isEditing).toBe(false)
    })

    it('should return false when no file is loaded', () => {
      store.editorOpen = true
      store.editorFile = null

      expect(store.isEditing).toBe(false)
    })
  })

  describe('action: setView', () => {
    it('should update currentView', () => {
      store.setView('projects')

      expect(store.currentView).toBe('projects')
    })

    it('should accept all valid view types', () => {
      const views = ['inbox', 'today', 'projects', 'kanban', 'calendar', 'notes', 'areas', 'settings'] as const

      views.forEach(view => {
        store.setView(view)
        expect(store.currentView).toBe(view)
      })
    })
  })

  describe('action: openEditor / closeEditor', () => {
    it('should open editor with file', () => {
      const file = createMockFile()

      store.openEditor(file)

      expect(store.editorOpen).toBe(true)
      expect(store.editorFile).toEqual(file)
    })

    it('should close editor and clear file', () => {
      store.editorOpen = true
      store.editorFile = createMockFile()

      store.closeEditor()

      expect(store.editorOpen).toBe(false)
      expect(store.editorFile).toBeNull()
    })
  })

  describe('action: toggleSidebar', () => {
    it('should toggle sidebarCollapsed', () => {
      expect(store.sidebarCollapsed).toBe(false)

      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)

      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })
  })

  describe('action: openQuickCapture / closeQuickCapture', () => {
    it('should open quick capture modal', () => {
      store.openQuickCapture()

      expect(store.quickCaptureOpen).toBe(true)
    })

    it('should close quick capture modal', () => {
      store.quickCaptureOpen = true

      store.closeQuickCapture()

      expect(store.quickCaptureOpen).toBe(false)
    })
  })

  describe('action: saveQuickCapture', () => {
    it('should create file and close modal', async () => {
      const mockInput = document.createElement('input')
      mockInput.value = 'New Quick Idea'
      const mockEvent = { target: mockInput } as unknown as Event

      await store.saveQuickCapture(mockEvent)

      expect(store.quickCaptureOpen).toBe(false)
      // Check file was created in files store
      const inboxFiles = filesStore.inboxFiles
      expect(inboxFiles.some(f => f.name === 'New Quick Idea')).toBe(true)
    })

    it('should close modal without creating file if empty', async () => {
      const mockInput = document.createElement('input')
      mockInput.value = '   '
      const mockEvent = { target: mockInput } as unknown as Event

      const initialFilesCount = filesStore.files.size

      await store.saveQuickCapture(mockEvent)

      expect(store.quickCaptureOpen).toBe(false)
      expect(filesStore.files.size).toBe(initialFilesCount)
    })

    it('should clear input after save', async () => {
      const mockInput = document.createElement('input')
      mockInput.value = 'Test Idea'
      const mockEvent = { target: mockInput } as unknown as Event

      await store.saveQuickCapture(mockEvent)

      expect(mockInput.value).toBe('')
    })
  })

  describe('action: openSearch / closeSearch', () => {
    it('should open search', () => {
      store.openSearch()

      expect(store.searchOpen).toBe(true)
    })

    it('should close search and clear query', () => {
      store.searchOpen = true
      store.searchQuery = 'test query'

      store.closeSearch()

      expect(store.searchOpen).toBe(false)
      expect(store.searchQuery).toBe('')
    })
  })

  describe('action: setFilter / clearFilters', () => {
    it('should set area filter', () => {
      store.setFilter('area', 'work')

      expect(store.selectedArea).toBe('work')
    })

    it('should set project filter', () => {
      store.setFilter('project', 'My Project')

      expect(store.selectedProject).toBe('My Project')
    })

    it('should clear area filter with null', () => {
      store.selectedArea = 'work'

      store.setFilter('area', null)

      expect(store.selectedArea).toBeNull()
    })

    it('should clear all filters', () => {
      store.selectedArea = 'work'
      store.selectedProject = 'My Project'

      store.clearFilters()

      expect(store.selectedArea).toBeNull()
      expect(store.selectedProject).toBeNull()
    })
  })
})
