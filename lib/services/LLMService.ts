import OpenAI from 'openai';
import { RepoFile } from './RepoParserService';

type LLMProvider = 'openai' | 'ollama' | 'groq';

export class LLMService {
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

  async generateArchitectureMarkdown(params: {
    repoName: string;
    repoStructure: RepoFile;
  }): Promise<string> {
    try {
      const { repoName, repoStructure } = params;

      const repoStructureJson = JSON.stringify(repoStructure, null, 2);

      const prompt = `Analyze the following GitHub repository structure and generate a comprehensive, accurate architecture.md document.

Repository: ${repoName}

Repository Structure:
${repoStructureJson}

CRITICAL INSTRUCTIONS:
- Base your analysis ONLY on actual files present in the repository structure
- Do NOT invent, assume, or hallucinate technologies that aren't clearly visible
- If you cannot determine something from the file structure, explicitly state "Not visible in repository structure"
- Cite specific files/folders when making claims (e.g., "Based on apps/web/package.json...")

Generate a detailed architecture.md document with the following sections:

1. **Project Overview**
   - What is the purpose of this project? (infer from repo name, folder structure, and visible routes)
   - Main features and functionality (based on app routes, components, and API endpoints)
   - Project type (monorepo? single app? library?)

2. **Tech Stack Analysis** (ONLY mention what you can CONFIRM from file extensions and folder names)
   - Framework & Runtime (Next.js? React? Node.js? Check for next.config, package.json patterns)
   - UI & Styling (Tailwind? CSS Modules? Component libraries?)
   - Language (TypeScript? JavaScript? Check .ts/.tsx vs .js/.jsx files)
   - Build Tools (Turbo? Vite? Webpack? Look for config files)
   - Database/Storage (Prisma? Supabase? MongoDB? Check lib/, schema files)
   - Authentication (NextAuth? Clerk? Custom? Check auth folders, middleware)
   - API/Backend (Express? tRPC? REST? GraphQL? Analyze api/ routes structure)
   - Testing (Jest? Vitest? Playwright? Check test files and configs)
   - Monorepo tools (if applicable - Turborepo? Nx? pnpm workspaces?)

3. **Architecture & Patterns**
   - Application architecture (App Router vs Pages Router? Monorepo structure?)
   - Rendering strategy (SSR? SSG? ISR? CSR? Based on page/route patterns)
   - Data fetching patterns (Server Components? Client fetch? React Query?)
   - State management approach (Context API? Zustand? Redux? Check context folders)
   - Code organization patterns (feature-based? layer-based? atomic design?)
   - Authentication flow (where are auth checks? middleware? HOCs?)

4. **Project Structure Deep Dive**
   - Explain the purpose of EACH top-level directory
   - Highlight any custom/unusual organizational patterns
   - Note separation of concerns (features, shared, utils, etc.)
   - Identify configuration files and their purposes

5. **Key Features & Components** (based on actual routes/files)
   - Main user-facing features (list specific routes/pages found)
   - Shared/reusable components (identify from components/ folders)
   - API endpoints and their purposes (analyze api/ routes)
   - Services and utilities (describe lib/, utils/, services/ folders)
   - Context providers and their role (if present)

6. **Data Flow & Integration**
   - How data flows through the application
   - External API integrations (if visible in code structure)
   - Database schema organization (if schema files present)
   - Real-time features (WebSockets? Server-Sent Events? Check for socket files)

7. **Development Setup**
   - Required environment variables (look for .env.example, env.ts validation files)
   - Installation steps specific to THIS project
   - Key npm/pnpm scripts (if package.json structure is visible)
   - Development workflow (monorepo commands? build process?)

8. **Deployment & Production**
   - Deployment indicators (Vercel? Docker? Check for configs)
   - Build output structure
   - Environment-specific configurations

Format as well-structured markdown with:
- Clear section headings (##, ###)
- Code blocks for file paths, commands, and examples
- Bullet points for lists
- Tables where appropriate (e.g., for environment variables)
- Emphasis on accuracy - better to say "Unknown" than to guess`;

      if (this.provider === 'ollama') {
        return await this.generateWithOllama(prompt);
      }

      if (this.provider === 'groq') {
        return await this.generateWithGroq(prompt);
      }

      return await this.generateWithOpenAI(prompt);
    } catch (error) {
      throw new Error(`Failed to generate architecture markdown: ${this.formatError(error)}`);
    }
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
            'You are an expert software architect. Generate clear, comprehensive architecture documentation for codebases.',
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
            'You are an expert software architect. Generate clear, comprehensive architecture documentation for codebases. Be specific, cite actual files, and avoid assumptions.',
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

    const response = await fetch(`${this.ollamaConfig.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaConfig.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert software architect. Generate clear, comprehensive architecture documentation for codebases.',
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

    return 'Unknown Ollama error occurred';
  }
}
