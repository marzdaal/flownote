import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'welcome',
    component: () => import('@/views/WelcomeView.vue'),
  },
  {
    path: '/inbox',
    name: 'inbox',
    component: () => import('@/views/InboxView.vue'),
  },
  {
    path: '/today',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsView.vue'),
  },
  {
    path: '/kanban',
    name: 'kanban',
    component: () => import('@/views/KanbanView.vue'),
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/CalendarView.vue'),
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('@/views/NotesView.vue'),
  },
  {
    path: '/daily',
    name: 'daily-notes',
    component: () => import('@/views/DailyNotesView.vue'),
  },
  {
    path: '/areas',
    name: 'areas',
    component: () => import('@/views/AreasView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard - redirect to welcome if no vault
router.beforeEach((to, from) => {
  const vaultPath = localStorage.getItem('flownotes-settings')
  const settings = vaultPath ? JSON.parse(vaultPath) : {}
  
  if (to.name !== 'welcome' && !settings.vaultPath) {
    return { name: 'welcome' }
  }
  
  if (to.name === 'welcome' && settings.vaultPath) {
    return { name: 'inbox' }
  }
})

export default router
