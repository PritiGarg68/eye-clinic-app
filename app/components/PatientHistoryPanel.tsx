"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  return new Date(dateValue).toLocaleDateString("en-IN");
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function hasVision(visit: PatientHistoryVisit) {
  return Boolean(
    visit.vision.unaided.distanceOD ||
      visit.vision.unaided.distanceOS ||
      visit.vision.unaided.nearOD ||
      visit.vision.unaided.nearOS ||
      visit.vision.withGlasses.distanceOD ||
      visit.vision.withGlasses.distanceOS ||
      visit.vision.withGlasses.nearOD ||
      visit.vision.withGlasses.nearOS ||
      visit.vision.withPinHole.distanceOD ||
      visit.vision.withPinHole.distanceOS ||
      visit.vision.withPinHole.nearOD ||
      visit.vision.withPinHole.nearOS
  );
}

const visionRows = [
  { key: "unaided", label: "Unaided" },
  { key: "withGlasses", label: "Glasses" },
  { key: "withPinHole", label: "Pin Hole" },
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
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

function getVisitSummary(visit: PatientHistoryVisit) {
  const tests = visit.additionalServices
    .flatMap((service) => service.services)
    .filter(Boolean);

  return {
    complaint: visit.chiefComplaint || "No complaint recorded",
    diagnosis: visit.diagnosis || "No diagnosis recorded",
    medicineCount: visit.medicines.length,
    tests: tests.length ? tests.join(", ") : "No additional tests",
  };
}

function VisitDetails({ visit }: { visit: PatientHistoryVisit }) {
  return (
    <div className="mt-3 grid gap-3">
      {hasText(visit.chiefComplaint) && (
        <Section title="Chief Complaint">
          <p className="whitespace-pre-wrap">{visit.chiefComplaint}</p>
        </Section>
      )}

      {hasText(visit.historyNotes) && (
        <Section title="History / Background">
          <p className="whitespace-pre-wrap">{visit.historyNotes}</p>
        </Section>
      )}

      {hasVision(visit) && (
        <Section title="Vision / VA">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-white">
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Type
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    D OD
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    D OS
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    N OD
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    N OS
                  </th>
                </tr>
              </thead>
              <tbody>
                {visionRows.map((row) => {
                  const entry = visit.vision[row.key];

                  return (
                    <tr key={row.key}>
                      <td className="border border-slate-200 px-2 py-1 font-medium">
                        {row.label}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {entry.distanceOD || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {entry.distanceOS || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {entry.nearOD || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {entry.nearOS || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {(hasText(visit.refractionRight) || hasText(visit.refractionLeft)) && (
        <Section title="Refraction">
          <p>
            Right: {visit.refractionRight || "—"} · Left:{" "}
            {visit.refractionLeft || "—"}
          </p>
        </Section>
      )}

      {(hasText(visit.iopRight) ||
        hasText(visit.iopLeft) ||
        hasText(visit.dilationStatus)) && (
        <Section title="IOP / Dilation">
          <p>
            IOP: OD {visit.iopRight || "—"} · OS {visit.iopLeft || "—"}
          </p>
          <p className="mt-1">
            Dilation: {visit.dilationStatus || "—"}
            {visit.dilationNotes ? ` · ${visit.dilationNotes}` : ""}
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
              <div key={medicine.id} className="rounded-lg bg-white p-2 text-xs">
                <p className="font-semibold text-slate-900">
                  {medicine.medicineName}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {medicine.eye || "—"} · {medicine.frequency || "—"} ·{" "}
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
              <div key={service.id} className="rounded-lg bg-white p-2 text-xs">
                <p className="font-semibold text-slate-900">
                  {service.services.join(", ") || "Service"}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {service.status} · ₹{service.netAmount}
                  {service.receiptNumber ? ` · ${service.receiptNumber}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function VisitTile({
  visit,
  isOpen,
  onToggle,
  label,
}: {
  visit: PatientHistoryVisit;
  isOpen: boolean;
  onToggle: () => void;
  label: string;
}) {
  const summary = getVisitSummary(visit);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {label} · {formatDate(visit.visitDate)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Token #{visit.tokenNumber} · {visit.visitType} · {visit.status}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {isOpen ? "Hide" : "View"}
          </span>
        </div>

        {!isOpen && (
          <div className="mt-3 grid gap-1 text-xs text-slate-700">
            <p>
              <span className="font-semibold">Complaint:</span>{" "}
              {summary.complaint}
            </p>
            <p>
              <span className="font-semibold">Diagnosis:</span>{" "}
              {summary.diagnosis}
            </p>
            <p>
              <span className="font-semibold">Medicines:</span>{" "}
              {summary.medicineCount}
            </p>
            <p>
              <span className="font-semibold">Tests:</span> {summary.tests}
            </p>
          </div>
        )}
      </button>

      {isOpen && <VisitDetails visit={visit} />}
    </div>
  );
}

export default function PatientHistoryPanel({
  patient,
}: PatientHistoryPanelProps) {
  const [history, setHistory] = useState<PatientHistoryVisit[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [openVisitIds, setOpenVisitIds] = useState<string[]>([]);
  const [showOlderVisits, setShowOlderVisits] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      if (!patient?.patientId) {
        setHistory([]);
        setOpenVisitIds([]);
        setShowOlderVisits(false);
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
        const previousVisits = visits.filter(
          (visit) => visit.visitId !== patient.id
        );

        setHistory(visits);
        setOpenVisitIds(previousVisits[0] ? [previousVisits[0].visitId] : []);
        setShowOlderVisits(false);
        setStatusMessage(
          previousVisits.length
            ? `Loaded ${previousVisits.length} previous visit record(s).`
            : "No previous visits found for this patient."
        );
      } catch (error) {
        setHistory([]);
        setOpenVisitIds([]);
        setShowOlderVisits(false);
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

  const previousVisits = history.filter((visit) => visit.visitId !== patient.id);
  const visibleVisits = previousVisits.slice(0, 3);
  const olderVisits = previousVisits.slice(3);
  const visitsToRender = showOlderVisits
    ? [...visibleVisits, ...olderVisits]
    : visibleVisits;

  function toggleVisit(visitId: string) {
    setOpenVisitIds((current) =>
      current.includes(visitId)
        ? current.filter((id) => id !== visitId)
        : [...current, visitId]
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Patient History</p>
        <p className="mt-1 text-xs text-blue-700">
          Previous Supabase visits for {patient.patientName}.
        </p>

        {statusMessage && (
          <p className="mt-2 text-xs font-medium text-blue-800">
            {statusMessage}
          </p>
        )}
      </div>

      {previousVisits.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No previous visit history to show yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {visitsToRender.map((visit, index) => (
            <VisitTile
              key={visit.visitId}
              visit={visit}
              label={
                index === 0 ? "Most Recent Previous Visit" : "Previous Visit"
              }
              isOpen={openVisitIds.includes(visit.visitId)}
              onToggle={() => toggleVisit(visit.visitId)}
            />
          ))}

          {olderVisits.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOlderVisits((current) => !current)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {showOlderVisits
                ? "Hide older visits"
                : `Show older visits (${olderVisits.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
