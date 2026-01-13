# FlowNotes

A minimalist GTD + Zettelkasten desktop app built with Tauri and Vue.

![FlowNotes](https://via.placeholder.com/800x500/1a1a1a/6366f1?text=FlowNotes)

## Features

- 📥 **Inbox** — Quick capture for thoughts and ideas
- 📅 **Today** — Focus on what matters today
- 📁 **Projects** — Organize multi-step outcomes
- 📊 **Kanban Board** — Visual task management with drag & drop
- 🗓️ **Calendar** — View tasks by date
- 📝 **Notes** — Zettelkasten-style knowledge base
- 🎯 **Areas** — Track different areas of your life

## Tech Stack

- **Frontend:** Vue 3 + TypeScript + Pinia
- **Desktop:** Tauri 2.0 (Rust)
- **Editor:** Tiptap (WYSIWYG)
- **Styling:** Tailwind CSS
- **Icons:** Lucide

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flownotes.git
cd flownotes

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Development (Web only)

```bash
# Run Vue dev server without Tauri
npm run dev
```

## Project Structure

```
flownotes/
├── src/                 # Vue frontend
│   ├── components/      # Reusable components
│   ├── views/           # Page views
│   ├── stores/          # Pinia stores
│   ├── composables/     # Vue composables
│   └── types/           # TypeScript types
├── src-tauri/           # Tauri/Rust backend
│   └── src/
│       └── commands/    # Tauri commands
└── public/              # Static assets
```

## Vault Structure

FlowNotes is compatible with the following folder structure:

```
vault/
├── 00 - Inbox/          # Incoming items
├── 01 - Projects/       # Active projects
├── 02 - Tasks/          # Tasks organized by status
│   ├── Next Actions/
│   ├── Waiting For/
│   └── Someday Maybe/
├── 03 - Notes/          # Zettelkasten notes
├── 04 - Daily/          # Daily notes
├── 05 - Areas/          # Life areas
└── 06 - Templates/      # Note templates
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Quick Capture | `Cmd/Ctrl + Shift + N` |
| Search | `Cmd/Ctrl + K` |
| New Note | `Cmd/Ctrl + N` |
| Save | `Cmd/Ctrl + S` |
| Toggle Sidebar | `Cmd/Ctrl + \` |

## License

MIT License
