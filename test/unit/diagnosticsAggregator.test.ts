import * as vscode from 'vscode';
import { KiCadDiagnosticsAggregator } from '../../src/language/diagnosticsAggregator';
import { languages } from './vscodeMock';

describe('KiCadDiagnosticsAggregator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps syntax and DRC diagnostics for the same file in one collection', () => {
    const backing = vscode.languages.createDiagnosticCollection('kicad');
    const aggregator = new KiCadDiagnosticsAggregator(backing);
    const uri = vscode.Uri.file('/workspace/board.kicad_pcb');
    const syntax = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Unknown node',
      2
    );
    syntax.source = 'kicad-studio:syntax';
    const drc = new vscode.Diagnostic(
      new vscode.Range(1, 0, 1, 1),
      'Clearance',
      0
    );
    drc.source = 'kicad-cli:drc';

    aggregator.set(uri, [syntax]);
    aggregator.set(uri, [drc]);

    expect(
      languages.getDiagnostics(uri).map((diagnostic) => diagnostic.message)
    ).toEqual(['Unknown node', 'Clearance']);
  });

  it('replaces only diagnostics from the same source', () => {
    const backing = vscode.languages.createDiagnosticCollection('kicad');
    const aggregator = new KiCadDiagnosticsAggregator(backing);
    const uri = vscode.Uri.file('/workspace/schematic.kicad_sch');
    const first = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Old ERC',
      1
    );
    first.source = 'kicad-cli:erc';
    const second = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'New ERC',
      1
    );
    second.source = 'kicad-cli:erc';

    aggregator.set(uri, [first]);
    aggregator.set(uri, [second]);

    expect(
      languages.getDiagnostics(uri).map((diagnostic) => diagnostic.message)
    ).toEqual(['New ERC']);
  });
});
