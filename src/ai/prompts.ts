export type AiLanguage = 'en' | 'tr' | 'de' | 'zh-CN' | 'ja';

export const DEFAULT_AI_LANGUAGE: AiLanguage = 'en';
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1';
export const DEFAULT_OPENAI_API_MODE = 'responses';

const LANGUAGE_NAMES: Record<AiLanguage, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese'
};

export function normalizeAiLanguage(value: string | undefined): AiLanguage {
  if (value === 'tr' || value === 'de' || value === 'zh-CN' || value === 'ja') {
    return value;
  }
  return DEFAULT_AI_LANGUAGE;
}

export function buildSystemPrompt(language: AiLanguage): string {
  return [
    'You are an expert electrical engineer specializing in KiCad schematic and PCB design.',
    'Be practical, concise, and safety-aware. When the available context is incomplete, state the assumption instead of inventing details.',
    `Respond in ${LANGUAGE_NAMES[language]}.`
  ].join(' ');
}

export function buildCircuitExplanationPrompt(): string {
  return 'Explain what this selected KiCad circuit block does, how it works, and call out any likely design risks or review notes.';
}

export function buildErrorAnalysisPrompt(args: {
  message: string;
  ruleName?: string;
  boardInfo?: string;
}): string {
  return [
    'Explain this KiCad DRC/ERC issue and provide step-by-step fix guidance.',
    `Issue: ${args.message}`,
    `Rule: ${args.ruleName || 'unknown'}`,
    'Coordinates: unknown',
    `Board context: ${args.boardInfo || 'unknown board'}`
  ].join('\n');
}
