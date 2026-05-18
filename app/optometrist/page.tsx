import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";

export default function OptometristPage() {
  return (
    <AppShell
      title="Optometrist Workspace"
      subtitle="Workup, refraction, IOP, dilation, and spectacle draft"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Live Queue"
          subtitle="Patients ready for optometrist workup"
        >
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Queue will appear here
          </div>
        </SectionCard>

        <SectionCard
          title="Patient Workup"
          subtitle="Enter preliminary ophthalmology findings"
          className="lg:col-span-2"
        >
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                No patient selected
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Select a patient from the queue to begin workup.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Vision / VA
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Refraction
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  IOP / Pressure
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
                Mark Dilated
              </button>

              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Ready for Doctor
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}