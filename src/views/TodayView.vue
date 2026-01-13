<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Plus, Sun, CheckCircle2, Filter } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'
import TaskItem from '@/components/shared/TaskItem.vue'
import type { AreaType } from '@/types'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

const filterArea = ref<AreaType | 'all'>('all')

const areas = computed(() => [
  { value: 'all' as const, label: 'All Areas' },
  ...areasStore.areasList.map(a => ({ value: a.id, label: a.name }))
])

const todayTasks = computed(() => {
  const tasks = filesStore.todayTasks
  if (filterArea.value === 'all') return tasks
  return tasks.filter(t => t.frontmatter.area === filterArea.value)
})
const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filesStore.nextActions.filter(t => {
    const due = t.frontmatter.due
    const areaMatch = filterArea.value === 'all' || t.frontmatter.area === filterArea.value
    return due && due < today && areaMatch
  })
})

const upcomingTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  
  return filesStore.nextActions.filter(t => {
    const due = t.frontmatter.due
    const areaMatch = filterArea.value === 'all' || t.frontmatter.area === filterArea.value
    return due && due > today && due <= nextWeekStr && areaMatch
  })
})

const todayNote = computed(() => filesStore.todayNote)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
})

function openDailyNote() {
  if (todayNote.value) {
    uiStore.openEditor(todayNote.value)
  }
}

async function createTodayTask() {
  const name = prompt('Task name:')
  if (!name) return

  const today = new Date().toISOString().split('T')[0]
  const area = filterArea.value !== 'all' ? filterArea.value : undefined
  
  const newTask = await filesStore.createFile(
    `${filesStore.vaultConfig.folders.tasks}/Next Actions`,
    name,
    `# ${name}\n\n`,
    { 
      status: 'next-action',
      due: today,
      area 
    }
  )
  
  if (newTask) {
    uiStore.openEditor(newTask)
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-6 border-b border-border bg-gradient-to-r from-surface to-surface-dark">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 mb-1">{{ formattedDate }}</p>
          <h1 class="text-2xl font-bold text-gray-100">
            {{ greeting }} 👋
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <!-- Area filter -->
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
          
          <button 
            v-if="todayNote"
            class="btn-secondary"
            @click="openDailyNote"
          >
            <CalendarDays class="w-4 h-4" />
            Daily Note
          </button>
          <button 
            class="btn-primary"
            @click="createTodayTask"
          >
            <Plus class="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex gap-6 mt-6">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <CheckCircle2 class="w-4 h-4 text-accent" />
          </div>
          <div>
            <p class="text-lg font-semibold text-gray-100">{{ todayTasks.length }}</p>
            <p class="text-xs text-gray-500">Today</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center">
            <CalendarDays class="w-4 h-4 text-danger" />
          </div>
          <div>
            <p class="text-lg font-semibold text-gray-100">{{ overdueTasks.length }}</p>
            <p class="text-xs text-gray-500">Overdue</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center">
            <CalendarDays class="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p class="text-lg font-semibold text-gray-100">{{ upcomingTasks.length }}</p>
            <p class="text-xs text-gray-500">This week</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-3xl space-y-8">
        <!-- Overdue -->
        <section v-if="overdueTasks.length > 0">
          <h2 class="text-sm font-medium text-danger uppercase tracking-wider mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Overdue
          </h2>
          <div class="card !border-danger/30 !bg-danger/5">
            <TaskItem 
              v-for="task in overdueTasks" 
              :key="task.path" 
              :task="task" 
            />
          </div>
        </section>

        <!-- Today -->
        <section>
          <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Today
          </h2>
          <div v-if="todayTasks.length > 0" class="card">
            <TaskItem 
              v-for="task in todayTasks" 
              :key="task.path" 
              :task="task" 
            />
          </div>
          <div 
            v-else 
            class="card text-center py-8 text-gray-500"
          >
            <Sun class="w-8 h-8 mx-auto mb-2 text-warning" />
            <p>No tasks scheduled for today</p>
            <button 
              class="btn-ghost btn-sm mt-2"
              @click="createTodayTask"
            >
              Add a task
            </button>
          </div>
        </section>

        <!-- Upcoming -->
        <section v-if="upcomingTasks.length > 0">
          <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            This Week
          </h2>
          <div class="card">
            <TaskItem 
              v-for="task in upcomingTasks" 
              :key="task.path" 
              :task="task" 
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
