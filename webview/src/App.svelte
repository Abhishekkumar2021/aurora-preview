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

  const ICON_COPY =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

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
      btn.className = 'icon-btn code-copy';
      btn.title = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = ICON_COPY;
      btn.addEventListener('click', () => {
        void navigator.clipboard?.writeText(code?.textContent ?? '');
        btn.innerHTML = ICON_CHECK;
        btn.classList.add('copied');
        btn.title = 'Copied';
        setTimeout(() => {
          btn.innerHTML = ICON_COPY;
          btn.classList.remove('copied');
          btn.title = 'Copy';
        }, 1200);
      });
      bar.appendChild(btn);
      pre.appendChild(bar);
    }
  }

  // Full-screen viewer (lightbox) for images and diagrams.
  let lightbox: HTMLDivElement | null = null;
  let lightboxContent: HTMLDivElement | null = null;
  function ensureLightbox(): HTMLDivElement {
    if (lightbox) return lightbox;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    const content = document.createElement('div');
    content.className = 'lightbox-content';
    content.addEventListener('click', (e) => e.stopPropagation());
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-btn lightbox-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = ICON_CLOSE;
    close.addEventListener('click', () => closeLightbox());
    lb.append(content, close);
    lb.addEventListener('click', () => closeLightbox());
    document.body.appendChild(lb);
    lightbox = lb;
    lightboxContent = content;
    return lb;
  }
  function openImage(src: string, alt: string) {
    ensureLightbox();
    lightboxContent!.className = 'lightbox-content';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    lightboxContent!.replaceChildren(img);
    lightbox!.classList.add('open');
  }
  function openDiagram(svg: SVGElement) {
    ensureLightbox();
    lightboxContent!.className = 'lightbox-content diagram';
    lightboxContent!.replaceChildren(svg);
    lightbox!.classList.add('open');
  }
  function closeLightbox() {
    lightbox?.classList.remove('open');
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

    // Click a content image or diagram to open it full-screen.
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const img = t.closest?.('.doc img') as HTMLImageElement | null;
      if (img) {
        openImage(img.currentSrc || img.src, img.getAttribute('alt') ?? '');
        return;
      }
      const diagram = t.closest?.('.doc .mermaid') as HTMLElement | null;
      if (diagram) {
        const svg = diagram.querySelector('svg');
        if (svg) openDiagram(svg.cloneNode(true) as SVGElement);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    post({ type: 'ready' });

    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="doc">{@html html}</div>
