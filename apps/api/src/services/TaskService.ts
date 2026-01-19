import OpenAI from 'openai';

type LLMProvider = 'openai' | 'ollama' | 'groq';

export interface GenerateTaskParams {
  architectureMarkdown: string;
  featureDescription: string;
  repoName: string;
}

export interface GeneratedTask {
  markdown: string;
  title: string;
}

export class TaskService {
  private provider: LLMProvider;
  private openai?: OpenAI;
  private groq?: OpenAI;
  private ollamaConfig?: {
    baseUrl: string;
    model: string;
  };

  constructor() {
    const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
    
    if (provider === 'ollama') {
      this.provider = 'ollama';
    } else if (provider === 'groq') {
      this.provider = 'groq';
    } else {
      this.provider = 'openai';
    }

    if (this.provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'llama3';

      this.ollamaConfig = {
        baseUrl,
        model,
      };
    } else if (this.provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }
      this.groq = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateTask(params: GenerateTaskParams): Promise<GeneratedTask> {
    try {
      const { architectureMarkdown, featureDescription, repoName } = params;

      const prompt = `You are a senior software engineer writing an implementation plan. Based on the architecture documentation for "${repoName}", create a task document for the requested feature.

ARCHITECTURE DOCUMENTATION:
${architectureMarkdown}

FEATURE REQUEST:
${featureDescription}

---

Generate a task document with this exact structure (no emojis, no decorative formatting):

# Task: [Descriptive title]

## Goal

[One paragraph describing what this feature accomplishes and why]

## Requirements

- [Functional requirement 1]
- [Functional requirement 2]
- [Continue as needed]

## Implementation Steps

### Step 1: [Step title]

Files: \`path/to/file.ts\`

[What to implement in this step. Be specific about the code changes needed.]

### Step 2: [Step title]

Files: \`path/to/file.ts\`, \`path/to/another.ts\`

[Continue with logical progression. Include code snippets if helpful.]

[Add 4-8 steps total, depending on complexity]

## Database Changes

[If applicable, describe any new tables, columns, or migrations needed. Include SQL if relevant.]

## Files to Create or Modify

| File | Action | Purpose |
|------|--------|---------|
| \`path/to/file.ts\` | Create | [Purpose] |
| \`path/to/existing.ts\` | Modify | [What changes] |

## Testing

- Unit tests: [What to test]
- Integration tests: [What flows to test]
- Manual verification: [How to verify it works]

## Considerations

- [Edge cases to handle]
- [Security implications]
- [Performance notes]
- [Migration or breaking changes]

## Done When

- [ ] [Completion criterion 1]
- [ ] [Completion criterion 2]
- [ ] [All tests pass]

---

CRITICAL RULES:
1. Use ONLY the actual file paths and patterns from the architecture documentation
2. Do NOT invent frameworks or tools not mentioned in the architecture (e.g., don't assume Prisma if it's not there)
3. Match the existing code style and conventions
4. Be specific - reference actual directories like "apps/api/src/routes/" not generic paths
5. If the architecture uses Supabase, use Supabase patterns. If it uses Express, use Express patterns.
6. Keep the document clean and professional - no emojis, no excessive formatting
7. Write like a senior engineer, not like a tutorial`;

      const markdown = await this.generate(prompt);
      
      // Extract title from the generated markdown
      const titleMatch = markdown.match(/^#\s*Task:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : featureDescription.slice(0, 100);

      return {
        markdown,
        title,
      };
    } catch (error) {
      throw new Error(`Failed to generate task: ${this.formatError(error)}`);
    }
  }

  private async generate(prompt: string): Promise<string> {
    if (this.provider === 'ollama') {
      return await this.generateWithOllama(prompt);
    }

    if (this.provider === 'groq') {
      return await this.generateWithGroq(prompt);
    }

    return await this.generateWithOpenAI(prompt);
  }

  private async generateWithOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert software architect and technical lead. Generate clear, actionable task breakdowns for software features. Be specific about file locations and implementation details.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    return content;
  }

  private async generateWithGroq(prompt: string): Promise<string> {
    if (!this.groq) {
      throw new Error('Groq client not initialized');
    }

    const completion = await this.groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert software architect and technical lead. Generate clear, actionable task breakdowns for software features. Be specific about file locations and implementation details.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 8000,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated from Groq');
    }

    return content;
  }

  private async generateWithOllama(prompt: string): Promise<string> {
    if (!this.ollamaConfig) {
      throw new Error('Ollama configuration missing');
    }

    type OllamaFetch = (
      input: string,
      init?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      }
    ) => Promise<{
      ok: boolean;
      status: number;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    }>;

    const fetchFn = (globalThis as typeof globalThis & { fetch?: OllamaFetch }).fetch;

    if (!fetchFn) {
      throw new Error('Fetch API is not available in this environment');
    }

    const response = await fetchFn(`${this.ollamaConfig.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaConfig.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert software architect and technical lead. Generate clear, actionable task breakdowns for software features.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`
      );
    }

    const result = (await response.json()) as {
      message?: { content?: string };
    };

    const content = result.message?.content;

    if (!content) {
      throw new Error('No content generated from Ollama');
    }

    return content;
  }

  private formatError(error: unknown): string {
    if (this.provider === 'openai' || this.provider === 'groq') {
      const providerName = this.provider === 'groq' ? 'Groq' : 'OpenAI';
      
      if (error && typeof error === 'object') {
        const status = 'status' in error ? (error as { status?: number }).status : undefined;
        const details =
          'message' in error && typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : undefined;

        if (status === 429) {
          return `${providerName} API rate limit exceeded. Please wait and try again.`;
        }

        if (details) {
          return details;
        }
      }

      return `Unknown ${providerName} error occurred`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error occurred';
  }
}
