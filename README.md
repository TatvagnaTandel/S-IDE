# S-IDE

A fast, lightweight, and zero-dependency in-browser IDE with a tabbed code editor, file explorer, command palette, and interactive terminal.

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](#architecture)
[![Tests Passing](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing)

---

## ✨ Features

- **⚡ Zero External Dependencies**: Built with pure vanilla HTML, modern CSS, and ES Modules. The preview server uses Node's native `http` module with zero npm packages.
- **📁 File Explorer & Outline**: Browse workspace files, view symbol outlines (functions, classes, styles), and create new files.
- **📝 Multi-Tab Code Editor**: Tab strip with dirty-state change tracking, line numbers, real-time minimap preview, and cursor coordinate status.
- **💻 Integrated Terminal**: Interactive console simulator with built-in commands (`help`, `ls`, `cat`, `run`, `echo`, `clear`).
- **⌨️ Quick Open & Command Palette**: Press `⌘ P` or `Ctrl + P` to quickly switch files, toggle panels, or trigger workspace actions.
- **💾 Local Persistence**: Workspaces and edits automatically persist across page reloads using browser `localStorage`.
- **📱 Responsive Design**: Seamless desktop, tablet, and mobile interface with adaptive activity navigation.
- **🐳 Docker Ready**: Reproducible Alpine-based containerization out of the box.

---

## 🚀 Quick Start

### Prerequisites

- Node.js `>= 20.0.0`
- npm (or pnpm / yarn)

### Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TatvagnaTandel/S-IDE.git
   cd S-IDE
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```

3. **Open in your browser:**
   ```
   http://localhost:4173
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>⌘ P</kbd> / <kbd>Ctrl P</kbd> | Open Command Palette / Quick Open |
| <kbd>⌘ S</kbd> / <kbd>Ctrl S</kbd> | Save active file buffer |
| <kbd>Ctrl `</kbd> | Toggle bottom terminal panel |
| <kbd>Esc</kbd> | Dismiss Command Palette or dialogs |

---

## 🧪 Testing & Verification

Run the built-in test suite:

```bash
npm test
# or using Makefile:
make test
```

Run static syntax and integrity validation:

```bash
npm run check
# or using Makefile:
make check
```

---

## 🐳 Docker

Run S-IDE inside an isolated Docker container:

```bash
docker build -t s-ide .
docker run --rm -p 4173:4173 s-ide
```

Then visit `http://localhost:4173`.

---

## 📂 Project Structure

```
.
├── index.html           # Main IDE shell structure and layout
├── styles.css           # Dark theme design system and layout styling
├── app.js               # Client state, virtual filesystem, and editor logic
├── server.js            # Dependency-free static HTTP preview server
├── package.json         # Project metadata and scripts
├── Makefile             # Convenient make shortcuts (start, test, check)
├── Dockerfile           # Minimal Node 22 Alpine container setup
├── scripts/
│   └── build-check.js   # Static validation and integrity checker
├── tests/
│   └── app.test.js      # Unit tests for HTTP routes and assets
└── docs/
    ├── ARCHITECTURE.md  # Detailed architecture and data-flow documentation
    └── PROJECT_NOTES.md # Project notes and scope summary
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
