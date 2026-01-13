<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Search, X, FileText, FolderKanban, CheckSquare, Inbox } from 'lucide-vue-next'
import { useSearch } from '@/composables/useSearch'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { query, results, setQuery, clearSearch } = useSearch()

const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

// Focus input on mount
onMounted(() => {
  setTimeout(() => {
    inputRef.value?.focus()
  }, 100)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

// Reset selection when results change
watch(results, () => {
  selectedIndex.value = 0
})

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

function handleClose() {
  clearSearch()
  uiStore.closeSearch()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (results.value[selectedIndex.value]) {
      selectResult(results.value[selectedIndex.value].file)
    }
  }
}

function selectResult(file: any) {
  uiStore.openEditor(file)
  handleClose()
}

function getFileIcon(folder: string) {
  if (folder.includes('Inbox')) return Inbox
  if (folder.includes('Tasks')) return CheckSquare
  if (folder.includes('Projects')) return FolderKanban
  return FileText
}

function highlightMatch(text: string, highlights: [number, number][]) {
  if (!highlights || highlights.length === 0) return text
  
  let result = ''
  let lastIndex = 0
  
  for (const [start, end] of highlights) {
    result += text.slice(lastIndex, start)
    result += `<mark class="bg-accent/30 text-accent rounded px-0.5">${text.slice(start, end)}</mark>`
    lastIndex = end
  }
  result += text.slice(lastIndex)
  
  return result
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div 
        v-if="uiStore.searchOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div class="w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-border overflow-hidden animate-scale-in">
          <!-- Search Input -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search class="w-5 h-5 text-gray-400" />
            <input
              ref="inputRef"
              type="text"
              :value="query"
              placeholder="Search files by name or content..."
              class="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-lg"
              @input="setQuery(($event.target as HTMLInputElement).value)"
              @keydown="handleKeydown"
            />
            <button 
              v-if="query"
              class="btn-ghost btn-icon btn-sm"
              @click="clearSearch"
            >
              <X class="w-4 h-4" />
            </button>
            <kbd class="hidden sm:inline-flex px-2 py-1 text-xs text-gray-500 bg-surface-dark rounded border border-border">
              ESC
            </kbd>
          </div>

          <!-- Results -->
          <div class="max-h-[400px] overflow-y-auto">
            <!-- Empty state -->
            <div v-if="query.length < 2" class="p-8 text-center text-gray-500">
              <Search class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Type at least 2 characters to search</p>
            </div>

            <!-- No results -->
            <div v-else-if="results.length === 0" class="p-8 text-center text-gray-500">
              <Search class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found for "{{ query }}"</p>
            </div>

            <!-- Results list -->
            <div v-else class="py-2">
              <button
                v-for="(result, index) in results"
                :key="result.file.path"
                class="w-full px-4 py-3 flex items-start gap-3 hover:bg-surface-hover transition-colors text-left"
                :class="{ 'bg-surface-hover': index === selectedIndex }"
                @click="selectResult(result.file)"
                @mouseenter="selectedIndex = index"
              >
                <component 
                  :is="getFileIcon(result.file.folder)" 
                  class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <!-- Title -->
                  <div 
                    class="font-medium text-gray-100 truncate"
                    v-html="result.matches.find(m => m.type === 'title')
                      ? highlightMatch(result.matches.find(m => m.type === 'title')!.text, result.matches.find(m => m.type === 'title')!.highlight)
                      : result.file.name"
                  />
                  
                  <!-- Folder path -->
                  <div class="text-xs text-gray-500 truncate">
                    {{ result.file.folder }}
                  </div>

                  <!-- Content match preview -->
                  <div 
                    v-if="result.matches.find(m => m.type === 'content')"
                    class="mt-1 text-sm text-gray-400 line-clamp-2"
                    v-html="highlightMatch(
                      result.matches.find(m => m.type === 'content')!.text,
                      result.matches.find(m => m.type === 'content')!.highlight
                    )"
                  />
                </div>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-2 border-t border-border bg-surface-dark flex items-center justify-between text-xs text-gray-500">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-surface rounded border border-border">↑</kbd>
                <kbd class="px-1.5 py-0.5 bg-surface rounded border border-border">↓</kbd>
                navigate
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-surface rounded border border-border">↵</kbd>
                open
              </span>
            </div>
            <span v-if="results.length > 0">
              {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.15s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
