"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";
import {
  OptometristWorkup,
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
  spectacleDraft: {
    od: { ...emptySpectacleRow },
    os: { ...emptySpectacleRow },
    add: { ...emptySpectacleRow },
    remarks: "",
  },
};

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

export default function OptometristPage() {
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
    saveOptometristWorkup,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");
  const [workupSaved, setWorkupSaved] = useState(false);
  const [workup, setWorkup] = useState<OptometristWorkup>(emptyWorkup);

  const isReadOnly =
    selectedQueueItem?.status === "Under Consultation" ||
    selectedQueueItem?.status === "Completed";

  useEffect(() => {
    setWorkup(normalizeWorkup(selectedQueueItem?.optometristWorkup));
    setWorkupSaved(false);
    setStatusMessage("");
  }, [selectedQueueItem?.id, selectedQueueItem?.optometristWorkup]);

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
  }

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

  function handleStartWorkup() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (selectedQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    updateQueueItemStatus(selectedQueueItem.id, "Under Optometry");
    setStatusMessage("Status updated to Under Optometry.");
  }

  function handleMarkDilated() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (selectedQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    const updatedWorkup: OptometristWorkup = {
      ...workup,
      dilationStatus: "Done",
    };

    setWorkup(updatedWorkup);
    saveOptometristWorkup(selectedQueueItem.id, updatedWorkup);
    updateQueueItemStatus(selectedQueueItem.id, "Dilated Waiting");
    setStatusMessage("Patient marked as Dilated Waiting.");
    setWorkupSaved(true);
  }

  function handleReadyForDoctor() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedQueueItem.status === "Completed") {
      alert("This consultation is already completed.");
      return;
    }

    if (selectedQueueItem.status === "Under Consultation") {
      alert("This patient is already under doctor consultation.");
      return;
    }

    saveOptometristWorkup(selectedQueueItem.id, workup);
    updateQueueItemStatus(selectedQueueItem.id, "Ready for Doctor");
    setStatusMessage("Patient marked Ready for Doctor.");
    setWorkupSaved(true);
  }

  function handleSaveWorkupDraft() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (isReadOnly) {
      alert(
        "Doctor has already started or completed consultation. Workup is now read-only."
      );
      return;
    }

    saveOptometristWorkup(selectedQueueItem.id, workup);
    setWorkupSaved(true);
    setStatusMessage("Optometrist workup draft saved.");
  }

  return (
    <AppShell
      title="Optometrist Workspace"
      subtitle="Workup, refraction, IOP, dilation, and spectacle draft"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Live Queue"
          subtitle="Patients ready for optometrist workup"
        >
          <QueuePanel
            items={sortQueueForRole(queueItems, "optometrist")}
            selectedItemId={selectedQueueItem?.id}
            onSelectItem={handleSelectPatientFromQueue}
          />
        </SectionCard>

        <SectionCard
          title="Patient Workup"
          subtitle="All fields are optional in V1"
          className="lg:col-span-2"
        >
          <div className="grid gap-4">
            {selectedQueueItem ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Selected Patient
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-900">
                  #{selectedQueueItem.tokenNumber} ·{" "}
                  {selectedQueueItem.patientName}
                </p>

                <p className="text-sm text-slate-600">
                  {selectedQueueItem.age} yrs / {selectedQueueItem.gender}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedQueueItem.uhid}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedQueueItem.visitType}
                </p>

                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Status: {selectedQueueItem.status}
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

            {isReadOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                Doctor has started or completed consultation. Workup is
                read-only.
              </div>
            )}

            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
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
                  disabled={isReadOnly}
                  placeholder="Example: redness, watering, blurred vision, pain..."
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Vision / VA</p>

              <div className="mt-4 overflow-x-auto">
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
                    {(Object.keys(visionRowLabels) as VisionRowKey[]).map(
                      (rowKey) => (
                        <tr key={rowKey}>
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                            {visionRowLabels[rowKey]}
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.vision[rowKey].distanceOD}
                              onChange={(event) =>
                                updateVisionField(
                                  rowKey,
                                  "distanceOD",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.vision[rowKey].distanceOS}
                              onChange={(event) =>
                                updateVisionField(
                                  rowKey,
                                  "distanceOS",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.vision[rowKey].nearOD}
                              onChange={(event) =>
                                updateVisionField(
                                  rowKey,
                                  "nearOD",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.vision[rowKey].nearOS}
                              onChange={(event) =>
                                updateVisionField(
                                  rowKey,
                                  "nearOS",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
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
                  disabled={isReadOnly}
                  placeholder="Right eye refraction notes"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.refractionLeft}
                  onChange={(event) =>
                    updateSimpleField("refractionLeft", event.target.value)
                  }
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                  placeholder="Right eye IOP"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.iopLeft}
                  onChange={(event) =>
                    updateSimpleField("iopLeft", event.target.value)
                  }
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                  placeholder="Dilation notes optional"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Spectacle Draft
              </p>

              <div className="mt-4 overflow-x-auto">
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
                    {(Object.keys(spectacleRowLabels) as SpectacleRowKey[]).map(
                      (rowKey) => (
                        <tr key={rowKey}>
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                            {spectacleRowLabels[rowKey]}
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.spectacleDraft[rowKey].sph}
                              onChange={(event) =>
                                updateSpectacleField(
                                  rowKey,
                                  "sph",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.spectacleDraft[rowKey].cyl}
                              onChange={(event) =>
                                updateSpectacleField(
                                  rowKey,
                                  "cyl",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.spectacleDraft[rowKey].axis}
                              onChange={(event) =>
                                updateSpectacleField(
                                  rowKey,
                                  "axis",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border border-slate-200 p-2">
                            <input
                              type="text"
                              value={workup.spectacleDraft[rowKey].vision}
                              onChange={(event) =>
                                updateSpectacleField(
                                  rowKey,
                                  "vision",
                                  event.target.value
                                )
                              }
                              disabled={isReadOnly}
                              className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Remarks
                  <textarea
                    value={workup.spectacleDraft.remarks}
                    onChange={(event) =>
                      updateSpectacleRemarks(event.target.value)
                    }
                    disabled={isReadOnly}
                    placeholder="Optional remarks"
                    className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                  />
                </label>
              </div>
            </div>

            {workupSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                Workup draft saved for selected patient.
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
                disabled={isReadOnly}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Save Workup Draft
              </button>

              <button
                onClick={handleMarkDilated}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Mark Dilated
              </button>

              <button
                onClick={handleReadyForDoctor}
                className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
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