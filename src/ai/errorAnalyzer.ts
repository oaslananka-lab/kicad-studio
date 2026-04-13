import * as vscode from 'vscode';
import { AIProviderRegistry } from './aiProvider';
import { Logger } from '../utils/logger';
import { SETTINGS } from '../constants';
import {
  buildErrorAnalysisPrompt,
  buildSystemPrompt,
  DEFAULT_AI_LANGUAGE,
  normalizeAiLanguage
} from './prompts';

export class ErrorAnalyzer {
  constructor(
    private readonly providers: AIProviderRegistry,
    private readonly logger: Logger
  ) {}

  async analyzeSelectedError(): Promise<void> {
    const provider = await this.providers.getProvider();
    if (!provider?.isConfigured()) {
      void vscode.window.showWarningMessage('AI provider is not configured. Choose a provider and store an API key first.');
      return;
    }

    const message = await vscode.window.showInputBox({
      title: 'Paste the DRC/ERC error description',
      prompt: 'Example: Clearance violation between U1 pad 1 and net GND'
    });
    if (!message) {
      return;
    }

    const ruleName = await vscode.window.showInputBox({
      title: 'Rule name',
      prompt: 'Example: clearance'
    });
    const boardInfo = await vscode.window.showInputBox({
      title: 'Board context',
      prompt: 'Example: MainBoard, 4 layers'
    });

    const language = normalizeAiLanguage(
      vscode.workspace.getConfiguration().get<string>(SETTINGS.aiLanguage, DEFAULT_AI_LANGUAGE)
    );
    const response = await provider.analyze(
      buildErrorAnalysisPrompt({ message, ruleName, boardInfo }),
      boardInfo ?? '',
      buildSystemPrompt(language)
    );
    this.logger.info(`AI analysis (${provider.name})\n${response}`);
    this.logger.show();
    await vscode.env.clipboard.writeText(response);
    void vscode.window.showInformationMessage('AI analysis copied to clipboard and written to the KiCad Studio output channel.');
  }
}
