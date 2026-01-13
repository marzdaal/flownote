<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, Search } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'

const filesStore = useFilesStore()
const uiStore = useUiStore()

const searchQuery = ref('')

const dailyNotes = computed(() => {
  let result = filesStore.dailyNotes

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(note => 
      note.name.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    )
  }

  return result.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Calendar class="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Дневные заметки</h1>
            <p class="text-sm text-gray-500">
              {{ dailyNotes.length }} заметок
            </p>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="mt-4 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Search daily notes..."
          class="input pl-10"
        />
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Empty state -->
      <div 
        v-if="dailyNotes.length === 0 && !searchQuery" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <div class="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mb-4">
          <Calendar class="w-8 h-8 text-gray-500" />
        </div>
        <h2 class="text-lg font-medium text-gray-300 mb-2">Нет дневных заметок</h2>
        <p class="text-gray-500 max-w-sm">
          Создайте дневную заметку, чтобы фиксировать планы и итоги дня.
        </p>
      </div>

      <!-- No results -->
      <div 
        v-else-if="dailyNotes.length === 0" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <Search class="w-12 h-12 text-gray-600 mb-4" />
        <h2 class="text-lg font-medium text-gray-300 mb-2">Ничего не найдено</h2>
        <p class="text-gray-500">Попробуйте изменить запрос.</p>
      </div>

      <!-- Daily notes grid -->
      <div 
        v-else 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="note in dailyNotes"
          :key="note.path"
          class="card cursor-pointer group"
          @click="uiStore.openEditor(note)"
        >
          <h3 class="font-medium text-gray-100 mb-2 group-hover:text-white transition-colors">
            {{ note.name }}
          </h3>

          <!-- Preview - clean markdown syntax -->
          <p class="text-sm text-gray-500 line-clamp-3 mb-3">
            {{ note.content
                .replace(/^#+ .*/gm, '')
                .replace(/\*\*/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/- \[ \]/g, '☐')
                .replace(/- \[x\]/g, '☑')
                .replace(/^- /gm, '• ')
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .trim()
                .slice(0, 150) 
            }}
          </p>

          <!-- Footer -->
          <div class="flex items-center gap-2 text-xs text-gray-600 pt-3 border-t border-border/50">
            <Calendar class="w-3 h-3" />
            {{ note.modifiedAt.toLocaleDateString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
