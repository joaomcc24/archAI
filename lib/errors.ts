// Structured error handling

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400, message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, 'Please sign in to continue');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, 'You do not have permission to perform this action');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, `The requested ${resource} could not be found`);
    this.name = 'NotFoundError';
  }
}

export class LimitExceededError extends AppError {
  constructor(
    limitType: string,
    current: number,
    limit: number,
    upgradeMessage?: string
  ) {
    const message = `${limitType} limit reached. You've used ${current} of ${limit}.`;
    super(
      message,
      'LIMIT_EXCEEDED',
      403,
      upgradeMessage || `${message} Upgrade to Pro for unlimited ${limitType}.`
    );
    this.name = 'LimitExceededError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `${service} error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      `We're experiencing issues with ${service}. Please try again later.`
    );
    this.name = 'ExternalServiceError';
  }
}

// Helper to format errors for API responses
export function formatErrorResponse(error: unknown): {
  error: string;
  code?: string;
  details?: string;
  userMessage?: string;
} {
  if (error instanceof AppError) {
    return {
      error: error.userMessage || error.message,
      code: error.code,
      details: error.message,
      userMessage: error.userMessage,
    };
  }

  if (error instanceof Error) {
    return {
      error: 'An unexpected error occurred',
      details: error.message,
    };
  }

  return {
    error: 'An unexpected error occurred',
  };
}
