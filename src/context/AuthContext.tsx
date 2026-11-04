"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { claimWorkspace as apiClaimWorkspace } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  claimWorkspace: (token?: string) => Promise<number>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  claimWorkspace: async (token?: string) => 0,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const claimCurrentWorkspace = useCallback(async (token?: string): Promise<number> => {
    try {
      const res = await apiClaimWorkspace(token);
      return res.claimed_count;
    } catch (err) {
      console.warn("Failed to claim sandbox workspace:", err);
      return 0;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fetch initial active session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.warn("Error getting initial Supabase session:", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    // Listen to real-time auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);

      // When user transitions to signed-in, claim sandbox shipments
      if (event === "SIGNED_IN" && newSession?.access_token) {
        await claimCurrentWorkspace(newSession.access_token);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [claimCurrentWorkspace]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signOut,
        claimWorkspace: claimCurrentWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
