import { BaseKiCanvasEditorProvider } from './baseKiCanvasEditorProvider';
import type { ViewerMetadata } from '../types';
import * as vscode from 'vscode';

export class SchematicEditorProvider extends BaseKiCanvasEditorProvider {
  protected override readonly fileExtension = '.kicad_sch';
  protected override readonly fileType = 'schematic' as const;
  protected override readonly viewerTitle = 'KiCad Studio Schematic Viewer';

  protected override buildViewerMetadata(
    _uri: vscode.Uri,
    text: string
  ): ViewerMetadata | undefined {
    const hopOvers = Array.from(
      text.matchAll(/\(\s*junction\s+\(\s*at\s+([0-9.-]+)\s+([0-9.-]+)\s*\)/g)
    )
      .map((match) => ({
        x: Number(match[1]),
        y: Number(match[2])
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!hopOvers.length) {
      return undefined;
    }

    return {
      hopOvers,
      notes: hopOvers.map(
        (point) =>
          `KiCad 10 hop-over junction detected at ${point.x}, ${point.y}. An overlay hint will be shown until KiCanvas renders hop-overs natively.`
      )
    };
  }
}
