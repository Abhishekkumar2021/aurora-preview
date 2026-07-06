// webview/src/App.test.ts
import { describe, it, expect, vi } from 'vitest';

// jsdom lacks DOMPurify's trusted-types deps; use a spy that strips <script> so we
// can assert the sink actually routes render HTML through sanitize().
const sanitize = vi.fn((s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, ''));
vi.mock('dompurify', () => ({ default: { sanitize: (s: string, _opts?: unknown) => sanitize(s) } }));

import { render } from '@testing-library/svelte';
import App from './App.svelte';

describe('App.svelte', () => {
  it('renders sanitized HTML from a render message', async () => {
    const { container } = render(App);
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'render', html: '<h1>Hi</h1>', source: '' },
    }));
    await Promise.resolve();
    expect(container.querySelector('.doc')?.innerHTML).toContain('<h1>Hi</h1>');
  });

  it('routes render HTML through DOMPurify.sanitize (does not inject raw)', async () => {
    render(App);
    const payload = '<p>ok</p><script>alert(1)</script>';
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', html: payload, source: '' } }));
    await Promise.resolve();
    expect(sanitize).toHaveBeenCalledWith(payload);
    // The rendered document must not contain the raw script the sanitizer removed.
    expect(document.querySelector('.doc')?.innerHTML).not.toContain('<script>');
  });

  it('applies accent + theme on setConfig', async () => {
    render(App);
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'setConfig', config: { accent: '#ff0000', theme: 'light' } },
    }));
    await Promise.resolve();
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#ff0000');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
