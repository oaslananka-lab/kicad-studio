import type { AIProvider } from '../types';
import { buildSystemPrompt, DEFAULT_AI_LANGUAGE } from './prompts';

export type OpenAIApiMode = 'responses' | 'chat-completions';

interface OpenAITextPart {
  text?: string;
}

interface OpenAIResponsesEntry {
  content?: OpenAITextPart[];
}

interface OpenAIResponsesResponse {
  output_text?: string | string[];
  output?: OpenAIResponsesEntry[];
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

const REQUEST_TIMEOUT_MS = 30_000;

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly mode: OpenAIApiMode = 'responses'
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async analyze(prompt: string, context: string, systemPrompt = buildSystemPrompt(DEFAULT_AI_LANGUAGE)): Promise<string> {
    return this.mode === 'chat-completions'
      ? this.analyzeWithChatCompletions(prompt, context, systemPrompt)
      : this.analyzeWithResponses(prompt, context, systemPrompt);
  }

  private async analyzeWithResponses(prompt: string, context: string, systemPrompt: string): Promise<string> {
    const response = await this.request('https://api.openai.com/v1/responses', {
      model: this.model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: this.buildUserMessage(prompt, context) }]
        }
      ]
    });

    const json = (await response.json()) as OpenAIResponsesResponse;
    if (Array.isArray(json.output_text)) {
      return json.output_text.join('\n').trim() || 'No response from OpenAI.';
    }
    if (typeof json.output_text === 'string') {
      return json.output_text.trim() || 'No response from OpenAI.';
    }

    const output = json.output
      ?.flatMap((entry) => entry.content ?? [])
      .map((part) => part.text)
      .filter((text): text is string => Boolean(text?.trim()))
      .join('\n');
    return output?.trim() || 'No response from OpenAI.';
  }

  private async analyzeWithChatCompletions(prompt: string, context: string, systemPrompt: string): Promise<string> {
    const response = await this.request('https://api.openai.com/v1/chat/completions', {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.buildUserMessage(prompt, context) }
      ]
    });

    const json = (await response.json()) as OpenAIChatResponse;
    return json.choices?.[0]?.message?.content?.trim() || 'No response from OpenAI.';
  }

  private async request(url: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(await this.formatHttpError(response));
      }

      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('OpenAI request timed out after 30 seconds. Check your connection and try again.', {
          cause: error
        });
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('OpenAI request failed due to an unknown network error.', { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async formatHttpError(response: Response): Promise<string> {
    const bodyText = await response.text().catch(() => '');
    let apiMessage = bodyText.trim();
    try {
      const parsed = JSON.parse(bodyText) as OpenAIErrorResponse;
      apiMessage = parsed.error?.message || parsed.error?.type || apiMessage;
    } catch {
      // Keep the raw response body if it was not JSON.
    }

    const prefix =
      response.status === 401
        ? 'OpenAI authentication failed. Check the stored API key.'
        : response.status === 429
          ? 'OpenAI rate limit reached. Wait and try again, or choose a different model.'
          : response.status >= 500
            ? 'OpenAI service returned a server error.'
            : `OpenAI request failed with HTTP ${response.status}.`;
    return apiMessage ? `${prefix} ${apiMessage}` : prefix;
  }

  private buildUserMessage(prompt: string, context: string): string {
    return `${prompt}\n\nContext:\n${context}`;
  }
}
