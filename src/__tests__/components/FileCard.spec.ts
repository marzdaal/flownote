import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileCard from '@/components/shared/FileCard.vue'
import type { VaultFile } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  ArrowRight: { template: '<span class="icon-arrow-right" />' },
  Calendar: { template: '<span class="icon-calendar" />' },
  Flag: { template: '<span class="icon-flag" />' },
}))

describe('FileCard', () => {
  const createMockFile = (overrides: Partial<VaultFile> = {}): VaultFile => ({
    path: '00 - Inbox/test-file.md',
    name: 'Test File',
    content: '# Test\n\nContent',
    frontmatter: {},
    folder: '00 - Inbox',
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountComponent = (file: VaultFile, showActions = false) => {
    return mount(FileCard, {
      props: {
        file,
        showActions,
      },
    })
  }

  describe('rendering', () => {
    it('should render file name', () => {
      const file = createMockFile({ name: 'My Important Note' })
      const wrapper = mountComponent(file)

      expect(wrapper.text()).toContain('My Important Note')
    })

    it('should render folder name', () => {
      const file = createMockFile({ folder: '02 - Tasks/Next Actions' })
      const wrapper = mountComponent(file)

      expect(wrapper.text()).toContain('Next Actions')
    })

    it('should render due date when present', () => {
      const file = createMockFile({
        frontmatter: { due: '2026-01-15' },
      })
      const wrapper = mountComponent(file)

      expect(wrapper.text()).toContain('2026-01-15')
    })

    it('should not render due date when not present', () => {
      const file = createMockFile({
        frontmatter: {},
      })
      const wrapper = mountComponent(file)

      expect(wrapper.find('.icon-calendar').exists()).toBe(false)
    })

    it('should render priority when present', () => {
      const file = createMockFile({
        frontmatter: { priority: 'high' },
      })
      const wrapper = mountComponent(file)

      expect(wrapper.text()).toContain('high')
    })

    it('should show area indicator with correct color', () => {
      const file = createMockFile({
        frontmatter: { area: 'work' },
      })
      const wrapper = mountComponent(file)

      const indicator = wrapper.find('[class*="bg-blue-500"]')
      expect(indicator.exists()).toBe(true)
    })

    it('should show green indicator for health area', () => {
      const file = createMockFile({
        frontmatter: { area: 'health' },
      })
      const wrapper = mountComponent(file)

      const indicator = wrapper.find('[class*="bg-green-500"]')
      expect(indicator.exists()).toBe(true)
    })

    it('should show purple indicator for learning area', () => {
      const file = createMockFile({
        frontmatter: { area: 'learning' },
      })
      const wrapper = mountComponent(file)

      const indicator = wrapper.find('[class*="bg-purple-500"]')
      expect(indicator.exists()).toBe(true)
    })

    it('should show orange indicator for home area', () => {
      const file = createMockFile({
        frontmatter: { area: 'home' },
      })
      const wrapper = mountComponent(file)

      const indicator = wrapper.find('[class*="bg-orange-500"]')
      expect(indicator.exists()).toBe(true)
    })
  })

  describe('priority styling', () => {
    it('should show danger color for high priority', () => {
      const file = createMockFile({
        frontmatter: { priority: 'high' },
      })
      const wrapper = mountComponent(file)

      const priorityEl = wrapper.find('.text-danger')
      expect(priorityEl.exists()).toBe(true)
    })

    it('should show warning color for medium priority', () => {
      const file = createMockFile({
        frontmatter: { priority: 'medium' },
      })
      const wrapper = mountComponent(file)

      const priorityEl = wrapper.find('.text-warning')
      expect(priorityEl.exists()).toBe(true)
    })
  })

  describe('overdue indication', () => {
    it('should show overdue styling for past due dates', () => {
      const file = createMockFile({
        frontmatter: { due: '2020-01-01' },
      })
      const wrapper = mountComponent(file)

      // Should have danger styling for overdue
      expect(wrapper.find('.text-danger').exists()).toBe(true)
    })

    it('should not show overdue styling for future dates', () => {
      const file = createMockFile({
        frontmatter: { due: '2099-12-31' },
      })
      const wrapper = mountComponent(file)

      // Check that the date span doesn't have danger class
      const dateSpan = wrapper.findAll('span').find(el => el.text().includes('2099-12-31'))
      expect(dateSpan?.classes()).not.toContain('text-danger')
    })
  })

  describe('actions', () => {
    it('should not show actions by default', () => {
      const file = createMockFile()
      const wrapper = mountComponent(file, false)

      expect(wrapper.findAll('button').length).toBe(0)
    })

    it('should show action buttons when showActions is true', () => {
      const file = createMockFile()
      const wrapper = mountComponent(file, true)

      expect(wrapper.text()).toContain('Task')
      expect(wrapper.text()).toContain('Project')
      expect(wrapper.text()).toContain('Note')
    })

    it('should have three action buttons', () => {
      const file = createMockFile()
      const wrapper = mountComponent(file, true)

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(3)
    })
  })

  describe('interactions', () => {
    it('should call openEditor when card is clicked', async () => {
      const file = createMockFile()
      const wrapper = mountComponent(file)

      await wrapper.find('.card').trigger('click')

      // The store action should be called - we can verify state changed
      // Since we're using actual stores, we check the ui store
      const { useUiStore } = await import('@/stores/ui')
      const uiStore = useUiStore()
      expect(uiStore.editorOpen).toBe(true)
      expect(uiStore.editorFile).toEqual(file)
    })

    it('should not propagate click from action buttons', async () => {
      const file = createMockFile()
      const wrapper = mountComponent(file, true)

      const { useUiStore } = await import('@/stores/ui')
      const uiStore = useUiStore()

      // Click on action button container (has @click.stop)
      const actionsContainer = wrapper.find('[class*="opacity-0"]')
      await actionsContainer.trigger('click')

      // Editor should not open
      expect(uiStore.editorOpen).toBe(false)
    })
  })
})
