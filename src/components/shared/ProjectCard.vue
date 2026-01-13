<script setup lang="ts">
import { computed } from 'vue'
import { FolderKanban, Calendar, CheckCircle2, Circle, Target } from 'lucide-vue-next'
import type { Project } from '@/types'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'

const props = defineProps<{
  project: Project
}>()

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

const area = computed(() => props.project.frontmatter.area)
const status = computed(() => props.project.frontmatter.status)
const outcome = computed(() => props.project.frontmatter.outcome)
const startDate = computed(() => props.project.frontmatter.start)
const itemId = computed(() => props.project.frontmatter.id)

// Count related tasks
const relatedTasks = computed(() => {
  return filesStore.tasks.filter(t => 
    t.frontmatter.project?.includes(props.project.name)
  )
})

const completedTasks = computed(() => 
  relatedTasks.value.filter(t => t.frontmatter.status === 'done').length
)

const totalTasks = computed(() => relatedTasks.value.length)

const progress = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const areaColor = computed(() => {
  if (!area.value) return 'from-gray-500/20 to-gray-600/10 border-gray-500/30'
  
  const areaData = areasStore.getArea(area.value)
  if (!areaData) return 'from-gray-500/20 to-gray-600/10 border-gray-500/30'
  
  const color = areaData.color
  return `from-${color}-500/20 to-${color}-600/10 border-${color}-500/30`
})

const statusBadge = computed(() => {
  switch (status.value) {
    case 'active': return { label: 'Active', class: 'badge-accent' }
    case 'on-hold': return { label: 'On Hold', class: 'badge-warning' }
    case 'completed': return { label: 'Completed', class: 'badge-success' }
    default: return { label: status.value, class: 'badge-default' }
  }
})

function openProject() {
  uiStore.openEditor(props.project)
}
</script>

<template>
  <div 
    class="card bg-gradient-to-br cursor-pointer group"
    :class="areaColor"
    @click="openProject"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <FolderKanban class="w-5 h-5 text-gray-400" />
        <span :class="statusBadge.class">{{ statusBadge.label }}</span>
      </div>
      <span v-if="area" class="text-xs text-gray-500 capitalize">{{ area }}</span>
    </div>

    <!-- Title -->
    <div class="mb-2">
      <span 
        v-if="itemId" 
        class="text-xs font-mono text-gray-500 mr-2"
      >
        {{ itemId }}
      </span>
      <h3 class="font-semibold text-gray-100 group-hover:text-white transition-colors inline">
        {{ project.name }}
      </h3>
    </div>

    <!-- Outcome -->
    <p v-if="outcome" class="text-sm text-gray-400 line-clamp-2 mb-4">
      {{ outcome }}
    </p>

    <!-- Progress bar -->
    <div v-if="totalTasks > 0" class="mb-3">
      <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>Progress</span>
        <span>{{ completedTasks }}/{{ totalTasks }}</span>
      </div>
      <div class="h-1.5 bg-surface-dark rounded-full overflow-hidden">
        <div 
          class="h-full bg-accent rounded-full transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-border/50">
      <span v-if="startDate" class="flex items-center gap-1">
        <Calendar class="w-3 h-3" />
        Started {{ startDate }}
      </span>
      <span v-else class="text-gray-600">No start date</span>

      <span class="flex items-center gap-1">
        <CheckCircle2 v-if="completedTasks > 0" class="w-3 h-3 text-success" />
        <Circle v-else class="w-3 h-3" />
        {{ totalTasks }} tasks
      </span>
    </div>
  </div>
</template>
