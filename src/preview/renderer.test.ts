import { describe, it, expect } from 'vitest';
import { createRenderer } from './renderer';

describe('createRenderer', () => {
  const r = createRenderer();

  it('renders a heading to an <h1>', () => {
    expect(r.render('# Hello')).toContain('<h1');
    expect(r.render('# Hello')).toContain('Hello</h1>');
  });

  it('injects a zero-based data-line source map on block elements', () => {
    const html = r.render('para one\n\npara two');
    expect(html).toContain('data-line="0"');
    expect(html).toContain('data-line="2"');
  });

  it('renders GitHub-style task lists as checkboxes', () => {
    const html = r.render('- [x] done\n- [ ] todo');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
  });

  it('adds slug ids to headings for anchors', () => {
    expect(r.render('## My Section')).toContain('id="my-section"');
  });

  it('supports footnotes', () => {
    const html = r.render('text[^1]\n\n[^1]: note');
    expect(html).toContain('footnote');
  });
});
