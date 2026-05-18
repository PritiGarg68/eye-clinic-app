import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";

export default function ReceptionPage() {
  return (
    <AppShell
      title="Reception Workspace"
      subtitle="Patient check-in, billing, and queue management"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Live Queue"
          subtitle="Patients waiting for consultation"
        >
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Queue will appear here
          </div>
        </SectionCard>

        <SectionCard
          title="Patient Check-In"
          subtitle="Search or register patient and collect payment"
          className="lg:col-span-2"
        >
          <div className="grid gap-4">
            <input
              type="text"
              placeholder="Search by mobile number / UHID / name"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Search Patient
              </button>

              <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
                Register New Patient
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}