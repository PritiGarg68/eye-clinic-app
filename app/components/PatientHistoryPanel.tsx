"use client";

import { useEffect, useState } from "react";
import {
  fetchPatientHistoryFromSupabase,
  PatientHistoryVisit,
} from "../../lib/patientHistoryDb";
import { QueueItem } from "../../types/queue";

type PatientHistoryPanelProps = {
  patient: QueueItem | null;
};

function formatDate(dateValue: string) {
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleDateString();
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function PatientHistoryPanel({
  patient,
}: PatientHistoryPanelProps) {
  const [history, setHistory] = useState<PatientHistoryVisit[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function loadHistory() {
      if (!patient?.patientId) {
        setHistory([]);
        setStatusMessage(
          patient
            ? "History is available for Supabase patients only."
            : "Select a patient to view previous visits."
        );
        return;
      }

      setStatusMessage("Loading patient history...");

      try {
        const visits = await fetchPatientHistoryFromSupabase(patient.patientId);
        setHistory(visits);
        setStatusMessage(
          visits.length
            ? `Loaded ${visits.length} visit record(s).`
            : "No previous visits found."
        );
      } catch (error) {
        setHistory([]);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not load patient history."
        );
      }
    }

    void loadHistory();
  }, [patient?.patientId, patient?.id]);

  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to view previous visits.
      </div>
    );
  }

  const previousVisits = history.filter(
    (visit) => visit.visitId !== patient.id
  );

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">
          Patient History
        </p>
        <p className="mt-1 text-xs text-blue-700">
          Previous Supabase visits for {patient.patientName}.
        </p>

        {statusMessage && (
          <p className="mt-2 text-xs font-medium text-blue-800">
            {previousVisits.length
              ? `Loaded ${previousVisits.length} previous visit record(s).`
              : "No previous visits found for this patient."}
          </p>
        )}
      </div>

      {previousVisits.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No previous visit history to show yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {previousVisits.map((visit, index) => (
            <div
              key={visit.visitId}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {index === 0 ? "Most Recent Previous Visit" : "Previous Visit"} ·{" "}
                    {formatDate(visit.visitDate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Token #{visit.tokenNumber} · {visit.visitType} ·{" "}
                    {visit.status}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                {hasText(visit.chiefComplaint) && (
                  <Section title="Chief Complaint">
                    <p className="whitespace-pre-wrap">
                      {visit.chiefComplaint}
                    </p>
                  </Section>
                )}

                {hasText(visit.historyNotes) && (
                  <Section title="History / Background">
                    <p className="whitespace-pre-wrap">
                      {visit.historyNotes}
                    </p>
                  </Section>
                )}

                {(hasText(visit.iopRight) ||
                  hasText(visit.iopLeft) ||
                  hasText(visit.dilationStatus)) && (
                  <Section title="IOP / Dilation">
                    <p>
                      IOP: OD {visit.iopRight || "—"} · OS{" "}
                      {visit.iopLeft || "—"}
                    </p>
                    <p className="mt-1">
                      Dilation: {visit.dilationStatus || "—"}
                      {visit.dilationNotes
                        ? ` · ${visit.dilationNotes}`
                        : ""}
                    </p>
                  </Section>
                )}

                {hasText(visit.findings) && (
                  <Section title="Findings">
                    <p className="whitespace-pre-wrap">{visit.findings}</p>
                  </Section>
                )}

                {hasText(visit.diagnosis) && (
                  <Section title="Diagnosis / Impression">
                    <p className="whitespace-pre-wrap">{visit.diagnosis}</p>
                  </Section>
                )}

                {visit.medicines.length > 0 && (
                  <Section title="Medicines">
                    <div className="grid gap-2">
                      {visit.medicines.map((medicine) => (
                        <div
                          key={medicine.id}
                          className="rounded-lg bg-white p-2 text-xs"
                        >
                          <p className="font-semibold text-slate-900">
                            {medicine.medicineName}
                          </p>
                          <p className="mt-0.5 text-slate-600">
                            {medicine.eye || "—"} ·{" "}
                            {medicine.frequency || "—"} ·{" "}
                            {medicine.duration || "—"}
                          </p>
                          {medicine.instructions && (
                            <p className="mt-0.5 text-slate-600">
                              {medicine.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {hasText(visit.advice) && (
                  <Section title="Advice">
                    <p className="whitespace-pre-wrap">{visit.advice}</p>
                  </Section>
                )}

                {(visit.followUpDate || visit.freeFollowUpValidUntil) && (
                  <Section
                    title={
                      visit.freeFollowUpValidUntil
                        ? "Free Follow-Up Valid Until"
                        : "Follow-Up"
                    }
                  >
                    <p className="font-semibold">
                      {visit.freeFollowUpValidUntil || visit.followUpDate}
                    </p>
                  </Section>
                )}

                {visit.spectacleAdvice && (
                  <Section title="Spectacle Advice">
                    <p>
                      OD {visit.spectacleAdvice.od.sph || "—"} /{" "}
                      {visit.spectacleAdvice.od.cyl || "—"} ×{" "}
                      {visit.spectacleAdvice.od.axis || "—"}
                    </p>
                    <p>
                      OS {visit.spectacleAdvice.os.sph || "—"} /{" "}
                      {visit.spectacleAdvice.os.cyl || "—"} ×{" "}
                      {visit.spectacleAdvice.os.axis || "—"}
                    </p>
                    {visit.spectacleAdvice.remarks && (
                      <p className="mt-1 whitespace-pre-wrap">
                        {visit.spectacleAdvice.remarks}
                      </p>
                    )}
                  </Section>
                )}

                {visit.additionalServices.length > 0 && (
                  <Section title="Additional Tests / Services">
                    <div className="grid gap-2">
                      {visit.additionalServices.map((service) => (
                        <div
                          key={service.id}
                          className="rounded-lg bg-white p-2 text-xs"
                        >
                          <p className="font-semibold text-slate-900">
                            {service.services.join(", ") || "Service"}
                          </p>
                          <p className="mt-0.5 text-slate-600">
                            {service.status} · ₹{service.netAmount}
                            {service.receiptNumber
                              ? ` · ${service.receiptNumber}`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
