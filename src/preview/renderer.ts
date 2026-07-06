import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import attrs from 'markdown-it-attrs';
import texmath from 'markdown-it-texmath';
import frontMatter from 'markdown-it-front-matter';
import githubAlerts from 'markdown-it-github-alerts';
import katex from 'katex';
import hljs from 'highlight.js';

export interface MarkdownRenderer {
  render(markdown: string): string;
}

/** Adds `data-line="<startLine>"` to block tokens that carry a source map. */
function injectLineNumbers(md: MarkdownIt): void {
  const rules = ['paragraph_open', 'heading_open', 'blockquote_open', 'list_item_open', 'table_open'];
  for (const rule of rules) {
    const original = md.renderer.rules[rule];
    md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.map && token.map.length) {
        token.attrSet('data-line', String(token.map[0]));
      }
      return original
        ? original(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
  }
}

/**
 * Fenced code: Mermaid blocks pass through as `<pre class="mermaid">` for the
 * webview to render; everything else is highlighted with highlight.js. Both
 * carry a `data-line` for scroll-sync.
 */
function installFenceRenderer(md: MarkdownIt): void {
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim().split(/\s+/g)[0] : '';
    const code = token.content;
    const dl = token.map && token.map.length ? ` data-line="${token.map[0]}"` : '';

    if (info === 'mermaid') {
      return `<pre class="mermaid"${dl}>${md.utils.escapeHtml(code)}</pre>\n`;
    }

    let body: string;
    if (info && hljs.getLanguage(info)) {
      try {
        body = hljs.highlight(code, { language: info, ignoreIllegals: true }).value;
      } catch {
        body = md.utils.escapeHtml(code);
      }
    } else {
      body = md.utils.escapeHtml(code);
    }
    const langClass = info ? ` language-${info}` : '';
    return `<pre${dl} class="hljs"><code class="hljs${langClass}">${body}</code></pre>\n`;
  };
}

/** Render leading YAML frontmatter as a subtle metadata card (title + fields). */
function renderFrontmatterCard(raw: string, escape: (s: string) => string): string {
  if (!raw || !raw.trim()) return '';
  let title = '';
  const fields: Array<[string, string]> = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!val) continue;
    if (m[1].toLowerCase() === 'title') title = val;
    else fields.push([m[1], val]);
  }
  if (!title && fields.length === 0) return '';
  let html = '<div class="frontmatter" data-line="0">';
  if (title) html += `<div class="fm-title">${escape(title)}</div>`;
  if (fields.length) {
    html += '<div class="fm-meta">';
    for (const [k, v] of fields) {
      html += `<span class="fm-field"><span class="fm-key">${escape(k)}</span>${escape(v)}</span>`;
    }
    html += '</div>';
  }
  return html + '</div>\n';
}

export function createRenderer(): MarkdownRenderer {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: false });
  // Capture leading YAML frontmatter so it renders as a card, not body text.
  let frontmatterRaw = '';
  md.use(frontMatter, (fm: string) => { frontmatterRaw = fm; });
  md.use(anchor, { slugify: (s: string) => s.trim().toLowerCase().replace(/[^\w]+/g, '-') });
  md.use(taskLists, { enabled: true });
  md.use(footnote);
  md.use(attrs);
  md.use(githubAlerts);
  md.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: { output: 'html', throwOnError: false },
  });
  injectLineNumbers(md);
  installFenceRenderer(md);
  return {
    render: (markdown: string) => {
      frontmatterRaw = '';
      const body = md.render(markdown);
      return renderFrontmatterCard(frontmatterRaw, md.utils.escapeHtml) + body;
    },
  };
}
