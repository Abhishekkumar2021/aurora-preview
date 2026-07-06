<script lang="ts">
  import { onMount, tick } from 'svelte';
  import DOMPurify from 'dompurify';
  import { isHostToWebview, type PreviewConfig } from '../../src/messaging';
  import './theme.css';

  // VS Code webview API (absent in unit tests / plain browser).
  const vscodeApi = (() => {
    const g = window as unknown as { acquireVsCodeApi?: () => { postMessage(m: unknown): void } };
    return typeof g.acquireVsCodeApi === 'function' ? g.acquireVsCodeApi() : undefined;
  })();
  const post = (msg: unknown) => vscodeApi?.postMessage(msg);

  let html = $state('');
  let suppressScrollReportUntil = 0;
  let currentScheme: 'light' | 'dark' = 'dark';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mermaidMod: any;

  function setVar(name: string, value: string | undefined) {
    if (value) document.documentElement.style.setProperty(name, value);
    else document.documentElement.style.removeProperty(name);
  }

  function applyConfig(cfg: PreviewConfig) {
    const root = document.documentElement;
    root.dataset.theme = cfg.theme ?? 'auto';
    root.dataset.scheme = cfg.colorScheme ?? 'dark';
    currentScheme = cfg.colorScheme ?? 'dark';
    setVar('--accent', cfg.accent);
    setVar('--md-font', cfg.fontFamily);
    setVar('--md-code-font', cfg.codeFontFamily);
    setVar('--md-font-size', cfg.fontSize ? `${cfg.fontSize}px` : undefined);
    setVar('--md-line-height', cfg.lineHeight ? String(cfg.lineHeight) : undefined);
    setVar('--md-content-width', cfg.contentWidth ? `${cfg.contentWidth}px` : undefined);
  }

  /** Add a language badge + copy button to each highlighted code block. */
  function enhanceCode() {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.doc pre.hljs'));
    for (const pre of blocks) {
      if (pre.dataset.enhanced) continue;
      pre.dataset.enhanced = '1';
      const code = pre.querySelector('code');
      const bar = document.createElement('div');
      bar.className = 'code-bar';
      const lang = Array.from(code?.classList ?? [])
        .find((c) => c.startsWith('language-'))
        ?.slice('language-'.length);
      if (lang) {
        const tag = document.createElement('span');
        tag.className = 'code-lang';
        tag.textContent = lang;
        bar.appendChild(tag);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        void navigator.clipboard?.writeText(code?.textContent ?? '');
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = 'Copy'), 1200);
      });
      bar.appendChild(btn);
      pre.appendChild(bar);
    }
  }

  async function renderMermaid() {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')
    );
    if (nodes.length === 0) return;
    if (!mermaidMod) mermaidMod = (await import('mermaid')).default;
    mermaidMod.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: currentScheme === 'light' ? 'default' : 'dark',
    });
    try {
      await mermaidMod.run({ nodes });
    } catch {
      /* invalid diagram source — leave the code block as-is */
    }
  }

  function nearestElementForLine(line: number): HTMLElement | null {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-line]'));
    let best: HTMLElement | null = null;
    let bestLine = -1;
    for (const el of els) {
      const l = Number(el.getAttribute('data-line'));
      if (l <= line && l > bestLine) { bestLine = l; best = el; }
    }
    return best ?? els[0] ?? null;
  }

  function scrollToLine(line: number) {
    const el = nearestElementForLine(line);
    if (!el) return;
    suppressScrollReportUntil = Date.now() + 250;
    el.scrollIntoView({ block: 'start' });
  }

  function reportScroll() {
    if (Date.now() < suppressScrollReportUntil) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-line]'));
    let line = 0;
    for (const el of els) {
      if (el.getBoundingClientRect().top >= 0) {
        line = Number(el.getAttribute('data-line'));
        break;
      }
    }
    post({ type: 'revealLine', line });
  }

  async function applyMessage(data: unknown) {
    if (!isHostToWebview(data)) return;
    if (data.type === 'render') {
      html = DOMPurify.sanitize(data.html);
      await tick();
      enhanceCode();
      await renderMermaid();
    } else if (data.type === 'setConfig') {
      applyConfig(data.config);
    } else if (data.type === 'scrollToLine') {
      scrollToLine(data.line);
    }
  }

  onMount(() => {
    const onMsg = (e: MessageEvent) => applyMessage(e.data);
    window.addEventListener('message', onMsg);

    let scrollTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(reportScroll, 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    post({ type: 'ready' });

    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('scroll', onScroll);
    };
  });
</script>

<div class="doc">{@html html}</div>
