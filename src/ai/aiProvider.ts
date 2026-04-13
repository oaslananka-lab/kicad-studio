import * as vscode from 'vscode';
import { AI_SECRET_KEY, SETTINGS } from '../constants';
import type { AIProvider } from '../types';
import { ClaudeProvider } from './claudeProvider';
import { OpenAIProvider } from './openaiProvider';
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_API_MODE,
  DEFAULT_OPENAI_MODEL
} from './prompts';

export class AIProviderRegistry {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getProvider(): Promise<AIProvider | undefined> {
    const config = vscode.workspace.getConfiguration();
    const selected = config.get<string>(SETTINGS.aiProvider, 'none');
    const apiKey = await this.context.secrets.get(AI_SECRET_KEY);
    const configuredModel = config.get<string>(SETTINGS.aiModel, '').trim();

    if (!apiKey || selected === 'none') {
      return undefined;
    }

    if (selected === 'claude') {
      return new ClaudeProvider(apiKey, configuredModel || DEFAULT_CLAUDE_MODEL);
    }
    if (selected === 'openai') {
      const apiMode = config.get<string>(SETTINGS.aiOpenAIApiMode, DEFAULT_OPENAI_API_MODE);
      return new OpenAIProvider(
        apiKey,
        configuredModel || DEFAULT_OPENAI_MODEL,
        apiMode === 'chat-completions' ? 'chat-completions' : 'responses'
      );
    }
    return undefined;
  }
}
