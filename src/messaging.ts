// Single source of truth for messages exchanged between the extension host and
// the webview. Both sides import these shapes.

export interface PreviewConfig {
  /** Visual theme. 'auto' inherits the current VS Code theme. */
  theme: 'auto' | 'terminal-glass' | 'sepia';
  /** Whether VS Code is currently light or dark — drives code-highlight theme. */
  colorScheme: 'light' | 'dark';
  /** Accent color override. Empty string = use the theme's link color. */
  accent: string;
  /** Reading font override. Empty = use the VS Code UI font. */
  fontFamily: string;
  /** Code font override. Empty = use the VS Code editor font. */
  codeFontFamily: string;
  /** Reading font size in px. 0 = default. */
  fontSize: number;
  /** Line height (unitless). 0 = default. */
  lineHeight: number;
  /** Reading column width in px. */
  contentWidth: number;
}

export type HostToWebview =
  | { type: 'render'; html: string; source: string }
  | { type: 'setConfig'; config: PreviewConfig }
  | { type: 'scrollToLine'; line: number }
  | { type: 'export'; format: 'html' | 'pdf' };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'revealLine'; line: number }
  | { type: 'exportHtml'; title: string; docHtml: string; vars: Record<string, string>; theme: string; scheme: string };

export function isHostToWebview(msg: unknown): msg is HostToWebview {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const m = msg as { type: string; [k: string]: unknown };
  if (m.type === 'render') return typeof m.html === 'string' && typeof m.source === 'string';
  if (m.type === 'setConfig') return typeof m.config === 'object' && m.config !== null;
  if (m.type === 'scrollToLine') return typeof m.line === 'number';
  if (m.type === 'export') return m.format === 'html' || m.format === 'pdf';
  return false;
}

export function isWebviewToHost(msg: unknown): msg is WebviewToHost {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const m = msg as { type: string; [k: string]: unknown };
  if (m.type === 'ready') return true;
  if (m.type === 'revealLine') return typeof m.line === 'number';
  if (m.type === 'exportHtml') {
    return (
      typeof m.title === 'string' &&
      typeof m.docHtml === 'string' &&
      typeof m.vars === 'object' && m.vars !== null &&
      typeof m.theme === 'string' &&
      typeof m.scheme === 'string'
    );
  }
  return false;
}
