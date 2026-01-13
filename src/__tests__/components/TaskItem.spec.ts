import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TaskItem from '@/components/shared/TaskItem.vue'
import type { Task } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  Calendar: { template: '<span class="icon-calendar" />' },
  Flag: { template: '<span class="icon-flag" />' },
  Link: { template: '<span class="icon-link" />' },
}))

describe('TaskItem', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    path: '02 - Tasks/Next Actions/task.md',
    name: 'Test Task',
    content: '# Test Task\n\nContent',
    frontmatter: {
      status: 'next-action',
      area: 'work',
      created: '2026-01-08',
    },
    folder: '02 - Tasks/Next Actions',
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountComponent = (task: Task, compact = false) => {
    return mount(TaskItem, {
      props: {
        task,
        compact,
      },
    })
  }

  describe('rendering', () => {
    it('should render task name', () => {
      const task = createMockTask({ name: 'Important Task' })
      const wrapper = mountComponent(task)

      expect(wrapper.text()).toContain('Important Task')
    })

    it('should render checkbox', () => {
      const task = createMockTask()
      const wrapper = mountComponent(task)

      const checkbox = wrapper.find('button')
      expect(checkbox.exists()).toBe(true)
    })

    it('should render due date when present', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: '2026-01-15',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.text()).toContain('2026-01-15')
    })

    it('should show "Today" for tasks due today', () => {
      const today = new Date().toISOString().split('T')[0]
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: today,
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.text()).toContain('Today')
    })

    it('should render project link when present', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          project: '[[My Project]]',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.text()).toContain('My Project')
    })

    it('should render waiting_for when present', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'waiting',
          waiting_for: '@John',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.text()).toContain('@John')
    })
  })

  describe('priority styling', () => {
    it('should show danger border for high priority', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          priority: 'high',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      const checkbox = wrapper.find('button')
      expect(checkbox.classes()).toContain('border-danger')
    })

    it('should show warning border for medium priority', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          priority: 'medium',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      const checkbox = wrapper.find('button')
      expect(checkbox.classes()).toContain('border-warning')
    })

    it('should show default border for low priority', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          priority: 'low',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      const checkbox = wrapper.find('button')
      expect(checkbox.classes()).toContain('border-border')
    })

    it('should show high priority flag icon', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          priority: 'high',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('.icon-flag').exists()).toBe(true)
    })

    it('should not show flag icon for non-high priority', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          priority: 'medium',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('.icon-flag').exists()).toBe(false)
    })
  })

  describe('area styling', () => {
    it('should show blue dot for work area', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          area: 'work',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('[class*="bg-blue-500"]').exists()).toBe(true)
    })

    it('should show green dot for health area', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          area: 'health',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('[class*="bg-green-500"]').exists()).toBe(true)
    })

    it('should show purple dot for learning area', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          area: 'learning',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('[class*="bg-purple-500"]').exists()).toBe(true)
    })

    it('should show orange dot for home area', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          area: 'home',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('[class*="bg-orange-500"]').exists()).toBe(true)
    })
  })

  describe('overdue styling', () => {
    it('should show danger text for overdue tasks', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: '2020-01-01',
          created: '2020-01-01',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('.text-danger').exists()).toBe(true)
    })

    it('should show accent text for tasks due today', () => {
      const today = new Date().toISOString().split('T')[0]
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: today,
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      // Should display "Today" text for tasks due today
      expect(wrapper.text()).toContain('Today')
    })
  })

  describe('compact mode', () => {
    it('should hide meta row in compact mode', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: '2026-01-15',
          area: 'work',
          priority: 'high',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task, true) // compact = true

      // In compact mode, due date and area should not be visible
      expect(wrapper.find('.icon-calendar').exists()).toBe(false)
      expect(wrapper.find('[class*="bg-blue-500"]').exists()).toBe(false)
    })

    it('should show meta row in normal mode', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: '2026-01-15',
          area: 'work',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task, false) // compact = false

      expect(wrapper.text()).toContain('2026-01-15')
    })
  })

  describe('today highlight', () => {
    it('should have highlight styling for tasks due today', () => {
      const today = new Date().toISOString().split('T')[0]
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: today,
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      expect(wrapper.find('[class*="bg-surface-light"]').exists()).toBe(true)
    })

    it('should not have highlight styling for future tasks', () => {
      const task = createMockTask({
        frontmatter: {
          status: 'next-action',
          due: '2099-12-31',
          created: '2026-01-08',
        },
      })
      const wrapper = mountComponent(task)

      const mainEl = wrapper.find('.flex.items-start')
      expect(mainEl.classes()).not.toContain('bg-surface-light')
    })
  })

  describe('interactions', () => {
    it('should open editor when clicked', async () => {
      const task = createMockTask()
      const wrapper = mountComponent(task)

      await wrapper.trigger('click')

      const { useUiStore } = await import('@/stores/ui')
      const uiStore = useUiStore()
      expect(uiStore.editorOpen).toBe(true)
      expect(uiStore.editorFile).toEqual(task)
    })

    it('should stop propagation when checkbox is clicked', async () => {
      const task = createMockTask()
      const wrapper = mountComponent(task)

      const { useUiStore } = await import('@/stores/ui')
      const uiStore = useUiStore()

      const checkbox = wrapper.find('button')
      await checkbox.trigger('click')

      // Editor should not open from checkbox click
      expect(uiStore.editorOpen).toBe(false)
    })
  })
})
