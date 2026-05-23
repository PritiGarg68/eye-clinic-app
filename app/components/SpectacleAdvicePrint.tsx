import { QueueItem } from "../../types/queue";
import SpectacleTable from "./SpectacleTable";

type SpectacleAdvicePrintProps = {
  patient: QueueItem | null;
};

export default function SpectacleAdvicePrint({
  patient,
}: SpectacleAdvicePrintProps) {
  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to preview spectacle advice.
      </div>
    );
  }

  const finalSpectacleAdvice = patient.doctorConsultation?.finalSpectacleAdvice;
  const today = new Date().toLocaleDateString();

  return (
    <div className="spectacle-print-area rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              Eye Clinic Name
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Address line, city · Phone number · Email
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Doctor name, qualification, registration number
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Spectacle Advice
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {today}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-500">Patient</p>
          <p className="font-semibold text-slate-900">{patient.patientName}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">UHID</p>
          <p className="font-semibold text-slate-900">{patient.uhid}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Age / Gender</p>
          <p className="font-semibold text-slate-900">
            {patient.age} yrs / {patient.gender}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Final Spectacle Prescription
        </p>

        {finalSpectacleAdvice ? (
          <div className="mt-4">
            <SpectacleTable
              value={{
                od: finalSpectacleAdvice.od,
                os: finalSpectacleAdvice.os,
                add: finalSpectacleAdvice.add,
              }}
              readOnly
            />

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Remarks</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {finalSpectacleAdvice.remarks || "Not entered"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No final spectacle advice entered.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end border-t border-slate-300 pt-6">
        <div className="min-w-48 text-right">
          <div className="mb-2 h-12 border-b border-slate-300" />
          <p className="text-sm font-semibold text-slate-900">
            Doctor Signature
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Name / registration details
          </p>
        </div>
      </div>
    </div>
  );
}