"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import SpectacleTable from "../components/SpectacleTable";
import PrescriptionPreview from "../components/PrescriptionPreview";
import MedicineEditor from "../components/MedicineEditor";
import PatientHistoryPanel from "../components/PatientHistoryPanel";
import SpectacleAdvicePrint from "../components/SpectacleAdvicePrint";
import DoctorActionPanel from "../components/DoctorActionPanel";
import DoctorWorkupOverridePanel from "../components/DoctorWorkupOverridePanel";
import AdditionalServiceRequestPanel from "../components/AdditionalServiceRequestPanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";
import { getPendingAdditionalService } from "../../lib/additionalServiceUtils";
import { Patient } from "../../types/patient";
import {
  AdditionalServiceRequest,
  DoctorConsultation,
  MedicineRow,
  OptometristWorkup,
  SpectacleAdvice,
  SpectacleDraftRow,
} from "../../types/queue";

const emptySpectacleRow: SpectacleDraftRow = {
  sph: "",
  cyl: "",
  axis: "",
  vision: "",
};

const emptySpectacleAdvice: SpectacleAdvice = {
  od: { ...emptySpectacleRow },
  os: { ...emptySpectacleRow },
  add: { ...emptySpectacleRow },
  remarks: "",
};

const emptyConsultation: DoctorConsultation = {
  findings: "",
  diagnosis: "",
  medicines: [],
  advice: "",
  followUpDate: "",
  freeFollowUpValidUntil: "",
  notes: "",
  finalSpectacleAdvice: emptySpectacleAdvice,
};

function normalizeSpectacleAdvice(
  savedAdvice?: Partial<SpectacleAdvice>
): SpectacleAdvice {
  return {
    od: {
      ...emptySpectacleAdvice.od,
      ...savedAdvice?.od,
    },
    os: {
      ...emptySpectacleAdvice.os,
      ...savedAdvice?.os,
    },
    add: {
      ...emptySpectacleAdvice.add,
      ...savedAdvice?.add,
    },
    remarks: savedAdvice?.remarks ?? "",
  };
}

function hasSpectacleAdviceValues(advice?: Partial<SpectacleAdvice>) {
  if (!advice) {
    return false;
  }

  const rows = [advice.od, advice.os, advice.add];

  return (
    rows.some((row) =>
      Object.values(row || {}).some((value) => String(value || "").trim())
    ) || Boolean(advice.remarks?.trim())
  );
}

function normalizeConsultation(
  savedConsultation?: Partial<DoctorConsultation>,
  optometristDraft?: SpectacleAdvice
): DoctorConsultation {
  const savedFinalSpectacleAdvice = savedConsultation?.finalSpectacleAdvice;

  const finalSpectacleAdvice = hasSpectacleAdviceValues(
    savedFinalSpectacleAdvice
  )
    ? savedFinalSpectacleAdvice
    : optometristDraft;

  return {
    ...emptyConsultation,
    ...savedConsultation,
    findings: savedConsultation?.findings || "",
    diagnosis: savedConsultation?.diagnosis || "",
    medicines: savedConsultation?.medicines || [],
    finalSpectacleAdvice: normalizeSpectacleAdvice(finalSpectacleAdvice),
  };
}

type SpectacleRowKey = "od" | "os" | "add";
type SpectacleFieldKey = keyof SpectacleDraftRow;

const findingQuickChips = [
  "Conjunctival congestion",
  "Dry eye changes",
  "Early cataract changes",
  "Lens clear",
  "Fundus within normal limits",
  "IOP within normal limits",
];

const diagnosisQuickChips = [
  "Dry eye",
  "Refractive error",
  "Cataract",
  "Allergic conjunctivitis",
  "Conjunctivitis",
  "Glaucoma suspect",
];

const adviceQuickChips = [
  "Continue drops as advised.",
  "Avoid rubbing eyes.",
  "Use lubricating eye drops regularly.",
  "Review with reports.",
  "Follow up if symptoms worsen.",
  "Regular follow-up advised.",
];

function appendText(existingText: string, textToAdd: string) {
  const trimmedExisting = existingText.trim();

  if (!trimmedExisting) {
    return textToAdd;
  }

  return `${trimmedExisting}\n${textToAdd}`;
}

export default function DoctorPage() {
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
    updateQueueItemPatientDetails,
    addOrReplacePendingAdditionalServiceRequest,
    saveOptometristWorkup,
    saveDoctorConsultation,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [showAdditionalServicePanel, setShowAdditionalServicePanel] =
    useState(false);
    const additionalServicePanelRef = useRef<HTMLDivElement | null>(null);
  const [additionalServiceMessage, setAdditionalServiceMessage] = useState("");
  const [isPrintingPrescription, setIsPrintingPrescription] = useState(false);
  const [isPrintingSpectacleAdvice, setIsPrintingSpectacleAdvice] =
    useState(false);
  const [consultation, setConsultation] =
    useState<DoctorConsultation>(emptyConsultation);
  const [isEditingPatientWorkup, setIsEditingPatientWorkup] = useState(false);

  const canSendBackToOptometrist =
    selectedQueueItem?.status === "Under Consultation";

  const pendingAdditionalService =
    getPendingAdditionalService(selectedQueueItem);

  const finalSpectacleAdvice =
    consultation.finalSpectacleAdvice || emptySpectacleAdvice;

  const patientForPrescription = selectedQueueItem
    ? {
        ...selectedQueueItem,
        doctorConsultation: consultation,
      }
    : null;

  useEffect(() => {
    setConsultation(
      normalizeConsultation(
        selectedQueueItem?.doctorConsultation,
        selectedQueueItem?.optometristWorkup?.spectacleDraft
      )
    );

    setStatusMessage("");
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);
  }, [selectedQueueItem?.id]);

  useEffect(() => {
    function handleAfterPrint() {
      setIsPrintingPrescription(false);
      setIsPrintingSpectacleAdvice(false);
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
    setStatusMessage("");
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);
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
    setShowPrescriptionPreview(false);
  }

  function updateFinalSpectacleField(
    row: SpectacleRowKey,
    field: SpectacleFieldKey,
    value: string
  ) {
    setConsultation((current) => {
      const currentAdvice =
        current.finalSpectacleAdvice || emptySpectacleAdvice;

      return {
        ...current,
        finalSpectacleAdvice: {
          ...currentAdvice,
          [row]: {
            ...currentAdvice[row],
            [field]: value,
          },
        },
      };
    });

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function updateFinalSpectacleRemarks(value: string) {
    setConsultation((current) => {
      const currentAdvice =
        current.finalSpectacleAdvice || emptySpectacleAdvice;

      return {
        ...current,
        finalSpectacleAdvice: {
          ...currentAdvice,
          remarks: value,
        },
      };
    });

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
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
    setShowPrescriptionPreview(false);
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
    setShowPrescriptionPreview(false);
  }

  function removeMedicineRow(medicineId: string) {
    setConsultation((current) => ({
      ...current,
      medicines: current.medicines.filter(
        (medicine) => medicine.id !== medicineId
      ),
    }));

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
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
      setShowPrescriptionPreview(false);
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
    setShowPrescriptionPreview(false);
  }

  function handleSavePatientDetailsFromDoctor(
    patientName: string,
    age: number,
    gender: Patient["gender"]
  ) {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    updateQueueItemPatientDetails(
      selectedQueueItem.id,
      patientName,
      age,
      gender
    );

    setStatusMessage("Patient details corrected by doctor/admin.");
  }

  function handleSaveWorkupFromDoctor(workup: OptometristWorkup) {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveOptometristWorkup(selectedQueueItem.id, workup);
    setStatusMessage("Workup details updated by doctor/admin.");
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
    setShowPrescriptionPreview(false);
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
    setShowPrescriptionPreview(false);
  }

  function handlePreviewPrescription() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);
    setConsultationSaved(true);
    setShowPrescriptionPreview(true);
    setStatusMessage("Prescription preview generated.");
  }

  function handlePrintPrescription() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);
    setConsultationSaved(true);
    setShowPrescriptionPreview(true);
    setIsPrintingPrescription(true);
    setStatusMessage("Prescription ready for printing.");

    setTimeout(() => {
      window.print();
    }, 150);
  }

  function handleOpenAdditionalServicePanel() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }
  
    setShowAdditionalServicePanel(true);
    setAdditionalServiceMessage("Additional Test / Payment panel opened below.");
  
    setTimeout(() => {
      additionalServicePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleSendForDilation() {
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

    const shouldSendForDilation = window.confirm(
      "Send this patient for dilation? The patient will move to Dilated Waiting and return to doctor after dilation is marked Done."
    );

    if (!shouldSendForDilation) {
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);

    const blankWorkup: OptometristWorkup = {
      chiefComplaint: "",
      vision: {
        unaided: {
          distanceOD: "",
          distanceOS: "",
          nearOD: "",
          nearOS: "",
        },
        withGlasses: {
          distanceOD: "",
          distanceOS: "",
          nearOD: "",
          nearOS: "",
        },
        withPinHole: {
          distanceOD: "",
          distanceOS: "",
          nearOD: "",
          nearOS: "",
        },
      },
      refractionRight: "",
      refractionLeft: "",
      iopRight: "",
      iopLeft: "",
      dilationStatus: "Not Done",
      dilationNotes: "",
      optometristNotes: "",
      spectacleDraft: {
        od: {
          sph: "",
          cyl: "",
          axis: "",
          vision: "",
        },
        os: {
          sph: "",
          cyl: "",
          axis: "",
          vision: "",
        },
        add: {
          sph: "",
          cyl: "",
          axis: "",
          vision: "",
        },
        remarks: "",
      },
    };

    const existingWorkup = selectedQueueItem.optometristWorkup || blankWorkup;

    const updatedWorkup: OptometristWorkup = {
      ...existingWorkup,
      dilationStatus: "Waiting",
      dilationNotes: existingWorkup.dilationNotes
        ? `${existingWorkup.dilationNotes}\nSent for dilation by doctor.`
        : "Sent for dilation by doctor.",
    };

    saveOptometristWorkup(selectedQueueItem.id, updatedWorkup);
    updateQueueItemStatus(selectedQueueItem.id, "Dilated Waiting");

    setConsultationSaved(true);
    setShowPrescriptionPreview(false);
    setStatusMessage(
      "Patient sent for dilation. Status changed to Dilated Waiting."
    );
  }

  function handleCreateAdditionalServiceRequest(
    serviceRequest: AdditionalServiceRequest
  ) {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);

    addOrReplacePendingAdditionalServiceRequest(
      selectedQueueItem.id,
      serviceRequest
    );

    setConsultationSaved(true);
    setShowPrescriptionPreview(false);

    const serviceNames = serviceRequest.services
      .map((service) => service.serviceName)
      .join(", ");

    const message = pendingAdditionalService
      ? `Pending request updated: ${serviceNames}. Revised amount to collect: ₹${serviceRequest.netAmount}.`
      : `${serviceNames} sent to reception. Amount to collect: ₹${serviceRequest.netAmount}.`;

    setAdditionalServiceMessage(message);
    setStatusMessage(message);
  }

  function handlePrintSpectacleAdvice() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    saveDoctorConsultation(selectedQueueItem.id, consultation);
    setConsultationSaved(true);
    setIsPrintingSpectacleAdvice(true);
    setStatusMessage("Spectacle advice ready for printing.");

    setTimeout(() => {
      window.print();
    }, 150);
  }

  if (isPrintingPrescription) {
    return (
      <div className="bg-white p-4">
        <PrescriptionPreview
          patient={patientForPrescription}
          showSpectacleAdvice={false}
        />
      </div>
    );
  }

  if (isPrintingSpectacleAdvice) {
    return (
      <div className="bg-white p-4">
        <SpectacleAdvicePrint patient={patientForPrescription} />
      </div>
    );
  }

  return (
    <AppShell
      title="Doctor / Admin Workspace"
      subtitle="Consultation, prescriptions, patient history, reports, and master data"
    >
      <div className="grid gap-6 lg:grid-cols-5">
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
            <PatientHistoryPanel patient={selectedQueueItem} />
          </SectionCard>
        </div>

        <SectionCard
          title="Current Consultation"
          subtitle="Patient/workup details, findings, diagnosis, medicines, advice, and follow-up"
          className="lg:col-span-3"
        >
          <div className="grid gap-4">
            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {statusMessage}
              </div>
            )}

            <DoctorWorkupOverridePanel
              patient={selectedQueueItem}
              canSendBackToOptometrist={canSendBackToOptometrist}
              onSendBackToOptometrist={handleSendBackToOptometrist}
              onSavePatientDetails={handleSavePatientDetailsFromDoctor}
              onSaveWorkup={handleSaveWorkupFromDoctor}
              onEditModeChange={setIsEditingPatientWorkup}
            />

            {!selectedQueueItem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Select a patient before entering consultation details.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Findings, diagnosis, medicines, advice, follow-up, printing, and payment actions will be available after a patient is selected from the queue.
                </p>
              </div>
            ) : isEditingPatientWorkup ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                Edit Patient / Workup mode is active. Save or Cancel the workup edit before entering consultation findings, diagnosis, medicines, advice, or printing.
              </div>
            ) : (
              <>
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Findings
                <textarea
                  value={consultation.findings}
                  onChange={(event) =>
                    updateConsultationField("findings", event.target.value)
                  }
                  placeholder="Enter clinical findings, examination notes, slit lamp/fundus observations, etc."
                  className="min-h-36 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {findingQuickChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        updateConsultationField(
                          "findings",
                          appendText(consultation.findings, chip)
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Diagnosis / Impression
                <textarea
                  value={consultation.diagnosis}
                  onChange={(event) =>
                    updateConsultationField("diagnosis", event.target.value)
                  }
                  placeholder="Optional short diagnosis or impression"
                  className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {diagnosisQuickChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        updateConsultationField(
                          "diagnosis",
                          appendText(consultation.diagnosis, chip)
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-4 text-sm font-medium text-slate-700">
                Final Spectacle Advice
              </p>

              <SpectacleTable
                value={{
                  od: finalSpectacleAdvice.od,
                  os: finalSpectacleAdvice.os,
                  add: finalSpectacleAdvice.add,
                }}
                onChange={updateFinalSpectacleField}
              />

              <div className="mt-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Final Spectacle Remarks
                  <textarea
                    value={finalSpectacleAdvice.remarks}
                    onChange={(event) =>
                      updateFinalSpectacleRemarks(event.target.value)
                    }
                    placeholder="Final spectacle advice remarks"
                    className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>
              </div>
            </div>

            <MedicineEditor
              medicines={consultation.medicines}
              onAddMedicine={addMedicineRow}
              onUpdateMedicine={updateMedicineRow}
              onRemoveMedicine={removeMedicineRow}
            />

{showAdditionalServicePanel && (
  <div
    ref={additionalServicePanelRef}
    className="grid gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4"
  >
    <div>
      <p className="text-base font-semibold text-orange-950">
        Additional Test / Payment
      </p>
      <p className="mt-1 text-sm text-orange-800">
        Select tests or procedures, confirm discount if any, and send the payment request to reception.
      </p>
    </div>

    <AdditionalServiceRequestPanel
      pendingRequest={pendingAdditionalService}
      onCreateRequest={handleCreateAdditionalServiceRequest}
      onCancel={() => setShowAdditionalServicePanel(false)}
    />
                {additionalServiceMessage && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-900">
                    {additionalServiceMessage}
                  </div>
                )}
              </div>
            )}

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

                <div className="mt-3 flex flex-wrap gap-2">
                  {adviceQuickChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        updateConsultationField(
                          "advice",
                          appendText(consultation.advice, chip)
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Follow-Up Date
                  <input
                    type="date"
                    value={consultation.followUpDate}
                    onChange={(event) => {
                      const value = event.target.value;
                    
                      setConsultation((current) => ({
                        ...current,
                        followUpDate: value,
                        freeFollowUpValidUntil: value ? "" : current.freeFollowUpValidUntil,
                      }));
                    
                      setConsultationSaved(false);
                      setShowPrescriptionPreview(false);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
  Free Follow-Up Valid Until
  <input
    type="date"
    value={consultation.freeFollowUpValidUntil || ""}
    onChange={(event) => {
      const value = event.target.value;
    
      setConsultation((current) => ({
        ...current,
        freeFollowUpValidUntil: value,
        followUpDate: value ? "" : current.followUpDate,
      }));
    
      setConsultationSaved(false);
      setShowPrescriptionPreview(false);
    }}
    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
  />
  <span className="text-xs font-normal text-slate-500">
    Optional. Use only when doctor wants to allow a free follow-up until this date.
  </span>
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

              </>
            )}

            {showPrescriptionPreview && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-4 text-sm font-medium text-slate-700">
                  Prescription Preview
                </p>

                <PrescriptionPreview
                  patient={patientForPrescription}
                  showSpectacleAdvice
                />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="lg:col-span-1">
        <DoctorActionPanel
  onStartConsultation={handleStartConsultation}
  onSaveDraft={handleSaveConsultationDraft}
  onPreviewPrescription={handlePreviewPrescription}
  onPrintPrescription={handlePrintPrescription}
  onPrintSpectacleAdvice={handlePrintSpectacleAdvice}
  onOpenAdditionalServicePanel={handleOpenAdditionalServicePanel}
  onSendForDilation={handleSendForDilation}
  onCompleteConsultation={handleCompleteConsultation}
/>
        </div>
      </div>
    </AppShell>
  );
}