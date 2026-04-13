import * as vscode from 'vscode';
import { BaseKiCanvasEditorProvider } from './baseKiCanvasEditorProvider';

export class SchematicEditorProvider extends BaseKiCanvasEditorProvider {
  protected readonly fileExtension = '.kicad_sch';
  protected readonly fileType = 'schematic' as const;
  protected readonly viewerTitle = 'KiCad Studio Schematic Viewer';

  constructor(context: vscode.ExtensionContext) {
    super(context);
  }
}
