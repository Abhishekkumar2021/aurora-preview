import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import attrs from 'markdown-it-attrs';

export interface MarkdownRenderer {
  render(markdown: string): string;
}

/** Adds `data-line="<startLine>"` to block tokens that carry a source map. */
function injectLineNumbers(md: MarkdownIt): void {
  const rules = ['paragraph_open', 'heading_open', 'blockquote_open', 'list_item_open', 'table_open', 'fence'];
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

export function createRenderer(): MarkdownRenderer {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: false });
  md.use(anchor, { slugify: (s: string) => s.trim().toLowerCase().replace(/[^\w]+/g, '-') });
  md.use(taskLists, { enabled: true });
  md.use(footnote);
  md.use(attrs);
  injectLineNumbers(md);
  return { render: (markdown: string) => md.render(markdown) };
}
