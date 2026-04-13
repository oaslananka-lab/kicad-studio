import type { AIProvider } from '../types';
import { buildSystemPrompt, DEFAULT_AI_LANGUAGE } from './prompts';

interface ClaudeResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

interface ClaudeErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

const REQUEST_TIMEOUT_MS = 30_000;

export class ClaudeProvider implements AIProvider {
  readonly name = 'Claude';

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async analyze(prompt: string, context: string, systemPrompt = buildSystemPrompt(DEFAULT_AI_LANGUAGE)): Promise<string> {
    const response = await this.request({
      model: this.model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nContext:\n${context}`
        }
      ]
    });

    const json = (await response.json()) as ClaudeResponse;
    return (
      json.content
        ?.map((item) => item.text)
        .filter((text): text is string => Boolean(text?.trim()))
        .join('\n\n')
        .trim() || 'No response from Claude.'
    );
  }

  private async request(body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(await this.formatHttpError(response));
      }

      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Claude request timed out after 30 seconds. Check your connection and try again.', {
          cause: error
        });
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Claude request failed due to an unknown network error.', { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async formatHttpError(response: Response): Promise<string> {
    const bodyText = await response.text().catch(() => '');
    let apiMessage = bodyText.trim();
    try {
      const parsed = JSON.parse(bodyText) as ClaudeErrorResponse;
      apiMessage = parsed.error?.message || parsed.error?.type || apiMessage;
    } catch {
      // Keep the raw response body if it was not JSON.
    }

    const prefix =
      response.status === 401
        ? 'Claude authentication failed. Check the stored API key.'
        : response.status === 429
          ? 'Claude rate limit reached. Wait and try again, or choose a different model.'
          : response.status >= 500
            ? 'Claude service returned a server error.'
            : `Claude request failed with HTTP ${response.status}.`;
    return apiMessage ? `${prefix} ${apiMessage}` : prefix;
  }
}
