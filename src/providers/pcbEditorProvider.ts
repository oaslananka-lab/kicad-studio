import { BaseKiCanvasEditorProvider } from './baseKiCanvasEditorProvider';

export class PcbEditorProvider extends BaseKiCanvasEditorProvider {
  protected override readonly fileExtension = '.kicad_pcb';
  protected override readonly fileType = 'board' as const;
  protected override readonly viewerTitle = 'KiCad Studio PCB Viewer';
}
