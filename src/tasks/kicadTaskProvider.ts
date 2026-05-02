import * as vscode from 'vscode';
import { buildCliExportCommands, type ExportCommandKind } from '../cli/exportCommands';
import type { KiCadCliDetector } from '../cli/kicadCliDetector';
import { SETTINGS } from '../constants';
import type { KiCadTaskDefinition } from '../types';

export class KiCadTaskProvider implements vscode.TaskProvider {
  constructor(private readonly cliDetector: KiCadCliDetector) {}

  async provideTasks(): Promise<vscode.Task[]> {
    await this.cliDetector.detect();
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

    const cli = vscode.workspace.getConfiguration().get<string>(SETTINGS.cliPath, '');
    const args = this.buildArgs(definition.task, definition.file, outputDir);

    let execution: vscode.ProcessExecution;
    const detected = this.cliDetector.getDetected();

    if (detected?.args?.length) {
      execution = new vscode.ProcessExecution(detected.path, [...detected.args, ...args]);
    } else {
      execution = new vscode.ProcessExecution(cli || 'kicad-cli', args);
    }

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
