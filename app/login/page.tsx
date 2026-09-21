"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { getRoleHome, useAuth } from "../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    profile,
    loading,
    accessError,
    signIn,
    signOut,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile) {
      router.replace(getRoleHome(profile.role));
    }
  }, [loading, profile, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await signIn(normalizedEmail, password);

      if (result.error) {
        setFormError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setFormError(null);

    try {
      await signOut();
    } catch (error) {
      console.error("Could not sign out", error);
      setFormError("Could not sign out. Please try again.");
    }
  }

  return (
    <AppShell
      title="Garg Eye Clinic"
      subtitle="Secure staff login"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Staff Login
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with your clinic account.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">
            Checking login session...
          </p>
        ) : user && !profile ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {accessError || "This account cannot access the clinic system."}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
