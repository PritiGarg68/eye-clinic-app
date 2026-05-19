"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";

export default function OptometristPage() {
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
    setStatusMessage("");
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

    updateQueueItemStatus(selectedQueueItem.id, "Dilated Waiting");
    setStatusMessage("Patient marked as Dilated Waiting.");
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

    updateQueueItemStatus(selectedQueueItem.id, "Ready for Doctor");
    setStatusMessage("Patient marked Ready for Doctor.");
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
          subtitle="Enter preliminary ophthalmology findings"
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

            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {statusMessage}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Chief Complaint
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Presenting complaint will be entered here.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Vision / VA
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Refraction
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  IOP / Pressure
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To be entered here
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleStartWorkup}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Start Workup
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