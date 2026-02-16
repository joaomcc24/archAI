import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiters } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply auth-specific rate limiting (per IP)
    const rate = rateLimiters.auth(request);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many reset attempts. Please try again in ${rate.retryAfter} seconds.`,
          retryAfter: rate.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfter || 60),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rate.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000)),
          },
        }
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Invalid request body';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const origin = request.nextUrl.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/reset-password`,
    });

    if (error) {
      // Mask detailed auth errors but log them on the server
      console.error('Failed to send password reset email:', error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again in a moment.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in forgot-password handler:', error);
    return NextResponse.json(
      { error: 'Unexpected error. Please try again.' },
      { status: 500 }
    );
  }
}

