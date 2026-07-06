import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('auroraPreview.open', () => {
      vscode.window.showInformationMessage('Aurora Preview: coming online…');
    })
  );
}

export function deactivate() {}
