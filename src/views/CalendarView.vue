<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import type { Task } from '@/types'

const filesStore = useFilesStore()
const uiStore = useUiStore()

const currentDate = ref(new Date())

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  tasks: Task[]
  hasDailyNote: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  // First day of the month
  const firstDay = new Date(year, month, 1)
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)
  
  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  // End on the Saturday of the week containing the last day
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  
  const days: CalendarDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const current = new Date(startDate)
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    
    // Find tasks for this day
    const tasks = filesStore.tasks.filter(t => t.frontmatter.due === dateStr)
    
    // Check for daily note
    const hasDailyNote = filesStore.dailyNotes.some(n => n.name.includes(dateStr))
    
    days.push({
      date: new Date(current),
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: current.getTime() === today.getTime(),
      tasks,
      hasDailyNote,
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function goToToday() {
  currentDate.value = new Date()
}

function selectDay(day: CalendarDay) {
  // If there's a daily note, open it
  if (day.hasDailyNote) {
    const dateStr = day.date.toISOString().split('T')[0]
    const note = filesStore.dailyNotes.find(n => n.name.includes(dateStr))
    if (note) {
      uiStore.openEditor(note)
    }
  }
}

function openTask(task: Task, event: Event) {
  event.stopPropagation()
  uiStore.openEditor(task)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Calendar class="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Calendar</h1>
            <p class="text-sm text-gray-500">
              Tasks and daily notes
            </p>
          </div>
        </div>

        <!-- Month navigation -->
        <div class="flex items-center gap-4">
          <button 
            class="btn-ghost btn-sm"
            @click="goToToday"
          >
            Today
          </button>
          <div class="flex items-center gap-2">
            <button 
              class="btn-ghost btn-icon btn-sm"
              @click="prevMonth"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-lg font-medium text-gray-100 w-40 text-center">
              {{ monthName }}
            </span>
            <button 
              class="btn-ghost btn-icon btn-sm"
              @click="nextMonth"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Calendar grid -->
    <div class="flex-1 overflow-hidden p-6">
      <div class="h-full flex flex-col">
        <!-- Days of week header -->
        <div class="grid grid-cols-7 gap-px mb-2">
          <div 
            v-for="day in daysOfWeek" 
            :key="day"
            class="text-center text-sm font-medium text-gray-500 py-2"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="flex-1 grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
          <div
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            class="bg-surface min-h-[100px] p-2 cursor-pointer hover:bg-surface-light transition-colors"
            :class="{
              'bg-surface-dark': !day.isCurrentMonth,
              'ring-2 ring-inset ring-accent': day.isToday,
            }"
            @click="selectDay(day)"
          >
            <!-- Day number -->
            <div class="flex items-center justify-between mb-1">
              <span 
                class="text-sm font-medium"
                :class="day.isCurrentMonth ? 'text-gray-100' : 'text-gray-600'"
              >
                {{ day.day }}
              </span>
              <span 
                v-if="day.hasDailyNote" 
                class="w-2 h-2 rounded-full bg-accent"
                title="Daily note"
              />
            </div>

            <!-- Tasks -->
            <div class="space-y-1">
              <div
                v-for="task in day.tasks.slice(0, 3)"
                :key="task.path"
                class="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-accent/20"
                :class="{
                  'bg-danger/20 text-danger': task.frontmatter.priority === 'high',
                  'bg-warning/20 text-warning': task.frontmatter.priority === 'medium',
                  'bg-surface-hover text-gray-300': task.frontmatter.priority === 'low' || !task.frontmatter.priority,
                }"
                @click="openTask(task, $event)"
              >
                {{ task.name }}
              </div>
              <div 
                v-if="day.tasks.length > 3"
                class="text-xs text-gray-500 px-1.5"
              >
                +{{ day.tasks.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
