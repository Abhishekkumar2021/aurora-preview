import * as vscode from 'vscode';
import { PreviewPanel } from './preview/panel';

export function activate(context: vscode.ExtensionContext) {
  const exportAs = (format: 'html' | 'pdf') => () => {
    const panel = PreviewPanel.active;
    if (!panel) {
      vscode.window.showInformationMessage('Aurora Preview: open the preview first, then export.');
      return;
    }
    panel.requestExport(format);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('auroraPreview.open', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Aurora Preview: open a Markdown file first.');
        return;
      }
      PreviewPanel.createOrShow(context, editor);
    }),
    vscode.commands.registerCommand('auroraPreview.exportHtml', exportAs('html')),
    vscode.commands.registerCommand('auroraPreview.exportPdf', exportAs('pdf'))
  );
}

export function deactivate() {}
