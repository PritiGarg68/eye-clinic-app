import type { ReactNode } from "react";
import RoleGuard from "../components/RoleGuard";

export default function OptometristLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={[
        "Optometrist",
        "Doctor/Admin",
      ]}
    >
      {children}
    </RoleGuard>
  );
}
