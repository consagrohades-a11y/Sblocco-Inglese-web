import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

async function loadProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_key, avatar_background_key, profession, age, interface_language, timezone, role, status')
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

      try {
        const nextProfile = nextSession?.user ? await loadProfile(nextSession.user.id) : null;

        if (nextSession?.user && !nextProfile) {
          await supabase.auth.signOut({ scope: 'local' });
          if (!active) return;
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setProfile(nextProfile);
      } catch {
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialiseAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      try {
        const nextProfile = nextSession?.user ? await loadProfile(nextSession.user.id) : null;

        if (nextSession?.user && !nextProfile) {
          if (event !== 'SIGNED_OUT') {
            await supabase.auth.signOut({ scope: 'local' });
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setProfile(nextProfile);
      } catch {
        setSession(null);
        setUser(null);
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

  const signUp = useCallback(({
    displayName,
    profession,
    age,
    avatarKey,
    avatarBackgroundKey,
    timezone,
    email,
    password,
    emailRedirectTo,
  }) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          profession: String(profession || '').trim() || null,
          age: Number.isInteger(age) ? age : null,
          avatar_key: avatarKey || null,
          avatar_background_key: avatarKey ? (avatarBackgroundKey || 'cream') : null,
          timezone: timezone || null,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
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
