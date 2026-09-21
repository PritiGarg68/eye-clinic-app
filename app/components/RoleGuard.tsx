"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getRoleHome,
  useAuth,
  type ClinicRole,
} from "./AuthProvider";

type RoleGuardProps = {
  allowedRoles: ClinicRole[];
  children: ReactNode;
};

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const hasAccess =
    Boolean(profile) &&
    allowedRoles.includes(profile!.role);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || !profile) {
      router.replace("/login");
      return;
    }

    if (!allowedRoles.includes(profile.role)) {
      router.replace(getRoleHome(profile.role));
    }
  }, [allowedRoles, loading, profile, router, user]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-8 py-12">
          <p className="text-sm text-slate-600">
            Checking access...
          </p>
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-8 py-12">
          <p className="text-sm text-slate-600">
            Redirecting...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
