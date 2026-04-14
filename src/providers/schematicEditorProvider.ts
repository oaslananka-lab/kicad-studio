import { BaseKiCanvasEditorProvider } from './baseKiCanvasEditorProvider';

export class SchematicEditorProvider extends BaseKiCanvasEditorProvider {
  protected override readonly fileExtension = '.kicad_sch';
  protected override readonly fileType = 'schematic' as const;
  protected override readonly viewerTitle = 'KiCad Studio Schematic Viewer';
}
