import { describe, it, expect } from 'vitest';
import { isHostToWebview, isWebviewToHost } from './messaging';

describe('isHostToWebview', () => {
  it('accepts a render message', () => {
    expect(isHostToWebview({ type: 'render', html: '<p></p>', source: '' })).toBe(true);
  });
  it('accepts a setConfig message', () => {
    expect(isHostToWebview({ type: 'setConfig', config: { accent: '#4cd7b0', theme: 'dark' } })).toBe(true);
  });
  it('accepts scrollToLine and export messages', () => {
    expect(isHostToWebview({ type: 'scrollToLine', line: 12 })).toBe(true);
    expect(isHostToWebview({ type: 'export', format: 'html' })).toBe(true);
    expect(isHostToWebview({ type: 'export', format: 'pdf' })).toBe(true);
  });
  it('rejects unknown / malformed messages', () => {
    expect(isHostToWebview({ type: 'nope' })).toBe(false);
    expect(isHostToWebview(null)).toBe(false);
    expect(isHostToWebview({ type: 'render' })).toBe(false);
    expect(isHostToWebview({ type: 'scrollToLine', line: 'x' })).toBe(false);
    expect(isHostToWebview({ type: 'export', format: 'docx' })).toBe(false);
  });
});

describe('isWebviewToHost', () => {
  it('accepts ready and revealLine', () => {
    expect(isWebviewToHost({ type: 'ready' })).toBe(true);
    expect(isWebviewToHost({ type: 'revealLine', line: 3 })).toBe(true);
  });
  it('accepts a well-formed exportHtml message', () => {
    expect(
      isWebviewToHost({ type: 'exportHtml', title: 'T', docHtml: '<div></div>', vars: {}, theme: 'auto', scheme: 'dark' })
    ).toBe(true);
  });
  it('rejects exportHtml missing theme/scheme or malformed input', () => {
    expect(isWebviewToHost({ type: 'exportHtml', title: 'T', docHtml: '<div></div>', vars: {} })).toBe(false);
    expect(isWebviewToHost({ type: 'revealLine', line: 'x' })).toBe(false);
    expect(isWebviewToHost({ type: 'nope' })).toBe(false);
    expect(isWebviewToHost(null)).toBe(false);
  });
});
