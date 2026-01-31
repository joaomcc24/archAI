import { describe, it, expect } from 'vitest';
import { generateTaskSchema, githubConnectSchema, formatZodError } from '../validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('generateTaskSchema', () => {
    it('should validate correct task generation request', () => {
      const valid = {
        snapshotId: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Add user authentication feature',
      };

      const result = generateTaskSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        snapshotId: 'invalid-uuid',
        description: 'Add user authentication feature',
      };

      const result = generateTaskSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject description shorter than 10 characters', () => {
      const invalid = {
        snapshotId: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Short',
      };

      const result = generateTaskSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('githubConnectSchema', () => {
    it('should validate correct GitHub connect request', () => {
      const valid = {
        repoName: 'owner/repo',
        githubToken: 'ghp_token123',
      };

      const result = githubConnectSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid repository name format', () => {
      const invalid = {
        repoName: 'invalid-repo-name',
        githubToken: 'ghp_token123',
      };

      const result = githubConnectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('formatZodError', () => {
    it('should format Zod errors correctly', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
      });

      const result = schema.safeParse({ name: '', email: 'invalid' });
      
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted.error).toBe('Validation failed');
        expect(formatted.fields).toBeDefined();
      }
    });
  });
});
