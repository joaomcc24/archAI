'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { trackEvent, identifyUser, AnalyticsEvents } from '../lib/analytics';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Track auth events
      if (session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email,
        });

        if (event === 'SIGNED_IN') {
          trackEvent(AnalyticsEvents.SIGNED_IN, {
            method: 'password', // Could be enhanced to detect OAuth
          });
        } else if (event === 'SIGNED_UP') {
          trackEvent(AnalyticsEvents.SIGNED_UP, {
            email: session.user.email,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        trackEvent(AnalyticsEvents.SIGNED_OUT);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    trackEvent(AnalyticsEvents.SIGNED_OUT);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
