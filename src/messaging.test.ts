import { describe, it, expect } from 'vitest';
import { isHostToWebview } from './messaging';

describe('isHostToWebview', () => {
  it('accepts a render message', () => {
    expect(isHostToWebview({ type: 'render', html: '<p></p>', source: '' })).toBe(true);
  });
  it('accepts a setConfig message', () => {
    expect(isHostToWebview({ type: 'setConfig', config: { accent: '#4cd7b0', theme: 'dark' } })).toBe(true);
  });
  it('rejects unknown / malformed messages', () => {
    expect(isHostToWebview({ type: 'nope' })).toBe(false);
    expect(isHostToWebview(null)).toBe(false);
    expect(isHostToWebview({ type: 'render' })).toBe(false);
  });
});
