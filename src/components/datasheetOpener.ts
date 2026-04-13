import * as vscode from 'vscode';

export async function openDatasheet(url: string): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(url));
}
