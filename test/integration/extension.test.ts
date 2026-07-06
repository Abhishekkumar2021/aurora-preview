// test/integration/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Aurora Preview', () => {
  test('command is registered', async () => {
    // The manifest declares no auto-activation events, so activate the
    // extension explicitly before asserting its command is registered.
    const ext = vscode.extensions.getExtension('abhishek.aurora-preview');
    assert.ok(ext, 'aurora-preview extension should be present');
    await ext!.activate();

    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('auroraPreview.open'), 'auroraPreview.open should be registered');
  });
});
