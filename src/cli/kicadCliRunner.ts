import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { CLI_TIMEOUT_MS } from '../constants';
import type { CliResult, CliRunOptions } from '../types';
import { Logger } from '../utils/logger';
import { KiCadCliDetector } from './kicadCliDetector';

export class KiCadCliRunner {
  private readonly controllers = new Set<AbortController>();

  constructor(
    private readonly detector: KiCadCliDetector,
    private readonly logger: Logger
  ) {}

  async run<T>(options: CliRunOptions): Promise<CliResult<T>> {
    const detected = await this.detector.detect(true);
    if (!detected) {
      throw new Error('kicad-cli not found. Please install KiCad or set the path in settings.');
    }

    const controller = new AbortController();
    this.controllers.add(controller);
    const startedAt = Date.now();
    this.logger.info(`Running ${detected.path} ${options.command.join(' ')}`);

    return new Promise<CliResult<T>>((resolve, reject) => {
      const child = spawn(detected.path, options.command, {
        cwd: options.cwd,
        env: process.env,
        signal: controller.signal,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        controller.abort();
      }, CLI_TIMEOUT_MS);

      const finish = (handler: () => void): void => {
        clearTimeout(timeout);
        this.controllers.delete(controller);
        handler();
      };

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        stdout += text;
        options.onProgress?.(text.trim());
        this.logger.info(text.trimEnd());
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        stderr += text;
        options.onProgress?.(text.trim());
        this.logger.warn(text.trimEnd());
      });

      child.on('error', (error) => {
        finish(() => reject(this.normalizeError(error)));
      });

      child.on('close', (exitCode) => {
        finish(() => {
          const result: CliResult<T> = {
            stdout,
            stderr,
            exitCode: exitCode ?? -1,
            durationMs: Date.now() - startedAt,
            parsed: options.parseOutput?.(stdout, stderr) as T | undefined
          };

          if ((exitCode ?? -1) !== 0) {
            reject(
              new Error(
                this.normalizeCliFailure(stderr || stdout || `kicad-cli exited with code ${exitCode ?? -1}`)
              )
            );
            return;
          }
          resolve(result);
        });
      });
    });
  }

  async runWithProgress<T>(options: CliRunOptions): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: options.progressTitle
      },
      async (progress, token) => {
        token.onCancellationRequested(() => this.cancelAll());
        const result = await this.run<T>({
          ...options,
          onProgress: (message) => {
            if (message) {
              progress.report({ message: message.slice(0, 120) });
              options.onProgress?.(message);
            }
          }
        });
        return (result.parsed as T | undefined) ?? (result.stdout as unknown as T);
      }
    );
  }

  cancelAll(): void {
    for (const controller of this.controllers) {
      controller.abort();
    }
    this.controllers.clear();
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error && /ENOENT/i.test(error.message)) {
      return new Error('kicad-cli not found. Please install KiCad or set the path in settings.');
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return new Error('KiCad command cancelled before completion.');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private normalizeCliFailure(message: string): string {
    if (/ENOENT/i.test(message)) {
      return 'kicad-cli not found. Please install KiCad or set the path in settings.';
    }
    if (/No such file/i.test(message)) {
      return `KiCad command failed because a required file was not found.\n${message}`;
    }
    return `KiCad command failed.\n${message}`;
  }
}
