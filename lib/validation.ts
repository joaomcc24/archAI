// Zod schemas for API request validation

import { z } from 'zod';

// Task generation request
export const generateTaskSchema = z.object({
  snapshotId: z.string().uuid('Invalid snapshot ID format'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
});

// GitHub connect request
export const githubConnectSchema = z.object({
  repoName: z.string().regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Invalid repository name format (expected: owner/repo)'),
  githubToken: z.string().min(1, 'GitHub token is required'),
  branch: z.string().optional(),
});

// Project generation request (no body, but we validate params)
export const projectIdSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
});

// Snapshot ID schema
export const snapshotIdSchema = z.object({
  id: z.string().uuid('Invalid snapshot ID format'),
});

// Task ID schema
export const taskIdSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
});

// Billing checkout request
export const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
});

// Helper function to validate request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    // Invalid JSON
    throw new Error('Invalid JSON in request body');
  }
}

// Helper function to validate URL params
export function validateParams<T>(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

// Format Zod errors for API responses
export function formatZodError(error: z.ZodError): {
  error: string;
  fields?: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    fields[path] = err.message;
  });
  
  return {
    error: 'Validation failed',
    fields: Object.keys(fields).length > 0 ? fields : undefined,
  };
}
