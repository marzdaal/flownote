<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, Flag, Link, Hash } from 'lucide-vue-next'
import type { Task } from '@/types'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'

const props = defineProps<{
  task: Task
  compact?: boolean
  openOnClick?: boolean
}>()

const uiStore = useUiStore()
const areasStore = useAreasStore()

const priority = computed(() => props.task.frontmatter.priority)
const dueDate = computed(() => props.task.frontmatter.due)
const project = computed(() => props.task.frontmatter.project)
const waitingFor = computed(() => props.task.frontmatter.waiting_for)
const area = computed(() => props.task.frontmatter.area)
const itemId = computed(() => props.task.frontmatter.id)

const priorityColor = computed(() => {
  switch (priority.value) {
    case 'high': return 'border-danger'
    case 'medium': return 'border-warning'
    default: return 'border-border'
  }
})

const areaColor = computed(() => {
  if (!area.value) return 'bg-gray-500'
  return areasStore.getAreaColor(area.value)
})

const isOverdue = computed(() => {
  if (!dueDate.value) return false
  return new Date(dueDate.value) < new Date()
})

const isToday = computed(() => {
  if (!dueDate.value) return false
  return dueDate.value === new Date().toISOString().split('T')[0]
})

const shouldOpenOnClick = computed(() => props.openOnClick ?? !props.compact)

function openTask() {
  uiStore.openEditor(props.task)
}

function handleClick() {
  if (shouldOpenOnClick.value) {
    openTask()
  }
}

function handleMouseDown(event: MouseEvent) {
  if (!props.compact) {
    event.stopPropagation()
  }
}

function handleDragStart(event: DragEvent) {
  if (!props.compact) {
    event.stopPropagation()
  }
}
</script>

<template>
  <div 
    class="flex items-start gap-3 p-3 rounded-lg transition-colors group"
    :class="{ 
      'bg-surface-light': isToday, 
      'cursor-pointer hover:bg-surface-hover': shouldOpenOnClick
    }"
    :style="compact ? '-webkit-app-region: no-drag;' : ''"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @dragstart="handleDragStart"
  >
    <!-- Checkbox -->
    <button 
      class="w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-colors"
      :class="priorityColor"
      @click.stop
    >
      <!-- Checkmark would go here when completed -->
    </button>

    <div class="flex-1 min-w-0">
      <!-- Title with ID -->
      <div class="flex items-center gap-2">
        <span 
          v-if="itemId" 
          class="text-xs font-mono text-gray-500 bg-surface-dark px-1.5 py-0.5 rounded"
        >
          {{ itemId }}
        </span>
      <p class="text-gray-100 leading-snug" :class="{ 'line-through text-gray-500': false }">
        {{ task.name }}
      </p>
      </div>

      <!-- Meta row -->
      <div 
        v-if="!compact" 
        class="flex items-center gap-3 mt-1.5 text-xs"
      >
        <!-- Area dot -->
        <span 
          v-if="area"
          class="w-2 h-2 rounded-full"
          :class="areaColor"
        />

        <!-- Due date -->
        <span 
          v-if="dueDate" 
          class="flex items-center gap-1"
          :class="isOverdue ? 'text-danger' : isToday ? 'text-accent' : 'text-gray-500'"
        >
          <Calendar class="w-3 h-3" />
          {{ isToday ? 'Today' : dueDate }}
        </span>

        <!-- Waiting for -->
        <span 
          v-if="waitingFor" 
          class="text-gray-500"
        >
          {{ waitingFor }}
        </span>

        <!-- Project link -->
        <span 
          v-if="project" 
          class="flex items-center gap-1 text-gray-500 hover:text-gray-300"
        >
          <Link class="w-3 h-3" />
          {{ project.replace(/\[\[|\]\]/g, '') }}
        </span>
      </div>
    </div>

    <!-- Priority flag -->
    <Flag 
      v-if="priority === 'high'"
      class="w-4 h-4 text-danger flex-shrink-0 opacity-60"
    />
  </div>
</template>
