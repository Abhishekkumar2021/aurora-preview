<script lang="ts">
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { isHostToWebview } from '../../src/messaging';
  import './theme.css';

  let html = $state('');

  export function applyMessage(data: unknown) {
    if (!isHostToWebview(data)) return;
    if (data.type === 'render') {
      html = DOMPurify.sanitize(data.html);
    } else if (data.type === 'setConfig') {
      document.documentElement.style.setProperty('--accent', data.config.accent);
      document.documentElement.dataset.theme = data.config.theme;
    }
  }

  onMount(() => {
    const handler = (e: MessageEvent) => applyMessage(e.data);
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });
</script>

<div class="doc">{@html html}</div>
