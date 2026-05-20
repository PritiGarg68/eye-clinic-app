import { QueueItem } from "../../types/queue";
import SpectacleTable from "./SpectacleTable";

type PrescriptionPreviewProps = {
  patient: QueueItem | null;
};

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-xl font-bold text-slate-900">
          Eye Clinic Prescription
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Clinic name, address, phone, registration details will appear here.
        </p>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Patient Name</p>
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
          <p className="text-xs font-medium text-slate-500">Visit Type</p>
          <p className="font-semibold text-slate-900">{patient.visitType}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Chief Complaint
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {optometristWorkup?.chiefComplaint || "Not entered"}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            Diagnosis / Impression
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {consultation?.diagnosis || "Not entered"}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Medicines</p>

          {consultation?.medicines && consultation.medicines.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      Medicine
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      Eye / Route
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      Frequency
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
                      Duration
                    </th>
                    <th className="border border-slate-200 px-3 py-2 text-left">
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

        <div>
          <p className="text-sm font-semibold text-slate-900">Advice</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {consultation?.advice || "Not entered"}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Follow-Up</p>
          <p className="mt-2 text-sm text-slate-700">
            {consultation?.followUpDate || "Not entered"}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            Final Spectacle Advice
          </p>

          {finalSpectacleAdvice ? (
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
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No final spectacle advice entered.
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              Doctor Signature
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Name / registration details will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}