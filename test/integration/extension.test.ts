// test/integration/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Aurora Preview', () => {
  test('command is registered', async () => {
    // The manifest declares no auto-activation events, so activate the
    // extension explicitly before asserting its command is registered.
    // Find it by manifest name so this doesn't break when the publisher changes.
    const ext = vscode.extensions.all.find((e) => e.packageJSON?.name === 'aurora-preview');
    assert.ok(ext, 'aurora-preview extension should be present');
    await ext!.activate();

    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('auroraPreview.open'), 'auroraPreview.open should be registered');
  });

  test('opens a preview for an active markdown document', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# Hello Aurora' });
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand('auroraPreview.open');
    // Give the webview a tick to instantiate.
    await new Promise((r) => setTimeout(r, 300));
    const tabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    const hasPreview = tabs.some((t) => t.label === 'Aurora Preview');
    assert.ok(hasPreview, 'an "Aurora Preview" tab should be open');
  });
});
