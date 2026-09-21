import type { ReactNode } from "react";
import RoleGuard from "../components/RoleGuard";

export default function ReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={[
        "Receptionist",
        "Doctor/Admin",
      ]}
    >
      {children}
    </RoleGuard>
  );
}
