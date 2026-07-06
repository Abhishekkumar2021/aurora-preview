# Aurora Preview — Markdown Preview, PDF Export & Mermaid

[![Version](https://vsmarketplacebadges.dev/version-short/abhishekkumar2021.aurora-preview.svg)](https://marketplace.visualstudio.com/items?itemName=abhishekkumar2021.aurora-preview)
[![Installs](https://vsmarketplacebadges.dev/installs-short/abhishekkumar2021.aurora-preview.svg)](https://marketplace.visualstudio.com/items?itemName=abhishekkumar2021.aurora-preview)
[![Rating](https://vsmarketplacebadges.dev/rating-short/abhishekkumar2021.aurora-preview.svg)](https://marketplace.visualstudio.com/items?itemName=abhishekkumar2021.aurora-preview&ssr=false#review-details)
[![CI](https://github.com/Abhishekkumar2021/aurora-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/Abhishekkumar2021/aurora-preview/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4cd7b0.svg)](LICENSE)

A gorgeous, **native-feeling** Markdown preview for VS Code. Aurora inherits your
editor's theme, fonts, and accent color, then adds refined typography — with
zero-setup Mermaid diagrams, KaTeX math, syntax highlighting, and export to
HTML/PDF.

> Open a Markdown file and run **Aurora: Open Preview to the Side** (`Ctrl/Cmd+K Shift+V`),
> or click the preview icon in the editor title bar.

## Install

- **In VS Code:** open Extensions (`Ctrl/Cmd+Shift+X`), search **“Aurora Preview”**, and click Install.
- **From the Marketplace:** [marketplace.visualstudio.com/items?itemName=abhishekkumar2021.aurora-preview](https://marketplace.visualstudio.com/items?itemName=abhishekkumar2021.aurora-preview)
- **From the command line:**
  ```bash
  code --install-extension abhishekkumar2021.aurora-preview
  ```

<!-- Add demo GIFs/screenshots here before publishing:
![Preview](images/preview.png)
![Themes](images/themes.png)
![Export](images/export.png)
-->

## Features

- **Native theming** — blends with your VS Code theme (background, foreground, link color, fonts) by default, so it never looks foreign.
- **Themes & customization** — `auto`, `terminal-glass`, and `sepia` presets, plus settings for accent, fonts, size, line height, and reading width.
- **Live preview** — updates as you type, with **bidirectional scroll-sync** between editor and preview.
- **Syntax highlighting** — theme-aware code colors (light/dark) via highlight.js.
- **Math** — inline `$…$` and block `$$…$$` rendered with KaTeX.
- **Diagrams** — zero-setup Mermaid, themed from your accent; click any diagram to view it full-screen.
- **GitHub-style callouts** — `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`.
- **Polished content** — task lists, tables, footnotes, frontmatter cards, code copy buttons, and a click-to-zoom image lightbox.
- **Export** — self-contained **HTML** (CSS and fonts inlined) and **PDF** via the print dialog.

## Commands

| Command | Description |
| --- | --- |
| `Aurora: Open Preview to the Side` | Open the live preview beside the editor (`Ctrl/Cmd+K Shift+V`). |
| `Aurora: Export to HTML` | Save the current preview as a self-contained `.html` file. |
| `Aurora: Export to PDF (Print)` | Open the print dialog — choose “Save as PDF”. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `auroraPreview.theme` | `auto` | `auto` (match VS Code), `terminal-glass`, or `sepia`. |
| `auroraPreview.accent` | `""` | Accent color (any CSS color). Empty uses your theme's link color. |
| `auroraPreview.fontFamily` | `""` | Reading font. Empty uses the VS Code UI font. |
| `auroraPreview.codeFontFamily` | `""` | Code font. Empty uses the VS Code editor font. |
| `auroraPreview.fontSize` | `0` | Reading font size in px (`0` = default). |
| `auroraPreview.lineHeight` | `0` | Line height (`0` = default). |
| `auroraPreview.contentWidth` | `860` | Maximum reading column width in px. |

## Export notes

- **HTML** export is fully self-contained (styles and KaTeX fonts inlined), so it renders identically anywhere.
- **PDF** export uses the print dialog — pick “Save as PDF”. It exports what you see, so switch to the `sepia` or a light theme first if you prefer a light PDF.

## Requirements

VS Code `1.90.0` or newer.

## Contributing & issues

Issues and PRs welcome. See the repository for the feature showcase in `examples/feature-showcase.md`.

## License

[MIT](LICENSE)
