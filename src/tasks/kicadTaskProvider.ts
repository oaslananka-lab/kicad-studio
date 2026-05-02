import * as vscode from 'vscode';
import { buildCliExportCommands, type ExportCommandKind } from '../cli/exportCommands';
import type { KiCadCliDetector } from '../cli/kicadCliDetector';
import { SETTINGS } from '../constants';
import type { KiCadTaskDefinition } from '../types';

export class KiCadTaskProvider implements vscode.TaskProvider {
  constructor(private readonly detector?: KiCadCliDetector) {}

  async provideTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    const pcbFiles = await vscode.workspace.findFiles(
      '**/*.kicad_pcb',
      '**/node_modules/**',
      5
    );
    const schFiles = await vscode.workspace.findFiles(
      '**/*.kicad_sch',
      '**/node_modules/**',
      5
    );
    for (const file of pcbFiles) {
      tasks.push(
        await this.createTask({
          type: 'kicad',
          task: 'export-gerbers',
          file: file.fsPath
        })
      );
      tasks.push(
        await this.createTask({
          type: 'kicad',
          task: 'run-drc',
          file: file.fsPath
        })
      );
    }
    for (const file of schFiles) {
      tasks.push(
        await this.createTask({
          type: 'kicad',
          task: 'run-erc',
          file: file.fsPath
        })
      );
      tasks.push(
        await this.createTask({
          type: 'kicad',
          task: 'export-netlist',
          file: file.fsPath
        })
      );
    }
    return tasks;
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    const definition = task.definition as KiCadTaskDefinition;
    return this.createTask(definition, task.name);
  }

  private async createTask(
    definition: KiCadTaskDefinition,
    name?: string
  ): Promise<vscode.Task> {
    const outputDir =
      definition.outputDir ??
      vscode.workspace.getConfiguration().get<string>(SETTINGS.outputDir, 'fab');

    const detected = await this.detector?.detect();
    const cliPath =
      detected?.path ??
      vscode.workspace.getConfiguration().get<string>(SETTINGS.cliPath, '') ||
      'kicad-cli';

    const baseArgs = this.buildArgs(definition.task, definition.file, outputDir);
    const args = detected?.flatpakArgs
      ? [...detected.flatpakArgs, ...baseArgs]
      : baseArgs;

    const execution = new vscode.ProcessExecution(cliPath, args);
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
