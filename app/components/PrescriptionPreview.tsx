import { QueueItem } from "../../types/queue";
import SpectacleTable from "./SpectacleTable";

type PrescriptionPreviewProps = {
  patient: QueueItem | null;
};

const visionRows = [
  { key: "unaided", label: "Unaided" },
  { key: "withGlasses", label: "With Glasses" },
  { key: "withPinHole", label: "Pin Hole" },
] as const;

export default function PrescriptionPreview({
  patient,
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-4">
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

          <div className="rounded-xl border border-slate-200 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Prescription
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {today}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-5">
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

      <div className="mt-6 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Chief Complaint
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {optometristWorkup?.chiefComplaint || "Not entered"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Diagnosis / Impression
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {consultation?.diagnosis || "Not entered"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Vision / VA</p>
            <p className="text-xs text-slate-500">
              Compact record for follow-up / referral reference
            </p>
          </div>

          {optometristWorkup?.vision ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-2 py-2 text-left font-semibold text-slate-700">
                      Vision
                    </th>
                    <th className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                      Dist OD
                    </th>
                    <th className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                      Dist OS
                    </th>
                    <th className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                      Near OD
                    </th>
                    <th className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                      Near OS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visionRows.map((row) => {
                    const visionEntry = optometristWorkup.vision[row.key];

                    return (
                      <tr key={row.key}>
                        <td className="border border-slate-200 px-2 py-2 font-medium text-slate-700">
                          {row.label}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-800">
                          {visionEntry.distanceOD || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-800">
                          {visionEntry.distanceOS || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-800">
                          {visionEntry.nearOD || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-800">
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

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Medicines</p>

          {consultation?.medicines && consultation.medicines.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Medicine
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Eye / Route
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Frequency
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Duration
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                      Instructions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {consultation.medicines.map((medicine) => (
                    <tr key={medicine.id}>
                      <td className="border border-slate-200 px-3 py-2">
                        {medicine.medicineName || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        {medicine.eye || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        {medicine.frequency || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        {medicine.duration || "—"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
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
          <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">Advice</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {consultation?.advice || "Not entered"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Follow-Up</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {consultation?.followUpDate || "Not entered"}
            </p>
          </div>
        </div>

        {finalSpectacleAdvice && (
          <div className="rounded-xl border border-dashed border-slate-300 p-4">
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

        <div className="mt-6 flex justify-end border-t border-slate-300 pt-6">
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
    </div>
  );
}