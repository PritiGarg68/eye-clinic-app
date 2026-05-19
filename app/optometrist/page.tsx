"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";
import { OptometristWorkup } from "../../types/queue";

const emptyWorkup: OptometristWorkup = {
  chiefComplaint: "",
  visionRight: "",
  visionLeft: "",
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  spectacleDraftNotes: "",
};

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
    if (selectedQueueItem?.optometristWorkup) {
      setWorkup(selectedQueueItem.optometristWorkup);
    } else {
      setWorkup(emptyWorkup);
    }

    setWorkupSaved(false);
    setStatusMessage("");
  }, [selectedQueueItem?.id, selectedQueueItem?.optometristWorkup]);

  function updateWorkupField<K extends keyof OptometristWorkup>(
    field: K,
    value: OptometristWorkup[K]
  ) {
    setWorkup((currentWorkup) => ({
      ...currentWorkup,
      [field]: value,
    }));

    setWorkupSaved(false);
  }

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
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
      alert("Doctor has already started or completed consultation. Workup is now read-only.");
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
                Doctor has started or completed consultation. Workup is read-only.
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
                    updateWorkupField("chiefComplaint", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Example: redness, watering, blurred vision, pain..."
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Vision / VA</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={workup.visionRight}
                  onChange={(event) =>
                    updateWorkupField("visionRight", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Right eye vision"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.visionLeft}
                  onChange={(event) =>
                    updateWorkupField("visionLeft", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Left eye vision"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Refraction</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={workup.refractionRight}
                  onChange={(event) =>
                    updateWorkupField("refractionRight", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Right eye refraction notes"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.refractionLeft}
                  onChange={(event) =>
                    updateWorkupField("refractionLeft", event.target.value)
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
                    updateWorkupField("iopRight", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Right eye IOP"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={workup.iopLeft}
                  onChange={(event) =>
                    updateWorkupField("iopLeft", event.target.value)
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
                    updateWorkupField(
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
                    updateWorkupField("dilationNotes", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Dilation notes optional"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Spectacle Draft Notes
                <textarea
                  value={workup.spectacleDraftNotes}
                  onChange={(event) =>
                    updateWorkupField("spectacleDraftNotes", event.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Optional spectacle draft notes for doctor review"
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </label>
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