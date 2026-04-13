let configuration: Record<string, unknown> = {};

export function __setConfiguration(next: Record<string, unknown>): void {
  configuration = next;
}

function createDisposable() {
  return {
    dispose: jest.fn()
  };
}

export const workspace = {
  workspaceFolders: [
    {
      uri: {
        fsPath: process.cwd()
      }
    }
  ],
  getConfiguration: () => ({
    get: <T>(key: string, fallback?: T): T =>
      (Object.prototype.hasOwnProperty.call(configuration, key)
        ? (configuration[key] as T)
        : (fallback as T)),
    inspect: <T>(key: string):
      | {
          globalValue?: T;
          workspaceValue?: T;
          workspaceFolderValue?: T;
        }
      | undefined =>
      Object.prototype.hasOwnProperty.call(configuration, key)
        ? { globalValue: configuration[key] as T }
        : undefined,
    update: jest.fn()
  }),
  fs: {
    readFile: jest.fn()
  },
  onDidSaveTextDocument: jest.fn(() => createDisposable()),
  getWorkspaceFolder: () => ({
    uri: {
      fsPath: process.cwd()
    }
  }),
  findFiles: jest.fn().mockResolvedValue([])
};

export const window = {
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  activeTextEditor: undefined,
  tabGroups: {
    activeTabGroup: {
      activeTab: undefined
    }
  }
};

export const commands = {
  executeCommand: jest.fn()
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number
  ) {
    this.start = new Position(startLine, startCharacter);
    this.end = new Position(endLine, endCharacter);
  }
}

export class Uri {
  constructor(public readonly fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }

  static joinPath(base: Uri, ...paths: string[]): Uri {
    return new Uri([base.fsPath, ...paths].join('/'));
  }

  static parse(value: string): Uri {
    return new Uri(value);
  }

  toString(): string {
    return this.fsPath;
  }
}
