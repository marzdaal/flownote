<script setup lang="ts">
import { computed } from 'vue'
import { Inbox, Plus, Trash2, ArrowRight } from 'lucide-vue-next'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import FileCard from '@/components/shared/FileCard.vue'

const filesStore = useFilesStore()
const uiStore = useUiStore()

const inboxFiles = computed(() => filesStore.inboxFiles)
const isEmpty = computed(() => inboxFiles.value.length === 0)

function handleQuickCapture() {
  uiStore.openQuickCapture()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Inbox class="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-100">Inbox</h1>
            <p class="text-sm text-gray-500">
              {{ inboxFiles.length }} items to process
            </p>
          </div>
        </div>

        <button 
          class="btn-primary"
          @click="handleQuickCapture"
        >
          <Plus class="w-4 h-4" />
          Quick Capture
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Empty state -->
      <div 
        v-if="isEmpty" 
        class="h-full flex flex-col items-center justify-center text-center"
      >
        <div class="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mb-4">
          <Inbox class="w-8 h-8 text-gray-500" />
        </div>
        <h2 class="text-lg font-medium text-gray-300 mb-2">Inbox Zero!</h2>
        <p class="text-gray-500 max-w-sm mb-6">
          Your inbox is empty. Great job! Use Quick Capture to add new thoughts and ideas.
        </p>
        <button 
          class="btn-primary"
          @click="handleQuickCapture"
        >
          <Plus class="w-4 h-4" />
          Quick Capture
        </button>
      </div>

      <!-- File list -->
      <div v-else class="space-y-3 max-w-3xl">
        <div class="mb-6">
          <p class="text-sm text-gray-500 mb-4">
            Process each item: convert to Task, Project, or Note, then clear your inbox.
          </p>
        </div>

        <TransitionGroup name="list">
          <FileCard 
            v-for="file in inboxFiles" 
            :key="file.path"
            :file="file"
            :show-actions="true"
          />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
