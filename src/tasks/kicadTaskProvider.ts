import * as vscode from 'vscode';
import { buildCliExportCommands, type ExportCommandKind } from '../cli/exportCommands';
import { KiCadCliDetector } from '../cli/kicadCliDetector';
import { SETTINGS } from '../constants';
import type { KiCadTaskDefinition } from '../types';

export class KiCadTaskProvider implements vscode.TaskProvider {
  constructor(private readonly detector: KiCadCliDetector) {}

  async provideTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    const pcbFiles = await vscode.workspace.findFiles('**/*.kicad_pcb', '**/node_modules/**', 5);
    const schFiles = await vscode.workspace.findFiles('**/*.kicad_sch', '**/node_modules/**', 5);
    for (const file of pcbFiles) {
      tasks.push(this.createTask({ type: 'kicad', task: 'export-gerbers', file: file.fsPath }));
      tasks.push(this.createTask({ type: 'kicad', task: 'run-drc', file: file.fsPath }));
    }
    for (const file of schFiles) {
      tasks.push(this.createTask({ type: 'kicad', task: 'run-erc', file: file.fsPath }));
      tasks.push(this.createTask({ type: 'kicad', task: 'export-netlist', file: file.fsPath }));
    }
    return tasks;
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    const definition = task.definition as KiCadTaskDefinition;
    return this.createTask(definition, task.name);
  }

  private createTask(definition: KiCadTaskDefinition, name?: string): vscode.Task {
    const outputDir =
      definition.outputDir ??
      vscode.workspace.getConfiguration().get<string>(SETTINGS.outputDir, 'fab');

    const args = this.buildArgs(definition.task, definition.file, outputDir);

    const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
      return new KiCadTaskTerminal(this.detector, args);
    });

    return new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      name ?? `KiCad: ${definition.task}`,
      'kicad',
      execution
    );
  }

  private buildArgs(task: string, file: string, outputDir: string): string[] {
    if (task === 'run-drc') {
      return ['pcb', 'drc', file];
    }
    if (task === 'run-erc') {
      return ['sch', 'erc', file];
    }
    const normalized = task as ExportCommandKind;
    return buildCliExportCommands(normalized, file, outputDir)[0] ?? [];
  }
}

class KiCadTaskTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose: vscode.Event<number> = this.closeEmitter.event;

  constructor(
    private readonly detector: KiCadCliDetector,
    private readonly args: string[]
  ) {}

  async open(): Promise<void> {
    try {
      const cli = await this.detector.detect(true);
      if (!cli) {
        this.writeEmitter.fire('Error: kicad-cli not found.\r\n');
        this.closeEmitter.fire(1);
        return;
      }

      const finalArgs = [...(cli.args ?? []), ...this.args];
      this.writeEmitter.fire(`Executing: ${cli.path} ${finalArgs.join(' ')}\r\n\r\n`);

      const { spawn } = await import('node:child_process');
      const cp = spawn(cli.path, finalArgs, {
        shell: false,
        env: process.env
      });

      cp.stdout.on('data', (data) => {
        this.writeEmitter.fire(data.toString().replace(/\n/g, '\r\n'));
      });

      cp.stderr.on('data', (data) => {
        this.writeEmitter.fire(data.toString().replace(/\n/g, '\r\n'));
      });

      cp.on('exit', (code) => {
        this.writeEmitter.fire(`\r\nProcess exited with code ${code}\r\n`);
        this.closeEmitter.fire(code ?? 0);
      });

      cp.on('error', (err) => {
        this.writeEmitter.fire(`\r\nError: ${err.message}\r\n`);
        this.closeEmitter.fire(1);
      });
    } catch (error) {
      this.writeEmitter.fire(
        `\r\nTask failed: ${error instanceof Error ? error.message : String(error)}\r\n`
      );
      this.closeEmitter.fire(1);
    }
  }

  close(): void {}
}
