// Environment variable validation

interface EnvConfig {
  // Required
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Optional but recommended
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OLLAMA_BASE_URL?: string;
  LLM_PROVIDER?: string;
  
  // Stripe (required for billing)
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRO_PRICE_ID?: string;
  STRIPE_TEAM_PRICE_ID?: string;
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID?: string;
  NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID?: string;
  
  // PostHog (optional)
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  
  // Sentry (optional)
  NEXT_PUBLIC_SENTRY_DSN?: string;
  
  // App URL
  NEXT_PUBLIC_APP_URL?: string;
}

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const recommendedEnvVars = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
] as const;

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check recommended variables
  for (const varName of recommendedEnvVars) {
    if (!process.env[varName]) {
      warnings.push(`Missing recommended environment variable: ${varName}`);
    }
  }

  // Check LLM provider configuration
  const llmProvider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  if (llmProvider === 'openai' && !process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when LLM_PROVIDER is set to "openai"');
  } else if (llmProvider === 'groq' && !process.env.GROQ_API_KEY) {
    errors.push('GROQ_API_KEY is required when LLM_PROVIDER is set to "groq"');
  } else if (llmProvider === 'ollama' && !process.env.OLLAMA_BASE_URL) {
    warnings.push('OLLAMA_BASE_URL is recommended when LLM_PROVIDER is set to "ollama" (defaults to http://localhost:11434)');
  }

  // Check Stripe configuration if billing is expected
  if (process.env.STRIPE_SECRET_KEY) {
    if (!process.env.STRIPE_PRO_PRICE_ID && !process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      warnings.push('Stripe Pro price ID not configured. Billing features may not work correctly.');
    }
    if (!process.env.STRIPE_TEAM_PRICE_ID && !process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID) {
      warnings.push('Stripe Team price ID not configured. Billing features may not work correctly.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getEnvConfig(): EnvConfig {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_TEAM_PRICE_ID: process.env.STRIPE_TEAM_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  const validation = validateEnv();
  
  if (!validation.valid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    
    // In production, we might want to throw an error
    // In development, we'll just warn
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Environment validation failed:\n${validation.errors.join('\n')}\n\n` +
        'Please check your environment variables and try again.'
      );
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    validation.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }
}
