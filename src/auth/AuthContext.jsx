import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { canKeepAuthenticatedView } from './authSessionContinuity.js';

const AuthContext = createContext(null);
const PROFILE_RETRY_DELAYS = [0, 180, 420, 800];

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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

async function loadProfileWithRetry(userId) {
  let lastError = null;

  for (const delay of PROFILE_RETRY_DELAYS) {
    if (delay) await wait(delay);

    try {
      const nextProfile = await loadProfile(userId);
      if (nextProfile) return nextProfile;
      lastError = null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [loading, setLoading] = useState(true);
  const profileRequestRef = useRef(0);
  const profileOwnerIdRef = useRef(null);

  const hydrateProfile = useCallback(async (activeUser) => {
    const requestId = ++profileRequestRef.current;

    if (!activeUser) {
      setProfile(null);
      profileOwnerIdRef.current = null;
      setProfileError('');
      return null;
    }

    try {
      const nextProfile = await loadProfileWithRetry(activeUser.id);
      if (requestId !== profileRequestRef.current) return null;

      profileOwnerIdRef.current = nextProfile ? activeUser.id : null;
      setProfile(nextProfile);
      setProfileError(nextProfile ? '' : 'missing');
      return nextProfile;
    } catch {
      if (requestId !== profileRequestRef.current) return null;

      profileOwnerIdRef.current = null;
      setProfile(null);
      setProfileError('unavailable');
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (activeUser = user) => {
    if (!activeUser) {
      profileRequestRef.current += 1;
      profileOwnerIdRef.current = null;
      setProfile(null);
      setProfileError('');
      return null;
    }

    // A manual profile refresh should not tear down a working live lesson.
    const needsAccessCheck = profileOwnerIdRef.current !== activeUser.id;
    if (needsAccessCheck) setLoading(true);
    try {
      return await hydrateProfile(activeUser);
    } finally {
      if (needsAccessCheck) setLoading(false);
    }
  }, [hydrateProfile, user]);

  useEffect(() => {
    let active = true;

    async function applySession(nextSession, event = 'INITIAL_SESSION') {
      if (!active) return;

      const nextUser = nextSession?.user ?? null;
      if (canKeepAuthenticatedView(event, nextUser?.id, profileOwnerIdRef.current)) {
        setSession(nextSession);
        setUser(nextUser);
        return;
      }

      setSession(nextSession ?? null);
      setUser(nextUser);

      if (!nextUser) {
        profileRequestRef.current += 1;
        profileOwnerIdRef.current = null;
        setProfile(null);
        setProfileError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      await hydrateProfile(nextUser);
      if (active) setLoading(false);
    }

    async function initialiseAuth() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError('');
        setLoading(false);
        return;
      }

      await applySession(data.session ?? null, 'INITIAL_SESSION');
    }

    initialiseAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Supabase explicitly recommends keeping this callback synchronous.
      // Defer profile/database work so auth state changes cannot deadlock the client.
      window.setTimeout(() => {
        if (!active) return;
        applySession(nextSession, event);
      }, 0);
    });

    return () => {
      active = false;
      profileRequestRef.current += 1;
      profileOwnerIdRef.current = null;
      listener.subscription.unsubscribe();
    };
  }, [hydrateProfile]);

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
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    }), []);

  const updatePassword = useCallback(({ password }) =>
    supabase.auth.updateUser({ password }), []);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    profileError,
    loading,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
  }), [
    session,
    user,
    profile,
    profileError,
    loading,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
