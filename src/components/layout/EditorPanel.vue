<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { X, Trash2, MoreHorizontal } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import { useSettingsStore } from '@/stores/settings'
import { useMarkdown } from '@/composables/useMarkdown'
import TiptapEditor from '@/components/editor/TiptapEditor.vue'
import FrontmatterForm from '@/components/editor/FrontmatterForm.vue'

const emit = defineEmits<{
  close: []
}>()

const uiStore = useUiStore()
const filesStore = useFilesStore()
const settingsStore = useSettingsStore()
const { markdownToHtml } = useMarkdown()

const activeTab = ref<'content' | 'properties'>('content')
const isModified = ref(false)
const pendingContent = ref<string>('')
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
let saveInFlight: ReturnType<typeof filesStore.updateFile> | null = null
let saveQueued = false

const file = computed(() => uiStore.editorFile)

// Convert markdown content to HTML for Tiptap
const htmlContent = computed(() => {
  if (!file.value?.content) return ''
  return markdownToHtml(file.value.content)
})

// Watch for file changes - reset state when new file is opened
watch(() => file.value?.path, () => {
  isModified.value = false
  pendingContent.value = htmlContent.value
})

// Initialize pending content with HTML
onMounted(() => {
  pendingContent.value = htmlContent.value
})

// Cleanup auto-save timeout on unmount
onUnmounted(() => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }
})

function handleContentChange(newContent: string) {
  pendingContent.value = newContent
  isModified.value = true
  
  scheduleAutoSave()
}

const pendingFrontmatter = ref<Record<string, unknown>>({})

// Initialize pending frontmatter when file changes
watch(() => file.value?.path, () => {
  pendingFrontmatter.value = { ...file.value?.frontmatter } ?? {}
}, { immediate: true })

async function handleSave() {
  if (!file.value || !isModified.value) return

  if (saveInFlight) {
    saveQueued = true
    return
  }

  try {
    saveInFlight = filesStore.updateFile(file.value.path, {
      content: pendingContent.value,
      frontmatter: { ...file.value.frontmatter, ...pendingFrontmatter.value },
    })
    await saveInFlight
    isModified.value = false
  } finally {
    saveInFlight = null
  }

  if (saveQueued) {
    saveQueued = false
    await handleSave()
  }
}

function handleFrontmatterUpdate(key: string, value: unknown) {
  pendingFrontmatter.value[key] = value
  isModified.value = true

  scheduleAutoSave()
}

function scheduleAutoSave() {
  if (!settingsStore.settings.autoSave) return

  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }

  const delay = settingsStore.settings.autoSaveDelay ?? 0

  if (delay <= 0) {
    queueMicrotask(() => {
      void handleSave()
    })
    return
  }

  autoSaveTimeout = setTimeout(() => {
    void handleSave()
  }, delay)
}

async function handleDelete() {
  if (!file.value) return
  
  if (confirm('Are you sure you want to delete this file?')) {
    await filesStore.deleteFile(file.value.path)
    emit('close')
  }
}

function handleClose() {
  if (isModified.value) {
    if (confirm('You have unsaved changes. Discard them?')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}
</script>

<template>
  <div class="fixed inset-y-0 right-0 w-[600px] bg-surface border-l border-border shadow-2xl flex flex-col z-40 animate-slide-in">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-dark">
      <div class="flex items-center gap-3">
        <button 
          class="btn-ghost btn-icon btn-sm"
          @click="handleClose"
        >
          <X class="w-4 h-4" />
        </button>
        <h2 class="font-medium text-gray-100 truncate max-w-[300px]">
          {{ file?.name || 'Untitled' }}
        </h2>
        <span 
          v-if="isModified" 
          class="w-2 h-2 rounded-full bg-warning"
          title="Unsaved changes"
        />
      </div>

      <div class="flex items-center gap-2">
        <button 
          class="btn-ghost btn-icon btn-sm text-gray-400 hover:text-danger"
          title="Delete"
          @click="handleDelete"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <button class="btn-ghost btn-icon btn-sm">
          <MoreHorizontal class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-border bg-surface-dark">
      <button 
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'content' 
          ? 'text-gray-100 border-b-2 border-accent' 
          : 'text-gray-400 hover:text-gray-200'"
        @click="activeTab = 'content'"
      >
        Content
      </button>
      <button 
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'properties' 
          ? 'text-gray-100 border-b-2 border-accent' 
          : 'text-gray-400 hover:text-gray-200'"
        @click="activeTab = 'properties'"
      >
        Properties
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <template v-if="file">
        <!-- Content Tab -->
        <div v-show="activeTab === 'content'" class="h-full">
          <TiptapEditor 
            :content="htmlContent"
            @update="handleContentChange"
          />
        </div>

        <!-- Properties Tab -->
        <div v-show="activeTab === 'properties'" class="p-4">
          <FrontmatterForm 
            :frontmatter="file.frontmatter"
            :file-type="file.folder.includes('Tasks') ? 'task' : file.folder.includes('Projects') ? 'project' : 'note'"
            @update="handleFrontmatterUpdate"
          />
        </div>
      </template>

      <div v-else class="flex items-center justify-center h-full text-gray-500">
        No file selected
      </div>
    </div>

    <!-- Footer with file info -->
    <div class="px-4 py-2 border-t border-border bg-surface-dark text-xs text-gray-500 flex items-center justify-between">
      <span>{{ file?.folder }}</span>
      <span>Modified {{ file?.modifiedAt.toLocaleDateString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-in {
  animation: slideInRight 0.2s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
