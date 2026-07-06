# Aurora Preview — Design Spec

**Date:** 2026-07-06
**Status:** Approved (brainstorming complete, pending implementation plan)
**Type:** VS Code extension — Markdown preview + export

---

## 1. Overview & positioning

Aurora Preview is a **free, open-source VS Code extension** that delivers the best-looking
Markdown preview on the Marketplace.

- **Wedge (the one thing people tell friends):** stunning **terminal-glass** UI/UX — gorgeous
  out of the box, console-elegant, deeply tunable.
- **Supporting acts (done well, not the headline):** zero-setup rich content (Mermaid + KaTeX),
  deep customization, and export (PDF + HTML).
- **Why it exists:** the built-in preview is plain; Markdown Preview Enhanced (MPE, ~4M installs)
  is powerful but visually dated and cluttered. Aurora wins on polish + customization while
  matching the table-stakes feature set.

**Name:** Aurora Preview (approved).
**License:** MIT. **Distribution:** VS Code Marketplace + Open VSX.
**Business model:** Free & open-source. No gating/licensing infrastructure. Codebase should stay
structured enough that a future Pro tier *could* be added without a rewrite, but no work toward
that in v1.

## 2. Design language — terminal-glass (Setu-derived)

The aesthetic follows **Setu design principles** (see `~/Dev/setu/web/src/app/globals.css`):
squared corners (0 radius), 1px hairline borders, flat fills, a single user-chosen `--accent`,
monospace chrome, no drop-shadows by default. Modern **glass** is applied with restraint: subtle
backdrop-blur on panels (toolbar, sidebar, status bar) plus a faint accent glow over a fine
dot-grid canvas — **not** a colorful aurora.

Signature terminal touches: `#`/`##` prompt markers on headings, a monospace frontmatter card,
dot indicators, and a bottom **status bar**.

### Token architecture (ported from Setu)
Port Setu's approach into the webview as plain CSS custom properties + `data-*` attributes on the
webview root (no Tailwind dependency required in the webview):

- Everything derives from one `--accent`.
- Core tokens: `--canvas`, `--ink`, `--surface`, hairline `--line` / `--line-strong`, flat
  `--fill-*`, and an accent-derived brand ramp via `color-mix`.
- Light + dark (+ auto/follow-VS-Code-theme).
- **Preference knobs** (persisted to VS Code settings, applied live): accent, theme mode, radius,
  border weight, blur, transparency, background (dot-grid / grid / none + accent glow), density,
  reading face (sans/mono), motion.

### Built-in themes (v1)
Terminal Glass (dark), Terminal Glass (light), Sepia, High-contrast. Plus a **custom-CSS escape
hatch** for power users.

## 3. Architecture (Approach A — markdown-it host + Svelte webview)

### 3.1 Extension host (TypeScript / Node)
- Activation, command registration, configuration, file/editor watching.
- Owns the **markdown-it rendering pipeline** with plugins:
  `markdown-it-anchor`, `markdown-it-toc-done-right`, `markdown-it-task-lists`,
  `markdown-it-footnote`, `markdown-it-attrs`, `markdown-it-texmath` (+ KaTeX), Mermaid handling.
- Injects `data-line` source-map attributes from markdown-it `token.map` for scroll-sync.
- Renders on document change (debounced) and posts HTML to the webview.

### 3.2 Webview UI (Svelte + Vite)
Owns all presentation and compiles to a single self-contained JS/CSS bundle in `media/`.
- Applies theme tokens; renders the host HTML into the document view.
- Attaches behaviors: bidirectional scroll-sync, code-copy, heading anchors, Mermaid render,
  focus mode.
- UI chrome: toolbar, outline sidebar, status bar, ⌘K command palette.

**Why Svelte:** tiny runtime → fast webview boot (webviews reload often); compiled fine-grained
reactivity → smooth high-frequency preview updates and scroll-sync on large docs; first-class
scoped CSS + CSS-custom-property binding for the live theme engine; single Vite bundle matches
what a webview and the self-contained HTML export both want; small API surface = maintainable OSS.

### 3.3 Export module (host)
Reuses the exact rendered preview HTML so exports match the preview:
- **Self-contained HTML:** inline CSS, fonts, KaTeX assets, and rendered Mermaid SVGs into one file.
- **PDF:**
  - *Default (lightweight):* render via VS Code's Electron webview `printToPDF` — zero extra
    binaries, small extension size.
  - *Optional high-fidelity (opt-in setting):* `puppeteer-core` driving the user's installed
    Chrome/Edge, for page numbers, headers/footers, and precise margins. No bundled Chromium.
- **Fast-follow:** DOCX, PNG.

### 3.4 Host ↔ Webview message contract
A single typed, documented module. Messages include:
`render`, `scrollToLine`, `revealSource`, `setConfig`, `export`, `command`.

### 3.5 Security
Markdown may contain raw HTML; sanitize rendered output with **DOMPurify** in the webview.
Follow VS Code webview CSP best practices (nonce'd scripts, restricted resource roots).

## 4. Rendering & scroll-sync

markdown-it parses on the host (debounced on edit). `token.map` line info is emitted as
`data-line` attributes, letting the webview map editor line ↔ rendered element for **bidirectional
scroll-sync** (editor→preview and preview→editor). KaTeX renders server-side (via texmath) for
speed; Mermaid renders in the webview (its library needs the DOM).

## 5. Components (webview)

- `App.svelte` — root; owns layout + state.
- `Toolbar.svelte` — font, theme, focus, export controls.
- `OutlineSidebar.svelte` — document outline (collapsible).
- `StatusBar.svelte` — word count, reading time, encoding, current line, live sync indicator.
- `CommandPalette.svelte` — ⌘K fuzzy actions (switch theme, export, jump to heading, toggle focus).
- `Document.svelte` — renders host HTML; attaches copy/anchor/Mermaid/scroll handlers.
- `ThemeController.ts` — resolves preferences into CSS custom properties on the root.

Each unit is isolated with a clear responsibility and independently testable.

## 6. Feature set

### v1 (launch)
- Beautiful live preview + bidirectional scroll-sync
- Terminal-glass themes (3–5 built-in) + full customization knobs
- Mermaid + KaTeX (zero setup)
- Reading / focus (typewriter) mode
- Outline (TOC) sidebar
- PDF + HTML export (lightweight default; optional Puppeteer high-fidelity)
- ⌘K command palette
- Terminal status bar
- Live accent picker
- Code-copy buttons + heading anchors
- Density + reading-font knobs

### Fast-follow (post-launch)
- Present mode (slides split on `---`)
- Scroll progress rail (accent rail + section ticks)
- DOCX / PNG export
- Additional themes

## 7. Project structure

```
markdown-preview-extension/
├─ src/                 # extension host (TypeScript)
│  ├─ extension.ts      # activate, commands, config
│  ├─ preview/          # panel manager, markdown-it pipeline, scroll-map
│  ├─ export/           # html + pdf (printToPDF | puppeteer)
│  └─ messaging.ts      # typed host <-> webview contract
├─ webview/             # Svelte + Vite app (builds into media/)
│  └─ src/{App, components/, theme/, lib/}
├─ media/               # built webview bundle (produced by Vite)
├─ themes/              # built-in theme token sets
├─ docs/                # specs, docs
└─ package.json         # contributes: commands, config, menus, keybindings
```

## 8. Testing

- **Unit (Vitest):** markdown-it pipeline/plugins, scroll-map math, theme token resolution,
  export HTML inlining.
- **Component (Vitest + @testing-library/svelte):** toolbar, command palette, outline, status bar.
- **Integration (`@vscode/test-electron`):** activation, preview opens to the side, export
  produces a valid file.
- Implementation follows TDD (superpowers test-driven-development workflow).

## 9. Distribution & CI

- MIT license.
- Publish with `vsce` to VS Code Marketplace and `ovsx` to Open VSX.
- GitHub Actions CI: lint + test + package `.vsix` on PRs; release workflow on tags.
- README with demo GIFs (preview, theming, export).

## 10. Marketplace discoverability (ASO / SEO)

**Reality:** Marketplace search ranking is dominated by signals not settable in a file —
**install count, install velocity/trending, rating, and review count** — plus text relevance
matching. Outranking MPE / built-in for the bare query "markdown" on day one is not realistic.
Strategy: max out controllable relevance, win long-tail queries, and let early installs + ratings
lift ranking over time. **No guarantee of #1 for "markdown"** is made.

**Controllable relevance (`package.json` + README):**
- `displayName`: `Aurora Preview — Markdown Preview, PDF Export & Mermaid` (keyword-forward,
  front-loaded; displayName matches are weighted heavily).
- `description`: one keyword-rich sentence covering *markdown preview, PDF/HTML export, Mermaid,
  KaTeX, themes*.
- `keywords` (~14 focused, not spam): `markdown`, `markdown preview`, `preview`, `pdf`, `export`,
  `html`, `mermaid`, `katex`, `math`, `diagram`, `toc`, `viewer`, `md`, `presentation`.
- `categories`: `["Visualization","Formatters","Other"]` (no "Markdown" category exists).
- `icon` + `galleryBanner`: striking icon to raise impression→install conversion.
- README indexed and doubles as the conversion page: lead with demo GIFs.
- Complete metadata: `repository`, `bugs`, `qna`, badges.

**Velocity / ratings levers (the real ranking fuel):**
- Polished demo GIFs so impressions convert to installs.
- Tasteful one-time prompt for a rating; respond to reviews.
- Steady release cadence (freshness/trending weighting).
- Publish to Open VSX for extra reach (Cursor / VSCodium).

**Long-tail queries to realistically own:** "markdown pdf", "markdown mermaid preview",
"beautiful markdown preview", "markdown export html".

## 11. Non-goals (v1)

- No WYSIWYG editing (preview only).
- No Pro tier / licensing infrastructure.
- No bundled Chromium.
- No MDX / custom scripting engine.
- Not attempting to replace/override VS Code's built-in preview command — Aurora ships its own
  command + editor-title button and coexists.

## 12. Open questions / decisions locked

- **Rendering pipeline:** markdown-it on host (locked — Approach A).
- **Webview framework:** Svelte + Vite (locked).
- **Layout:** Studio (top toolbar + collapsible outline sidebar) (locked).
- **Aesthetic:** terminal-glass, Setu principles (locked).
- **PDF:** lightweight `printToPDF` default + optional Puppeteer high-fidelity (locked).
- Icon/branding art: to be produced during implementation.
