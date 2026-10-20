# S-IDE

A fast, lightweight, and modern IDE available both as a **standalone macOS Desktop App (.dmg)** and an in-browser code editor with native local filesystem access, tabbed editing, and an integrated terminal.

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Download DMG](https://img.shields.io/badge/Download-macOS%20DMG-blue)](https://github.com/TatvagnaTandel/S-IDE/releases/download/v1.0.0/S-IDE-1.0.0-arm64.dmg)
[![Tests Passing](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing-and-verification)

---

## Features

- **Standalone macOS App and DMG**: Packaged with Electron and electron-builder, featuring native macOS titlebar traffic lights, native app menus, and window management.
- **Real Local Filesystem**: Open any folder from your Mac via native dialogs (<kbd>⌘ O</kbd>), view real directory trees, edit, and save files directly to disk (<kbd>⌘ S</kbd>).
- **Live Interactive Shell Terminal**: Integrated terminal connected directly to your system's live shell (`/bin/zsh`) in the desktop app. Run real commands like `git`, `python`, `node`, `npm`, `cargo`, and system utilities.
- **Dual Mode (Desktop and Web)**: Run locally as a desktop app or host the static front end via the zero-dependency Node.js HTTP server.
- **Multi-Tab Code Editor**: Tab strip with dirty-state change tracking, line numbers, real-time minimap preview, and cursor coordinate status.
- **Quick Open and Command Palette**: Press <kbd>⌘ P</kbd> / <kbd>Ctrl P</kbd> to quickly search files, switch tabs, toggle panels, or trigger workspace actions.
- **Local Persistence**: Workspaces and editor states automatically persist across page reloads and sessions using browser `localStorage`.
- **Responsive Design**: Seamless desktop, tablet, and mobile interface with adaptive activity navigation.
- **Docker Ready**: Reproducible Alpine-based containerization out of the box.

---

## Quick Start

### Download the Desktop App (macOS)

Download the ready-to-use installer from [GitHub Releases](https://github.com/TatvagnaTandel/S-IDE/releases/latest):
- [S-IDE-1.0.0-arm64.dmg](https://github.com/TatvagnaTandel/S-IDE/releases/download/v1.0.0/S-IDE-1.0.0-arm64.dmg) (Apple Silicon)

Double-click the downloaded `.dmg` and drag **S-IDE** into your Applications folder.

### Run from Source

#### Prerequisites

- Node.js `>= 20.0.0`
- npm or pnpm

#### 1. Run the Desktop App (macOS)

```bash
# Clone the repository
git clone https://github.com/TatvagnaTandel/S-IDE.git
cd S-IDE

# Install dependencies
pnpm install # or npm install

# Launch desktop app
npm run desktop
```

#### 2. Build the macOS DMG and App Bundle

Package S-IDE into a distributable `.dmg` disk image and `.app` bundle:

```bash
npm run dist
```

Output files will be generated in `dist/`:
- `dist/S-IDE-1.0.0-arm64.dmg` (Drag-and-drop macOS installer)
- `dist/mac-arm64/S-IDE.app` (Direct macOS application bundle)

#### 3. Run in Browser

```bash
# Start local preview server
npm start
# Open http://localhost:4173
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>⌘ O</kbd> / <kbd>Ctrl O</kbd> | Open Project Folder from local filesystem |
| <kbd>⌘ P</kbd> / <kbd>Ctrl P</kbd> | Open Command Palette / Quick Open |
| <kbd>⌘ S</kbd> / <kbd>Ctrl S</kbd> | Save active file buffer (to disk or local storage) |
| <kbd>Ctrl `</kbd> | Toggle bottom terminal panel |
| <kbd>Esc</kbd> | Dismiss Command Palette or dialogs |

---

## Testing and Verification

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

## Docker

Run the browser version of S-IDE inside an isolated Docker container:

```bash
docker build -t s-ide .
docker run --rm -p 4173:4173 s-ide
```

Then visit `http://localhost:4173`.

---

## Project Structure

```
.
├── index.html           # Main IDE shell structure and layout
├── styles.css           # Dark theme design system and layout styling
├── app.js               # Client state, virtual/real filesystem bridge, and editor logic
├── server.js            # Dependency-free static HTTP preview server
├── electron/
│   ├── main.cjs         # Electron main process (native menus, dialogs, zsh shell)
│   └── preload.cjs      # Secure contextBridge IPC layer
├── package.json         # Project metadata, build configuration, and scripts
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

## License

This project is open-source and available under the [MIT License](LICENSE).
