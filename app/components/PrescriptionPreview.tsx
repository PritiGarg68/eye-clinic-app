import { QueueItem } from "../../types/queue";
import SpectacleTable from "./SpectacleTable";
import { ClinicSettings, clinicSettings } from "../../lib/clinicSettings";

type PrescriptionPreviewProps = {
  patient: QueueItem | null;
  showSpectacleAdvice?: boolean;
  clinicSettingsOverride?: ClinicSettings;
  dateOverride?: string;
};

const visionRows = [
  { key: "unaided", label: "Unaided" },
  { key: "withGlasses", label: "Glasses" },
  { key: "withPinHole", label: "Pin Hole" },
] as const;

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

export default function PrescriptionPreview({
  patient,
  showSpectacleAdvice = true,
  clinicSettingsOverride,
  dateOverride,
}: PrescriptionPreviewProps) {
  const activeClinicSettings = clinicSettingsOverride || clinicSettings;

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
  const today = dateOverride || new Date().toLocaleDateString();

  const hasChiefComplaint = hasText(optometristWorkup?.chiefComplaint);
  const hasHistory = hasText(optometristWorkup?.optometristNotes);
  const hasFindings = hasText(consultation?.findings);
  const hasDiagnosis = hasText(consultation?.diagnosis);
  const hasAdvice = hasText(consultation?.advice);
  const hasFollowUp = Boolean(
    consultation?.freeFollowUpValidUntil || consultation?.followUpDate
  );
  const hasMedicines =
    Boolean(consultation?.medicines) && consultation!.medicines.length > 0;

  return (
    <div className="prescription-print-area rounded-2xl border border-slate-200 bg-white p-4 text-[13px] leading-normal text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-2">
        <div className="flex items-start justify-between gap-6">
          <div className="shrink-0">
            <img
              src="/clinic-logo.png"
              alt={activeClinicSettings.clinicName}
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="flex-1 text-right">
            <p className="text-base font-bold leading-tight text-slate-900">
              {activeClinicSettings.doctorName}
            </p>

            <p className="mt-0.5 text-[13px] font-semibold text-slate-700">
              {activeClinicSettings.doctorQualification} · Regn:{" "}
              {activeClinicSettings.medicalRegistrationNumber}
            </p>

            <p className="mt-1 text-[13px] font-medium text-slate-700">
              {activeClinicSettings.address}
            </p>

            <p className="mt-0.5 text-[13px] font-medium text-slate-700">
              {activeClinicSettings.phone} · {activeClinicSettings.email}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr>
              <td className="w-[30%] border-r border-slate-200 px-2.5 py-2 align-top">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </p>
                <p className="font-semibold text-slate-900">
                  {patient.patientName}
                </p>
              </td>

              <td className="w-[17%] border-r border-slate-200 px-2.5 py-2 align-top">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  UHID
                </p>
                <p className="font-semibold text-slate-900">{patient.uhid}</p>
              </td>

              <td className="w-[17%] border-r border-slate-200 px-2.5 py-2 align-top">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Age / Gender
                </p>
                <p className="font-semibold text-slate-900">
                  {patient.age} yrs / {patient.gender}
                </p>
              </td>

              <td className="w-[21%] border-r border-slate-200 px-2.5 py-2 align-top">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Visit
                </p>
                <p className="font-semibold text-slate-900">
                  {patient.visitType}
                </p>
              </td>

              <td className="w-[15%] px-2.5 py-2 align-top">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </p>
                <p className="font-semibold text-slate-900">{today}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-flow mt-3 grid gap-3">
        {(hasChiefComplaint || optometristWorkup?.vision) && (
          <div className="grid gap-3 md:grid-cols-5">
            {hasChiefComplaint && (
              <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Chief Complaint
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-800">
                  {optometristWorkup?.chiefComplaint}
                </p>
              </div>
            )}

            {optometristWorkup?.vision && (
              <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Vision / VA
                </p>

                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700">
                          Type
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                          D OD
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                          D OS
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                          N OD
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                          N OS
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visionRows.map((row) => {
                        const visionEntry = optometristWorkup.vision[row.key];

                        return (
                          <tr key={row.key}>
                            <td className="border border-slate-200 px-2 py-1 font-medium text-slate-700">
                              {row.label}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-center text-slate-800">
                              {visionEntry.distanceOD || "—"}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-center text-slate-800">
                              {visionEntry.distanceOS || "—"}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-center text-slate-800">
                              {visionEntry.nearOD || "—"}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-center text-slate-800">
                              {visionEntry.nearOS || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {hasHistory && (
          <div className="print-compact-section rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              History / Relevant Background
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-normal text-slate-800">
              {optometristWorkup?.optometristNotes}
            </p>
          </div>
        )}

        {hasFindings && (
          <div className="print-compact-section rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Findings
            </p>
            <p className="mt-1 whitewrap text-[13px] leading-normal text-slate-800">
              {consultation?.findings}
            </p>
          </div>
        )}

        {hasDiagnosis && (
          <div className="print-compact-section rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Diagnosis / Impression
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-800">
              {consultation?.diagnosis}
            </p>
          </div>
        )}

        {hasMedicines && (
          <div className="print-compact-section rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Medicines
            </p>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="w-[28%] border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
                      Medicine
                    </th>
                    <th className="w-[14%] border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
                      Eye / Route
                    </th>
                    <th className="w-[17%] border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
                      Frequency
                    </th>
                    <th className="w-[13%] border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
                      Duration
                    </th>
                    <th className="w-[28%] border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
                      Instructions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {consultation?.medicines.map((medicine) => (
                    <tr key={medicine.id}>
                      <td className="border border-slate-200 px-2 py-1.5 align-top">
                        {medicine.medicineName || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 align-top">
                        {medicine.eye || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 align-top">
                        {medicine.frequency || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 align-top">
                        {medicine.duration || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 align-top">
                        {medicine.instructions || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(hasAdvice || hasFollowUp) && (
          <div className="grid gap-3 md:grid-cols-3">
            {hasAdvice && (
              <div className="print-compact-section rounded-xl border border-slate-200 p-3 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Advice
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-normal text-slate-800">
                  {consultation?.advice}
                </p>
              </div>
            )}

            {hasFollowUp && (
              <div className="print-compact-section rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  {consultation?.freeFollowUpValidUntil
                    ? "Free Follow-Up Valid Until"
                    : "Follow-Up"}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-slate-900">
                  {consultation?.freeFollowUpValidUntil ||
                    consultation?.followUpDate}
                </p>
              </div>
            )}
          </div>
        )}

        {showSpectacleAdvice && finalSpectacleAdvice && (
          <div className="prescription-screen-only rounded-xl border border-dashed border-slate-300 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Final Spectacle Advice
              </p>
              <p className="text-[11px] text-slate-500">
                Separate spectacle print can be generated later
              </p>
            </div>

            <div className="mt-2">
              <SpectacleTable
                value={{
                  od: finalSpectacleAdvice.od,
                  os: finalSpectacleAdvice.os,
                  add: finalSpectacleAdvice.add,
                }}
                readOnly
              />

              <div className="mt-2 rounded-xl bg-slate-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Remarks
                </p>
                <p className="mt-1 text-xs text-slate-800">
                  {finalSpectacleAdvice.remarks || "Not entered"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-end border-t border-slate-300 pt-4">
          <div className="min-w-44 text-right">
            <div className="mb-2 h-9 border-b border-slate-300" />
            <p className="text-xs font-semibold text-slate-900">
              Doctor Signature
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {activeClinicSettings.doctorName}
            </p>
            <p className="text-[11px] text-slate-500">
              Regn: {activeClinicSettings.medicalRegistrationNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
