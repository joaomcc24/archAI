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
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_WEBHOOK_SECRET_CLI?: string;

  // GitHub OAuth
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
  INVITATION_EMAIL_FROM?: string;
  RESEND_FROM_EMAIL?: string;
  
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
  if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OLLAMA_BASE_URL) {
    warnings.push('No LLM provider API key configured. Some AI features may not work.');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is not set. Billing and subscriptions will be disabled.');
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

    if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET_CLI) {
      warnings.push('Stripe webhook secret (STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_CLI) is not configured. Webhook events will fail verification.');
    }
  }

  // App URL (required in production for correct redirects)
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL is required in production for correct redirect URLs.');
  } else if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push(
      'NEXT_PUBLIC_APP_URL is not set. Falling back to http://localhost:3000 in some routes. Configure it to match your deployed URL.'
    );
  }

  // GitHub OAuth configuration
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_REDIRECT_URI) {
    warnings.push('GitHub OAuth variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI) are not fully configured. GitHub login may not work.');
  }

  // Resend / email configuration
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY is not set. Transactional emails (e.g., invitations, password reset) will not be sent.');
  } else {
    if (!process.env.INVITATION_EMAIL_FROM && !process.env.RESEND_FROM_EMAIL) {
      warnings.push('INVITATION_EMAIL_FROM or RESEND_FROM_EMAIL is not set. Resend emails will not have a configured "from" address.');
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
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_WEBHOOK_SECRET_CLI: process.env.STRIPE_WEBHOOK_SECRET_CLI,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    INVITATION_EMAIL_FROM: process.env.INVITATION_EMAIL_FROM,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
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
