import Link from "next/link";
import AppShell from "./components/AppShell";

const roles = [
  {
    title: "Reception",
    description: "Patient check-in, billing, receipts, and queue entry",
    href: "/reception",
  },
  {
    title: "Optometrist",
    description: "Workup, refraction, IOP, dilation, and spectacle draft",
    href: "/optometrist",
  },
  {
    title: "Doctor / Admin",
    description: "Consultation, prescriptions, reports, and master data",
    href: "/doctor",
  },
];

export default function Home() {
  return (
    <AppShell
      title="Eye Clinic OPD System"
      subtitle="Internal clinic management and EMR"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">
          Select your workspace
        </h2>

        <p className="mt-2 text-slate-600">
          Choose the role you want to use for today’s clinic workflow.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => (
          <Link
            key={role.title}
            href={role.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-xl font-semibold text-slate-900">
              {role.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {role.description}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}