import * as vscode from 'vscode';
import { createRenderer } from './renderer';
import type { HostToWebview, PreviewConfig } from '../messaging';

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function readConfig(): PreviewConfig {
  const cfg = vscode.workspace.getConfiguration('auroraPreview');
  const kind = vscode.window.activeColorTheme.kind;
  const isLight = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
  return { accent: cfg.get('accent', '#4cd7b0'), theme: isLight ? 'light' : 'dark' };
}

export class PreviewPanel {
  private static current: PreviewPanel | undefined;
  private readonly renderer = createRenderer();
  private disposables: vscode.Disposable[] = [];
  private debounce: NodeJS.Timeout | undefined;

  static createOrShow(context: vscode.ExtensionContext, editor: vscode.TextEditor): PreviewPanel {
    if (PreviewPanel.current) {
      PreviewPanel.current.track(editor.document);
      PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return PreviewPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'auroraPreview', 'Aurora Preview', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] }
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
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    vscode.workspace.onDidChangeTextDocument(
      (e) => { if (e.document === this.doc) this.scheduleRender(); },
      null, this.disposables
    );
    this.postConfig();
    this.render();
  }

  private track(doc: vscode.TextDocument) { this.doc = doc; this.postConfig(); this.render(); }

  private scheduleRender() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.render(), 120);
  }

  private post(msg: HostToWebview) { void this.panel.webview.postMessage(msg); }
  private postConfig() { this.post({ type: 'setConfig', config: readConfig() }); }
  private render() {
    const source = this.doc.getText();
    this.post({ type: 'render', html: this.renderer.render(source), source });
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
      `script-src 'nonce-${n}'`,
    ].join('; ');
    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Security-Policy" content="${csp}" />
      <link rel="stylesheet" href="${css}" />
    </head><body><div id="app"></div>
      <script nonce="${n}" src="${js}"></script>
    </body></html>`;
  }

  dispose() {
    PreviewPanel.current = undefined;
    if (this.debounce) clearTimeout(this.debounce);
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
