import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { QueueItem } from "../../types/queue";

const queueItems: QueueItem[] = [];

export default function DoctorPage() {
  return (
    <AppShell
      title="Doctor / Admin Workspace"
      subtitle="Consultation, prescriptions, patient history, reports, and master data"
    >
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="grid gap-6 lg:col-span-1">
          <SectionCard
            title="Live Queue"
            subtitle="Patients waiting for doctor"
          >
            <QueuePanel items={queueItems} />
          </SectionCard>

          <SectionCard
            title="Patient Snapshot"
            subtitle="Current patient context"
          >
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No patient selected
            </div>
          </SectionCard>

          <SectionCard
            title="History Timeline"
            subtitle="Previous visits"
          >
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Prior visits will appear here
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Current Consultation"
          subtitle="Complaints, findings, diagnosis, medicines, advice, and follow-up"
          className="lg:col-span-3"
        >
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Chief Complaints
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Structured complaints and free-text notes will appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Optometrist Findings
              </p>
              <p className="mt-2 text-sm text-slate-500">
                VA, refraction, IOP, and dilation details will appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Diagnosis
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Diagnosis selection and notes will appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Medicines
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Medicine rows with eye, frequency, duration, and notes will
                appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Advice & Follow-Up
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Advice and follow-up date will appear here.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
                Save Draft
              </button>

              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Preview Prescription
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}