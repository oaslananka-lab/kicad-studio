import * as vscode from 'vscode';
import { BaseKiCanvasEditorProvider } from './baseKiCanvasEditorProvider';

export class PcbEditorProvider extends BaseKiCanvasEditorProvider {
  protected readonly fileExtension = '.kicad_pcb';
  protected readonly fileType = 'board' as const;
  protected readonly viewerTitle = 'KiCad Studio PCB Viewer';

  constructor(context: vscode.ExtensionContext) {
    super(context);
  }
}
