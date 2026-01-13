<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { LayoutGrid, Filter, Plus, GripVertical } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'
import TaskItem from '@/components/shared/TaskItem.vue'
import type { Task, AreaType, TaskStatus, Frontmatter } from '@/types'
import { addColumn as addColumnUtil, reorderColumns, updateColumnTitle } from '@/utils/kanban'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

const filterArea = ref<AreaType | 'all'>('all')

// Sync with uiStore.selectedArea when navigating from sidebar or Areas view
onMounted(() => {
  if (uiStore.selectedArea) {
    filterArea.value = uiStore.selectedArea as AreaType
  }
})

watch(() => uiStore.selectedArea, (newArea) => {
  if (newArea) {
    filterArea.value = newArea as AreaType
  }
})

// Clear uiStore filter when user changes local filter
watch(filterArea, (newFilter) => {
  if (newFilter === 'all') {
    uiStore.setFilter('area', null)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupDrag()
})

interface KanbanColumnConfig {
  id: string
  title: string
  color: string
  status: TaskStatus
}

interface KanbanColumn extends KanbanColumnConfig {
  tasks: Task[]
}

const STORAGE_KEY = 'flownotes-kanban-columns'

const defaultColumns: KanbanColumnConfig[] = [
  {
    id: 'not-started',
    title: 'Не начато',
    color: 'border-gray-500',
    status: 'not-started',
  },
  {
    id: 'next',
    title: 'Next Actions',
    color: 'border-accent',
    status: 'next-action',
  },
  {
    id: 'waiting',
    title: 'Waiting For',
    color: 'border-warning',
    status: 'waiting',
  },
  {
    id: 'someday',
    title: 'Someday',
    color: 'border-gray-600',
    status: 'someday',
  },
]

function hydrateColumns(): KanbanColumnConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultColumns
    const parsed = JSON.parse(stored) as KanbanColumnConfig[]
    if (!Array.isArray(parsed)) return defaultColumns
    const defaultsById = new Map(defaultColumns.map(column => [column.id, column]))
    const merged = parsed
      .filter(column => column && typeof column.id === 'string')
      .map(column => ({
        ...defaultsById.get(column.id),
        ...column,
      }))
    const existingIds = new Set(merged.map(column => column.id))
    defaultColumns.forEach(column => {
      if (!existingIds.has(column.id)) {
        merged.push(column)
      }
    })
    return merged
  } catch (error) {
    console.error('Failed to hydrate kanban columns', error)
    return defaultColumns
  }
}

const columnConfigs = ref<KanbanColumnConfig[]>(hydrateColumns())
const editingColumnId = ref<string | null>(null)
const editingTitle = ref('')
const addColumnOpen = ref(false)
const newColumnTitle = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)
const newColumnInputRef = ref<HTMLInputElement | null>(null)
const draggedColumnId = ref<string | null>(null)
const dragOverColumnId = ref<string | null>(null)

watch(editingColumnId, async (columnId) => {
  if (columnId) {
    await nextTick()
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  }
})

watch(addColumnOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    newColumnInputRef.value?.focus()
  }
})

const statusToColumnId = computed(() => {
  return new Map(columnConfigs.value.map(column => [column.status, column.id]))
})

const filteredTasks = computed(() => {
  if (filterArea.value === 'all') return filesStore.tasks
  return filesStore.tasks.filter(t => t.frontmatter.area === filterArea.value)
})

function getColumnIdForTask(task: Task): string | null {
  const status = task.frontmatter.status
  if (status && statusToColumnId.value.has(status)) {
    return statusToColumnId.value.get(status) ?? null
  }

  if (task.folder.includes('Next Actions')) {
    return statusToColumnId.value.get('next-action') ?? null
  }
  if (task.folder.includes('Waiting For')) {
    return statusToColumnId.value.get('waiting') ?? null
  }
  if (task.folder.includes('Someday Maybe')) {
    return statusToColumnId.value.get('someday') ?? null
  }

  return null
}

const columns = computed<KanbanColumn[]>(() => {
  const tasksByColumn = new Map<string, Task[]>()

  columnConfigs.value.forEach(column => {
    tasksByColumn.set(column.id, [])
  })

  filteredTasks.value.forEach(task => {
    const columnId = getColumnIdForTask(task)
    if (columnId && tasksByColumn.has(columnId)) {
      tasksByColumn.get(columnId)?.push(task)
    }
  })

  return columnConfigs.value.map(column => ({
    ...column,
    tasks: tasksByColumn.get(column.id) ?? [],
  }))
})

const areas = computed(() => [
  { value: 'all' as const, label: 'All Areas' },
  ...areasStore.areasList.map(a => ({ value: a.id, label: a.name }))
])

function persistColumns(nextColumns: KanbanColumnConfig[], fallback: KanbanColumnConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColumns))
  } catch (error) {
    console.error('Failed to persist kanban columns', error)
    columnConfigs.value = fallback
    alert('Не удалось сохранить изменения колонок. Попробуйте ещё раз.')
  }
}

function validateColumnTitle(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { ok: false, value: '', message: 'Название колонки не может быть пустым.' }
  if (trimmed.length > 60) return { ok: false, value: trimmed.slice(0, 60), message: 'Название слишком длинное.' }
  return { ok: true, value: trimmed, message: '' }
}

function startEditingColumn(column: KanbanColumnConfig) {
  editingColumnId.value = column.id
  editingTitle.value = column.title
}

function cancelEditing() {
  editingColumnId.value = null
  editingTitle.value = ''
}

function saveColumnTitle(columnId: string) {
  const validated = validateColumnTitle(editingTitle.value)
  if (!validated.ok) {
    alert(validated.message)
    return
  }

  editingTitle.value = validated.value
  const previous = columnConfigs.value
  const next = updateColumnTitle(previous, columnId, validated.value)
  columnConfigs.value = next
  persistColumns(next, previous)
  cancelEditing()
}

function openAddColumn() {
  addColumnOpen.value = true
  newColumnTitle.value = ''
}

function cancelAddColumn() {
  addColumnOpen.value = false
  newColumnTitle.value = ''
}

function createColumnId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return `custom-${slug || 'column'}-${Date.now()}`
}

function handleAddColumn() {
  const validated = validateColumnTitle(newColumnTitle.value)
  if (!validated.ok) {
    alert(validated.message)
    return
  }

  newColumnTitle.value = validated.value
  const column: KanbanColumnConfig = {
    id: createColumnId(validated.value),
    title: validated.value,
    color: 'border-gray-500',
    status: '',
  }
  column.status = column.id

  const previous = columnConfigs.value
  const next = addColumnUtil(previous, column)
  columnConfigs.value = next
  persistColumns(next, previous)
  cancelAddColumn()
}

function handleColumnDragStart(event: DragEvent, columnId: string) {
  draggedColumnId.value = columnId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', columnId)
  }
}

function handleColumnDragOver(event: DragEvent, columnId: string) {
  if (!draggedColumnId.value || draggedColumnId.value === columnId) return
  event.preventDefault()
  dragOverColumnId.value = columnId
}

function handleColumnDrop(event: DragEvent, columnId: string) {
  event.preventDefault()
  const activeId = draggedColumnId.value ?? event.dataTransfer?.getData('text/plain')
  if (!activeId) return

  const previous = columnConfigs.value
  const next = reorderColumns(previous, activeId, columnId)
  columnConfigs.value = next
  persistColumns(next, previous)
  draggedColumnId.value = null
  dragOverColumnId.value = null
}

function handleColumnDragEnd() {
  draggedColumnId.value = null
  dragOverColumnId.value = null
}

// Simple drag and drop state
const draggedTask = ref<Task | null>(null)
const dragOverColumn = ref<string | null>(null)
const isDragging = ref(false)
const dragStartPos = ref<{ x: number; y: number } | null>(null)
const hasDragged = ref(false)

function onDragStart(event: DragEvent, task: Task) {
  console.log('Drag start:', task.name)
  event.stopPropagation()
  draggedTask.value = task
  isDragging.value = true
  hasDragged.value = true
  dragStartPos.value = { x: event.clientX, y: event.clientY }
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.path)
    // Set empty drag image to prevent issues
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    event.dataTransfer.setDragImage(img, 0, 0)
  }
  
  // Add global mouse move and up listeners for Tauri compatibility
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  console.log('Drag started successfully, task:', task.name)
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !draggedTask.value) return
  
  // Find which column we're over
  const element = document.elementFromPoint(event.clientX, event.clientY)
  if (!element) return
  
  const columnElement = element.closest('[data-column-id]') as HTMLElement | null
  if (columnElement) {
    const columnId = columnElement.getAttribute('data-column-id')
    if (columnId && dragOverColumn.value !== columnId) {
      console.log('Mouse over column:', columnId)
      dragOverColumn.value = columnId
    }
  }
}

function handleMouseUp(event: MouseEvent) {
  if (!isDragging.value || !draggedTask.value) {
    cleanupDrag()
    return
  }
  
  // Find which column we're over
  const element = document.elementFromPoint(event.clientX, event.clientY)
  if (element) {
    const columnElement = element.closest('[data-column-id]') as HTMLElement | null
    if (columnElement) {
      const columnId = columnElement.getAttribute('data-column-id')
      if (columnId) {
        console.log('Mouse drop on column:', columnId)
        handleDrop(columnId)
      }
    }
  }
  
  cleanupDrag()
}

function cleanupDrag() {
  isDragging.value = false
  setTimeout(() => {
    hasDragged.value = false
  }, 100)
  dragStartPos.value = null
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

async function handleDrop(columnId: string) {
  if (!draggedTask.value) return
  
  const task = draggedTask.value
  const newStatus = columnConfigs.value.find(column => column.id === columnId)?.status
  
  if (newStatus && task.frontmatter.status !== newStatus) {
    console.log('Updating task status from', task.frontmatter.status, 'to', newStatus)
    await filesStore.updateFile(task.path, {
      frontmatter: { ...task.frontmatter, status: newStatus }
    })
  }
  
  draggedTask.value = null
  dragOverColumn.value = null
}

function handleTaskClick(task: Task) {
  if (isDragging.value || hasDragged.value) {
    return
  }
  uiStore.openEditor(task)
}

function onDragEnd() {
  console.log('Drag end')
  cleanupDrag()
}

function onDragEnter(event: DragEvent, columnId: string) {
  if (draggedColumnId.value) {
    handleColumnDragOver(event, columnId)
    return
  }
  console.log('Drag enter column:', columnId)
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverColumn.value = columnId
}

function onDragOver(event: DragEvent, columnId: string) {
  if (draggedColumnId.value) {
    handleColumnDragOver(event, columnId)
    return
  }
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
    console.log('Drag over column:', columnId, 'dropEffect:', event.dataTransfer.dropEffect, 'types:', Array.from(event.dataTransfer.types))
  }
  dragOverColumn.value = columnId
}

function onDragLeave(event: DragEvent) {
  if (draggedColumnId.value) {
    dragOverColumnId.value = null
    return
  }
  // Only clear if we're actually leaving the column, not just moving to a child
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement
  
  // Don't clear if moving to a child element
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }
  
  // Small delay to prevent flickering when moving between child elements
  setTimeout(() => {
    const rect = currentTarget.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY
    
    // Only clear if mouse is actually outside the column
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
  dragOverColumn.value = null
}
  }, 50)
}

async function onDrop(event: DragEvent, columnId: string) {
  if (draggedColumnId.value) {
    handleColumnDrop(event, columnId)
    return
  }
  event.preventDefault()
  event.stopPropagation()
  
  console.log('Drop on column:', columnId, 'Task:', draggedTask.value?.name)
  console.log('Drop event:', {
    dataTransfer: event.dataTransfer ? {
      types: Array.from(event.dataTransfer.types),
      dropEffect: event.dataTransfer.dropEffect,
      effectAllowed: event.dataTransfer.effectAllowed,
      data: event.dataTransfer.getData('text/plain')
    } : null,
    draggedTask: draggedTask.value
  })
  
  if (!draggedTask.value) {
    console.warn('No dragged task found, trying to get from dataTransfer')
    if (event.dataTransfer) {
      const data = event.dataTransfer.getData('text/plain')
      if (data) {
        const task = filesStore.files.get(data)
        if (task) {
          console.log('Found task from dataTransfer:', task)
          draggedTask.value = task as Task
        }
      }
    }
    if (!draggedTask.value) {
      console.warn('Still no dragged task found')
      return
    }
  }

  const task = draggedTask.value
  const newStatus = columnConfigs.value.find(column => column.id === columnId)?.status

  // Just update status, no folder movement needed
  if (newStatus && task.frontmatter.status !== newStatus) {
    console.log('Updating task status from', task.frontmatter.status, 'to', newStatus)
    try {
      const updated = await filesStore.updateFile(task.path, {
        frontmatter: { ...task.frontmatter, status: newStatus }
      })
      console.log('Task updated successfully:', updated)
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  } else {
    console.log('No status change needed. Current:', task.frontmatter.status, 'Target:', newStatus)
  }

  draggedTask.value = null
  dragOverColumn.value = null
}

// Get folder and frontmatter for a column - all tasks go to Tasks folder
function getColumnConfig(columnId: string) {
  const tasksFolder = filesStore.vaultConfig.folders.tasks
  const columnStatus = columnConfigs.value.find(column => column.id === columnId)?.status

  switch (columnStatus) {
    case 'not-started':
      return {
        folder: `${tasksFolder}/Next Actions`,
        frontmatter: { status: 'not-started' }
      }
    case 'next-action':
      return {
        folder: `${tasksFolder}/Next Actions`,
        frontmatter: { status: 'next-action', priority: 'medium' }
      }
    case 'waiting':
      return {
        folder: `${tasksFolder}/Waiting For`,
        frontmatter: { status: 'waiting' }
      }
    case 'someday':
      return {
        folder: `${tasksFolder}/Someday Maybe`,
        frontmatter: { status: 'someday' }
      }
    default:
      return { folder: tasksFolder, frontmatter: columnStatus ? { status: columnStatus } : {} }
  }
}

async function createTaskInColumn(columnId: string) {
  const name = prompt('Task name:')
  if (!name?.trim()) return

  const config = getColumnConfig(columnId)
  
  // Build frontmatter with area if filtered
  const frontmatter: Partial<Frontmatter> = {
    ...config.frontmatter,
    created: new Date().toISOString().split('T')[0]
  }
  
  // Add area if one is selected
  if (filterArea.value !== 'all') {
    frontmatter.area = filterArea.value
  }

  const newFile = await filesStore.createFile(
    config.folder,
    name.trim(),
    `# ${name.trim()}\n\n`,
    frontmatter
  )

  // Open the new task in editor
  if (newFile) {
    uiStore.openEditor(newFile)
  }
}
</script>

<template>
  <div class="h-full flex flex-col no-drag" style="-webkit-app-region: no-drag;">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface flex-shrink-0 no-drag" style="-webkit-app-region: no-drag;">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <LayoutGrid class="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Kanban Board</h1>
            <p class="text-sm text-gray-500">
              Drag tasks between columns
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <Filter class="w-4 h-4 text-gray-500" />
            <select 
              v-model="filterArea"
              class="input py-1.5 text-sm w-auto"
            >
              <option 
                v-for="area in areas" 
                :key="area.value" 
                :value="area.value"
              >
                {{ area.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Kanban board -->
    <div 
      class="flex-1 overflow-x-auto p-6 no-drag" 
      style="-webkit-app-region: no-drag;"
      @dragover.prevent="(e) => { e.preventDefault(); e.stopPropagation(); }"
      @drop.prevent="(e) => { e.preventDefault(); e.stopPropagation(); }"
    >
      <div class="flex gap-4 h-full min-w-max">
        <div
          v-for="column in columns"
          :key="column.id"
          :data-column-id="column.id"
          class="w-80 flex flex-col bg-surface-dark rounded-xl border-t-4 flex-shrink-0 no-drag"
          :class="[
            column.color,
            dragOverColumn === column.id ? 'ring-2 ring-accent' : '',
            dragOverColumnId === column.id ? 'ring-2 ring-warning' : ''
          ]"
          style="-webkit-app-region: no-drag !important;"
          @dragover="onDragOver($event, column.id)"
          @dragenter="onDragEnter($event, column.id)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, column.id)"
        >
          <!-- Column header -->
          <div class="px-4 py-3 border-b border-border/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <button
                  class="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
                  draggable="true"
                  @dragstart="handleColumnDragStart($event, column.id)"
                  @dragend="handleColumnDragEnd"
                >
                  <GripVertical class="w-4 h-4" />
                </button>
                <input
                  v-if="editingColumnId === column.id"
                  ref="titleInputRef"
                  v-model="editingTitle"
                  class="input py-1 px-2 text-sm w-full"
                  maxlength="60"
                  @keydown.enter.prevent="saveColumnTitle(column.id)"
                  @keydown.esc.prevent="cancelEditing"
                  @click.stop
                  @blur="cancelEditing"
                />
                <button
                  v-else
                  class="font-medium text-gray-100 truncate text-left"
                  @click="startEditingColumn(column)"
                >
                  {{ column.title }}
                </button>
              </div>
              <span class="text-sm text-gray-500 bg-surface px-2 py-0.5 rounded-full">
                {{ column.tasks.length }}
              </span>
            </div>
          </div>

          <!-- Tasks -->
          <div class="flex-1 overflow-y-auto p-2 no-drag" style="-webkit-app-region: no-drag;">
            <TransitionGroup name="kanban-list" tag="div" class="space-y-2">
              <div
                v-for="task in column.tasks"
                :key="task.path"
                draggable="true"
                class="bg-surface rounded-lg border border-border hover:border-border-light transition-all cursor-grab active:cursor-grabbing select-none no-drag"
                :class="{ 'opacity-50': draggedTask?.path === task.path }"
                style="-webkit-app-region: no-drag !important; user-select: none;"
                @dragstart="onDragStart($event, task)"
                @dragend="onDragEnd"
                @click="handleTaskClick(task)"
              >
                <TaskItem :task="task" :compact="true" :open-on-click="false" />
              </div>
            </TransitionGroup>

            <!-- Empty state -->
            <div 
              v-if="column.tasks.length === 0"
              class="text-center py-6 text-gray-600 text-sm"
            >
              Drop tasks here
            </div>

            <!-- Add task button -->
            <button
              class="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-surface-hover rounded-lg border border-dashed border-border hover:border-gray-500 transition-colors"
              @click="createTaskInColumn(column.id)"
            >
              <Plus class="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
        <div class="w-64 flex-shrink-0">
          <div
            class="bg-surface-dark border border-dashed border-border rounded-xl p-4 flex flex-col gap-3"
          >
            <button
              v-if="!addColumnOpen"
              class="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-surface-hover rounded-lg transition-colors"
              @click="openAddColumn"
            >
              <Plus class="w-4 h-4" />
              Add column
            </button>
            <div v-else class="flex flex-col gap-2">
              <input
                ref="newColumnInputRef"
                v-model="newColumnTitle"
                class="input py-2 px-3 text-sm w-full"
                placeholder="Column title"
                maxlength="60"
                @keydown.enter.prevent="handleAddColumn"
                @keydown.esc.prevent="cancelAddColumn"
              />
              <div class="flex gap-2">
                <button class="btn-primary btn-sm flex-1" @click="handleAddColumn">
                  Add
                </button>
                <button class="btn-secondary btn-sm flex-1" @click="cancelAddColumn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-list-move,
.kanban-list-enter-active,
.kanban-list-leave-active {
  transition: all 0.25s ease;
}

.kanban-list-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.kanban-list-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
