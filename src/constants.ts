import * as vscode from 'vscode';

export const EXTENSION_ID = 'oaslananka.kicadstudio';
export const OUTPUT_CHANNEL_NAME = 'KiCad Studio';
export const DIAGNOSTIC_COLLECTION_NAME = 'kicad';
export const TREE_VIEW_ID = 'kicadstudio.projectTree';
export const BOM_VIEW_ID = 'kicadstudio.bomView';
export const NETLIST_VIEW_ID = 'kicadstudio.netlistView';
export const SCHEMATIC_EDITOR_VIEW_TYPE = 'kicadstudio.schematicViewer';
export const PCB_EDITOR_VIEW_TYPE = 'kicadstudio.pcbViewer';
export const LARGE_FILE_BYTES = 5 * 1024 * 1024;
export const PARTIAL_PARSE_LINE_LIMIT = 2000;
export const WEBVIEW_MESSAGE_DEBOUNCE_MS = 500;
export const SEARCH_DEBOUNCE_MS = 300;
export const CLI_TIMEOUT_MS = 5 * 60 * 1000;
export const AI_MAX_TOKENS = 4096;
export const AI_STREAM_TIMEOUT_MS = 120_000;
export const AI_CHAT_MAX_HISTORY = 20;
export const VIEWER_HIDDEN_CACHE_RELEASE_MS = 5 * 60 * 1000;
export const EXPORT_PRESET_SETTING = 'kicadstudio.exportPresets';
export const OCTOPART_SECRET_KEY = 'kicadstudio.secrets.octopart';
export const AI_SECRET_KEY = 'kicadstudio.secrets.ai';
export const KICAD_LANGUAGES = [
  'kicad-schematic',
  'kicad-pcb',
  'kicad-symbol',
  'kicad-footprint',
  'kicad-project'
] as const;
export const KICAD_FILE_EXTENSIONS = [
  '.kicad_pro',
  '.kicad_sch',
  '.kicad_pcb',
  '.kicad_sym',
  '.kicad_mod',
  '.kicad_jobset'
] as const;
export const COMMANDS = {
  showStatusMenu: 'kicadstudio.showStatusMenu',
  openSchematic: 'kicadstudio.openSchematic',
  openPCB: 'kicadstudio.openPCB',
  openInKiCad: 'kicadstudio.openInKiCad',
  detectCli: 'kicadstudio.detectCli',
  exportGerbers: 'kicadstudio.exportGerbers',
  exportGerbersWithDrill: 'kicadstudio.exportGerbersWithDrill',
  exportPDF: 'kicadstudio.exportPDF',
  exportPCBPDF: 'kicadstudio.exportPCBPDF',
  exportSVG: 'kicadstudio.exportSVG',
  exportIPC2581: 'kicadstudio.exportIPC2581',
  exportODB: 'kicadstudio.exportODB',
  export3DGLB: 'kicadstudio.export3DGLB',
  export3DBREP: 'kicadstudio.export3DBREP',
  export3DPLY: 'kicadstudio.export3DPLY',
  exportGenCAD: 'kicadstudio.exportGenCAD',
  exportIPCD356: 'kicadstudio.exportIPCD356',
  exportDXF: 'kicadstudio.exportDXF',
  exportPickAndPlace: 'kicadstudio.exportPickAndPlace',
  exportFootprintSVG: 'kicadstudio.exportFootprintSVG',
  exportSymbolSVG: 'kicadstudio.exportSymbolSVG',
  exportManufacturingPackage: 'kicadstudio.exportManufacturingPackage',
  exportBOMCSV: 'kicadstudio.exportBOMCSV',
  exportBOMXLSX: 'kicadstudio.exportBOMXLSX',
  exportNetlist: 'kicadstudio.exportNetlist',
  runJobset: 'kicadstudio.runJobset',
  exportInteractiveBOM: 'kicadstudio.exportInteractiveBOM',
  runDRC: 'kicadstudio.runDRC',
  runERC: 'kicadstudio.runERC',
  searchComponent: 'kicadstudio.searchComponent',
  showDiff: 'kicadstudio.showDiff',
  aiAnalyzeError: 'kicadstudio.aiAnalyzeError',
  aiExplainCircuit: 'kicadstudio.aiExplainCircuit',
  openAiChat: 'kicadstudio.openAiChat',
  aiProactiveDRC: 'kicadstudio.aiProactiveDRC',
  testAiConnection: 'kicadstudio.testAiConnection',
  searchLibrarySymbol: 'kicadstudio.searchLibrarySymbol',
  searchLibraryFootprint: 'kicadstudio.searchLibraryFootprint',
  reindexLibraries: 'kicadstudio.reindexLibraries',
  refreshProjectTree: 'kicadstudio.refreshProjectTree',
  saveExportPreset: 'kicadstudio.saveExportPreset',
  runExportPreset: 'kicadstudio.runExportPreset',
  setOctopartApiKey: 'kicadstudio.setOctopartApiKey',
  setAiApiKey: 'kicadstudio.setAiApiKey',
  clearSecrets: 'kicadstudio.clearSecrets'
} as const;
export const CONTEXT_KEYS = {
  hasProject: 'kicadstudio.hasProject',
  schematicOpen: 'kicadstudio.schematicOpen',
  pcbOpen: 'kicadstudio.pcbOpen',
  aiEnabled: 'kicadstudio.aiEnabled',
  aiHealthy: 'kicadstudio.aiHealthy'
} as const;
export const SETTINGS = {
  cliPath: 'kicadstudio.kicadCliPath',
  kicadPath: 'kicadstudio.kicadPath',
  outputDir: 'kicadstudio.defaultOutputDir',
  gerberPrecision: 'kicadstudio.gerber.precision',
  gerberUseProtelExtension: 'kicadstudio.gerber.useProtelExtension',
  ipcVersion: 'kicadstudio.ipc2581.version',
  ipcUnits: 'kicadstudio.ipc2581.units',
  bomGroupIdentical: 'kicadstudio.bom.groupIdentical',
  bomFields: 'kicadstudio.bom.fields',
  viewerTheme: 'kicadstudio.viewer.theme',
  viewerAutoRefresh: 'kicadstudio.viewer.autoRefresh',
  octopartApiKey: 'kicadstudio.componentSearch.octopartApiKey',
  enableLCSC: 'kicadstudio.componentSearch.enableLCSC',
  aiProvider: 'kicadstudio.ai.provider',
  aiApiKey: 'kicadstudio.ai.apiKey',
  aiModel: 'kicadstudio.ai.model',
  aiLanguage: 'kicadstudio.ai.language',
  aiOpenAIApiMode: 'kicadstudio.ai.openaiApiMode',
  logLevel: 'kicadstudio.logLevel',
  autoRunDRC: 'kicadstudio.drc.autoRunOnSave',
  autoRunERC: 'kicadstudio.erc.autoRunOnSave'
} as const;
export const DEFAULT_BOM_FIELDS = [
  'Reference',
  'Value',
  'Footprint',
  'Quantity',
  'MPN',
  'Manufacturer',
  'Description'
];
export const CLI_CAPABILITY_COMMANDS = {
  gerbers: ['pcb', 'export', 'gerbers'],
  drill: ['pcb', 'export', 'drill'],
  pdfSch: ['sch', 'export', 'pdf'],
  pdfPcb: ['pcb', 'export', 'pdf'],
  svgSch: ['sch', 'export', 'svg'],
  svgPcb: ['pcb', 'export', 'svg'],
  ipc2581: ['pcb', 'export', 'ipc2581'],
  odb: ['pcb', 'export', 'odb'],
  glb: ['pcb', 'export', 'glb'],
  brep: ['pcb', 'export', 'brep'],
  ply: ['pcb', 'export', 'ply'],
  gencad: ['pcb', 'export', 'gencad'],
  ipcd356: ['pcb', 'export', 'ipcd356'],
  dxf: ['pcb', 'export', 'dxf'],
  pos: ['pcb', 'export', 'pos'],
  fpSvg: ['fp', 'export', 'svg'],
  symSvg: ['sym', 'export', 'svg'],
  jobset: ['jobset', 'run'],
  bom: ['sch', 'export', 'bom'],
  netlist: ['sch', 'export', 'netlist'],
  drc: ['pcb', 'drc'],
  erc: ['sch', 'erc']
} as const;
export const DOCUMENT_SELECTOR: vscode.DocumentSelector = KICAD_LANGUAGES.map((language) => ({
  language
}));
