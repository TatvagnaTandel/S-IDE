const STORAGE_KEY = "side-ide-state";

const INITIAL_FILES = {
  "src/app.js": `const workspace = {
  name: "demo-workspace",
  branch: "main",
  files: ["src/app.js", "styles.css", "README.md"],
};

function bootWorkspace() {
  const ready = workspace.files.length > 0;

  if (!ready) {
    throw new Error("Workspace is empty");
  }

  return {
    ...workspace,
    status: "ready",
  };
}

export { bootWorkspace, workspace };`,
  "styles.css": `:root {
  --ground: #171719;
  --surface: #131217;
  --accent: #61a5f4;
}

.workspace {
  display: grid;
  min-height: 100vh;
  background: var(--ground);
}

.workspace.is-ready {
  border-color: var(--accent);
}`,
  "README.md": `# S-IDE workspace

A compact browser IDE surface for opening a project, editing a file, and running a command.

## Shortcuts

- \`⌘ P\` / \`Ctrl P\` opens the command palette.
- \`⌘ S\` / \`Ctrl S\` saves the current file.
- Ctrl + backtick focuses the terminal.

The interface keeps the workspace local, quiet, and ready for the next edit.`,
  "tests/smoke.test.js": `import test from "node:test";
import assert from "node:assert/strict";

test("the workspace has a name", () => {
  assert.equal("demo-workspace".length > 0, true);
});`,
};

const FILE_META = {
  js: { label: "JS", className: "js", language: "JavaScript" },
  css: { label: "#", className: "css", language: "CSS" },
  md: { label: "M", className: "md", language: "Markdown" },
  test: { label: "T", className: "test", language: "Test" },
};

const COMMANDS = [
  { id: "open-folder", label: "Open folder", hint: "⌘ O", icon: "folder" },
  { id: "open-file", label: "Open file", hint: "⌘ P", icon: "file" },
  { id: "toggle-terminal", label: "Toggle terminal", hint: "Ctrl `", icon: "terminal" },
  { id: "run-project", label: "Run workspace", hint: "", icon: "play" },
  { id: "focus-explorer", label: "Focus explorer", hint: "", icon: "folder" },
  { id: "new-file", label: "Create new file", hint: "", icon: "plus" },
];

const state = {
  files: { ...INITIAL_FILES },
  originals: { ...INITIAL_FILES },
  openTabs: ["src/app.js", "styles.css", "README.md"],
  activeFile: "src/app.js",
  activePanel: "explorer",
  terminalMode: "terminal",
  commandIndex: 0,
  commandMatches: [...COMMANDS],
  lastRun: null,
  workspaceName: "demo-workspace",
  projectRoot: null,
  fileTree: null,
  realFilePaths: {},
};

let toastTimer;

const elements = {
  sidebar: document.querySelector("#sidebar-panel"),
  tabStrip: document.querySelector("#tab-strip"),
  breadcrumbs: document.querySelector("#breadcrumbs"),
  editor: document.querySelector("#code-editor"),
  lineNumbers: document.querySelector("#line-numbers"),
  minimap: document.querySelector("#minimap"),
  outline: document.querySelector("#outline-list"),
  openEditors: document.querySelector("#open-editor-list"),
  openEditorsCount: document.querySelector("#open-editors-count"),
  languageStatus: document.querySelector("#language-status"),
  cursorLine: document.querySelector("#cursor-line"),
  cursorColumn: document.querySelector("#cursor-column"),
  terminal: document.querySelector("#terminal-panel"),
  terminalOutput: document.querySelector("#terminal-output"),
  terminalForm: document.querySelector("#terminal-form"),
  terminalInput: document.querySelector("#terminal-input"),
  commandPalette: document.querySelector("#command-palette"),
  commandInput: document.querySelector("#command-input"),
  commandList: document.querySelector("#command-list"),
  toast: document.querySelector("#toast"),
  lastRunNote: document.querySelector("#last-run-note"),
  openFolderButton: document.querySelector("#open-folder-button"),
  workspaceName: document.querySelector(".workspace-name"),
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFileExtension(path) {
  if (path.includes(".test.")) return "test";
  return path.split(".").pop() || "js";
}

function getFileMeta(path) {
  return FILE_META[getFileExtension(path)] || FILE_META.js;
}

function fileBadge(path) {
  const meta = getFileMeta(path);
  return `<span class="file-badge ${meta.className}" aria-hidden="true">${meta.label}</span>`;
}

function svgIcon(kind) {
  const icons = {
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7v-17Z"/><path d="M14 3.5v4h4M10 12h5M10 16h5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6h5l2 2h8v10h-15v-12Z"/><path d="M4.5 10h15"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="m8 10 2 2-2 2M13 15h3"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>',
    symbol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18V6h8a3 3 0 1 1 0 6H6M6 12h8a3 3 0 1 1 0 6H6"/></svg>',
  };
  return icons[kind] || icons.file;
}

function isDirty(path) {
  return state.files[path] !== state.originals[path];
}

function currentMeta() {
  return getFileMeta(state.activeFile);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2400);
}

function renderSidebar(panel = state.activePanel) {
  state.activePanel = panel;
  if (panel === "explorer") renderExplorer();
  if (panel === "search") renderSearchPanel();
  if (panel === "source") renderSourcePanel();
  if (panel === "run") renderRunPanel();
  if (panel === "extensions") renderExtensionsPanel();

  document.querySelectorAll(".rail-button[data-panel]").forEach((button) => {
    const isActive = button.dataset.panel === state.activePanel;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function sidebarShell(title, action = "") {
  return `<div class="sidebar-content">
    <div class="panel-title-row">
      <span class="panel-title">${title}</span>
      ${action}
    </div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">
      ${svgIcon("symbol")}
      <span>Everything here stays in this workspace.</span>
    </div>
  </div>`;
}

function renderTreeNodes(nodes, depth = 0) {
  let html = "";
  for (const node of nodes) {
    const pad = depth > 0 ? ` style="padding-left: ${16 + depth * 14}px"` : "";
    if (node.isDirectory) {
      html += `<button class="tree-row is-directory" type="button"${pad} data-directory="true">
        ${svgIcon("folder")}<span class="tree-row-label">${escapeHtml(node.name)}</span>
      </button>`;
      if (node.children && node.children.length) {
        html += renderTreeNodes(node.children, depth + 1);
      }
    } else {
      const isSelected = node.relativePath === state.activeFile ? " is-selected" : "";
      const dirty = isDirty(node.relativePath) ? ' <span class="dirty-indicator" title="Unsaved changes">●</span>' : "";
      html += `<button class="tree-row${isSelected}" type="button"${pad} data-file="${escapeHtml(node.relativePath)}">
        ${fileBadge(node.relativePath)}<span class="tree-row-label">${escapeHtml(node.name)}</span>${dirty}
      </button>`;
    }
  }
  return html;
}

async function openFolder() {
  if (window.electronAPI?.isElectron) {
    const folderPath = await window.electronAPI.openFolderDialog();
    if (folderPath) await loadFolder(folderPath);
  } else if (window.showDirectoryPicker) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await loadDirectoryHandle(dirHandle);
    } catch (e) {
      if (e.name !== "AbortError") {
        showToast("Could not access folder");
      }
    }
  } else {
    showToast("Open Folder requires the desktop app");
  }
}

async function loadFolder(folderPath) {
  showToast("Scanning folder...");
  state.projectRoot = folderPath;
  const folderName = folderPath.split("/").filter(Boolean).pop() || "project";
  state.workspaceName = folderName;
  if (elements.workspaceName) elements.workspaceName.textContent = folderName;

  const rawTree = await window.electronAPI.readDirectory(folderPath);
  state.realFilePaths = {};

  function processNodes(nodes, parentRel = "") {
    return nodes.map((n) => {
      const rel = parentRel ? `${parentRel}/${n.name}` : n.name;
      if (!n.isDirectory) {
        state.realFilePaths[rel] = n.path;
      }
      return {
        ...n,
        relativePath: rel,
        children: n.children ? processNodes(n.children, rel) : [],
      };
    });
  }

  state.fileTree = processNodes(rawTree);
  state.files = {};
  state.originals = {};
  state.openTabs = [];

  const firstRelPath = Object.keys(state.realFilePaths)[0];
  if (firstRelPath) {
    await openFile(firstRelPath);
  } else {
    state.activeFile = "";
    renderTabs();
    renderEditor();
  }

  window.electronAPI.startTerminal(folderPath);
  renderExplorer();
  showToast(`Opened ${folderName}`);
}

async function loadDirectoryHandle(dirHandle) {
  showToast("Opening folder...");
  state.workspaceName = dirHandle.name;
  if (elements.workspaceName) elements.workspaceName.textContent = dirHandle.name;

  async function scanHandle(handle, parentRel = "") {
    const items = [];
    for await (const [name, entry] of handle.entries()) {
      if (name.startsWith(".") || name === "node_modules" || name === "dist") continue;
      const rel = parentRel ? `${parentRel}/${name}` : name;
      if (entry.kind === "directory") {
        const children = await scanHandle(entry, rel);
        items.push({ name, relativePath: rel, isDirectory: true, children });
      } else {
        const file = await entry.getFile();
        const text = await file.text();
        state.files[rel] = text;
        state.originals[rel] = text;
        items.push({ name, relativePath: rel, isDirectory: false });
      }
    }
    return items;
  }

  state.fileTree = await scanHandle(dirHandle);
  state.openTabs = [];
  const firstFile = Object.keys(state.files)[0];
  if (firstFile) {
    await openFile(firstFile);
  }
  renderExplorer();
  showToast(`Opened ${dirHandle.name}`);
}

function renderExplorer() {
  const treeContent = state.fileTree
    ? renderTreeNodes(state.fileTree)
    : `
      <div class="tree-section-title">Workspace files</div>
      <button class="tree-row is-directory" type="button" data-file="src/app.js" data-directory="true">
        ${svgIcon("folder")}<span class="tree-row-label">src</span>
      </button>
      ${treeFile("src/app.js", true)}
      ${treeFile("styles.css", false)}
      ${treeFile("README.md", false)}
      <button class="tree-row is-directory" type="button" data-file="tests/smoke.test.js" data-directory="true">
        ${svgIcon("folder")}<span class="tree-row-label">tests</span>
      </button>
      ${treeFile("tests/smoke.test.js", true)}
    `;

  elements.sidebar.innerHTML = `<div class="sidebar-content">
    <div class="panel-title-row">
      <span class="panel-title">Explorer</span>
      <button class="panel-action" type="button" id="new-file-button" aria-label="Create new file" title="Create new file">${svgIcon("plus")}</button>
    </div>
    <button class="workspace-switcher" type="button" id="workspace-switcher" title="Click to open a project folder">
      ${svgIcon("folder")}
      <span>${escapeHtml(state.workspaceName || "demo-workspace")}</span>
    </button>
    <div class="tree">
      ${treeContent}
    </div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">
      ${svgIcon("symbol")}
      <span>${window.electronAPI?.isElectron ? "Connected to local filesystem" : "Local in-memory workspace"}</span>
    </div>
  </div>`;

  elements.sidebar.querySelectorAll("[data-file]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.directory === "true") return;
      openFile(button.dataset.file);
    });
  });
  elements.sidebar.querySelector("#new-file-button").addEventListener("click", createNewFile);
  elements.sidebar.querySelector("#workspace-switcher").addEventListener("click", openFolder);
}

function treeFile(path, child) {
  return `<button class="tree-row${child ? " is-child" : ""}${path === state.activeFile ? " is-selected" : ""}" type="button" data-file="${path}">
    ${fileBadge(path)}<span class="tree-row-label">${path.split("/").pop()}</span>
  </button>`;
}

function renderSearchPanel() {
  elements.sidebar.innerHTML = `<div class="sidebar-content">
    <div class="panel-title-row"><span class="panel-title">Search</span></div>
    <input class="panel-search" id="workspace-search" type="search" placeholder="Search in workspace" autocomplete="off" />
    <div class="search-results" id="search-results"></div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">${svgIcon("search")}<span>Search matches update as you type.</span></div>
  </div>`;

  const input = elements.sidebar.querySelector("#workspace-search");
  const results = elements.sidebar.querySelector("#search-results");
  const paintResults = () => {
    const query = input.value.trim().toLowerCase();
    const matches = Object.entries(state.files).flatMap(([path, content]) => {
      const lines = content.split("\n");
      return lines
        .map((line, index) => ({ path, line, index: index + 1 }))
        .filter((item) => query && item.line.toLowerCase().includes(query));
    });
    results.innerHTML = matches.length
      ? matches
          .slice(0, 16)
          .map(
            (match) => `<button class="search-result-row" type="button" data-file="${match.path}" data-line="${match.index}">
              ${fileBadge(match.path)}
              <span class="search-result-copy"><strong>${escapeHtml(match.line.trim() || "blank line")}</strong><span>${match.path}:${match.index}</span></span>
            </button>`,
          )
          .join("")
      : `<div class="sidebar-footer-note">${svgIcon("search")}<span>${query ? "No matches yet." : "Type to search all open files."}</span></div>`;

    results.querySelectorAll("[data-file]").forEach((button) => {
      button.addEventListener("click", () => {
        openFile(button.dataset.file);
        focusLine(Number(button.dataset.line));
      });
    });
  };

  input.addEventListener("input", paintResults);
  input.focus();
  paintResults();
}

function renderSourcePanel() {
  elements.sidebar.innerHTML = `<div class="sidebar-content">
    <div class="panel-title-row"><span class="panel-title">Source control</span><span class="section-meta">main</span></div>
    <div class="source-list">
      <div class="source-row">${svgIcon("symbol")}<span class="source-copy"><strong>Changes</strong><span>2 files ready to review</span></span><span class="source-state">2</span></div>
      ${sourceFileRow("src/app.js", "Modified")}
      ${sourceFileRow("styles.css", "Modified")}
      <button class="source-row" type="button" id="commit-button">${svgIcon("play")}<span class="source-copy"><strong>Commit staged changes</strong><span>Use the current workspace state</span></span></button>
    </div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">${svgIcon("symbol")}<span>Changes are shown locally before they move anywhere.</span></div>
  </div>`;
  elements.sidebar.querySelector("#commit-button").addEventListener("click", () => showToast("No remote is connected — changes remain local"));
}

function sourceFileRow(path, stateLabel) {
  return `<button class="source-row" type="button" data-file="${path}">${fileBadge(path)}<span class="source-copy"><strong>${path}</strong><span>${stateLabel}</span></span><span class="source-state">M</span></button>`;
}

function renderRunPanel() {
  elements.sidebar.innerHTML = `<div class="sidebar-content">
    <div class="panel-title-row"><span class="panel-title">Run and debug</span></div>
    <div class="run-config-list">
      <div class="run-config-row">${svgIcon("play")}<span class="run-config-copy"><strong>Workspace check</strong><span>node --test</span></span><span class="run-action">Ready</span></div>
      <div class="run-config-row">${svgIcon("terminal")}<span class="run-config-copy"><strong>Local preview</strong><span>node server.js</span></span><span class="run-action">Idle</span></div>
      <button class="run-config-row" type="button" id="run-check-button">${svgIcon("play")}<span class="run-config-copy"><strong>Start workspace check</strong><span>Run the offline smoke suite</span></span><span class="run-action">Run</span></button>
    </div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">${svgIcon("symbol")}<span>Run actions write their output to the terminal.</span></div>
  </div>`;
  elements.sidebar.querySelector("#run-check-button").addEventListener("click", runProject);
}

function renderExtensionsPanel() {
  elements.sidebar.innerHTML = `<div class="sidebar-content">
    <div class="panel-title-row"><span class="panel-title">Extensions</span><button class="panel-action" type="button" id="extension-search-button" aria-label="Search extensions" title="Search extensions">${svgIcon("search")}</button></div>
    <div class="extension-list">
      <div class="extension-row">${svgIcon("symbol")}<span class="extension-copy"><strong>Language tools</strong><span>JavaScript · CSS · Markdown</span></span><span class="extension-state">On</span></div>
      <div class="extension-row">${svgIcon("terminal")}<span class="extension-copy"><strong>Terminal helpers</strong><span>Command palette integration</span></span><span class="extension-state">On</span></div>
      <div class="extension-row">${svgIcon("file")}<span class="extension-copy"><strong>Workspace notes</strong><span>Local-only scratch files</span></span><span class="extension-state">On</span></div>
    </div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer-note">${svgIcon("symbol")}<span>Extensions are represented as local capabilities.</span></div>
  </div>`;
  elements.sidebar.querySelector("#extension-search-button").addEventListener("click", () => showToast("Extension search is ready for a registry"));
}

function renderTabs() {
  elements.tabStrip.innerHTML = state.openTabs
    .map((path) => {
      const dirty = isDirty(path);
      return `<button class="editor-tab${path === state.activeFile ? " is-active" : ""}" type="button" data-file="${path}">
        ${fileBadge(path)}
        <span class="editor-tab-label">${path.split("/").pop()}</span>
        ${dirty ? '<span class="editor-tab-dirty" aria-label="Unsaved changes">●</span>' : ""}
        <span class="tab-close" role="button" aria-label="Close ${path.split("/").pop()}" data-close-tab="${path}">${svgIcon("close")}</span>
      </button>`;
    })
    .join("");

  elements.tabStrip.querySelectorAll(".editor-tab").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-tab]")) return;
      openFile(tab.dataset.file);
    });
  });
  elements.tabStrip.querySelectorAll("[data-close-tab]").forEach((closeButton) => {
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(closeButton.dataset.closeTab);
    });
  });
}

function renderOpenEditors() {
  elements.openEditorsCount.textContent = String(state.openTabs.length);
  elements.openEditors.innerHTML = state.openTabs
    .map(
      (path) => `<button class="open-editor-item${path === state.activeFile ? " is-active" : ""}" type="button" data-file="${path}">
        ${fileBadge(path)}<span>${path}</span>${isDirty(path) ? '<span class="editor-dirty">●</span>' : ""}
      </button>`,
    )
    .join("");
  elements.openEditors.querySelectorAll("[data-file]").forEach((button) => button.addEventListener("click", () => openFile(button.dataset.file)));
}

function renderEditor() {
  const content = state.files[state.activeFile] ?? "";
  elements.editor.value = content;
  elements.breadcrumbs.innerHTML = breadcrumbMarkup(state.activeFile);
  elements.languageStatus.textContent = currentMeta().language;
  renderLineNumbers();
  renderMinimap();
  renderOutline();
  updateCursorPosition();
}

function breadcrumbMarkup(path) {
  const parts = path.split("/");
  return parts
    .map((part, index) => `<span class="${index === parts.length - 1 ? "breadcrumb-current" : ""}">${part}</span>`)
    .join('<span class="breadcrumb-separator">/</span>');
}

function renderLineNumbers() {
  const lineCount = Math.max(1, elements.editor.value.split("\n").length);
  const currentLine = getCursorLine();
  elements.lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, index) => `<div class="line-number${index + 1 === currentLine ? " is-current" : ""}">${index + 1}</div>`).join("");
}

function renderMinimap() {
  const lines = elements.editor.value.split("\n");
  elements.minimap.innerHTML = lines
    .slice(0, 120)
    .map((line) => {
      const width = Math.max(14, Math.min(78, Math.round(line.trim().length * 1.8)));
      return `<span class="minimap-line" style="width:${width}%"></span>`;
    })
    .join("");
}

function renderOutline() {
  const lines = elements.editor.value.split("\n");
  const items = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const functionMatch = trimmed.match(/(?:function|const|let)\s+([A-Za-z_$][\w$]*)/);
    const exportMatch = trimmed.match(/^export\s+\{([^}]+)\}/);
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    const selectorMatch = currentMeta().language === "CSS" && trimmed.endsWith("{") && !trimmed.startsWith("@") ? trimmed.slice(0, -1).trim() : null;
    const label = functionMatch?.[1] || exportMatch?.[1]?.trim() || headingMatch?.[1] || selectorMatch;
    if (label) {
      items.push({ label, line: index + 1, kind: headingMatch ? "heading" : "symbol" });
    }
  });

  elements.outline.innerHTML = items.length
    ? items
        .slice(0, 16)
        .map(
          (item) => `<button class="outline-item" type="button" data-line="${item.line}">
            ${svgIcon(item.kind === "heading" ? "file" : "symbol")}<span>${escapeHtml(item.label)}</span><small>${item.line}</small>
          </button>`,
        )
        .join("")
    : `<div class="activity-note"><span class="activity-dot activity-dot-muted"></span><div><strong>No symbols found</strong><p>This file is ready for text.</p></div></div>`;

  elements.outline.querySelectorAll("[data-line]").forEach((button) => button.addEventListener("click", () => focusLine(Number(button.dataset.line))));
}

function updateCursorPosition() {
  elements.cursorLine.textContent = String(getCursorLine());
  elements.cursorColumn.textContent = String(getCursorColumn());
}

function getCursorLine() {
  return elements.editor.value.slice(0, elements.editor.selectionStart).split("\n").length;
}

function getCursorColumn() {
  const beforeCursor = elements.editor.value.slice(0, elements.editor.selectionStart);
  const lastBreak = beforeCursor.lastIndexOf("\n");
  return beforeCursor.length - lastBreak;
}

function focusLine(lineNumber) {
  const lines = elements.editor.value.split("\n");
  const offset = lines.slice(0, Math.max(0, lineNumber - 1)).reduce((total, line) => total + line.length + 1, 0);
  elements.editor.focus();
  elements.editor.setSelectionRange(offset, offset);
  updateCursorPosition();
  renderLineNumbers();
  const lineHeight = Number.parseFloat(window.getComputedStyle(elements.editor).lineHeight) || 22;
  elements.editor.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
}

async function openFile(path) {
  if (state.files[path] === undefined) {
    if (window.electronAPI?.isElectron && state.realFilePaths[path]) {
      try {
        const content = await window.electronAPI.readFile(state.realFilePaths[path]);
        state.files[path] = content;
        state.originals[path] = content;
      } catch (err) {
        state.files[path] = `// Error loading file: ${err.message}`;
        state.originals[path] = state.files[path];
      }
    } else {
      state.files[path] = "";
      state.originals[path] = "";
    }
  }
  if (!state.openTabs.includes(path)) state.openTabs.push(path);
  state.activeFile = path;
  renderTabs();
  renderEditor();
  renderOpenEditors();
  if (state.activePanel === "explorer") renderSidebar("explorer");
}

function closeTab(path) {
  if (isDirty(path) && !window.confirm(`${path} has unsaved changes. Close it anyway?`)) return;
  const index = state.openTabs.indexOf(path);
  state.openTabs = state.openTabs.filter((item) => item !== path);
  if (state.openTabs.length === 0) state.openTabs = ["src/app.js"];
  if (state.activeFile === path) {
    state.activeFile = state.openTabs[Math.max(0, index - 1)] || state.openTabs[0];
  }
  renderTabs();
  renderEditor();
  renderOpenEditors();
}

async function saveCurrentFile() {
  state.originals[state.activeFile] = state.files[state.activeFile];
  if (window.electronAPI?.isElectron && state.realFilePaths[state.activeFile]) {
    try {
      await window.electronAPI.writeFile(state.realFilePaths[state.activeFile], state.files[state.activeFile]);
    } catch (err) {
      showToast(`Error saving to disk: ${err.message}`);
      return;
    }
  }
  persistState();
  renderTabs();
  renderOpenEditors();
  renderSidebar(state.activePanel);
  showToast(`Saved ${state.activeFile}`);
}

async function createNewFile() {
  const suggested = "src/new-file.js";
  const path = window.prompt("Create a file in this workspace", suggested);
  if (!path) return;
  const cleanPath = path.trim().replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("..")) {
    showToast("Choose a workspace-relative file name");
    return;
  }
  if (!state.files[cleanPath]) {
    state.files[cleanPath] = "";
    state.originals[cleanPath] = "";
  }
  if (window.electronAPI?.isElectron && state.projectRoot) {
    const fullPath = `${state.projectRoot}/${cleanPath}`;
    try {
      await window.electronAPI.createFile(fullPath, "");
      state.realFilePaths[cleanPath] = fullPath;
    } catch (err) {
      console.error(err);
    }
  }
  openFile(cleanPath);
  showToast(`Created ${cleanPath}`);
}

function appendTerminal(lines) {
  const markup = lines
    .map((line) => {
      const className = line.className ? ` ${line.className}` : "";
      return `<div class="terminal-line${className}">${escapeHtml(line.text)}</div>`;
    })
    .join("");
  elements.terminalOutput.insertAdjacentHTML("beforeend", markup);
  elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
}

function clearTerminal() {
  elements.terminalOutput.innerHTML = "";
  appendTerminal([{ text: "Terminal cleared.", className: "muted" }]);
}

function runProject() {
  elements.terminal.classList.remove("is-collapsed");
  state.lastRun = new Date();
  const runLabel = state.lastRun.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  elements.lastRunNote.textContent = `${runLabel} · 4 assertions passed`;
  appendTerminal([
    { text: "$ npm test", className: "command" },
    { text: "PASS workspace name is present", className: "success" },
    { text: "PASS editor opens the active file", className: "success" },
    { text: "PASS terminal accepts a command", className: "success" },
    { text: "PASS responsive shell is available", className: "success" },
    { text: "4 tests passed in 42ms", className: "success" },
  ]);
  showToast("Workspace check passed");
}

function runTerminalCommand(command) {
  const normalized = command.trim();
  if (!normalized) return;

  if (window.electronAPI?.isElectron) {
    window.electronAPI.sendTerminalInput(`${command}\n`);
    return;
  }

  appendTerminal([{ text: `$ ${normalized}`, className: "command" }]);

  if (normalized === "clear") {
    clearTerminal();
    return;
  }
  if (normalized === "help") {
    appendTerminal([
      { text: "Available commands: help, clear, npm test, git status, npm run start", className: "muted" },
    ]);
    return;
  }
  if (normalized === "npm test") {
    runProject();
    return;
  }
  if (normalized === "git status") {
    appendTerminal([
      { text: "On branch main", className: "muted" },
      { text: "Changes not staged for commit:", className: "warning" },
      { text: "  modified:   src/app.js", className: "warning" },
      { text: "  modified:   styles.css", className: "warning" },
    ]);
    return;
  }
  if (normalized === "npm run start") {
    appendTerminal([{ text: "Preview server is available at http://localhost:4173", className: "success" }]);
    return;
  }
  appendTerminal([{ text: `command not found: ${normalized}`, className: "warning" }]);
}

function setTerminalMode(mode) {
  state.terminalMode = mode;
  document.querySelectorAll("[data-terminal-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.terminalTab === mode));
  if (mode === "problems") {
    elements.terminalOutput.innerHTML = "";
    appendTerminal([{ text: "No problems detected in the active file.", className: "success" }]);
  } else if (mode === "output") {
    elements.terminalOutput.innerHTML = "";
    appendTerminal([{ text: "S-IDE workspace output is clean.", className: "muted" }]);
  } else if (!elements.terminalOutput.children.length) {
    appendTerminal([
      { text: "S-IDE terminal · local workspace", className: "muted" },
      { text: "Working directory: demo-workspace", className: "muted" },
      { text: "Ready. Type help for available commands.", className: "muted" },
    ]);
  }
}

function openCommandPalette() {
  elements.commandPalette.classList.remove("is-hidden");
  elements.commandInput.value = "";
  state.commandMatches = [...COMMANDS];
  state.commandIndex = 0;
  renderCommandList();
  window.requestAnimationFrame(() => elements.commandInput.focus());
}

function closeCommandPalette() {
  elements.commandPalette.classList.add("is-hidden");
}

function renderCommandList() {
  elements.commandList.innerHTML = state.commandMatches.length
    ? state.commandMatches
        .map(
          (command, index) => `<button class="command-item${index === state.commandIndex ? " is-highlighted" : ""}" type="button" data-command="${command.id}">
            ${svgIcon(command.icon)}<span class="command-label">${command.label}</span><span class="command-hint">${command.hint}</span>
          </button>`,
        )
        .join("")
    : `<div class="activity-note"><span class="activity-dot activity-dot-muted"></span><div><strong>No commands found</strong><p>Try a different phrase.</p></div></div>`;
  elements.commandList.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => executeCommand(button.dataset.command)));
}

function executeCommand(id) {
  closeCommandPalette();
  if (id === "open-folder") {
    openFolder();
    return;
  }
  if (id === "open-file") {
    renderSidebar("explorer");
    showToast("Choose a file from Explorer");
    return;
  }
  if (id === "toggle-terminal") {
    elements.terminal.classList.toggle("is-collapsed");
    if (!elements.terminal.classList.contains("is-collapsed")) elements.terminalInput.focus();
    return;
  }
  if (id === "run-project") {
    runProject();
    return;
  }
  if (id === "focus-explorer") {
    renderSidebar("explorer");
    return;
  }
  if (id === "new-file") createNewFile();
}

function persistState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        files: state.files,
        originals: state.originals,
        openTabs: state.openTabs,
        activeFile: state.activeFile,
      }),
    );
  } catch {
    // Private browsing can disable local storage; the editor still works in memory.
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    if (saved.files && typeof saved.files === "object") state.files = { ...INITIAL_FILES, ...saved.files };
    if (saved.originals && typeof saved.originals === "object") state.originals = { ...INITIAL_FILES, ...saved.originals };
    if (Array.isArray(saved.openTabs) && saved.openTabs.length) state.openTabs = saved.openTabs.filter((path) => state.files[path]);
    if (saved.activeFile && state.files[saved.activeFile]) state.activeFile = saved.activeFile;
  } catch {
    // Invalid local state is ignored so the workspace can still open cleanly.
  }
}

function initElectronBridge() {
  if (!window.electronAPI?.isElectron) return;

  document.body.classList.add("is-electron");

  window.electronAPI.onTerminalOutput((chunk) => {
    const clean = chunk.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\r/g, "");
    if (!clean) return;
    const lines = clean.split("\n");
    const formatted = lines
      .filter((l) => l.length > 0)
      .map((text) => ({ text, className: "" }));
    if (formatted.length) appendTerminal(formatted);
  });

  window.electronAPI.onMenuAction((action) => {
    if (action === "open-folder") openFolder();
    if (action === "new-file") createNewFile();
    if (action === "save-file") saveCurrentFile();
    if (action === "toggle-terminal") elements.terminal.classList.toggle("is-collapsed");
    if (action === "clear-terminal") clearTerminal();
  });

  window.electronAPI.startTerminal(state.projectRoot || "");
}

function bindEvents() {
  document.querySelectorAll(".rail-button[data-panel]").forEach((button) => button.addEventListener("click", () => renderSidebar(button.dataset.panel)));
  document.querySelector("#command-trigger").addEventListener("click", openCommandPalette);
  document.querySelector("#run-button").addEventListener("click", runProject);
  document.querySelector("#save-button").addEventListener("click", saveCurrentFile);
  document.querySelector("#collapse-terminal").addEventListener("click", () => elements.terminal.classList.add("is-collapsed"));
  document.querySelector("#clear-terminal").addEventListener("click", clearTerminal);
  document.querySelector("#split-editor-button").addEventListener("click", () => showToast("Split editor is ready for another file"));
  document.querySelector("#more-editor-button").addEventListener("click", openCommandPalette);
  document.querySelector("#settings-button").addEventListener("click", () => showToast("Editor settings are local to this workspace"));
  document.querySelector("#help-button").addEventListener("click", () => showToast("Try ⌘ P, ⌘ S, or the Run button"));
  document.querySelector("#workspace-menu-button").addEventListener("click", openFolder);
  document.querySelector("#profile-button").addEventListener("click", () => showToast("S-IDE · Tatvagna Tandel"));
  document.querySelectorAll("[data-terminal-tab]").forEach((tab) => tab.addEventListener("click", () => setTerminalMode(tab.dataset.terminalTab)));

  if (elements.openFolderButton) {
    elements.openFolderButton.addEventListener("click", openFolder);
  }

  elements.editor.addEventListener("input", () => {
    state.files[state.activeFile] = elements.editor.value;
    renderLineNumbers();
    renderMinimap();
    renderOutline();
    renderTabs();
    renderOpenEditors();
    updateCursorPosition();
    persistState();
  });
  elements.editor.addEventListener("click", updateCursorPosition);
  elements.editor.addEventListener("keyup", updateCursorPosition);
  elements.editor.addEventListener("scroll", () => {
    elements.lineNumbers.scrollTop = elements.editor.scrollTop;
    elements.minimap.scrollTop = elements.editor.scrollTop;
  });
  elements.terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runTerminalCommand(elements.terminalInput.value);
    elements.terminalInput.value = "";
  });
  elements.commandInput.addEventListener("input", () => {
    const query = elements.commandInput.value.trim().toLowerCase();
    state.commandMatches = COMMANDS.filter((command) => command.label.toLowerCase().includes(query));
    state.commandIndex = 0;
    renderCommandList();
  });
  elements.commandInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.commandIndex = Math.min(state.commandIndex + 1, Math.max(0, state.commandMatches.length - 1));
      renderCommandList();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.commandIndex = Math.max(0, state.commandIndex - 1);
      renderCommandList();
    }
    if (event.key === "Enter" && state.commandMatches[state.commandIndex]) {
      event.preventDefault();
      executeCommand(state.commandMatches[state.commandIndex].id);
    }
    if (event.key === "Escape") closeCommandPalette();
  });
  elements.commandPalette.addEventListener("click", (event) => {
    if (event.target === elements.commandPalette) closeCommandPalette();
  });

  document.addEventListener("keydown", (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === "o") {
      event.preventDefault();
      openFolder();
    }
    if (modifier && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openCommandPalette();
    }
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveCurrentFile();
    }
    if (modifier && event.key === "`" && !elements.commandPalette.classList.contains("is-hidden")) return;
    if (modifier && event.key === "`") {
      event.preventDefault();
      elements.terminal.classList.toggle("is-collapsed");
    }
    if (event.key === "Escape" && !elements.commandPalette.classList.contains("is-hidden")) closeCommandPalette();
  });
}

initElectronBridge();
restoreState();
bindEvents();
renderSidebar("explorer");
renderTabs();
renderEditor();
renderOpenEditors();
setTerminalMode("terminal");
