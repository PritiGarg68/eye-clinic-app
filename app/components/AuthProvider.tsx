"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

export type ClinicRole =
  | "Doctor/Admin"
  | "Receptionist"
  | "Optometrist";

export type ClinicUserProfile = {
  id: string;
  authUserId: string;
  fullName: string;
  role: ClinicRole;
  isActive: boolean;
};

type SignInResult = {
  error: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: ClinicUserProfile | null;
  loading: boolean;
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type ProfileRow = {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

function isClinicRole(role: string): role is ClinicRole {
  return (
    role === "Doctor/Admin" ||
    role === "Receptionist" ||
    role === "Optometrist"
  );
}

function mapProfile(row: ProfileRow): ClinicUserProfile {
  if (!isClinicRole(row.role)) {
    throw new Error(`Unsupported clinic role: ${row.role}`);
  }

  return {
    id: row.id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
  };
}

async function fetchProfile(
  authUserId: string
): Promise<ClinicUserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, full_name, role, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfile(data as ProfileRow) : null;
}

export function getRoleHome(role: ClinicRole): string {
  switch (role) {
    case "Receptionist":
      return "/reception";
    case "Optometrist":
      return "/optometrist";
    case "Doctor/Admin":
      return "/doctor";
  }
}

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ClinicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function applySession(nextUser: User | null) {
      if (cancelled) {
        return;
      }

      setUser(nextUser);
      setAccessError(null);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await fetchProfile(nextUser.id);

        if (cancelled) {
          return;
        }

        if (!nextProfile) {
          setProfile(null);
          setAccessError(
            "This login does not have a clinic user profile."
          );
          setLoading(false);
          return;
        }

        if (!nextProfile.isActive) {
          setProfile(null);
          setAccessError("This clinic user account is inactive.");
          setLoading(false);
          return;
        }

        setProfile(nextProfile);
      } catch (error) {
        console.error("Could not load clinic user profile", error);

        if (!cancelled) {
          setAccessError("Could not load the clinic user profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Could not read Supabase auth session", error);

        if (!cancelled) {
          setAccessError("Could not read the login session.");
          setLoading(false);
        }

        return;
      }

      void applySession(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(
    email: string,
    password: string
  ): Promise<SignInResult> {
    setAccessError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Login succeeded but no user was returned." };
    }

    try {
      const nextProfile = await fetchProfile(data.user.id);

      if (!nextProfile) {
        await supabase.auth.signOut();
        return {
          error: "This login does not have a clinic user profile.",
        };
      }

      if (!nextProfile.isActive) {
        await supabase.auth.signOut();
        return {
          error: "This clinic user account is inactive.",
        };
      }

      setUser(data.user);
      setProfile(nextProfile);
      setAccessError(null);

      return { error: null };
    } catch (profileError) {
      console.error("Could not validate clinic user profile", profileError);
      await supabase.auth.signOut();

      return {
        error: "Could not validate the clinic user profile.",
      };
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setProfile(null);
    setAccessError(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      accessError,
      signIn,
      signOut,
    }),
    [user, profile, loading, accessError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
