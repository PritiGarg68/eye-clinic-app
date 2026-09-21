import type { ReactNode } from "react";
import RoleGuard from "../../components/RoleGuard";

export default function MastersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["Doctor/Admin"]}>
      {children}
    </RoleGuard>
  );
}
