<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Link as LinkIcon,
  Undo,
  Redo
} from 'lucide-vue-next'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  update: [content: string]
}>()

const editor = useEditor({
  content: props.content,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: 'Start writing...',
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-accent hover:text-accent-hover underline',
      },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-invert max-w-none p-6 min-h-full focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update', editor.getHTML())
  },
})

// Watch for external content changes
watch(() => props.content, (newContent) => {
  if (editor.value && newContent !== editor.value.getHTML()) {
    editor.value.commands.setContent(newContent)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const toolbarItems = [
  { icon: Bold, action: () => editor.value?.chain().focus().toggleBold().run(), isActive: () => editor.value?.isActive('bold') },
  { icon: Italic, action: () => editor.value?.chain().focus().toggleItalic().run(), isActive: () => editor.value?.isActive('italic') },
  { icon: Strikethrough, action: () => editor.value?.chain().focus().toggleStrike().run(), isActive: () => editor.value?.isActive('strike') },
  { icon: Code, action: () => editor.value?.chain().focus().toggleCode().run(), isActive: () => editor.value?.isActive('code') },
  { type: 'divider' },
  { icon: Heading1, action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.value?.isActive('heading', { level: 1 }) },
  { icon: Heading2, action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.value?.isActive('heading', { level: 2 }) },
  { icon: Heading3, action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.value?.isActive('heading', { level: 3 }) },
  { type: 'divider' },
  { icon: List, action: () => editor.value?.chain().focus().toggleBulletList().run(), isActive: () => editor.value?.isActive('bulletList') },
  { icon: ListOrdered, action: () => editor.value?.chain().focus().toggleOrderedList().run(), isActive: () => editor.value?.isActive('orderedList') },
  { icon: CheckSquare, action: () => editor.value?.chain().focus().toggleTaskList().run(), isActive: () => editor.value?.isActive('taskList') },
  { type: 'divider' },
  { icon: Quote, action: () => editor.value?.chain().focus().toggleBlockquote().run(), isActive: () => editor.value?.isActive('blockquote') },
  { icon: Minus, action: () => editor.value?.chain().focus().setHorizontalRule().run() },
  { type: 'divider' },
  { icon: Undo, action: () => editor.value?.chain().focus().undo().run() },
  { icon: Redo, action: () => editor.value?.chain().focus().redo().run() },
]
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface-dark flex-wrap">
      <template v-for="(item, index) in toolbarItems" :key="index">
        <div 
          v-if="item.type === 'divider'" 
          class="w-px h-5 bg-border mx-1"
        />
        <button 
          v-else
          class="btn-ghost btn-icon btn-sm"
          :class="{ 'bg-surface-hover text-gray-100': item.isActive?.() }"
          @click="item.action"
        >
          <component :is="item.icon" class="w-4 h-4" />
        </button>
      </template>
    </div>

    <!-- Editor -->
    <div class="flex-1 overflow-y-auto">
      <EditorContent :editor="editor" class="h-full" />
    </div>
  </div>
</template>

<style>
/* Tiptap editor styles */
.ProseMirror {
  min-height: 100%;
}

.ProseMirror p.is-editor-empty:first-child::before {
  @apply text-gray-500;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror h1 {
  @apply text-2xl font-bold mb-4 text-gray-100;
}

.ProseMirror h2 {
  @apply text-xl font-semibold mb-3 text-gray-100;
}

.ProseMirror h3 {
  @apply text-lg font-medium mb-2 text-gray-100;
}

.ProseMirror p {
  @apply mb-3 text-gray-300 leading-relaxed;
}

/* List styles */
.ProseMirror ul {
  @apply pl-6 mb-3;
  list-style-type: disc;
}

.ProseMirror ol {
  @apply pl-6 mb-3;
  list-style-type: decimal;
}

.ProseMirror li {
  @apply mb-1 text-gray-300;
}

.ProseMirror li p {
  @apply mb-0;
}

.ProseMirror ul li::marker {
  @apply text-gray-500;
}

.ProseMirror ol li::marker {
  @apply text-gray-500;
}

/* Task list styles */
.ProseMirror ul[data-type="taskList"] {
  @apply pl-0 list-none;
}

.ProseMirror ul[data-type="taskList"] li {
  @apply flex items-center gap-2 mb-2;
}

.ProseMirror ul[data-type="taskList"] li > label {
  @apply flex items-center flex-shrink-0;
}

.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
  @apply w-4 h-4 rounded border-2 border-gray-500 bg-transparent cursor-pointer;
  accent-color: #6366f1;
}

.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
  @apply border-accent bg-accent;
}

.ProseMirror ul[data-type="taskList"] li > div {
  @apply flex-1;
}

.ProseMirror ul[data-type="taskList"] li > div p {
  @apply mb-0 leading-tight;
}

.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div p {
  @apply line-through text-gray-500;
}

.ProseMirror blockquote {
  @apply border-l-4 border-accent pl-4 italic text-gray-400 my-4;
}

.ProseMirror code {
  @apply bg-surface-dark px-1.5 py-0.5 rounded text-sm font-mono text-accent;
}

.ProseMirror pre {
  @apply bg-surface-dark p-4 rounded-lg mb-3 overflow-x-auto;
}

.ProseMirror pre code {
  @apply bg-transparent p-0;
}

.ProseMirror hr {
  @apply border-border my-6;
}

.ProseMirror a {
  @apply text-accent hover:text-accent-hover underline;
}
</style>
