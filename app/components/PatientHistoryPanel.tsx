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
        <p className="text-sm font-semibold text-slate-800">
          Previous Visits
        </p>

        <p className="mt-2 text-sm text-slate-500">
          No previous visits are available in this prototype.
        </p>

        <p className="mt-2 text-xs text-slate-500">
          After database integration, this panel will show real previous visits,
          prescriptions, diagnosis history, vision/refraction history, and
          follow-up notes for {patient.patientName}.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        For Version 2 testing, use this area only as a placeholder. Real patient
        history will be implemented in the database phase.
      </div>
    </div>
  );
}
