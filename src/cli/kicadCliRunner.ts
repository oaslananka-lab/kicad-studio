import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { CLI_TIMEOUT_MS } from '../constants';
import { KiCadCliNotFoundError, KiCadCliTimeoutError } from '../errors';
import type { CliResult, CliRunOptions } from '../types';
import { Logger } from '../utils/logger';
import { KiCadCliDetector } from './kicadCliDetector';

/**
 * Runs kicad-cli commands with progress reporting and request de-duplication.
 */
export class KiCadCliRunner {
  private readonly controllers = new Set<AbortController>();
  private readonly runningCommands = new Map<string, Promise<CliResult>>();

  constructor(
    private readonly detector: KiCadCliDetector,
    private readonly logger: Logger
  ) {}

  async run<T>(options: CliRunOptions): Promise<CliResult<T>> {
    const key = options.command.join(' ');
    const existing = this.runningCommands.get(key);
    if (existing) {
      return existing as Promise<CliResult<T>>;
    }

    const next = this.executeCommand<T>(options);
    this.runningCommands.set(key, next as Promise<CliResult>);
    try {
      return await next;
    } finally {
      this.runningCommands.delete(key);
    }
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

  private async executeCommand<T>(options: CliRunOptions): Promise<CliResult<T>> {
    const detected = await this.detector.detect(true);
    if (!detected) {
      throw new KiCadCliNotFoundError();
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
        controller.abort(new KiCadCliTimeoutError(options.command.join(' '), CLI_TIMEOUT_MS));
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
        finish(() => reject(this.normalizeError(error, options.command.join(' '))));
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

  private normalizeError(error: unknown, command: string): Error {
    if (error instanceof KiCadCliTimeoutError) {
      return error;
    }
    if (error instanceof Error && /ENOENT/i.test(error.message)) {
      return new KiCadCliNotFoundError();
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return error.cause instanceof KiCadCliTimeoutError
        ? error.cause
        : new Error(`KiCad command cancelled before completion: ${command}.`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private normalizeCliFailure(message: string): string {
    if (/ENOENT/i.test(message)) {
      return new KiCadCliNotFoundError().message;
    }
    if (/No such file/i.test(message)) {
      return `KiCad command failed because a required file was not found.\n${message}`;
    }
    return `KiCad command failed.\n${message}`;
  }
}
