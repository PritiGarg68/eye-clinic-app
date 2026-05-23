import { QueueItem } from "../../types/queue";

type PatientHistoryPanelProps = {
  patient: QueueItem | null;
};

export default function PatientHistoryPanel({
  patient,
}: PatientHistoryPanelProps) {
  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to view previous visits.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">
          Previous Visit Snapshot
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Real visit history will appear here after database integration.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Mock Previous Visit
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Example only · Supabase history pending
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Read-only
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Date</p>
            <p className="text-slate-800">Previous visit date</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Vision Summary</p>
            <p className="text-slate-800">
              Last recorded VA / refraction will appear here.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Diagnosis / Impression
            </p>
            <p className="text-slate-800">
              Previous diagnosis summary will appear here.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Advice</p>
            <p className="text-slate-800">
              Previous advice and follow-up summary will appear here.
            </p>
          </div>

          <button
            type="button"
            className="mt-1 rounded-xl bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            View Previous Prescription PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        This is a placeholder. Once Supabase is added, this panel will show real
        previous visits for {patient.patientName}.
      </div>
    </div>
  );
}