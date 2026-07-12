import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

async function loadProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, interface_language, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (activeUser = user) => {
    if (!activeUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await loadProfile(activeUser.id);
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  useEffect(() => {
    let active = true;

    async function initialiseAuth() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const nextSession = data.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        setProfile(nextSession?.user ? await loadProfile(nextSession.user.id) : null);
      } catch {
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialiseAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        setProfile(nextSession?.user ? await loadProfile(nextSession.user.id) : null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(({ displayName, email, password }) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    }), []);

  const signIn = useCallback(({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password }), []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const requestPasswordReset = useCallback(({ email }) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    }), []);

  const updatePassword = useCallback(({ password }) =>
    supabase.auth.updateUser({ password }), []);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
  }), [session, user, profile, loading, refreshProfile, signUp, signIn, signOut, requestPasswordReset, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
