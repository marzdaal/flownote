<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { LayoutGrid, Filter, Plus } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'
import TaskItem from '@/components/shared/TaskItem.vue'
import type { Task, AreaType } from '@/types'

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

interface KanbanColumn {
  id: string
  title: string
  color: string
  tasks: Task[]
}

const columns = computed<KanbanColumn[]>(() => {
  const filter = (tasks: Task[]) => {
    if (filterArea.value === 'all') return tasks
    return tasks.filter(t => t.frontmatter.area === filterArea.value)
  }

  return [
    {
      id: 'not-started',
      title: 'Не начато',
      color: 'border-gray-500',
      tasks: filter(filesStore.notStarted),
    },
    {
      id: 'next',
      title: 'Next Actions',
      color: 'border-accent',
      tasks: filter(filesStore.nextActions),
    },
    {
      id: 'waiting',
      title: 'Waiting For',
      color: 'border-warning',
      tasks: filter(filesStore.waitingFor),
    },
    {
      id: 'someday',
      title: 'Someday',
      color: 'border-gray-600',
      tasks: filter(filesStore.somedayMaybe),
    },
  ]
})

const areas = computed(() => [
  { value: 'all' as const, label: 'All Areas' },
  ...areasStore.areasList.map(a => ({ value: a.id, label: a.name }))
])

// Simple drag and drop state
const draggedTask = ref<Task | null>(null)
const dragOverColumn = ref<string | null>(null)
const isDragging = ref(false)
const dragStartPos = ref<{ x: number; y: number } | null>(null)

function onDragStart(event: DragEvent, task: Task) {
  console.log('Drag start:', task.name)
  event.stopPropagation()
  draggedTask.value = task
  isDragging.value = true
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
  dragStartPos.value = null
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

async function handleDrop(columnId: string) {
  if (!draggedTask.value) return
  
  const task = draggedTask.value
  let newStatus = ''
  
  switch (columnId) {
    case 'not-started':
      newStatus = 'not-started'
      break
    case 'next':
      newStatus = 'next-action'
      break
    case 'waiting':
      newStatus = 'waiting'
      break
    case 'someday':
      newStatus = 'someday'
      break
  }
  
  if (newStatus && task.frontmatter.status !== newStatus) {
    console.log('Updating task status from', task.frontmatter.status, 'to', newStatus)
    await filesStore.updateFile(task.path, {
      frontmatter: { ...task.frontmatter, status: newStatus }
    })
  }
  
  draggedTask.value = null
  dragOverColumn.value = null
}

function onDragEnd(event: DragEvent) {
  console.log('Drag end')
  cleanupDrag()
}

function onDragEnter(event: DragEvent, columnId: string) {
  console.log('Drag enter column:', columnId)
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverColumn.value = columnId
}

function onDragOver(event: DragEvent, columnId: string) {
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
    console.log('Drag over column:', columnId, 'dropEffect:', event.dataTransfer.dropEffect, 'types:', Array.from(event.dataTransfer.types))
  }
  dragOverColumn.value = columnId
}

function onDragLeave(event: DragEvent) {
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
  let newStatus = ''

  switch (columnId) {
    case 'not-started':
      newStatus = 'not-started'
      break
    case 'next':
      newStatus = 'next-action'
      break
    case 'waiting':
      newStatus = 'waiting'
      break
    case 'someday':
      newStatus = 'someday'
      break
  }

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
  
  switch (columnId) {
    case 'not-started':
      return {
        folder: `${tasksFolder}/Next Actions`,
        frontmatter: { status: 'not-started' }
      }
    case 'next':
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
      return { folder: tasksFolder, frontmatter: {} }
  }
}

async function createTaskInColumn(columnId: string) {
  const name = prompt('Task name:')
  if (!name?.trim()) return

  const config = getColumnConfig(columnId)
  
  // Build frontmatter with area if filtered
  const frontmatter: Record<string, unknown> = {
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
          :class="[column.color, dragOverColumn === column.id ? 'ring-2 ring-accent' : '']"
          style="-webkit-app-region: no-drag !important;"
          @dragover="onDragOver($event, column.id)"
          @dragenter="onDragEnter($event, column.id)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, column.id)"
        >
          <!-- Column header -->
          <div class="px-4 py-3 border-b border-border/50">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-gray-100">{{ column.title }}</h3>
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
                @dragend="onDragEnd($event)"
                @click.stop
              >
                <TaskItem :task="task" :compact="true" />
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
