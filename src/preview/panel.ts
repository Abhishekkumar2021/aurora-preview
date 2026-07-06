import * as vscode from 'vscode';
import { createRenderer } from './renderer';
import { isWebviewToHost, type HostToWebview, type PreviewConfig } from '../messaging';

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

  /** Webview readiness handshake: buffer the latest messages until it signals ready. */
  private ready = false;
  private pendingRender: HostToWebview | undefined;
  private pendingConfig: HostToWebview | undefined;

  /** Scroll-sync loop guard (timestamp in ms). */
  private lockEditorScrollUntil = 0;

  static createOrShow(context: vscode.ExtensionContext, editor: vscode.TextEditor): PreviewPanel {
    if (PreviewPanel.current) {
      PreviewPanel.current.track(editor.document);
      PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return PreviewPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'auroraPreview',
      'Aurora Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
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
      this.ready = true;
      if (this.pendingConfig) { void this.panel.webview.postMessage(this.pendingConfig); this.pendingConfig = undefined; }
      if (this.pendingRender) { void this.panel.webview.postMessage(this.pendingRender); this.pendingRender = undefined; }
    } else if (msg.type === 'revealLine') {
      this.syncPreviewToEditor(msg.line);
    }
  }

  private scheduleRender() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.render(), 120);
  }

  /** Post a message, or buffer the latest until the webview is ready. */
  private post(msg: HostToWebview) {
    if (this.ready) {
      void this.panel.webview.postMessage(msg);
    } else if (msg.type === 'render') {
      this.pendingRender = msg;
    } else if (msg.type === 'setConfig') {
      this.pendingConfig = msg;
    }
  }

  private postConfig() { this.post({ type: 'setConfig', config: readConfig() }); }

  private render() {
    const source = this.doc.getText();
    this.post({ type: 'render', html: this.renderer.render(source), source });
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
