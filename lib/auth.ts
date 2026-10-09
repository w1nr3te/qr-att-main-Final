  import { useState, useEffect } from 'react';
  import { supabase } from './supabase';
  import type { Session, User } from '@supabase/supabase-js';

  type AuthState = {
    session: Session | null;
    user: User | null;
    loading: boolean;
  };

  let globalSession: Session | null = null;
  let globalUser: User | null = null;
  let globalLoading = true;
  let listeners: Set<() => void> = new Set();

  function notify() {
    listeners.forEach((l) => l());
  }

  export function setAuth(session: Session | null) {
    globalSession = session;
    globalUser = session?.user ?? null;
    globalLoading = false;
    notify();
  }

  // Load any existing session when the app starts
  supabase.auth.getSession().then(({ data }) => {
    setAuth(data.session ?? null);
  });

  // Keep global state in sync with Supabase's own auth events
  // (login, logout, token refresh, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    setAuth(session);
  });

  export function useAuth(): AuthState {
    const [, forceRender] = useState(0);

    useEffect(() => {
      const listener = () => forceRender((n) => n + 1);
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }, []);

    return {
      session: globalSession,
      user: globalUser,
      loading: globalLoading,
    };
  }

  export async function signUp(
    email: string,
    password: string,
    metadata?: { full_name?: string; role?: string }
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (!error && data.session) {
      setAuth(data.session);
    }
    return { data, error };
  }

  export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setAuth(data.session);
    }
    return { data, error };
  }

  export async function signOut() {
    const { error } = await supabase.auth.signOut();
    setAuth(null);
    return { error };
  }