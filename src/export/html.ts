export interface StandaloneHtmlOptions {
  /** Document title (used for <title>). */
  title: string;
  /** The rendered `.doc` element's outerHTML (post-render: includes SVGs, KaTeX, highlighted code). */
  docHtml: string;
  /** Contents of the built webview stylesheet (media/webview.css). */
  css: string;
  /** Resolved theme token values (e.g. `--bg`, `--fg`, `--accent`) to bake in so the file is self-contained. */
  vars: Record<string, string>;
  /** Active theme preset (drives `data-theme` selectors like terminal-glass). */
  dataTheme?: string;
  /** Active light/dark scheme (drives `data-scheme` selectors). */
  dataScheme?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a fully self-contained HTML document from the rendered preview: the
 * webview CSS and the resolved theme variables are inlined, so the file renders
 * identically to the preview with no external dependencies.
 */
export function buildStandaloneHtml(o: StandaloneHtmlOptions): string {
  const varsCss = Object.entries(o.vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
  const attrs =
    (o.dataTheme ? ` data-theme="${escapeHtml(o.dataTheme)}"` : '') +
    (o.dataScheme ? ` data-scheme="${escapeHtml(o.dataScheme)}"` : '');
  return `<!DOCTYPE html>
<html${attrs}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(o.title)}</title>
<style>
${o.css}
</style>
<style>:root { ${varsCss} }</style>
</head>
<body>
${o.docHtml}
</body>
</html>
`;
}
