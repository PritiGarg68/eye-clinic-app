"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import PrescriptionPreview from "../components/PrescriptionPreview";
import SpectacleAdvicePrint from "../components/SpectacleAdvicePrint";
import { clinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";
import {
  SupabasePatient,
  searchPatientsFromSupabase,
} from "../../lib/patientsDb";
import {
  PatientRecordPayment,
  PatientRecordVisit,
  fetchPatientRecordsFromSupabase,
} from "../../lib/patientRecordsDb";

function formatDateTime(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function ReceiptPrintView({
  patient,
  visit,
  payment,
}: {
  patient: SupabasePatient;
  visit: PatientRecordVisit;
  payment: PatientRecordPayment;
}) {
  const isAdditional = payment.paymentType !== "Consultation";

  return (
    <div className="bg-white p-4">
      <div className="receipt-print-area rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
        <div className="border-b border-slate-300 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold tracking-tight">
                {clinicSettings.clinicName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {clinicSettings.address}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {clinicSettings.phone}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isAdditional
                  ? "Receipt for additional test / procedure payment"
                  : "Receipt for consultation payment"}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {isAdditional ? "Additional Receipt" : "Receipt"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {payment.receiptNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-slate-500">Patient</p>
            <p className="font-semibold text-slate-900">{patient.fullName}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">UHID</p>
            <p className="font-semibold text-slate-900">{patient.uhid}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Date / Time</p>
            <p className="font-semibold text-slate-900">
              {formatDateTime(payment.paidAt)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Age / Gender</p>
            <p className="font-semibold text-slate-900">
              {patient.ageYears} yrs / {patient.gender}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Mobile</p>
            <p className="font-semibold text-slate-900">{patient.mobile}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium text-slate-500">Visit Type</p>
            <p className="font-semibold text-slate-900">{visit.visitType}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Payment Details
          </p>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            {payment.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-2 border-b border-slate-200 text-sm"
              >
                <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
                  {item.itemName}
                </div>
                <div className="px-4 py-3 text-right font-semibold">
                  ₹{item.grossAmount}
                </div>
              </div>
            ))}

            {payment.discountAmount > 0 && (
              <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
                <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
                  Discount
                </div>
                <div className="px-4 py-3 text-right font-semibold">
                  ₹{payment.discountAmount}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
              <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
                Amount Paid
              </div>
              <div className="px-4 py-3 text-right font-bold text-emerald-700">
                ₹{payment.netAmount}
              </div>
            </div>

            <div className="grid grid-cols-2 text-sm">
              <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
                Payment Mode
              </div>
              <div className="px-4 py-3 text-right font-semibold">
                {payment.paymentMode}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between border-t border-slate-300 pt-5 text-xs text-slate-500">
          <p>Thank you.</p>
          <p>Generated by Eye Clinic App</p>
        </div>
      </div>
    </div>
  );
}

export default function PatientRecordsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<SupabasePatient[]>([]);
  const [selectedPatient, setSelectedPatient] =
    useState<SupabasePatient | null>(null);
  const [visits, setVisits] = useState<PatientRecordVisit[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [printingReceipt, setPrintingReceipt] = useState<{
    visit: PatientRecordVisit;
    payment: PatientRecordPayment;
  } | null>(null);
  const [printingPrescription, setPrintingPrescription] =
    useState<PatientRecordVisit | null>(null);
  const [printingSpectacleAdvice, setPrintingSpectacleAdvice] =
    useState<PatientRecordVisit | null>(null);

  async function handleSearchPatients() {
    const term = searchTerm.trim();

    if (!term) {
      setStatusMessage("Enter mobile, UHID, or patient name to search.");
      return;
    }

    setStatusMessage("Searching patients...");
    setSelectedPatient(null);
    setVisits([]);

    try {
      const results = await searchPatientsFromSupabase(term);
      setPatients(results);
      setStatusMessage(`Found ${results.length} patient(s).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not search patients."
      );
    }
  }

  async function handleSelectPatient(patient: SupabasePatient) {
    setSelectedPatient(patient);
    setStatusMessage("Loading patient records...");

    try {
      const records = await fetchPatientRecordsFromSupabase(patient.id);
      setVisits(records);
      setStatusMessage(`Loaded ${records.length} visit record(s).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not load patient records."
      );
    }
  }

  function handlePrintReceipt(
    visit: PatientRecordVisit,
    payment: PatientRecordPayment
  ) {
    setPrintingReceipt({ visit, payment });

    setTimeout(() => {
      window.print();
      setPrintingReceipt(null);
    }, 150);
  }

  function handlePrintPrescription(visit: PatientRecordVisit) {
    setPrintingPrescription(visit);

    setTimeout(() => {
      window.print();
      setPrintingPrescription(null);
    }, 150);
  }

  function handlePrintSpectacleAdvice(visit: PatientRecordVisit) {
    setPrintingSpectacleAdvice(visit);

    setTimeout(() => {
      window.print();
      setPrintingSpectacleAdvice(null);
    }, 150);
  }

  if (printingReceipt && selectedPatient) {
    return (
      <ReceiptPrintView
        patient={selectedPatient}
        visit={printingReceipt.visit}
        payment={printingReceipt.payment}
      />
    );
  }

  if (printingPrescription) {
    return (
      <div className="bg-white p-4">
        <PrescriptionPreview
          patient={printingPrescription.queueItem}
          showSpectacleAdvice={false}
          dateOverride={formatDate(printingPrescription.visitDate)}
        />
      </div>
    );
  }

  if (printingSpectacleAdvice) {
    return (
      <div className="bg-white p-4">
        <SpectacleAdvicePrint
          patient={printingSpectacleAdvice.queueItem}
          dateOverride={formatDate(printingSpectacleAdvice.visitDate)}
        />
      </div>
    );
  }

  return (
    <AppShell
      title="Patient Records"
      subtitle="Search old visits, receipts, prescriptions, and uploaded reports"
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard
          title="Search Patient"
          subtitle="Search by mobile, UHID, or name"
        >
          <div className="grid gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearchPatients();
                }
              }}
              placeholder="Mobile / UHID / patient name"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            <button
              onClick={handleSearchPatients}
              className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
            >
              Search Records
            </button>

            {statusMessage && (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {statusMessage}
              </p>
            )}

            {patients.length > 0 && (
              <div className="grid gap-3">
                {patients.map((patient) => {
                  const isSelected = selectedPatient?.id === patient.id;

                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => void handleSelectPatient(patient)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {patient.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {patient.ageYears} yrs / {patient.gender}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {patient.uhid} · {patient.mobile}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Visit Records"
          subtitle="Old visits and receipt reprints"
        >
          {!selectedPatient && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Select a patient to view old visits and receipts.
            </div>
          )}

          {selectedPatient && (
            <div className="grid gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800">
                  Selected Patient
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {selectedPatient.fullName}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedPatient.ageYears} yrs / {selectedPatient.gender}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedPatient.uhid} · {selectedPatient.mobile}
                </p>
              </div>

              {visits.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No visits found for this patient.
                </div>
              )}

              {visits.map((visit) => (
                <div
                  key={visit.visitId}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {formatDate(visit.visitDate)} · Token #{visit.tokenNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {visit.visitType} · {visit.status}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-900">
                        Clinical Prints
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handlePrintPrescription(visit)}
                          disabled={!visit.hasPrescription}
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                          Print Prescription
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintSpectacleAdvice(visit)}
                          disabled={!visit.hasSpectacleAdvice}
                          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                          Print Spectacle Advice
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Receipts
                    </p>

                    {visit.payments.length === 0 && (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                        No paid receipts found for this visit.
                      </p>
                    )}

                    {visit.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {payment.paymentType} · {payment.receiptNumber}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatDateTime(payment.paidAt)} · ₹
                              {payment.netAmount} · {payment.paymentMode}
                            </p>
                            {payment.items.length > 0 && (
                              <p className="mt-1 text-sm text-slate-500">
                                {payment.items
                                  .map((item) => item.itemName)
                                  .join(", ")}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(visit, payment)}
                            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                          >
                            Print Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
