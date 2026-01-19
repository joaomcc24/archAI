import { TaskService, GenerateTaskParams } from '../TaskService';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `# Task: Add User Settings Page

## 🎯 Goal
Create a comprehensive user settings page with profile editing, password change, and notification preferences.

---

## ✅ Requirements
- Users can update their profile information
- Users can change their password
- Users can manage notification preferences

---

## 🧩 Steps

### **Step 1: Create Settings Page**
- Create \`apps/web/app/settings/page.tsx\`
- Add basic layout and navigation

### **Step 2: Add Profile Form**
- Create profile editing form component
- Connect to API

---

## 🧠 Done When
- Users can successfully update their settings
- All forms validate input correctly`,
              },
            },
          ],
        }),
      },
    },
  }));
});

describe('TaskService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.LLM_PROVIDER = 'openai';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error if OpenAI API key is not set', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.LLM_PROVIDER = 'openai';
      
      expect(() => new TaskService()).toThrow('OPENAI_API_KEY environment variable is not set');
    });

    it('should initialize with Groq provider', () => {
      process.env.LLM_PROVIDER = 'groq';
      process.env.GROQ_API_KEY = 'test-groq-key';
      
      const service = new TaskService();
      expect(service).toBeInstanceOf(TaskService);
    });

    it('should initialize with Ollama provider', () => {
      process.env.LLM_PROVIDER = 'ollama';
      
      const service = new TaskService();
      expect(service).toBeInstanceOf(TaskService);
    });
  });

  describe('generateTask', () => {
    it('should generate a task with title and markdown', async () => {
      const service = new TaskService();
      
      const params: GenerateTaskParams = {
        architectureMarkdown: '# Architecture\n\nThis is a Next.js app...',
        featureDescription: 'Add user settings page with profile editing',
        repoName: 'user/my-app',
      };

      const result = await service.generateTask(params);

      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('title');
      expect(result.title).toBe('Add User Settings Page');
      expect(result.markdown).toContain('# Task:');
      expect(result.markdown).toContain('## 🎯 Goal');
      expect(result.markdown).toContain('## 🧩 Steps');
    });

    it('should handle empty feature description gracefully', async () => {
      const service = new TaskService();
      
      const params: GenerateTaskParams = {
        architectureMarkdown: '# Architecture\n\nThis is a Next.js app...',
        featureDescription: '',
        repoName: 'user/my-app',
      };

      const result = await service.generateTask(params);

      // Should still generate something
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('title');
    });

    it('should use feature description as fallback title if not found in markdown', async () => {
      // Override mock for this test
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'Some markdown without a proper title header',
                  },
                },
              ],
            }),
          },
        },
      }));

      const service = new TaskService();
      
      const params: GenerateTaskParams = {
        architectureMarkdown: '# Architecture',
        featureDescription: 'A very long feature description that should be truncated for the title',
        repoName: 'user/my-app',
      };

      const result = await service.generateTask(params);

      expect(result.title).toBe('A very long feature description that should be truncated for the title');
    });

    it('should throw error on LLM failure', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
          },
        },
      }));

      const service = new TaskService();
      
      const params: GenerateTaskParams = {
        architectureMarkdown: '# Architecture',
        featureDescription: 'Add feature',
        repoName: 'user/my-app',
      };

      await expect(service.generateTask(params)).rejects.toThrow('Failed to generate task');
    });

    it('should throw error if no content is generated', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                  },
                },
              ],
            }),
          },
        },
      }));

      const service = new TaskService();
      
      const params: GenerateTaskParams = {
        architectureMarkdown: '# Architecture',
        featureDescription: 'Add feature',
        repoName: 'user/my-app',
      };

      await expect(service.generateTask(params)).rejects.toThrow('No content generated from OpenAI');
    });
  });
});
