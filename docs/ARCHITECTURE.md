# Architecture & Design

This document details the architecture, design choices, and data flow of **S-IDE**.

---

## Overview

S-IDE is engineered as a lightweight, zero-dependency browser IDE. It provides a full-featured desktop-like development experience in the browser while maintaining high performance and portability.

```
┌─────────────────────────────────────────────────────────────┐
│                         Title Bar                           │
│  [Logo / Name]     [Quick Open (⌘P)]     [Run]    [Profile] │
├────┬─────────────────────────────┬──────────────────────────┤
│ R  │         Sidebar             │       Editor Area        │
│ a  │  - File Explorer            │  - Tab Strip             │
│ i  │  - Search                   │  - Breadcrumbs           │
│ l  │  - Source Control           │  - Line Numbers + Code   │
│    │  - Run & Debug              │  - Minimap               │
│    │  - Extensions               ├──────────────────────────┤
│    │  - Outline View             │      Terminal Panel      │
├────┴─────────────────────────────┴──────────────────────────┤
│                        Status Bar                           │
│  [Branch: main]   [Line / Col]   [Encoding: UTF-8]   [Lang] │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

| Component | Primary File | Responsibility |
| --- | --- | --- |
| **Shell & Layout** | `index.html` | Semantic layout, activity rails, panels, modal triggers |
| **Styling & Theme** | `styles.css` | Sleek dark UI theme, responsive breakpoints, typography |
| **State & Logic** | `app.js` | Virtual filesystem, editor operations, tabs, terminal simulator |
| **HTTP Server** | `server.js` | Zero-dependency static server with MIME detection and security checks |
| **Verification** | `scripts/build-check.js` | Static validation and file integrity checks |
| **Test Suite** | `tests/app.test.js` | HTTP endpoint, content type, and route error tests |

---

## State Management

The frontend state is centralized in `app.js` in a single reactive state object:

- **Virtual Filesystem (`state.files`)**: In-memory file dictionary mapping paths to string content.
- **Dirty Tracking (`state.originals`)**: Compares active file buffers with baseline state to flag unsaved edits with dirty dots.
- **Tab History (`state.openTabs` / `state.activeFile`)**: Tracks active and open editor buffers.
- **Persistence Layer**: Automatic synchronization with browser `localStorage`. Changes survive page reloads and browser restarts without requiring a remote database.

---

## Terminal & Command Runner

The built-in terminal is an interactive simulator designed for self-contained demonstration and local workspace manipulation:
- **`help`**: Displays list of available commands.
- **`ls`**: Lists workspace files in current directory.
- **`cat <filename>`**: Displays file contents directly in terminal.
- **`clear`**: Resets output console.
- **`run`**: Executes workspace verification and tests.
- **`echo <msg>`**: Outputs text.

---

## Security & Server Design

`server.js` uses Node's native `node:http` module without third-party frameworks:
- **No external npm dependencies**: Avoids supply-chain risks and ensures instant startup.
- **Path containment**: Validates relative paths against root directory to block directory traversal attacks.
- **Strict HTTP methods**: Allows only `GET` and `HEAD` requests.
