"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import PatientAttachmentsPanel from "../components/PatientAttachmentsPanel";
import VisionTable from "../components/VisionTable";
import SpectacleTable from "../components/SpectacleTable";
import { sortQueueForRole } from "../../lib/queueSorting";
import {
  fetchTodayQueueFromSupabase,
  updateVisitStatusInSupabase,
} from "../../lib/queueDb";
import {
  fetchOptometristWorkupFromSupabase,
  saveOptometristWorkupToSupabase,
} from "../../lib/optometristWorkupDb";
import { fetchClinicalTemplatesFromSupabase } from "../../lib/clinicalTemplatesDb";
import {
  getAdditionalServiceNames,
  getPaidAdditionalServices,
} from "../../lib/additionalServiceUtils";
import {
  OptometristWorkup,
  QueueItem,
  QueueStatus,
  SpectacleDraftRow,
  VisionEntry,
} from "../../types/queue";

const emptyVisionEntry: VisionEntry = {
  distanceOD: "",
  distanceOS: "",
  nearOD: "",
  nearOS: "",
};

const emptySpectacleRow: SpectacleDraftRow = {
  sph: "",
  cyl: "",
  axis: "",
  vision: "",
};

const emptyWorkup: OptometristWorkup = {
  chiefComplaint: "",
  vision: {
    unaided: { ...emptyVisionEntry },
    withGlasses: { ...emptyVisionEntry },
    withPinHole: { ...emptyVisionEntry },
  },
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  optometristNotes: "",
  spectacleDraft: {
    od: { ...emptySpectacleRow },
    os: { ...emptySpectacleRow },
    add: { ...emptySpectacleRow },
    remarks: "",
  },
};

function normalizeWorkup(
  savedWorkup?: Partial<OptometristWorkup>
): OptometristWorkup {
  return {
    ...emptyWorkup,
    ...savedWorkup,
    vision: {
      unaided: {
        ...emptyWorkup.vision.unaided,
        ...savedWorkup?.vision?.unaided,
      },
      withGlasses: {
        ...emptyWorkup.vision.withGlasses,
        ...savedWorkup?.vision?.withGlasses,
      },
      withPinHole: {
        ...emptyWorkup.vision.withPinHole,
        ...savedWorkup?.vision?.withPinHole,
      },
    },
    spectacleDraft: {
      od: {
        ...emptyWorkup.spectacleDraft.od,
        ...savedWorkup?.spectacleDraft?.od,
      },
      os: {
        ...emptyWorkup.spectacleDraft.os,
        ...savedWorkup?.spectacleDraft?.os,
      },
      add: {
        ...emptyWorkup.spectacleDraft.add,
        ...savedWorkup?.spectacleDraft?.add,
      },
      remarks: savedWorkup?.spectacleDraft?.remarks ?? "",
    },
  };
}

type VisionRowKey = keyof OptometristWorkup["vision"];
type VisionFieldKey = keyof VisionEntry;
type SpectacleRowKey = "od" | "os" | "add";
type SpectacleFieldKey = keyof SpectacleDraftRow;

const chiefComplaintQuickChips = [
  "Diminution of vision",
  "Redness",
  "Watering",
  "Itching",
  "Pain",
  "Headache",
  "Routine eye check-up",
  "Follow-up visit",
];

const historyQuickChips = [
  "Diabetes",
  "Hypertension",
  "Drug allergy",
  "Previous eye surgery",
  "Family history of glaucoma",
  "Wearing glasses since childhood",
];

const optometristRelevantStatuses: QueueStatus[] = [
  "Needs Optometry Review",
  "Waiting",
  "Under Optometry",
  "Dilated Waiting",
  "Ready for Doctor",
];

function isOptometristRelevantQueueItem(item: QueueItem) {
  return optometristRelevantStatuses.includes(item.status);
}

function appendText(existingText: string, textToAdd: string) {
  const trimmedExisting = existingText.trim();

  if (!trimmedExisting) {
    return textToAdd;
  }

  return `${trimmedExisting}\n${textToAdd}`;
}

const doctorSendBackReviewNote =
  "Sent back by doctor for additional optometry review.";

function hasDoctorSendBackReviewNote(item: QueueItem | null | undefined) {
  return Boolean(
    item?.optometristWorkup?.optometristNotes?.includes(doctorSendBackReviewNote)
  );
}


export default function OptometristPage() {

  const [statusMessage, setStatusMessage] = useState("");
  const [workupSaved, setWorkupSaved] = useState(false);
  const [workup, setWorkup] = useState<OptometristWorkup>(emptyWorkup);
  const [supabaseQueueItems, setSupabaseQueueItems] = useState<QueueItem[]>([]);
  const [selectedSupabaseQueueItem, setSelectedSupabaseQueueItem] =
    useState<QueueItem | null>(null);
  const [supabaseQueueStatus, setSupabaseQueueStatus] = useState("");
  const [chiefComplaintTemplateChips, setChiefComplaintTemplateChips] =
    useState<string[]>(chiefComplaintQuickChips);
  const [historyTemplateChips, setHistoryTemplateChips] =
    useState<string[]>(historyQuickChips);

  const activeQueueItem = selectedSupabaseQueueItem;
  const paidAdditionalServices = getPaidAdditionalServices(activeQueueItem);
  const hasDoctorSendBackReview =
    activeQueueItem?.status === "Needs Optometry Review" &&
    (hasDoctorSendBackReviewNote(activeQueueItem) ||
      workup.optometristNotes.includes(doctorSendBackReviewNote));
  const hasOptometryReviewTask =
    activeQueueItem?.status === "Needs Optometry Review" &&
    paidAdditionalServices.length > 0 &&
    !hasDoctorSendBackReview;

  const isReadOnly =
    activeQueueItem?.status === "Under Consultation" ||
    activeQueueItem?.status === "Completed";
  const isFormDisabled = !activeQueueItem || isReadOnly;

  async function loadSupabaseOptometristQueue() {
    setSupabaseQueueStatus("Loading optometrist queue...");

    try {
      const queue = await fetchTodayQueueFromSupabase();
      const optometryQueue = sortQueueForRole(
        queue.filter(isOptometristRelevantQueueItem),
        "optometrist"
      );

      setSupabaseQueueItems(optometryQueue);

      setSelectedSupabaseQueueItem((current) => {
        if (!current) {
          return null;
        }

        return optometryQueue.find((item) => item.id === current.id) || null;
      });

      setSupabaseQueueStatus(
        optometryQueue.length === 0
          ? "No patients currently waiting for optometry."
          : `Loaded ${optometryQueue.length} optometry queue patient(s).`
      );
    } catch (error) {
      setSupabaseQueueStatus(
        error instanceof Error
          ? error.message
          : "Could not load optometrist queue."
      );
    }
  }

  useEffect(() => {
    loadSupabaseOptometristQueue();
  }, []);

  useEffect(() => {
    async function loadTemplateChips() {
      try {
        const [chiefComplaintTemplates, historyTemplates] = await Promise.all([
          fetchClinicalTemplatesFromSupabase("Chief Complaint"),
          fetchClinicalTemplatesFromSupabase("History"),
        ]);

        const chiefComplaintChips = chiefComplaintTemplates
          .map((template) => template.text)
          .filter(Boolean);
        const historyChips = historyTemplates
          .map((template) => template.text)
          .filter(Boolean);

        if (chiefComplaintChips.length > 0) {
          setChiefComplaintTemplateChips(chiefComplaintChips);
        }

        if (historyChips.length > 0) {
          setHistoryTemplateChips(historyChips);
        }
      } catch (error) {
        console.error("Could not load Supabase optometrist templates", error);
      }
    }

    void loadTemplateChips();
  }, []);

  async function handleSelectSupabaseQueuePatient(item: QueueItem) {
    setSelectedSupabaseQueueItem(item);
    setWorkup(normalizeWorkup(item.optometristWorkup));
    setWorkupSaved(false);
    setStatusMessage(`Selected patient #${item.tokenNumber}.`);

    try {
      const savedWorkup = await fetchOptometristWorkupFromSupabase(item.id);

      if (savedWorkup) {
        setWorkup(normalizeWorkup(savedWorkup));
        setStatusMessage(
          `Loaded saved workup for token #${item.tokenNumber}.`
        );
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not load saved workup."
      );
    }
  }

  useEffect(() => {
    setWorkup(normalizeWorkup(activeQueueItem?.optometristWorkup));
    setWorkupSaved(false);
    setStatusMessage("");
  }, [activeQueueItem?.id, activeQueueItem?.optometristWorkup]);


  function updateSimpleField<K extends keyof OptometristWorkup>(
    field: K,
    value: OptometristWorkup[K]
  ) {
    setWorkup((current) => ({
      ...current,
      [field]: value,
    }));
    setWorkupSaved(false);
  }

  function updateVisionField(
    row: VisionRowKey,
    field: VisionFieldKey,
    value: string
  ) {
    setWorkup((current) => ({
      ...current,
      vision: {
        ...current.vision,
        [row]: {
          ...current.vision[row],
          [field]: value,
        },
      },
    }));
    setWorkupSaved(false);
  }

  function updateSpectacleField(
    row: SpectacleRowKey,
    field: SpectacleFieldKey,
    value: string
  ) {
    setWorkup((current) => ({
      ...current,
      spectacleDraft: {
        ...current.spectacleDraft,
        [row]: {
          ...current.spectacleDraft[row],
          [field]: value,
        },
      },
    }));
    setWorkupSaved(false);
  }

  function updateSpectacleRemarks(value: string) {
    setWorkup((current) => ({
      ...current,
      spectacleDraft: {
        ...current.spectacleDraft,
        remarks: value,
      },
    }));
    setWorkupSaved(false);
  }

  async function handleStartWorkup() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (activeQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (activeQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      try {
        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          "Under Optometry"
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Under Optometry" as const,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          )
        );
        setStatusMessage("Status updated to Under Optometry.");
        await loadSupabaseOptometristQueue();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update status."
        );
      }

      return;
    }
  }

  async function handleMarkDilated() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (activeQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (activeQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    const updatedWorkup: OptometristWorkup = {
      ...workup,
      dilationStatus: "Done",
    };

    setWorkup(updatedWorkup);

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup: updatedWorkup,
        });

        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          "Ready for Doctor"
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Ready for Doctor" as const,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          )
        );
        setStatusMessage(
          "Dilation completed. Patient marked Ready for Doctor."
        );
        setWorkupSaved(true);
        await loadSupabaseOptometristQueue();
        setStatusMessage(
          "Dilation completed. Patient marked Ready for Doctor."
        );
      } catch (error) {
        setWorkupSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not mark patient Ready for Doctor."
        );
      }

      return;
    }
  }

  async function handleReadyForDoctor() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (activeQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (activeQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    const nextStatus: QueueStatus =
      workup.dilationStatus === "Waiting"
        ? "Dilated Waiting"
        : "Ready for Doctor";

    if (workup.dilationStatus === "Waiting") {
      alert(
        "Dilation is still pending. Patient will remain in Dilated Waiting until dilation is marked Done."
      );
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup,
        });

        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          nextStatus
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: nextStatus,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          )
        );

        setStatusMessage(
          nextStatus === "Dilated Waiting"
            ? "Workup saved. Patient remains in Dilated Waiting."
            : "Workup saved. Patient marked Ready for Doctor."
        );
        setWorkupSaved(true);
        await loadSupabaseOptometristQueue();
      } catch (error) {
        setWorkupSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update workup status."
        );
      }

      return;
    }
  }

  async function handleSaveWorkupDraft() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (isReadOnly) {
      alert(
        "Doctor has already started or completed consultation. Workup is now read-only."
      );
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup,
        });

        setWorkupSaved(true);
        setStatusMessage("Optometrist workup draft saved.");
      } catch (error) {
        setWorkupSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not save optometrist workup."
        );
      }

      return;
    }
  }

  return (
    <AppShell
      title="Optometrist Workspace"
      subtitle="Workup, refraction, IOP, dilation, and spectacle draft"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6">
          <SectionCard
            title="Live Queue"
            subtitle="Patients ready for optometrist workup"
          >
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Optometrist Queue
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Patients currently waiting for optometrist workup.
                </p>
              </div>

              <button
                onClick={loadSupabaseOptometristQueue}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Refresh Queue
              </button>
            </div>

            {supabaseQueueStatus && (
              <p className="mt-3 text-xs text-emerald-800">
                {supabaseQueueStatus}
              </p>
            )}

            {supabaseQueueItems.length > 0 && (
              <div className="mt-4 grid gap-3">
                {supabaseQueueItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSupabaseQueuePatient(item)}
                    className={`rounded-xl border p-3 text-left transition ${
                      item.status === "Needs Optometry Review" ||
                      item.status === "Dilated Waiting"
                        ? selectedSupabaseQueueItem?.id === item.id
                          ? "border-amber-500 bg-amber-50 shadow-sm ring-2 ring-amber-200"
                          : "border-amber-300 bg-amber-50 hover:bg-amber-100"
                        : selectedSupabaseQueueItem?.id === item.id
                          ? "border-emerald-500 bg-white shadow-sm"
                          : "border-emerald-100 bg-white/70 hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      #{item.tokenNumber} · {item.patientName}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.uhid} · {item.age} yrs / {item.gender}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.visitType} · {item.status}
                    </p>

                    {item.status === "Needs Optometry Review" &&
                      (hasDoctorSendBackReviewNote(item) ||
                        (selectedSupabaseQueueItem?.id === item.id &&
                          workup.optometristNotes.includes(
                            doctorSendBackReviewNote
                          ))) && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                            Doctor requested review
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            Additional optometry review requested
                          </p>
                        </div>
                      )}

                    {item.status === "Needs Optometry Review" &&
                      !hasDoctorSendBackReviewNote(item) &&
                      !(
                        selectedSupabaseQueueItem?.id === item.id &&
                        workup.optometristNotes.includes(
                          doctorSendBackReviewNote
                        )
                      ) &&
                      getPaidAdditionalServices(item).length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                            Tests to perform / review
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {getPaidAdditionalServices(item)
                              .map((service) => getAdditionalServiceNames(service))
                              .join(", ")}
                          </p>
                        </div>
                      )}
                  </button>
                ))}
              </div>
            )}

            {selectedSupabaseQueueItem && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Selected Patient
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  #{selectedSupabaseQueueItem.tokenNumber} ·{" "}
                  {selectedSupabaseQueueItem.patientName}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Status: {selectedSupabaseQueueItem.status}
                </p>
              </div>
            )}
          </div>


          </SectionCard>

          <SectionCard
            title="Attachments / Reports"
            subtitle="Patient-level files by upload date"
          >
            <PatientAttachmentsPanel
              patient={activeQueueItem}
              sourceLabel="Optometrist"
            />
          </SectionCard>
        </div>

        <SectionCard
          title="Patient Workup"
          subtitle="All fields are optional"
          className="lg:col-span-2"
        >
          <div className="grid gap-4">
            {activeQueueItem ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Selected Patient
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-900">
                  #{activeQueueItem.tokenNumber} ·{" "}
                  {activeQueueItem.patientName}
                </p>

                <p className="text-sm text-slate-600">
                  {activeQueueItem.age} yrs / {activeQueueItem.gender}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {activeQueueItem.uhid}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {activeQueueItem.visitType}
                </p>

                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Status: {activeQueueItem.status}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  No patient selected
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Select a patient from the queue to begin workup.
                </p>
              </div>
            )}

            {hasDoctorSendBackReview && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-amber-800">
                  Doctor requested additional optometry review
                </p>
                <p className="mt-2 text-sm text-amber-900">
                  Review or update the workup as needed, then click Ready for Doctor.
                </p>
                <p className="mt-2 text-xs text-amber-800">
                  Earlier paid tests remain part of the visit record, but they are not shown here as fresh pending tasks.
                </p>
              </div>
            )}

            {hasOptometryReviewTask && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-amber-800">
                  Tests to perform / review before sending to Doctor
                </p>

                <div className="mt-3 grid gap-3">
                  {paidAdditionalServices.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-xl border border-amber-200 bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {getAdditionalServiceNames(service)}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Paid ₹{service.netAmount}
                        {service.paymentMode ? ` · ${service.paymentMode}` : ""}
                        {service.receiptNumber
                          ? ` · Receipt ${service.receiptNumber}`
                          : ""}
                      </p>

                      {service.notes && (
                        <p className="mt-2 text-xs text-slate-700">
                          Doctor note: {service.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-sm font-medium text-amber-900">
                  Complete/update the relevant test or workup details, then click Ready for Doctor.
                </p>
              </div>
            )}

            {isReadOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                Doctor has started or completed consultation. Workup is
                read-only.
              </div>
            )}

            {statusMessage && (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
                {statusMessage}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Chief Complaint
                <textarea
                  value={workup.chiefComplaint}
                  onChange={(event) =>
                    updateSimpleField("chiefComplaint", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Example: redness, watering, blurred vision, pain..."
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {chiefComplaintTemplateChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={isFormDisabled}
                      onClick={() =>
                        updateSimpleField(
                          "chiefComplaint",
                          appendText(workup.chiefComplaint, chip)
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-4 text-sm font-medium text-slate-700">
                Vision / VA
              </p>

              <VisionTable
                value={workup.vision}
                readOnly={isFormDisabled}
                onChange={updateVisionField}
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Refraction</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={workup.refractionRight}
                  onChange={(event) =>
                    updateSimpleField("refractionRight", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Right eye refraction notes"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.refractionLeft}
                  onChange={(event) =>
                    updateSimpleField("refractionLeft", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Left eye refraction notes"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                IOP / Pressure
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={workup.iopRight}
                  onChange={(event) =>
                    updateSimpleField("iopRight", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Right eye IOP"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.iopLeft}
                  onChange={(event) =>
                    updateSimpleField("iopLeft", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Left eye IOP"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Dilation</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <select
                  value={workup.dilationStatus}
                  onChange={(event) =>
                    updateSimpleField(
                      "dilationStatus",
                      event.target.value as OptometristWorkup["dilationStatus"]
                    )
                  }
                  disabled={isFormDisabled}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                >
                  <option value="Not Done">Not Done</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Done">Done</option>
                </select>

                <input
                  type="text"
                  value={workup.dilationNotes}
                  onChange={(event) =>
                    updateSimpleField("dilationNotes", event.target.value)
                  }
                  disabled={isFormDisabled}
                  placeholder="Dilation notes optional"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">
              History / Relevant Background
              </p>

              <textarea
                value={workup.optometristNotes}
                onChange={(event) =>
                  updateSimpleField("optometristNotes", event.target.value)
                }
                disabled={isFormDisabled}
                rows={3}
                placeholder="Relevant history/background, e.g. diabetes, hypertension, allergy, previous surgery, family history, since when wearing glasses."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {historyTemplateChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      updateSimpleField(
                        "optometristNotes",
                        appendText(workup.optometristNotes, chip)
                      )
                    }
                    disabled={isFormDisabled}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <p className="mt-2 text-xs text-slate-500">
              Visible to doctor and printed on prescription if filled.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-4 text-sm font-medium text-slate-700">
                Spectacle Draft
              </p>

              <SpectacleTable
                value={{
                  od: workup.spectacleDraft.od,
                  os: workup.spectacleDraft.os,
                  add: workup.spectacleDraft.add,
                }}
                readOnly={isFormDisabled}
                onChange={updateSpectacleField}
              />

              <div className="mt-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Remarks
                  <textarea
                    value={workup.spectacleDraft.remarks}
                    onChange={(event) =>
                      updateSpectacleRemarks(event.target.value)
                    }
                    disabled={isFormDisabled}
                    placeholder="Optional remarks"
                    className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                  />
                </label>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`rounded-xl border-2 p-4 text-sm font-semibold shadow-sm ${
                  workupSaved
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {statusMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleStartWorkup}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Start Workup
              </button>

              <button
                onClick={handleSaveWorkupDraft}
                disabled={isFormDisabled}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Save Workup Draft
              </button>

              <button
                onClick={handleMarkDilated}
                disabled={isFormDisabled}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Mark Dilation Done
              </button>

              <button
                onClick={handleReadyForDoctor}
                disabled={isFormDisabled}
                className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Ready for Doctor
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}