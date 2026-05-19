"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import { useQueue } from "../components/QueueProvider";
import { sortQueueForRole } from "../../lib/queueSorting";

export default function DoctorPage() {
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");

  const optometristWorkup = selectedQueueItem?.optometristWorkup;

  const canSendBackToOptometrist =
    selectedQueueItem?.status === "Under Consultation";

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    selectQueueItem(item);
    setStatusMessage("");
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

  function handleCompleteConsultation() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    updateQueueItemStatus(selectedQueueItem.id, "Completed");
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
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Vision Right
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.visionRight || "Not entered"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Vision Left
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {optometristWorkup.visionLeft || "Not entered"}
                      </p>
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

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Spectacle Draft Notes
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {optometristWorkup.spectacleDraftNotes || "Not entered"}
                    </p>
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
              <p className="text-sm font-medium text-slate-700">Diagnosis</p>
              <p className="mt-2 text-sm text-slate-500">
                Diagnosis selection and notes will appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Medicines</p>
              <p className="mt-2 text-sm text-slate-500">
                Medicine rows with eye, frequency, duration, and notes will
                appear here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">
                Advice & Follow-Up
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Advice and follow-up date will appear here.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleStartConsultation}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Start Consultation
              </button>

              <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
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