import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFilesStore } from '@/stores/files'
import type { VaultFile, Task, Project } from '@/types'

describe('useFilesStore', () => {
  let store: ReturnType<typeof useFilesStore>

  // Helper to create mock files
  const createMockFile = (overrides: Partial<VaultFile> = {}): VaultFile => ({
    path: 'test/path.md',
    name: 'Test File',
    content: 'Test content',
    frontmatter: {},
    folder: 'test',
    createdAt: new Date('2026-01-01'),
    modifiedAt: new Date('2026-01-01'),
    ...overrides,
  })

  beforeEach(() => {
    store = useFilesStore()
  })

  describe('initial state', () => {
    it('should have empty files map', () => {
      expect(store.files.size).toBe(0)
    })

    it('should have default vault config', () => {
      expect(store.vaultConfig.folders.inbox).toBe('00 - Inbox')
      expect(store.vaultConfig.folders.projects).toBe('01 - Projects')
      expect(store.vaultConfig.folders.tasks).toBe('02 - Tasks')
    })

    it('should not be loading initially', () => {
      expect(store.isLoading).toBe(false)
    })
  })

  describe('computed: inboxFiles', () => {
    it('should return files from inbox folder', () => {
      const inboxFile = createMockFile({
        path: '00 - Inbox/idea.md',
        name: 'Idea',
        folder: '00 - Inbox',
      })
      const taskFile = createMockFile({
        path: '02 - Tasks/task.md',
        name: 'Task',
        folder: '02 - Tasks',
      })

      store.files.set(inboxFile.path, inboxFile)
      store.files.set(taskFile.path, taskFile)

      expect(store.inboxFiles).toHaveLength(1)
      expect(store.inboxFiles[0].name).toBe('Idea')
    })

    it('should sort by modifiedAt descending', () => {
      const olderFile = createMockFile({
        path: '00 - Inbox/old.md',
        name: 'Old',
        folder: '00 - Inbox',
        modifiedAt: new Date('2026-01-01'),
      })
      const newerFile = createMockFile({
        path: '00 - Inbox/new.md',
        name: 'New',
        folder: '00 - Inbox',
        modifiedAt: new Date('2026-01-08'),
      })

      store.files.set(olderFile.path, olderFile)
      store.files.set(newerFile.path, newerFile)

      expect(store.inboxFiles[0].name).toBe('New')
      expect(store.inboxFiles[1].name).toBe('Old')
    })
  })

  describe('computed: tasks', () => {
    it('should return files from tasks folder', () => {
      const task = createMockFile({
        path: '02 - Tasks/Next Actions/task.md',
        name: 'My Task',
        folder: '02 - Tasks/Next Actions',
        frontmatter: { status: 'next-action', area: 'work' },
      })

      store.files.set(task.path, task)

      expect(store.tasks).toHaveLength(1)
    })

    it('should filter nextActions correctly', () => {
      const nextAction = createMockFile({
        path: '02 - Tasks/Next Actions/task.md',
        name: 'Next Action Task',
        folder: '02 - Tasks/Next Actions',
      })
      const waiting = createMockFile({
        path: '02 - Tasks/Waiting For/waiting.md',
        name: 'Waiting Task',
        folder: '02 - Tasks/Waiting For',
      })

      store.files.set(nextAction.path, nextAction)
      store.files.set(waiting.path, waiting)

      expect(store.nextActions).toHaveLength(1)
      expect(store.nextActions[0].name).toBe('Next Action Task')
    })

    it('should filter waitingFor correctly', () => {
      const waiting = createMockFile({
        path: '02 - Tasks/Waiting For/waiting.md',
        name: 'Waiting Task',
        folder: '02 - Tasks/Waiting For',
      })

      store.files.set(waiting.path, waiting)

      expect(store.waitingFor).toHaveLength(1)
      expect(store.waitingFor[0].name).toBe('Waiting Task')
    })

    it('should filter somedayMaybe correctly', () => {
      const someday = createMockFile({
        path: '02 - Tasks/Someday Maybe/someday.md',
        name: 'Someday Task',
        folder: '02 - Tasks/Someday Maybe',
      })

      store.files.set(someday.path, someday)

      expect(store.somedayMaybe).toHaveLength(1)
      expect(store.somedayMaybe[0].name).toBe('Someday Task')
    })
  })

  describe('computed: todayTasks', () => {
    it('should return tasks due today', () => {
      const today = new Date().toISOString().split('T')[0]
      const todayTask = createMockFile({
        path: '02 - Tasks/Next Actions/today.md',
        name: 'Today Task',
        folder: '02 - Tasks/Next Actions',
        frontmatter: { due: today },
      })
      const tomorrowTask = createMockFile({
        path: '02 - Tasks/Next Actions/tomorrow.md',
        name: 'Tomorrow Task',
        folder: '02 - Tasks/Next Actions',
        frontmatter: { due: '2099-12-31' },
      })

      store.files.set(todayTask.path, todayTask)
      store.files.set(tomorrowTask.path, tomorrowTask)

      expect(store.todayTasks).toHaveLength(1)
      expect(store.todayTasks[0].name).toBe('Today Task')
    })
  })

  describe('computed: projects', () => {
    it('should return files from projects folder', () => {
      const project = createMockFile({
        path: '01 - Projects/project.md',
        name: 'My Project',
        folder: '01 - Projects',
        frontmatter: { status: 'active', area: 'work' },
      })

      store.files.set(project.path, project)

      expect(store.projects).toHaveLength(1)
    })

    it('should filter activeProjects', () => {
      const activeProject = createMockFile({
        path: '01 - Projects/active.md',
        name: 'Active Project',
        folder: '01 - Projects',
        frontmatter: { status: 'active' },
      })
      const completedProject = createMockFile({
        path: '01 - Projects/completed.md',
        name: 'Completed Project',
        folder: '01 - Projects',
        frontmatter: { status: 'completed' },
      })

      store.files.set(activeProject.path, activeProject)
      store.files.set(completedProject.path, completedProject)

      expect(store.activeProjects).toHaveLength(1)
      expect(store.activeProjects[0].name).toBe('Active Project')
    })
  })

  describe('computed: notes', () => {
    it('should return files from notes folder', () => {
      const note = createMockFile({
        path: '03 - Notes/note.md',
        name: 'My Note',
        folder: '03 - Notes',
        frontmatter: { tags: ['test'] },
      })

      store.files.set(note.path, note)

      expect(store.notes).toHaveLength(1)
      expect(store.notes[0].name).toBe('My Note')
    })
  })

  describe('computed: dailyNotes', () => {
    it('should return files from daily folder', () => {
      const daily = createMockFile({
        path: '04 - Daily/2026-01-08.md',
        name: '2026-01-08',
        folder: '04 - Daily',
      })

      store.files.set(daily.path, daily)

      expect(store.dailyNotes).toHaveLength(1)
    })

    it('should find todayNote', () => {
      const today = new Date().toISOString().split('T')[0]
      const todayDaily = createMockFile({
        path: `04 - Daily/${today}.md`,
        name: today,
        folder: '04 - Daily',
      })

      store.files.set(todayDaily.path, todayDaily)

      expect(store.todayNote).toBeDefined()
      expect(store.todayNote?.name).toBe(today)
    })
  })

  describe('computed: areaStats', () => {
    it('should calculate stats per area', () => {
      const workTask = createMockFile({
        path: '02 - Tasks/Next Actions/work.md',
        folder: '02 - Tasks/Next Actions',
        frontmatter: { area: 'work' },
      })
      const workProject = createMockFile({
        path: '01 - Projects/work-project.md',
        folder: '01 - Projects',
        frontmatter: { area: 'work' },
      })
      const healthTask = createMockFile({
        path: '02 - Tasks/Next Actions/health.md',
        folder: '02 - Tasks/Next Actions',
        frontmatter: { area: 'health' },
      })

      store.files.set(workTask.path, workTask)
      store.files.set(workProject.path, workProject)
      store.files.set(healthTask.path, healthTask)

      const workStats = store.areaStats.find(s => s.id === 'work')
      const healthStats = store.areaStats.find(s => s.id === 'health')

      expect(workStats?.tasksCount).toBe(1)
      expect(workStats?.projectsCount).toBe(1)
      expect(healthStats?.tasksCount).toBe(1)
      expect(healthStats?.projectsCount).toBe(0)
    })
  })

  describe('action: createFile', () => {
    it('should create a new file', async () => {
      const file = await store.createFile(
        '00 - Inbox',
        'New Idea',
        '# New Idea\n\nContent here',
        { priority: 'high' }
      )

      expect(file.name).toBe('New Idea')
      expect(file.folder).toBe('00 - Inbox')
      expect(file.frontmatter.priority).toBe('high')
      expect(file.frontmatter.created).toBeDefined()
      expect(store.files.has('00 - Inbox/New Idea.md')).toBe(true)
    })
  })

  describe('action: updateFile', () => {
    it('should update an existing file', async () => {
      const original = createMockFile({
        path: 'test/file.md',
        name: 'Original',
        content: 'Original content',
      })
      store.files.set(original.path, original)

      const updated = await store.updateFile('test/file.md', {
        content: 'Updated content',
      })

      expect(updated?.content).toBe('Updated content')
      expect(updated?.modifiedAt.getTime()).toBeGreaterThan(original.modifiedAt.getTime())
    })

    it('should return undefined for non-existent file', async () => {
      const result = await store.updateFile('non-existent.md', {})

      expect(result).toBeUndefined()
    })
  })

  describe('action: moveFile', () => {
    it('should move file to new folder', async () => {
      const file = createMockFile({
        path: '00 - Inbox/idea.md',
        name: 'Idea',
        folder: '00 - Inbox',
      })
      store.files.set(file.path, file)

      const moved = await store.moveFile(
        '00 - Inbox/idea.md',
        '02 - Tasks/Next Actions'
      )

      expect(moved?.folder).toBe('02 - Tasks/Next Actions')
      expect(moved?.path).toBe('02 - Tasks/Next Actions/Idea.md')
      expect(store.files.has('00 - Inbox/idea.md')).toBe(false)
      expect(store.files.has('02 - Tasks/Next Actions/Idea.md')).toBe(true)
    })

    it('should apply task template when specified', async () => {
      const file = createMockFile({
        path: '00 - Inbox/idea.md',
        name: 'Idea',
        folder: '00 - Inbox',
      })
      store.files.set(file.path, file)

      const moved = await store.moveFile(
        '00 - Inbox/idea.md',
        '02 - Tasks/Next Actions',
        'task'
      )

      expect(moved?.frontmatter.status).toBe('next-action')
      expect(moved?.frontmatter.priority).toBe('medium')
    })

    it('should apply project template when specified', async () => {
      const file = createMockFile({
        path: '00 - Inbox/idea.md',
        name: 'Idea',
        folder: '00 - Inbox',
      })
      store.files.set(file.path, file)

      const moved = await store.moveFile(
        '00 - Inbox/idea.md',
        '01 - Projects',
        'project'
      )

      expect(moved?.frontmatter.status).toBe('active')
      expect(moved?.frontmatter.start).toBeDefined()
    })
  })

  describe('action: deleteFile', () => {
    it('should delete file from store', async () => {
      const file = createMockFile({
        path: 'test/file.md',
      })
      store.files.set(file.path, file)

      await store.deleteFile('test/file.md')

      expect(store.files.has('test/file.md')).toBe(false)
    })
  })

  describe('action: getFile', () => {
    it('should return file by path', () => {
      const file = createMockFile({
        path: 'test/file.md',
        name: 'Test',
      })
      store.files.set(file.path, file)

      const result = store.getFile('test/file.md')

      expect(result?.name).toBe('Test')
    })

    it('should return undefined for non-existent path', () => {
      const result = store.getFile('non-existent.md')

      expect(result).toBeUndefined()
    })
  })

  describe('action: searchFiles', () => {
    it('should search by name', () => {
      const file1 = createMockFile({
        path: 'file1.md',
        name: 'Important Task',
        content: 'Some content',
      })
      const file2 = createMockFile({
        path: 'file2.md',
        name: 'Another File',
        content: 'Different content',
      })

      store.files.set(file1.path, file1)
      store.files.set(file2.path, file2)

      const results = store.searchFiles('Important')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Important Task')
    })

    it('should search by content', () => {
      const file = createMockFile({
        path: 'file.md',
        name: 'Note',
        content: 'This contains searchterm in the body',
      })

      store.files.set(file.path, file)

      const results = store.searchFiles('searchterm')

      expect(results).toHaveLength(1)
    })

    it('should be case insensitive', () => {
      const file = createMockFile({
        path: 'file.md',
        name: 'UPPERCASE',
        content: 'content',
      })

      store.files.set(file.path, file)

      const results = store.searchFiles('uppercase')

      expect(results).toHaveLength(1)
    })
  })

  describe('parseFrontmatter', () => {
    // Internal function, testing via initVault behavior
    it('should be used during vault initialization', async () => {
      // This is tested indirectly through loadMockData
      await store.initVault()

      // Mock data should have parsed frontmatter
      expect(store.files.size).toBeGreaterThan(0)
    })
  })
})
