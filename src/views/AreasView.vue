<script setup lang="ts">
import { computed, ref } from 'vue'
import { Target, Briefcase, Heart, BookOpen, Home, ChevronRight, ChevronDown, FolderKanban, CheckSquare, Plus, Pencil, Trash2, X, Star, Zap, Coffee, Music, Camera, Globe, Rocket, Award, Gift, Smile, Sun, Moon, Cloud, Compass, Flag, Bell, Calendar, Clock, Users } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore, areaColors, areaIcons } from '@/stores/areas'
import { useRouter } from 'vue-router'
import type { Area } from '@/types'
import TaskItem from '@/components/shared/TaskItem.vue'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()
const router = useRouter()

const expandedArea = ref<string | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingArea = ref<Area | null>(null)

// Form state
const formName = ref('')
const formColor = ref('blue')
const formIcon = ref('Briefcase')
const formDescription = ref('')

// Icon components map
const iconComponents: Record<string, any> = {
  Briefcase, Heart, BookOpen, Home, Star, Target, 
  Zap, Coffee, Music, Camera, Globe, Rocket,
  Award, Gift, Smile, Sun, Moon, Cloud,
  Compass, Flag, Bell, Calendar, Clock, Users
}

const areasWithStats = computed(() => {
  return areasStore.areasList.map(area => {
    const tasks = filesStore.tasks.filter(t => t.frontmatter.area === area.id)
    const projects = filesStore.projects.filter(p => p.frontmatter.area === area.id)
    return {
      ...area,
      tasksCount: tasks.length,
      projectsCount: projects.length,
      tasks,
      projects,
    }
  })
})

function getColorClass(colorId: string) {
  return areaColors.find(c => c.id === colorId)?.class || 'bg-gray-500'
}

function getTextColorClass(colorId: string) {
  return areaColors.find(c => c.id === colorId)?.text || 'text-gray-400'
}

function toggleArea(areaId: string) {
  if (expandedArea.value === areaId) {
    expandedArea.value = null
  } else {
    expandedArea.value = areaId
  }
}

function goToKanban(areaId: string) {
  uiStore.setFilter('area', areaId)
  router.push('/kanban')
}

// Create area
function openCreateModal() {
  formName.value = ''
  formColor.value = 'blue'
  formIcon.value = 'Briefcase'
  formDescription.value = ''
  showCreateModal.value = true
}

function createArea() {
  if (!formName.value.trim()) return
  
  areasStore.createArea({
    name: formName.value.trim(),
    color: formColor.value,
    icon: formIcon.value,
    description: formDescription.value.trim(),
  })
  
  showCreateModal.value = false
}

// Edit area
function openEditModal(area: Area) {
  editingArea.value = area
  formName.value = area.name
  formColor.value = area.color
  formIcon.value = area.icon
  formDescription.value = area.description || ''
  showEditModal.value = true
}

function saveArea() {
  if (!editingArea.value || !formName.value.trim()) return
  
  areasStore.updateArea(editingArea.value.id, {
    name: formName.value.trim(),
    color: formColor.value,
    icon: formIcon.value,
    description: formDescription.value.trim(),
  })
  
  showEditModal.value = false
  editingArea.value = null
}

function deleteArea() {
  if (!editingArea.value) return
  
  if (confirm(`Delete area "${editingArea.value.name}"? Tasks and projects in this area will keep their area tag.`)) {
    areasStore.deleteArea(editingArea.value.id)
    showEditModal.value = false
    editingArea.value = null
  }
}

function closeModals() {
  showCreateModal.value = false
  showEditModal.value = false
  editingArea.value = null
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-purple-500/20 flex items-center justify-center">
          <Target class="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-100">Areas of Life</h1>
          <p class="text-sm text-gray-500">
            Balance across different aspects of your life
          </p>
        </div>
        </div>
        
        <button 
          class="btn-primary"
          @click="openCreateModal"
        >
          <Plus class="w-4 h-4" />
          New Area
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-4xl space-y-4">
        <!-- Area cards with expandable content -->
          <div
            v-for="area in areasWithStats"
            :key="area.id"
          class="card overflow-hidden group"
          >
          <!-- Header - clickable to expand -->
          <div 
            class="flex items-center justify-between cursor-pointer -m-4 p-4 hover:bg-surface-hover/50 transition-colors"
            @click="toggleArea(area.id)"
          >
              <div class="flex items-center gap-3">
                <div 
                class="w-12 h-12 rounded-xl flex items-center justify-center"
                :class="`bg-${area.color}-500/20`"
                >
                <component 
                  :is="iconComponents[area.icon] || Target" 
                  class="w-6 h-6" 
                  :class="getTextColorClass(area.color)" 
                />
                </div>
                <div>
                <h2 class="text-lg font-semibold text-gray-100">
                    {{ area.name }}
                  </h2>
                  <p class="text-sm text-gray-500">{{ area.description }}</p>
                </div>
              </div>
            
            <div class="flex items-center gap-4">
              <!-- Stats badges -->
              <div class="flex items-center gap-3 text-sm">
                <span class="flex items-center gap-1 text-gray-400">
                  <CheckSquare class="w-4 h-4" />
                  {{ area.tasksCount }}
                </span>
                <span class="flex items-center gap-1 text-gray-400">
                  <FolderKanban class="w-4 h-4" />
                  {{ area.projectsCount }}
                </span>
              </div>
              
              <!-- Edit button -->
              <button
                class="btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100"
                @click.stop="openEditModal(area)"
                title="Edit area"
              >
                <Pencil class="w-4 h-4" />
              </button>
              
              <component 
                :is="expandedArea === area.id ? ChevronDown : ChevronRight" 
                class="w-5 h-5 text-gray-500 transition-transform"
              />
            </div>
          </div>

          <!-- Expanded content -->
          <transition name="expand">
            <div v-if="expandedArea === area.id" class="mt-4 pt-4 border-t border-border">
              <!-- Projects section -->
              <div v-if="area.projects.length > 0" class="mb-4">
                <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FolderKanban class="w-4 h-4" />
                  Projects ({{ area.projects.length }})
                </h3>
                <div class="space-y-2">
                  <div 
                    v-for="project in area.projects" 
                    :key="project.path"
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover cursor-pointer"
                    @click.stop="uiStore.openEditor(project)"
                  >
                    <div class="w-2 h-2 rounded-full" :class="area.bgColor" />
                    <span class="text-gray-200 flex-1">{{ project.name }}</span>
                    <span 
                      class="badge text-xs"
                      :class="project.frontmatter.status === 'active' ? 'badge-accent' : 'badge-default'"
                    >
                      {{ project.frontmatter.status }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Tasks section -->
              <div v-if="area.tasks.length > 0">
                <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CheckSquare class="w-4 h-4" />
                  Tasks ({{ area.tasks.length }})
                </h3>
                <div class="space-y-1">
                  <TaskItem 
                    v-for="task in area.tasks.slice(0, 5)" 
                    :key="task.path" 
                    :task="task"
                    compact
                  />
                  <p 
                    v-if="area.tasks.length > 5" 
                    class="text-sm text-gray-500 text-center py-2"
                  >
                    +{{ area.tasks.length - 5 }} more tasks
                  </p>
                </div>
            </div>

              <!-- Empty state -->
              <div 
                v-if="area.projects.length === 0 && area.tasks.length === 0"
                class="text-center py-4 text-gray-500"
              >
                No projects or tasks in this area yet
              </div>

              <!-- Action buttons -->
              <div class="flex gap-2 mt-4 pt-4 border-t border-border">
                <button 
                  class="btn-secondary btn-sm flex-1"
                  @click.stop="goToKanban(area.id)"
                >
                  <FolderKanban class="w-4 h-4" />
                  View in Kanban
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Overview section -->
        <div class="card mt-6">
          <h3 class="text-lg font-semibold text-gray-100 mb-4">Overview</h3>
          
          <div class="space-y-4">
            <div 
              v-for="area in areasWithStats"
              :key="area.id"
              class="flex items-center gap-4"
            >
              <component 
                :is="iconComponents[area.icon] || Target" 
                class="w-5 h-5" 
                :class="getTextColorClass(area.color)" 
              />
              <span class="text-gray-300 flex-1">{{ area.name }}</span>
              
              <!-- Progress bar -->
              <div class="w-32 h-2 bg-surface-dark rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all"
                  :class="getColorClass(area.color)"
                  :style="{ width: `${Math.min((area.tasksCount / 10) * 100, 100)}%` }"
                />
              </div>
              
              <span class="text-sm text-gray-500 w-12 text-right">
                {{ area.tasksCount }} tasks
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div 
        v-if="showCreateModal || showEditModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background-color: rgba(0, 0, 0, 0.5);"
        @click.self="closeModals"
      >
        <div 
          class="w-full max-w-md mx-4 bg-surface rounded-xl shadow-2xl border border-border"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-border">
            <h3 class="text-lg font-medium text-gray-100">
              {{ showEditModal ? 'Edit Area' : 'New Area' }}
            </h3>
            <button 
              class="btn-ghost btn-icon btn-sm"
              @click="closeModals"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <!-- Form -->
          <div class="p-4 space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input 
                v-model="formName"
                type="text"
                placeholder="Area name..."
                class="input"
                autofocus
              />
            </div>
            
            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Description</label>
              <input 
                v-model="formDescription"
                type="text"
                placeholder="Short description..."
                class="input"
              />
            </div>
            
            <!-- Color -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Color</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in areaColors"
                  :key="color.id"
                  class="w-8 h-8 rounded-lg transition-all"
                  :class="[
                    color.class,
                    formColor === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : 'opacity-60 hover:opacity-100'
                  ]"
                  @click="formColor = color.id"
                  :title="color.name"
                />
              </div>
            </div>
            
            <!-- Icon -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Icon</label>
              <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <button
                  v-for="icon in areaIcons"
                  :key="icon"
                  class="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  :class="formIcon === icon ? 'bg-accent text-white' : 'bg-surface-dark text-gray-400 hover:text-gray-200'"
                  @click="formIcon = icon"
                >
                  <component :is="iconComponents[icon]" class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center justify-between p-4 border-t border-border">
            <div>
              <button 
                v-if="showEditModal"
                class="btn-ghost text-danger hover:bg-danger/10"
                @click="deleteArea"
              >
                <Trash2 class="w-4 h-4" />
                Delete
              </button>
            </div>
            <div class="flex gap-2">
              <button 
                class="btn-secondary"
                @click="closeModals"
              >
                Cancel
              </button>
              <button 
                class="btn-primary"
                @click="showEditModal ? saveArea() : createArea()"
                :disabled="!formName.trim()"
              >
                {{ showEditModal ? 'Save' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
