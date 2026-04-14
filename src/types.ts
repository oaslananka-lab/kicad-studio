import * as vscode from 'vscode';

export interface FileReference {
  uri: vscode.Uri;
  fsPath: string;
  basename: string;
  extname: string;
}

export interface CliRunOptions {
  command: string[];
  cwd: string;
  progressTitle: string;
  parseOutput?: (stdout: string, stderr: string) => unknown;
  onProgress?: (message: string) => void;
}

export interface CliResult<T = unknown> {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  parsed?: T | undefined;
}

export interface DetectedKiCadCli {
  path: string;
  version: string;
  versionLabel: string;
  source: 'settings' | 'common-path' | 'path';
}

export interface ViewerState {
  zoom: number;
  grid: boolean;
  theme: string;
  selectedReference?: string | undefined;
}

export interface ViewerInboundMessage {
  type:
    | 'load'
    | 'refresh'
    | 'setTheme'
    | 'highlight'
    | 'setLayers'
    | 'showDiff'
    | 'showMessage';
  payload?: Record<string, unknown>;
}

export interface ViewerOutboundMessage {
  type:
    | 'ready'
    | 'componentSelected'
    | 'openInKiCad'
    | 'status'
    | 'error'
    | 'themeChanged';
  payload?: Record<string, unknown>;
}

export interface BomEntry {
  references: string[];
  value: string;
  footprint: string;
  quantity: number;
  mpn: string;
  manufacturer: string;
  lcsc: string;
  description: string;
  dnp: boolean;
  uuid?: string | undefined;
}

export interface BomSummary {
  totalComponents: number;
  uniqueValues: number;
}

export interface BomWebviewMessage {
  type: 'setData' | 'highlight' | 'exportCsv' | 'exportXlsx' | 'rowSelected';
  payload?: Record<string, unknown>;
}

export interface NetlistNode {
  netName: string;
  nodes: Array<{
    reference: string;
    pin: string;
  }>;
}

export interface NetlistWebviewMessage {
  type: 'setNetlist' | 'selectReference';
  payload?: Record<string, unknown>;
}

export interface ComponentPriceBreak {
  quantity: number;
  price: number;
  currency: string;
}

export interface ComponentOffer {
  seller: string;
  inventoryLevel?: number | undefined;
  prices: ComponentPriceBreak[];
}

export interface ComponentSearchResult {
  source: 'octopart' | 'lcsc';
  mpn: string;
  manufacturer: string;
  description: string;
  category?: string | undefined;
  datasheetUrl?: string | undefined;
  imageUrl?: string | undefined;
  lcscPartNumber?: string | undefined;
  offers: ComponentOffer[];
  specs: Array<{
    name: string;
    value: string;
  }>;
}

export interface ComponentDiff {
  uuid: string;
  reference: string;
  type: 'added' | 'removed' | 'changed';
  before?: Record<string, string> | undefined;
  after?: Record<string, string> | undefined;
}

export interface DiffWebviewMessage {
  type: 'setDiff' | 'navigate';
  payload?: Record<string, unknown>;
}

export interface ExportPreset {
  name: string;
  description?: string | undefined;
  commands: string[];
  outputDir?: string | undefined;
}

export interface AIConnectionResult {
  ok: boolean;
  latencyMs: number;
  error?: string | undefined;
}

export interface DiagnosticSummary {
  file: string;
  errors: number;
  warnings: number;
  infos: number;
  source: 'drc' | 'erc' | 'syntax';
}

export interface KiCadTaskDefinition extends vscode.TaskDefinition {
  task: string;
  file: string;
  outputDir?: string | undefined;
}

export interface ProjectTreeNode {
  label: string;
  type:
    | 'project'
    | 'schematic'
    | 'pcb'
    | 'symbol-library'
    | 'footprint-library'
    | 'jobset'
    | 'fab-output'
    | 'model'
    | 'file'
    | 'folder';
  uri?: vscode.Uri | undefined;
  children?: ProjectTreeNode[] | undefined;
}

export interface AIProvider {
  name: string;
  analyze(prompt: string, context: string, systemPrompt?: string): Promise<string>;
  analyzeStream?(
    prompt: string,
    context: string,
    systemPrompt: string | undefined,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void>;
  testConnection(): Promise<AIConnectionResult>;
  isConfigured(): boolean;
}

export interface ParserError {
  message: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
}

export interface SchemaNodeDefinition {
  tag: string;
  description: string;
  children?: string[] | undefined;
}
