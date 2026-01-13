<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileText, Plus, Search, Tag, Calendar } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { useAreasStore } from '@/stores/areas'

const filesStore = useFilesStore()
const uiStore = useUiStore()
const areasStore = useAreasStore()

const searchQuery = ref('')
const selectedTag = ref<string | null>(null)
const selectedArea = ref<string | null>(null)

const notes = computed(() => {
  let result = filesStore.notes

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(n => 
      n.name.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    )
  }

  if (selectedTag.value) {
    result = result.filter(n => 
      n.frontmatter.tags?.includes(selectedTag.value!)
    )
  }

  if (selectedArea.value) {
    result = result.filter(n => n.frontmatter.area === selectedArea.value)
  }

  return result.sort((a, b) => 
    b.modifiedAt.getTime() - a.modifiedAt.getTime()
  )
})

const areas = computed(() => areasStore.areasList)

const allTags = computed(() => {
  const tags = new Set<string>()
  filesStore.notes.forEach(note => {
    note.frontmatter.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

async function createNote() {
  const name = prompt('Note title:')
  if (!name) return

  const frontmatter: Record<string, unknown> = { tags: [] }
  if (selectedArea.value) {
    frontmatter.area = selectedArea.value
  }

  const note = await filesStore.createFile(
    filesStore.vaultConfig.folders.notes,
    name,
    `# ${name}\n\n`,
    frontmatter
  )

  if (note) {
    uiStore.openEditor(note)
  }
}

function selectTag(tag: string) {
  selectedTag.value = selectedTag.value === tag ? null : tag
}

function selectArea(areaId: string) {
  selectedArea.value = selectedArea.value === areaId ? null : areaId
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <FileText class="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Заметки</h1>
            <p class="text-sm text-gray-500">
              {{ filesStore.notes.length }} заметок
            </p>
          </div>
        </div>

        <button 
          class="btn-primary"
          @click="createNote"
        >
          <Plus class="w-4 h-4" />
          New Note
        </button>
      </div>

      <!-- Search -->
      <div class="mt-4 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Search notes..."
          class="input pl-10"
        />
      </div>

      <!-- Filters: Areas and Tags -->
      <div class="flex flex-wrap items-center gap-4 mt-4">
        <!-- Area filter -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Area:</span>
          <div class="flex gap-1">
            <button
              v-for="area in areas"
              :key="area.id"
              class="w-6 h-6 rounded-full flex items-center justify-center transition-all"
              :class="[
                areasStore.getAreaColor(area.id),
                selectedArea === area.id ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : 'opacity-50 hover:opacity-100'
              ]"
              :title="area.name"
              @click="selectArea(area.id)"
            />
          </div>
      </div>

      <!-- Tags -->
        <div v-if="allTags.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag"
          :class="{ 'bg-accent/20 text-accent': selectedTag === tag }"
          @click="selectTag(tag)"
        >
          <Tag class="w-3 h-3" />
          {{ tag }}
        </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Empty state -->
      <div 
        v-if="notes.length === 0 && !searchQuery && !selectedTag" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <div class="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mb-4">
          <FileText class="w-8 h-8 text-gray-500" />
        </div>
        <h2 class="text-lg font-medium text-gray-300 mb-2">No notes yet</h2>
        <p class="text-gray-500 max-w-sm mb-6">
          Start building your knowledge base with notes.
        </p>
        <button 
          class="btn-primary"
          @click="createNote"
        >
          <Plus class="w-4 h-4" />
          Create Note
        </button>
      </div>

      <!-- No results -->
      <div 
        v-else-if="notes.length === 0" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <Search class="w-12 h-12 text-gray-600 mb-4" />
        <h2 class="text-lg font-medium text-gray-300 mb-2">No notes found</h2>
        <p class="text-gray-500">Try a different search term or tag.</p>
      </div>

      <!-- Notes grid -->
      <div 
        v-else 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="note in notes"
          :key="note.path"
          class="card cursor-pointer group"
          @click="uiStore.openEditor(note)"
        >
          <!-- Header with ID and Area -->
          <div class="flex items-center gap-2 mb-2">
            <span 
              v-if="note.frontmatter.id" 
              class="text-xs font-mono text-gray-500 bg-surface-dark px-1.5 py-0.5 rounded"
            >
              {{ note.frontmatter.id }}
            </span>
            <span 
              v-if="note.frontmatter.area"
              class="w-2 h-2 rounded-full"
              :class="areasStore.getAreaColor(note.frontmatter.area)"
            />
          </div>
          
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

          <!-- Tags -->
          <div v-if="note.frontmatter.tags?.length" class="flex flex-wrap gap-1 mb-3">
            <span 
              v-for="tag in note.frontmatter.tags.slice(0, 3)" 
              :key="tag"
              class="tag text-2xs"
            >
              #{{ tag }}
            </span>
            <span 
              v-if="note.frontmatter.tags.length > 3" 
              class="text-2xs text-gray-600"
            >
              +{{ note.frontmatter.tags.length - 3 }}
            </span>
          </div>

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
