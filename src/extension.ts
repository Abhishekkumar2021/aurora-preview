import * as vscode from 'vscode';
import { PreviewPanel } from './preview/panel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('auroraPreview.open', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Aurora Preview: open a Markdown file first.');
        return;
      }
      PreviewPanel.createOrShow(context, editor);
    })
  );
}

export function deactivate() {}
