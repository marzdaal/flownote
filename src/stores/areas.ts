import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Area } from '@/types'

// Default areas
const defaultAreas: Area[] = [
  {
    id: 'work',
    name: 'Work',
    icon: 'Briefcase',
    color: 'blue',
    description: 'Career and professional development',
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'Heart',
    color: 'green',
    description: 'Physical and mental wellbeing',
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: 'BookOpen',
    color: 'purple',
    description: 'Education and skill development',
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'Home',
    color: 'orange',
    description: 'Household and living space',
  },
]

// Available colors for areas
export const areaColors = [
  { id: 'blue', name: 'Blue', class: 'bg-blue-500', text: 'text-blue-400' },
  { id: 'green', name: 'Green', class: 'bg-green-500', text: 'text-green-400' },
  { id: 'purple', name: 'Purple', class: 'bg-purple-500', text: 'text-purple-400' },
  { id: 'orange', name: 'Orange', class: 'bg-orange-500', text: 'text-orange-400' },
  { id: 'red', name: 'Red', class: 'bg-red-500', text: 'text-red-400' },
  { id: 'yellow', name: 'Yellow', class: 'bg-yellow-500', text: 'text-yellow-400' },
  { id: 'pink', name: 'Pink', class: 'bg-pink-500', text: 'text-pink-400' },
  { id: 'cyan', name: 'Cyan', class: 'bg-cyan-500', text: 'text-cyan-400' },
  { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500', text: 'text-indigo-400' },
  { id: 'teal', name: 'Teal', class: 'bg-teal-500', text: 'text-teal-400' },
]

// Available icons for areas
export const areaIcons = [
  'Briefcase', 'Heart', 'BookOpen', 'Home', 'Star', 'Target', 
  'Zap', 'Coffee', 'Music', 'Camera', 'Globe', 'Rocket',
  'Award', 'Gift', 'Smile', 'Sun', 'Moon', 'Cloud',
  'Compass', 'Flag', 'Bell', 'Calendar', 'Clock', 'Users'
]

export const useAreasStore = defineStore('areas', () => {
  // Load from localStorage or use defaults
  const stored = localStorage.getItem('flownotes-areas')
  const initial = stored ? JSON.parse(stored) : defaultAreas

  // State
  const areas = ref<Area[]>(initial)

  // Persist to localStorage
  watch(areas, (newAreas) => {
    localStorage.setItem('flownotes-areas', JSON.stringify(newAreas))
  }, { deep: true })

  // Computed
  const areasList = computed(() => areas.value)

  const areasMap = computed(() => {
    const map = new Map<string, Area>()
    areas.value.forEach(area => map.set(area.id, area))
    return map
  })

  // Actions
  function getArea(id: string): Area | undefined {
    return areasMap.value.get(id)
  }

  function getAreaColor(id: string): string {
    const area = getArea(id)
    if (!area) return 'bg-gray-500'
    const colorConfig = areaColors.find(c => c.id === area.color)
    return colorConfig?.class || 'bg-gray-500'
  }

  function getAreaTextColor(id: string): string {
    const area = getArea(id)
    if (!area) return 'text-gray-400'
    const colorConfig = areaColors.find(c => c.id === area.color)
    return colorConfig?.text || 'text-gray-400'
  }

  function createArea(area: Omit<Area, 'id'>): Area {
    const id = area.name.toLowerCase().replace(/\s+/g, '-')
    const newArea: Area = { ...area, id }
    areas.value.push(newArea)
    return newArea
  }

  function updateArea(id: string, updates: Partial<Omit<Area, 'id'>>): boolean {
    const index = areas.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    areas.value[index] = { ...areas.value[index], ...updates }
    return true
  }

  function deleteArea(id: string): boolean {
    const index = areas.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    areas.value.splice(index, 1)
    return true
  }

  function resetToDefaults() {
    areas.value = [...defaultAreas]
  }

  return {
    areas,
    areasList,
    areasMap,
    getArea,
    getAreaColor,
    getAreaTextColor,
    createArea,
    updateArea,
    deleteArea,
    resetToDefaults,
  }
})
