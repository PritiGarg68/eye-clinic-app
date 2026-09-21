"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  children,
}: AppShellProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Could not sign out", error);
      window.alert("Could not sign out. Please try again.");
    }
  }
    return (
      <main className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white px-8 py-5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {title}
              </h1>

              {subtitle && (
                <p className="text-sm text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>

            {profile && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {profile.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {profile.role}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>
  
        <section className="mx-auto max-w-6xl px-8 py-12">
          {children}
        </section>
      </main>
    );
  }