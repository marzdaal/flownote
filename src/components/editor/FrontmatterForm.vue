<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Frontmatter, TaskStatus, ProjectStatus, Priority } from '@/types'
import { Calendar, Tag, User, Flag, FolderKanban, Target, Hash } from 'lucide-vue-next'
import { useAreasStore } from '@/stores/areas'

const areasStore = useAreasStore()

const props = defineProps<{
  frontmatter: Frontmatter
  fileType: 'task' | 'project' | 'note'
}>()

const emit = defineEmits<{
  update: [key: string, value: unknown]
}>()

// Local state for form fields
const localData = ref({ ...props.frontmatter })

const statusOptions: { value: TaskStatus | ProjectStatus; label: string }[] = props.fileType === 'task'
  ? [
      { value: 'not-started', label: 'Не начато' },
      { value: 'next-action', label: 'Next Action' },
      { value: 'waiting', label: 'Waiting For' },
      { value: 'someday', label: 'Someday/Maybe' },
      { value: 'done', label: 'Done' },
    ]
  : [
      { value: 'active', label: 'Active' },
      { value: 'on-hold', label: 'On Hold' },
      { value: 'completed', label: 'Completed' },
    ]

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-danger' },
  { value: 'medium', label: 'Medium', color: 'text-warning' },
  { value: 'low', label: 'Low', color: 'text-gray-400' },
]

const areaOptions = computed(() => 
  areasStore.areasList.map(a => ({
    value: a.id,
    label: a.name,
    color: areasStore.getAreaColor(a.id)
  }))
)

function updateField(key: string, value: unknown) {
  localData.value[key] = value
  emit('update', key, value)
}

const tagsInput = ref('')

function addTag() {
  if (!tagsInput.value.trim()) return
  
  const currentTags = localData.value.tags || []
  const newTags = [...currentTags, tagsInput.value.trim()]
  updateField('tags', newTags)
  tagsInput.value = ''
}

function removeTag(tag: string) {
  const currentTags = localData.value.tags || []
  updateField('tags', currentTags.filter(t => t !== tag))
}
</script>

<template>
  <div class="space-y-6">
    <!-- Status (for tasks and projects) -->
    <div v-if="fileType !== 'note'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <FolderKanban class="w-4 h-4 inline mr-2" />
        Status
      </label>
      <select 
        :value="localData.status"
        class="input"
        @change="updateField('status', ($event.target as HTMLSelectElement).value)"
      >
        <option 
          v-for="opt in statusOptions" 
          :key="opt.value" 
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Area -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <Target class="w-4 h-4 inline mr-2" />
        Area
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="area in areaOptions"
          :key="area.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
          :class="localData.area === area.value 
            ? 'border-accent bg-accent/20 text-gray-100' 
            : 'border-border text-gray-400 hover:border-border-light'"
          @click="updateField('area', area.value)"
        >
          <span :class="[area.color, 'w-2 h-2 rounded-full inline-block mr-2']" />
          {{ area.label }}
        </button>
      </div>
    </div>

    <!-- Priority (for tasks) -->
    <div v-if="fileType === 'task'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <Flag class="w-4 h-4 inline mr-2" />
        Priority
      </label>
      <div class="flex gap-2">
        <button
          v-for="priority in priorityOptions"
          :key="priority.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
          :class="localData.priority === priority.value 
            ? 'border-accent bg-accent/20 text-gray-100' 
            : 'border-border text-gray-400 hover:border-border-light'"
          @click="updateField('priority', priority.value)"
        >
          <span :class="priority.color">{{ priority.label }}</span>
        </button>
      </div>
    </div>

    <!-- Due Date (for tasks) -->
    <div v-if="fileType === 'task'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <Calendar class="w-4 h-4 inline mr-2" />
        Due Date
      </label>
      <input 
        type="date"
        :value="localData.due"
        class="input"
        @change="updateField('due', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Waiting For (for tasks) -->
    <div v-if="fileType === 'task' && localData.status === 'waiting'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <User class="w-4 h-4 inline mr-2" />
        Waiting For
      </label>
      <input 
        type="text"
        :value="localData.waiting_for"
        placeholder="@Person"
        class="input"
        @input="updateField('waiting_for', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Project Link (for tasks) -->
    <div v-if="fileType === 'task'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <FolderKanban class="w-4 h-4 inline mr-2" />
        Project
      </label>
      <input 
        type="text"
        :value="localData.project"
        placeholder="[[Project Name]]"
        class="input"
        @input="updateField('project', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Outcome (for projects) -->
    <div v-if="fileType === 'project'">
      <label class="block text-sm font-medium text-gray-400 mb-2">
        Outcome
      </label>
      <textarea 
        :value="localData.outcome"
        placeholder="What does success look like?"
        class="input min-h-[80px] resize-none"
        @input="updateField('outcome', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Tags -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-2">
        <Tag class="w-4 h-4 inline mr-2" />
        Tags
      </label>
      <div class="flex flex-wrap gap-2 mb-2">
        <span 
          v-for="tag in (localData.tags || [])" 
          :key="tag"
          class="tag group"
        >
          #{{ tag }}
          <button 
            class="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            @click="removeTag(tag)"
          >
            ×
          </button>
        </span>
      </div>
      <div class="flex gap-2">
        <input 
          v-model="tagsInput"
          type="text"
          placeholder="Add tag..."
          class="input flex-1"
          @keydown.enter.prevent="addTag"
        />
        <button class="btn-secondary btn-sm" @click="addTag">Add</button>
      </div>
    </div>

    <!-- ID & Dates -->
    <div class="pt-4 border-t border-border">
      <div class="text-xs text-gray-500 space-y-1">
        <p v-if="localData.id" class="flex items-center gap-2">
          <Hash class="w-3 h-3" />
          <span class="font-mono bg-surface-dark px-2 py-0.5 rounded text-gray-400">
            {{ localData.id }}
          </span>
        </p>
        <p v-if="localData.created">Created: {{ localData.created }}</p>
        <p v-if="localData.start">Started: {{ localData.start }}</p>
        <p v-if="localData.end">Completed: {{ localData.end }}</p>
      </div>
    </div>
  </div>
</template>
