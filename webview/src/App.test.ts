// webview/src/App.test.ts
import { describe, it, expect, vi } from 'vitest';

// jsdom lacks DOMPurify's trusted-types deps; stub to identity for the test.
vi.mock('dompurify', () => ({ default: { sanitize: (s: string) => s } }));

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
