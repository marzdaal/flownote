<script setup lang="ts">
import { computed, ref } from 'vue'
import { FolderKanban, Plus, Filter, Grid, List, ArrowUpDown } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'
import ProjectCard from '@/components/shared/ProjectCard.vue'
import type { AreaType } from '@/types'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

const viewMode = ref<'grid' | 'list'>('grid')
const filterArea = ref<AreaType | 'all'>('all')
const filterStatus = ref<'active' | 'all'>('active')
const sortBy = ref<'date' | 'name' | 'area'>('date')

const sortOptions = [
  { value: 'date', label: 'Start Date' },
  { value: 'name', label: 'Name' },
  { value: 'area', label: 'Area' },
]

const projects = computed(() => {
  let result = filesStore.projects

  if (filterStatus.value === 'active') {
    result = result.filter(p => p.frontmatter.status === 'active')
  }

  if (filterArea.value !== 'all') {
    result = result.filter(p => p.frontmatter.area === filterArea.value)
  }

  return result.sort((a, b) => {
    // First sort active projects to top
    if (a.frontmatter.status === 'active' && b.frontmatter.status !== 'active') return -1
    if (a.frontmatter.status !== 'active' && b.frontmatter.status === 'active') return 1
    
    // Then sort by selected criteria
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'area':
        return (a.frontmatter.area || '').localeCompare(b.frontmatter.area || '')
      case 'date':
      default:
    return (b.frontmatter.start || '').localeCompare(a.frontmatter.start || '')
    }
  })
})

const activeCount = computed(() => 
  filesStore.projects.filter(p => p.frontmatter.status === 'active').length
)

const areas = computed(() => [
  { value: 'all' as const, label: 'All Areas' },
  ...areasStore.areasList.map(a => ({ value: a.id, label: a.name }))
])

async function createProject() {
  const name = prompt('Project name:')
  if (!name) return

  await filesStore.createFile(
    filesStore.vaultConfig.folders.projects,
    name,
    `# ${name}\n\n## Outcome\n\n## Tasks\n\n`,
    {
      status: 'active',
      start: new Date().toISOString().split('T')[0],
    }
  )
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FolderKanban class="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Projects</h1>
            <p class="text-sm text-gray-500">
              {{ activeCount }} active projects
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- View toggle -->
          <div class="flex items-center bg-surface-dark rounded-lg p-1">
            <button 
              class="p-1.5 rounded"
              :class="viewMode === 'grid' ? 'bg-surface-hover text-gray-100' : 'text-gray-500'"
              @click="viewMode = 'grid'"
            >
              <Grid class="w-4 h-4" />
            </button>
            <button 
              class="p-1.5 rounded"
              :class="viewMode === 'list' ? 'bg-surface-hover text-gray-100' : 'text-gray-500'"
              @click="viewMode = 'list'"
            >
              <List class="w-4 h-4" />
            </button>
          </div>

          <button 
            class="btn-primary"
            @click="createProject"
          >
            <Plus class="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mt-4">
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

        <!-- Sort dropdown -->
        <div class="flex items-center gap-2">
          <ArrowUpDown class="w-4 h-4 text-gray-500" />
          <select 
            v-model="sortBy"
            class="input py-1.5 text-sm w-auto"
          >
            <option 
              v-for="opt in sortOptions" 
              :key="opt.value" 
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <button 
            class="btn-sm"
            :class="filterStatus === 'active' ? 'btn-primary' : 'btn-ghost'"
            @click="filterStatus = 'active'"
          >
            Active
          </button>
          <button 
            class="btn-sm"
            :class="filterStatus === 'all' ? 'btn-primary' : 'btn-ghost'"
            @click="filterStatus = 'all'"
          >
            All
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Empty state -->
      <div 
        v-if="projects.length === 0" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <div class="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mb-4">
          <FolderKanban class="w-8 h-8 text-gray-500" />
        </div>
        <h2 class="text-lg font-medium text-gray-300 mb-2">No projects yet</h2>
        <p class="text-gray-500 max-w-sm mb-6">
          Projects help you organize related tasks towards a specific outcome.
        </p>
        <button 
          class="btn-primary"
          @click="createProject"
        >
          <Plus class="w-4 h-4" />
          Create Project
        </button>
      </div>

      <!-- Grid view -->
      <div 
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <ProjectCard 
          v-for="project in projects" 
          :key="project.path" 
          :project="project" 
        />
      </div>

      <!-- List view -->
      <div v-else class="space-y-2 max-w-4xl">
        <div 
          v-for="project in projects" 
          :key="project.path"
          class="card flex items-center gap-4 cursor-pointer"
          @click="uiStore.openEditor(project)"
        >
          <div 
            class="w-2 h-10 rounded-full"
            :class="project.frontmatter.area ? areasStore.getAreaColor(project.frontmatter.area) : 'bg-gray-500'"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span 
                v-if="project.frontmatter.id" 
                class="text-xs font-mono text-gray-500 bg-surface-dark px-1.5 py-0.5 rounded"
              >
                {{ project.frontmatter.id }}
              </span>
            <h3 class="font-medium text-gray-100">{{ project.name }}</h3>
            </div>
            <p v-if="project.frontmatter.outcome" class="text-sm text-gray-500 truncate">
              {{ project.frontmatter.outcome }}
            </p>
          </div>
          <span 
            class="badge"
            :class="{
              'badge-accent': project.frontmatter.status === 'active',
              'badge-warning': project.frontmatter.status === 'on-hold',
              'badge-success': project.frontmatter.status === 'completed',
            }"
          >
            {{ project.frontmatter.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
