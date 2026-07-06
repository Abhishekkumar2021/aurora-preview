import * as vscode from 'vscode';
import { createRenderer } from './renderer';
import { buildStandaloneHtml } from '../export/html';
import { isWebviewToHost, type HostToWebview, type PreviewConfig, type WebviewToHost } from '../messaging';

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function readConfig(): PreviewConfig {
  const cfg = vscode.workspace.getConfiguration('auroraPreview');
  const kind = vscode.window.activeColorTheme.kind;
  const isLight =
    kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
  return {
    theme: cfg.get('theme', 'auto'),
    colorScheme: isLight ? 'light' : 'dark',
    accent: cfg.get('accent', ''),
    fontFamily: cfg.get('fontFamily', ''),
    codeFontFamily: cfg.get('codeFontFamily', ''),
    fontSize: cfg.get('fontSize', 0),
    lineHeight: cfg.get('lineHeight', 0),
    contentWidth: cfg.get('contentWidth', 860),
  };
}

export class PreviewPanel {
  private static current: PreviewPanel | undefined;
  private readonly renderer = createRenderer();
  private disposables: vscode.Disposable[] = [];
  private debounce: NodeJS.Timeout | undefined;

  /** Scroll-sync loop guard (timestamp in ms). */
  private lockEditorScrollUntil = 0;

  static get active(): PreviewPanel | undefined {
    return PreviewPanel.current;
  }

  static createOrShow(context: vscode.ExtensionContext, editor: vscode.TextEditor): PreviewPanel {
    if (PreviewPanel.current) {
      PreviewPanel.current.track(editor.document);
      PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return PreviewPanel.current;
    }
    const docDir = editor.document.uri.with({ path: editor.document.uri.path.replace(/\/[^/]*$/, '') });
    const roots = [
      vscode.Uri.joinPath(context.extensionUri, 'media'),
      docDir,
      ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
    ];
    const panel = vscode.window.createWebviewPanel(
      'auroraPreview',
      'Aurora Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: roots,
      }
    );
    PreviewPanel.current = new PreviewPanel(panel, context, editor.document);
    return PreviewPanel.current;
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private doc: vscode.TextDocument
  ) {
    this.panel.webview.html = this.htmlShell();

    this.panel.webview.onDidReceiveMessage((msg) => this.onWebviewMessage(msg), null, this.disposables);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    vscode.workspace.onDidChangeTextDocument(
      (e) => { if (e.document === this.doc) this.scheduleRender(); },
      null, this.disposables
    );
    vscode.workspace.onDidChangeConfiguration(
      (e) => { if (e.affectsConfiguration('auroraPreview')) this.postConfig(); },
      null, this.disposables
    );
    vscode.window.onDidChangeActiveColorTheme(() => this.postConfig(), null, this.disposables);
    vscode.window.onDidChangeTextEditorVisibleRanges(
      (e) => { if (e.textEditor.document === this.doc) this.syncEditorToPreview(e.textEditor); },
      null, this.disposables
    );

    this.postConfig();
    this.render();
  }

  private track(doc: vscode.TextDocument) {
    this.doc = doc;
    this.postConfig();
    this.render();
  }

  private onWebviewMessage(msg: unknown) {
    if (!isWebviewToHost(msg)) return;
    if (msg.type === 'ready') {
      // Idempotent: re-send current state on every ready (initial load AND webview reloads/moves).
      this.postConfig();
      this.render();
    } else if (msg.type === 'revealLine') {
      this.syncPreviewToEditor(msg.line);
    } else if (msg.type === 'exportHtml') {
      void this.writeHtmlExport(msg);
    }
  }

  /** Trigger an export in the webview (HTML round-trips back; PDF prints in place). */
  requestExport(format: 'html' | 'pdf') {
    this.post({ type: 'export', format });
  }

  private async writeHtmlExport(msg: Extract<WebviewToHost, { type: 'exportHtml' }>) {
    const cssUri = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css');
    let css = '';
    try {
      css = new TextDecoder().decode(await vscode.workspace.fs.readFile(cssUri));
      css = await this.inlineFontAssets(css);
    } catch {
      /* stylesheet missing — export still works, just unstyled */
    }
    const html = buildStandaloneHtml({
      title: msg.title,
      docHtml: msg.docHtml,
      css,
      vars: msg.vars,
      dataTheme: msg.theme,
      dataScheme: msg.scheme,
    });
    const base = this.doc.uri.path.replace(/\.[^/.]+$/, '') + '.html';
    const target = await vscode.window.showSaveDialog({
      defaultUri: this.doc.uri.with({ path: base }),
      filters: { 'HTML document': ['html'] },
    });
    if (!target) return;
    await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(html));
    const open = 'Open';
    const choice = await vscode.window.showInformationMessage(
      `Exported ${target.path.split('/').pop()}`,
      open
    );
    if (choice === open) void vscode.env.openExternal(target);
  }

  private scheduleRender() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.render(), 120);
  }

  private post(msg: HostToWebview) {
    void this.panel.webview.postMessage(msg);
  }

  private postConfig() { this.post({ type: 'setConfig', config: readConfig() }); }

  private render() {
    const source = this.doc.getText();
    const html = this.rewriteLocalImages(this.renderer.render(source));
    this.post({ type: 'render', html, source });
  }

  /** Rewrite local <img> sources to webview URIs so workspace-relative images resolve. */
  private rewriteLocalImages(html: string): string {
    const dir = this.doc.uri.with({ path: this.doc.uri.path.replace(/\/[^/]*$/, '') });
    return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/gi, (whole, pre, src, post) => {
      if (/^(https?:|data:|vscode-webview-resource:|vscode-resource:|#)/i.test(src)) return whole;
      try {
        const resolved = /^\//.test(src)
          ? this.doc.uri.with({ path: src })
          : vscode.Uri.joinPath(dir, src);
        return `${pre}${this.panel.webview.asWebviewUri(resolved)}${post}`;
      } catch {
        return whole;
      }
    });
  }

  /** Editor scrolled → tell the preview which source line is at the top. */
  private syncEditorToPreview(editor: vscode.TextEditor) {
    if (Date.now() < this.lockEditorScrollUntil) return;
    const top = editor.visibleRanges[0]?.start.line ?? 0;
    this.post({ type: 'scrollToLine', line: top });
  }

  /** Preview scrolled → reveal the matching source line in the editor. */
  private syncPreviewToEditor(line: number) {
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === this.doc);
    if (!editor) return;
    this.lockEditorScrollUntil = Date.now() + 250;
    const target = Math.max(0, Math.min(line, this.doc.lineCount - 1));
    const pos = new vscode.Position(target, 0);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtTop);
  }

  /** Inline `url(assets/*.woff2)` font references as base64 data URIs for a self-contained export. */
  private async inlineFontAssets(css: string): Promise<string> {
    const seen = new Set<string>();
    for (const m of css.matchAll(/url\((?:\.?\/)?(assets\/[^)"']+\.woff2?)\)/g)) {
      const rel = m[1];
      if (seen.has(rel)) continue;
      seen.add(rel);
      try {
        const bytes = await vscode.workspace.fs.readFile(
          vscode.Uri.joinPath(this.context.extensionUri, 'media', rel)
        );
        const b64 = Buffer.from(bytes).toString('base64');
        const mime = rel.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
        css = css.split(m[0]).join(`url(data:${mime};base64,${b64})`);
      } catch {
        /* asset missing — leave the reference as-is */
      }
    }
    return css;
  }

  private htmlShell(): string {
    const n = nonce();
    const w = this.panel.webview;
    const js = w.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.js'));
    const css = w.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css'));
    const csp = [
      `default-src 'none'`,
      `img-src ${w.cspSource} https: data:`,
      `style-src ${w.cspSource} 'unsafe-inline'`,
      `font-src ${w.cspSource} https: data:`,
      // 'strict-dynamic' lets the nonced entry script load its own code-split
      // chunks (Mermaid, KaTeX) which cannot themselves carry a nonce.
      `script-src 'nonce-${n}' 'strict-dynamic'`,
      `worker-src blob:`,
    ].join('; ');
    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Security-Policy" content="${csp}" />
      <link rel="stylesheet" href="${css}" />
    </head><body><div id="app"></div>
      <script type="module" nonce="${n}" src="${js}"></script>
    </body></html>`;
  }

  dispose() {
    PreviewPanel.current = undefined;
    if (this.debounce) clearTimeout(this.debounce);
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
