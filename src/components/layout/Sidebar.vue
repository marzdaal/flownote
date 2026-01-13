<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { 
  Inbox, 
  CalendarDays, 
  FolderKanban, 
  LayoutGrid, 
  Calendar, 
  FileText, 
  Target,
  Settings,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'

const router = useRouter()
const route = useRoute()
const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

// Areas with task counts
const areasWithCounts = computed(() => {
  return areasStore.areasList.map(area => ({
    ...area,
    tasksCount: filesStore.tasks.filter(t => t.frontmatter.area === area.id).length
  }))
})

const navItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, path: '/inbox', count: () => filesStore.inboxFiles.length },
  { id: 'today', label: 'Today', icon: CalendarDays, path: '/today', count: () => filesStore.todayTasks.length },
  { id: 'projects', label: 'Projects', icon: FolderKanban, path: '/projects', count: () => filesStore.activeProjects.length },
  { id: 'kanban', label: 'Board', icon: LayoutGrid, path: '/kanban' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
  { id: 'notes', label: 'Notes', icon: FileText, path: '/notes', count: () => filesStore.notes.length },
  { id: 'areas', label: 'Areas', icon: Target, path: '/areas' },
]

const isActive = (path: string) => route.path === path

// Get vault name from path
const vaultName = computed(() => {
  const path = filesStore.vaultConfig.path
  if (!path) return null
  return path.split('/').pop() || path
})

function navigateTo(path: string) {
  router.push(path)
}

function handleQuickCapture() {
  uiStore.openQuickCapture()
}

function handleSearch() {
  uiStore.openSearch()
}

function handleAreaClick(areaId: string) {
  // Toggle area filter
  if (uiStore.selectedArea === areaId) {
    uiStore.setFilter('area', null)
  } else {
    uiStore.setFilter('area', areaId)
    // Navigate to kanban if not already there
    if (route.path !== '/kanban') {
      router.push('/kanban')
    }
  }
}
</script>

<template>
  <aside 
    class="flex flex-col bg-surface border-r border-border h-screen transition-all duration-200 overflow-hidden"
    :class="uiStore.sidebarCollapsed ? 'w-16' : 'w-sidebar'"
  >
    <!-- Logo & Quick Actions -->
    <div class="p-4 border-b border-border/50">
      <div class="flex items-center justify-between mb-4">
        <h1 
          v-if="!uiStore.sidebarCollapsed" 
          class="text-lg font-semibold text-gray-100"
        >
          FlowNotes
        </h1>
        <div class="flex items-center gap-1">
          <button 
            class="btn-ghost btn-icon btn-sm"
            title="Search (⌘K)"
            @click="handleSearch"
          >
            <Search class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Quick Capture Button -->
      <button 
        class="w-full btn-primary flex items-center justify-center gap-2"
        @click="handleQuickCapture"
      >
        <Plus class="w-4 h-4" />
        <span v-if="!uiStore.sidebarCollapsed">Quick Capture</span>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item w-full"
        :class="{ active: isActive(item.path) }"
        @click="navigateTo(item.path)"
      >
        <component :is="item.icon" class="icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="flex-1 text-left">
          {{ item.label }}
        </span>
        <span 
          v-if="!uiStore.sidebarCollapsed && item.count && item.count() > 0" 
          class="text-xs text-gray-500 bg-surface-dark px-2 py-0.5 rounded-full"
        >
          {{ item.count() }}
        </span>
      </button>
    </nav>

    <!-- Areas Quick Access -->
    <div v-if="!uiStore.sidebarCollapsed" class="p-3 border-t border-border/50">
      <p class="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Areas</p>
      <div class="space-y-1">
        <button 
          v-for="area in areasWithCounts" 
          :key="area.id"
          class="nav-item w-full text-sm"
          :class="{ active: uiStore.selectedArea === area.id }"
          @click="handleAreaClick(area.id)"
        >
          <span 
            class="w-2 h-2 rounded-full"
            :class="areasStore.getAreaColor(area.id)"
          />
          <span class="flex-1 text-left">{{ area.name }}</span>
          <span class="text-xs text-gray-500">{{ area.tasksCount }}</span>
        </button>
      </div>
    </div>

    <!-- Settings -->
    <div class="p-3 border-t border-border/50">
      <button 
        class="nav-item w-full"
        :class="{ active: isActive('/settings') }"
        @click="navigateTo('/settings')"
      >
        <Settings class="icon" />
        <span v-if="!uiStore.sidebarCollapsed">Settings</span>
      </button>

      <!-- Collapse toggle button -->
      <button 
        class="nav-item w-full mt-2"
        @click="uiStore.toggleSidebar()"
        :title="uiStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <component 
          :is="uiStore.sidebarCollapsed ? PanelLeftOpen : PanelLeftClose" 
          class="icon" 
        />
        <span v-if="!uiStore.sidebarCollapsed">Collapse</span>
      </button>

      <!-- Vault path indicator -->
      <div 
        v-if="!uiStore.sidebarCollapsed && vaultName"
        class="mt-2 px-3 py-2 text-xs text-gray-600 truncate"
        :title="filesStore.vaultConfig.path"
      >
        📁 {{ vaultName }}
      </div>
    </div>
  </aside>
</template>
