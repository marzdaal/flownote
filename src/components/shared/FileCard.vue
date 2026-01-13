<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Calendar, Flag } from 'lucide-vue-next'
import type { VaultFile } from '@/types'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import { useAreasStore } from '@/stores/areas'

const props = defineProps<{
  file: VaultFile
  showActions?: boolean
}>()

const uiStore = useUiStore()
const filesStore = useFilesStore()
const areasStore = useAreasStore()

const priority = computed(() => props.file.frontmatter.priority)
const dueDate = computed(() => props.file.frontmatter.due)
const area = computed(() => props.file.frontmatter.area)
const itemId = computed(() => props.file.frontmatter.id)

const priorityColor = computed(() => {
  switch (priority.value) {
    case 'high': return 'text-danger'
    case 'medium': return 'text-warning'
    default: return 'text-gray-400'
  }
})

const areaColor = computed(() => {
  if (!area.value) return 'bg-gray-500'
  return areasStore.getAreaColor(area.value as string)
})

const isOverdue = computed(() => {
  if (!dueDate.value) return false
  return new Date(dueDate.value) < new Date()
})

function openFile() {
  uiStore.openEditor(props.file)
}

async function moveToTask() {
  await filesStore.moveFile(
    props.file.path, 
    `${filesStore.vaultConfig.folders.tasks}/Next Actions`,
    'task'
  )
}

async function moveToProject() {
  await filesStore.moveFile(
    props.file.path, 
    filesStore.vaultConfig.folders.projects,
    'project'
  )
}

async function moveToNote() {
  await filesStore.moveFile(
    props.file.path, 
    filesStore.vaultConfig.folders.notes
  )
}
</script>

<template>
  <div 
    class="card group cursor-pointer hover:bg-surface-light"
    @click="openFile"
  >
    <div class="flex items-start gap-3">
      <!-- Area indicator -->
      <span 
        v-if="area"
        class="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
        :class="areaColor"
      />

      <div class="flex-1 min-w-0">
        <!-- Title with ID -->
        <div class="flex items-center gap-2">
          <span 
            v-if="itemId" 
            class="text-xs font-mono text-gray-500 bg-surface-dark px-1.5 py-0.5 rounded flex-shrink-0"
          >
            {{ itemId }}
          </span>
          <h3 class="font-medium text-gray-100 truncate">
            {{ file.name }}
          </h3>
        </div>

        <!-- Meta info -->
        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <!-- Due date -->
          <span 
            v-if="dueDate" 
            class="flex items-center gap-1"
            :class="{ 'text-danger': isOverdue }"
          >
            <Calendar class="w-3 h-3" />
            {{ dueDate }}
          </span>

          <!-- Priority -->
          <span 
            v-if="priority" 
            class="flex items-center gap-1"
            :class="priorityColor"
          >
            <Flag class="w-3 h-3" />
            {{ priority }}
          </span>

          <!-- Folder -->
          <span class="text-gray-600">
            {{ file.folder.split('/').pop() }}
          </span>
        </div>
      </div>

      <!-- Quick actions (for inbox) -->
      <div 
        v-if="showActions"
        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop
      >
        <button 
          class="btn-ghost btn-sm text-xs"
          title="Move to Tasks"
          @click="moveToTask"
        >
          <ArrowRight class="w-3 h-3" />
          Task
        </button>
        <button 
          class="btn-ghost btn-sm text-xs"
          title="Move to Projects"
          @click="moveToProject"
        >
          <ArrowRight class="w-3 h-3" />
          Project
        </button>
        <button 
          class="btn-ghost btn-sm text-xs"
          title="Move to Notes"
          @click="moveToNote"
        >
          <ArrowRight class="w-3 h-3" />
          Note
        </button>
      </div>
    </div>
  </div>
</template>
