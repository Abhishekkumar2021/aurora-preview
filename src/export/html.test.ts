import { describe, it, expect } from 'vitest';
import { buildStandaloneHtml } from './html';

describe('buildStandaloneHtml', () => {
  const out = buildStandaloneHtml({
    title: 'My <Doc>',
    docHtml: '<div class="doc"><h1>Hi</h1></div>',
    css: '.doc{color:red}',
    vars: { '--bg': '#111', '--fg': '#eee' },
  });

  it('is a full standalone html document', () => {
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out).toContain('</html>');
    expect(out).toContain('<meta charset="utf-8"');
  });

  it('escapes the title', () => {
    expect(out).toContain('<title>My &lt;Doc&gt;</title>');
  });

  it('inlines the css and the document body', () => {
    expect(out).toContain('.doc{color:red}');
    expect(out).toContain('<div class="doc"><h1>Hi</h1></div>');
  });

  it('bakes resolved css variables into :root', () => {
    expect(out).toContain('--bg: #111;');
    expect(out).toContain('--fg: #eee;');
  });
});
