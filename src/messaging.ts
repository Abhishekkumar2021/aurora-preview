export interface PreviewConfig {
  accent: string;
  theme: 'dark' | 'light';
}

export type HostToWebview =
  | { type: 'render'; html: string; source: string }
  | { type: 'setConfig'; config: PreviewConfig };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'revealSource'; line: number };

export function isHostToWebview(msg: unknown): msg is HostToWebview {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const m = msg as { type: string; [k: string]: unknown };
  if (m.type === 'render') return typeof m.html === 'string' && typeof m.source === 'string';
  if (m.type === 'setConfig') return typeof m.config === 'object' && m.config !== null;
  return false;
}
