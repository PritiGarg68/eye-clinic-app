"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";
import { DoctorConsultation, MedicineRow } from "../../types/queue";

const visionRowLabels = {
  unaided: "Unaided",
  withGlasses: "With Glasses",
  withPinHole: "With Pin Hole",
} as const;

const spectacleRowLabels = {
  od: "OD",
  os: "OS",
  add: "Add",
} as const;

const emptyConsultation: DoctorConsultation = {
  diagnosis: "",
  medicines: [],
  advice: "",
  followUpDate: "",
  notes: "",
};

export default function DoctorPage() {
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
    saveDoctorConsultation,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [consultation, setConsultation] =
    useState<DoctorConsultation>(emptyConsultation);

  const optometristWorkup = selectedQueueItem?.optometristWorkup;

  const canSendBackToOptometrist =
    selectedQueueItem?.status === "Under Consultation";

  useEffect(() => {
    if (selectedQueueItem?.doctorConsultation) {
      setConsultation(selectedQueueItem.doctorConsultation);
    } else {
      setConsultation(emptyConsultation);
    }

    setStatusMessage("");
    setConsultationSaved(false);
  }, [selectedQueueItem?.id, selectedQueueItem?.doctorConsultation]);

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
    setStatusMessage("");
    setConsultationSaved(false);
  }

  function updateConsultationField<K extends keyof DoctorConsultation>(
    field: K,
    value: DoctorConsultation[K]
  ) {
    setConsultation((current) => ({
      ...current,
      [field]: value,
    }));

    setConsultationSaved(false);
  }

  function addMedicineRow() {
    const newMedicine: MedicineRow = {
      id: `medicine-${Date.now()}`,
      medicineName: "",
      eye: "Both Eyes",
      frequency: "",
      duration: "",
      instructions: "",
    };

    setConsultation((current) => ({
      ...current,
      medicines: [...current.medicines, newMedicine],
    }));

    setConsultationSaved(false);
  }

  function updateMedicineRow(
    medicineId: string,
    field: keyof MedicineRow,
    value: MedicineRow[keyof MedicineRow]
  ) {
    setConsultation((current) => ({
      ...current,
      medicines: current.medicines.map((medicine) =>
        medicine.id === medicineId
          ? {
              ...medicine,
              [field]: value,
            }
          : medicine
      ),
    }));

    setConsultationSaved(false);
  }

  function removeMedicineRow(medicineId: string) {
    setConsultation((current) => ({
      ...current,
      medicines: current.medicines.filter(
        (medicine) => medicine.id !== medicineId
      ),
    }));

    setConsultationSaved(false);
  }

  function handleStartConsultation() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedQueueItem.status === "Completed") {
      const shouldReopen = window.confirm(
        "This consultation is already completed. Do you still want to reopen it?"
      );

      if (!shouldReopen) {
        return;
      }

      updateQueueItemStatus(selectedQueueItem.id, "Under Consultation");
      setStatusMessage("Completed consultation reopened.");
      return;
    }

    if (selectedQueueItem.status === "Under Consultation") {
      setStatusMessage("Consultation is already active.");
      return;
    }

    if (selectedQueueItem.status !== "Ready for Doctor") {
      const shouldOverride = window.confirm(
        `This patient is currently marked as "${selectedQueueItem.status}", not "Ready for Doctor". Do you still want to start consultation?`
      );

      if (!shouldOverride) {
        return;
      }
    }

    updateQueueItemStatus(selectedQueueItem.id, "Under Consultation");
    setStatusMessage("Consultation started.");
  }

  function handleSendBackToOptometrist() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedQueueItem.status === "Completed") {
      alert(
        "This consultation is already completed. Reopen it first if changes are needed."
      );
      return;
    }

    if (selectedQueueItem.status !== "Under Consultation") {
      alert("Patient can be sent back only after consultation has started.");
      return;
    }

    const shouldSendBack = window.confirm(
      "Send this patient back to optometrist for additional workup?"
    );

    if (!shouldSendBack) {
      return;
    }

    updateQueueItemStatus(selectedQueueItem.id, "Needs Optometry Review");
    setStatusMessage("Patient sent back to optometrist for additional workup.");
  }

  function handleSaveConsultationDraft() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);
    setConsultationSaved(true);
    setStatusMessage("Consultation draft saved.");
  }

  function handleCompleteConsultation() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);
    updateQueueItemStatus(selectedQueueItem.id, "Completed");
    setConsultationSaved(true);
    setStatusMessage("Consultation completed.");
  }

  return (
    <AppShell
      title="Doctor / Admin Workspace"
      subtitle="Consultation, prescriptions, patient history, reports, and master data"
    >
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="grid gap-6 lg:col-span-1">
          <SectionCard title="Live Queue" subtitle="Patients waiting for doctor">
            <QueuePanel
              items={sortQueueForRole(queueItems, "doctor")}
              selectedItemId={selectedQueueItem?.id}
              onSelectItem={handleSelectPatientFromQueue}
            />
          </SectionCard>

          <SectionCard title="Patient Snapshot" subtitle="Current patient context">
            {selectedQueueItem ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Selected Patient
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  #{selectedQueueItem.tokenNumber} ·{" "}
                  {selectedQueueItem.patientName}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedQueueItem.age} yrs / {selectedQueueItem.gender}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedQueueItem.uhid}
                </p>

                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Status: {selectedQueueItem.status}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No patient selected
              </div>
            )}
          </SectionCard>

          <SectionCard title="History Timeline" subtitle="Previous visits">
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
            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {statusMessage}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Chief Complaints
              </p>

              {optometristWorkup?.chiefComplaint ? (
                <p className="mt-2 text-sm text-slate-700">
                  {optometristWorkup.chiefComplaint}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No chief complaint entered yet.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Optometrist Findings
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Workup entered by optometrist for doctor review.
                  </p>
                </div>

                {canSendBackToOptometrist && (
                  <button
                    onClick={handleSendBackToOptometrist}
                    className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
                  >
                    Send Back to Optometrist
                  </button>
                )}
              </div>

              {optometristWorkup ? (
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Vision / VA
                    </p>

                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
                              Vision
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Distance OD
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Distance OS
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Near OD
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Near OS
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.keys(visionRowLabels) as Array<
                            keyof typeof visionRowLabels
                          >).map((rowKey) => (
                            <tr key={rowKey}>
                              <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                                {visionRowLabels[rowKey]}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.vision?.[rowKey]
                                  ?.distanceOD || "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.vision?.[rowKey]
                                  ?.distanceOS || "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.vision?.[rowKey]?.nearOD ||
                                  "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.vision?.[rowKey]?.nearOS ||
                                  "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Refraction Right
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.refractionRight || "Not entered"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Refraction Left
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.refractionLeft || "Not entered"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        IOP Right
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.iopRight || "Not entered"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        IOP Left
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.iopLeft || "Not entered"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Dilation Status
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.dilationStatus}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Dilation Notes
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.dilationNotes || "Not entered"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Spectacle Draft
                    </p>

                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
                              Eye
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Sph.
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Cyl.
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Axis
                            </th>
                            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
                              Vision
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.keys(spectacleRowLabels) as Array<
                            keyof typeof spectacleRowLabels
                          >).map((rowKey) => (
                            <tr key={rowKey}>
                              <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                                {spectacleRowLabels[rowKey]}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.spectacleDraft?.[rowKey]
                                  ?.sph || "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.spectacleDraft?.[rowKey]
                                  ?.cyl || "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.spectacleDraft?.[rowKey]
                                  ?.axis || "—"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-800">
                                {optometristWorkup.spectacleDraft?.[rowKey]
                                  ?.vision || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Remarks
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.spectacleDraft?.remarks ||
                          "Not entered"}
                      </p>
                    </div>
                  </div>

                  {optometristWorkup.updatedAt && (
                    <p className="text-xs text-slate-400">
                      Last saved:{" "}
                      {new Date(optometristWorkup.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No optometrist workup saved yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Diagnosis / Impression
                <textarea
                  value={consultation.diagnosis}
                  onChange={(event) =>
                    updateConsultationField("diagnosis", event.target.value)
                  }
                  placeholder="Enter diagnosis or clinical impression"
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Medicines
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add medicine rows for prescription draft.
                  </p>
                </div>

                <button
                  onClick={addMedicineRow}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Add Medicine
                </button>
              </div>

              {consultation.medicines.length === 0 ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No medicines added yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {consultation.medicines.map((medicine, index) => (
                    <div
                      key={medicine.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">
                          Medicine #{index + 1}
                        </p>

                        <button
                          onClick={() => removeMedicineRow(medicine.id)}
                          className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          type="text"
                          value={medicine.medicineName}
                          onChange={(event) =>
                            updateMedicineRow(
                              medicine.id,
                              "medicineName",
                              event.target.value
                            )
                          }
                          placeholder="Medicine name"
                          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                        />

                        <select
                          value={medicine.eye}
                          onChange={(event) =>
                            updateMedicineRow(
                              medicine.id,
                              "eye",
                              event.target.value as MedicineRow["eye"]
                            )
                          }
                          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                        >
                          <option value="Both Eyes">Both Eyes</option>
                          <option value="Right Eye">Right Eye</option>
                          <option value="Left Eye">Left Eye</option>
                          <option value="Oral">Oral</option>
                          <option value="Other">Other</option>
                        </select>

                        <input
                          type="text"
                          value={medicine.frequency}
                          onChange={(event) =>
                            updateMedicineRow(
                              medicine.id,
                              "frequency",
                              event.target.value
                            )
                          }
                          placeholder="Frequency e.g. 4 times/day"
                          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                        />

                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(event) =>
                            updateMedicineRow(
                              medicine.id,
                              "duration",
                              event.target.value
                            )
                          }
                          placeholder="Duration e.g. 7 days"
                          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                        />

                        <textarea
                          value={medicine.instructions}
                          onChange={(event) =>
                            updateMedicineRow(
                              medicine.id,
                              "instructions",
                              event.target.value
                            )
                          }
                          placeholder="Instructions optional"
                          className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Advice
                <textarea
                  value={consultation.advice}
                  onChange={(event) =>
                    updateConsultationField("advice", event.target.value)
                  }
                  placeholder="General advice, precautions, tests, procedures..."
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Follow-Up Date
                  <input
                    type="date"
                    value={consultation.followUpDate}
                    onChange={(event) =>
                      updateConsultationField(
                        "followUpDate",
                        event.target.value
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Doctor Notes
                  <input
                    type="text"
                    value={consultation.notes}
                    onChange={(event) =>
                      updateConsultationField("notes", event.target.value)
                    }
                    placeholder="Internal notes optional"
                    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>
              </div>
            </div>

            {consultationSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                Consultation draft saved for selected patient.
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleStartConsultation}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Start Consultation
              </button>

              <button
                onClick={handleSaveConsultationDraft}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Save Draft
              </button>

              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Preview Prescription
              </button>

              <button
                onClick={handleCompleteConsultation}
                className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
              >
                Complete Consultation
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}