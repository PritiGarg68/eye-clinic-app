import { QueueItem } from "../../types/queue";
import SpectacleTable from "./SpectacleTable";
import { clinicSettings } from "../../lib/clinicSettings";
type PrescriptionPreviewProps = {
  patient: QueueItem | null;
  showSpectacleAdvice?: boolean;
};

const visionRows = [
  { key: "unaided", label: "Unaided" },
  { key: "withGlasses", label: "Glasses" },
  { key: "withPinHole", label: "Pin Hole" },
] as const;

export default function PrescriptionPreview({
  patient,
  showSpectacleAdvice = true,
}: PrescriptionPreviewProps) {
  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to preview prescription.
      </div>
    );
  }

  const optometristWorkup = patient.optometristWorkup;
  const consultation = patient.doctorConsultation;
  const finalSpectacleAdvice = consultation?.finalSpectacleAdvice;
  const today = new Date().toLocaleDateString();

  return (
    <div className="prescription-print-area rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
          <p className="text-2xl font-bold tracking-tight">
  {clinicSettings.clinicName}
</p>
<p className="mt-1 text-sm text-slate-600">
  {clinicSettings.address}
</p>
<p className="mt-1 text-sm text-slate-600">
  {clinicSettings.phone} · {clinicSettings.email}
</p>
<p className="mt-1 text-xs text-slate-500">
  {clinicSettings.doctorName}, {clinicSettings.doctorQualification} · Regn:{" "}
  {clinicSettings.medicalRegistrationNumber}
</p>
          </div>

          <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Prescription
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {today}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-5">
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

        <div>
          <p className="text-xs font-medium text-slate-500">Visit</p>
          <p className="font-semibold text-slate-900">{patient.visitType}</p>
        </div>
      </div>

      <div className="print-flow mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">
              Chief Complaint
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {optometristWorkup?.chiefComplaint || "Not entered"}
            </p>
          </div>

          <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Vision / VA
              </p>
              <p className="text-xs text-slate-500">Compact record</p>
            </div>

            {optometristWorkup?.vision ? (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 px-1.5 py-1 text-left font-semibold text-slate-700">
                        Type
                      </th>
                      <th className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-slate-700">
                        D OD
                      </th>
                      <th className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-slate-700">
                        D OS
                      </th>
                      <th className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-slate-700">
                        N OD
                      </th>
                      <th className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-slate-700">
                        N OS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visionRows.map((row) => {
                      const visionEntry = optometristWorkup.vision[row.key];

                      return (
                        <tr key={row.key}>
                          <td className="border border-slate-200 px-1.5 py-1 font-medium text-slate-700">
                            {row.label}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center text-slate-800">
                            {visionEntry.distanceOD || "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center text-slate-800">
                            {visionEntry.distanceOS || "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center text-slate-800">
                            {visionEntry.nearOD || "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center text-slate-800">
                            {visionEntry.nearOS || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Vision not recorded.
              </p>
            )}
          </div>
        </div>

        <div className="print-compact-section rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">Findings</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {consultation?.findings || "Not entered"}
          </p>
        </div>

        <div className="print-compact-section rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Diagnosis / Impression
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {consultation?.diagnosis || "Not entered"}
          </p>
        </div>

        <div className="print-compact-section rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Medicines</p>
            <p className="text-xs text-slate-500">
              Expands for additional medicines as needed
            </p>
          </div>

          {consultation?.medicines && consultation.medicines.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="w-[28%] border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Medicine
                    </th>
                    <th className="w-[14%] border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Eye / Route
                    </th>
                    <th className="w-[17%] border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Frequency
                    </th>
                    <th className="w-[13%] border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Duration
                    </th>
                    <th className="w-[28%] border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Instructions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {consultation.medicines.map((medicine) => (
                    <tr key={medicine.id}>
                      <td className="border border-slate-200 px-3 py-2 align-top">
                        {medicine.medicineName || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 align-top">
                        {medicine.eye || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 align-top">
                        {medicine.frequency || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 align-top">
                        {medicine.duration || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 align-top">
                        {medicine.instructions || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No medicines added.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">Advice</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {consultation?.advice || "Not entered"}
            </p>
          </div>

          <div className="print-compact-section rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">Follow-Up</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {consultation?.followUpDate || "Not entered"}
            </p>
          </div>
        </div>

        {showSpectacleAdvice && finalSpectacleAdvice && (
          <div className="prescription-screen-only rounded-xl border border-dashed border-slate-300 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Final Spectacle Advice
              </p>
              <p className="text-xs text-slate-500">
                Separate spectacle print can be generated later
              </p>
            </div>

            <div className="mt-3">
              <SpectacleTable
                value={{
                  od: finalSpectacleAdvice.od,
                  os: finalSpectacleAdvice.os,
                  add: finalSpectacleAdvice.add,
                }}
                readOnly
              />

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Remarks</p>
                <p className="mt-1 text-sm text-slate-800">
                  {finalSpectacleAdvice.remarks || "Not entered"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end border-t border-slate-300 pt-5">
          <div className="min-w-48 text-right">
            <div className="mb-2 h-10 border-b border-slate-300" />
            <p className="text-sm font-semibold text-slate-900">
  Doctor Signature
</p>
<p className="mt-1 text-xs text-slate-500">
  {clinicSettings.doctorName}
</p>
<p className="text-xs text-slate-500">
  Regn: {clinicSettings.medicalRegistrationNumber}
</p>
          </div>
        </div>
      </div>
    </div>
  );
}