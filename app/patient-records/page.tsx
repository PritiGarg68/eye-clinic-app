"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import PrescriptionPreview from "../components/PrescriptionPreview";
import SpectacleAdvicePrint from "../components/SpectacleAdvicePrint";
import { clinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";
import {
  SupabasePatient,
  deactivatePatientInSupabase,
  searchPatientsFromSupabase,
  updatePatientInSupabase,
} from "../../lib/patientsDb";
import {
  PatientRecordPayment,
  PatientRecordVisit,
  fetchPatientRecordsFromSupabase,
} from "../../lib/patientRecordsDb";
import {
  AttachmentCategory,
  PatientAttachment,
  fetchPatientAttachmentsFromSupabase,
  uploadPatientAttachmentToSupabase,
} from "../../lib/patientAttachmentsDb";
import {
  createGeneratedDocumentSignedUrl,
  fetchGeneratedDocumentForVisit,
  fetchGeneratedReceiptForPayment,
} from "../../lib/generatedDocumentsDb";

const attachmentCategories: AttachmentCategory[] = [
  "OCT",
  "Fundus Photo",
  "Perimetry",
  "IOP Report",
  "External Report",
  "Prescription",
  "Spectacle Prescription",
  "Other",
];

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

function formatFileSize(bytes: number) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentDisplayName(attachment: PatientAttachment) {
  if (attachment.notes) {
    return `${attachment.attachmentCategory} · ${attachment.notes}`;
  }

  return attachment.attachmentCategory;
}

function printAttachment(attachment: PatientAttachment) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Could not open attachment for printing.");
    return;
  }

  const displayName = getAttachmentDisplayName(attachment);
  const uploadedAt = formatDateTime(attachment.createdAt);
  const isImage = attachment.fileType.startsWith("image/");
  const isPdf = attachment.fileType === "application/pdf";

  const fileDisplay = isImage
    ? `<img src="${attachment.publicUrl}" onload="window.focus(); window.print();" />`
    : isPdf
      ? `<iframe src="${attachment.publicUrl}" title="${attachment.fileName}"></iframe>`
      : `<p>This file type can be viewed here: <a href="${attachment.publicUrl}" target="_blank" rel="noopener noreferrer">${attachment.fileName}</a></p>`;

  const helperText = isPdf
    ? "Click Print below if the print dialog does not open automatically."
    : "Print dialog should open automatically.";

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${attachment.fileName}</title>
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }

          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
          }

          .title {
            font-size: 14px;
            font-weight: 700;
          }

          .meta {
            margin-top: 4px;
            font-size: 12px;
            color: #475569;
          }

          .helper {
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
          }

          button {
            border: 0;
            border-radius: 10px;
            background: #0f172a;
            color: white;
            font-size: 13px;
            font-weight: 700;
            padding: 9px 14px;
            cursor: pointer;
          }

          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }

          iframe {
            width: 100%;
            height: calc(100vh - 92px);
            border: 0;
          }

          @media print {
            body {
              padding: 0;
            }

            .toolbar {
              display: none;
            }

            img {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div>
            <div class="title">${displayName}</div>
            <div class="meta">${attachment.fileName} · Uploaded ${uploadedAt}</div>
            <div class="helper">${helperText}</div>
          </div>
          <button onclick="window.focus(); window.print();">Print</button>
        </div>
        ${fileDisplay}
      </body>
    </html>
  `);

  printWindow.document.close();
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
  const [isEditingPatientDetails, setIsEditingPatientDetails] = useState(false);
  const [editablePatientName, setEditablePatientName] = useState("");
  const [editablePatientMobile, setEditablePatientMobile] = useState("");
  const [editablePatientAge, setEditablePatientAge] = useState("");
  const [editablePatientGender, setEditablePatientGender] =
    useState<SupabasePatient["gender"]>("Male");
  const [editablePatientAddress, setEditablePatientAddress] = useState("");
  const [patientDetailsStatus, setPatientDetailsStatus] = useState("");
  const [visits, setVisits] = useState<PatientRecordVisit[]>([]);
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [showAddReport, setShowAddReport] = useState(false);
  const [reportCategory, setReportCategory] =
    useState<AttachmentCategory>("External Report");
  const [reportNote, setReportNote] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportUploadStatus, setReportUploadStatus] = useState("");
  const [reportFileInputKey, setReportFileInputKey] = useState(0);
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
    setIsEditingPatientDetails(false);
    setPatientDetailsStatus("");
    setVisits([]);
    setAttachments([]);
    setShowAddReport(false);
    setReportCategory("External Report");
    setReportNote("");
    setReportFile(null);
    setReportUploadStatus("");
    setReportFileInputKey((current) => current + 1);

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
    setIsEditingPatientDetails(false);
    setEditablePatientName(patient.fullName);
    setEditablePatientMobile(patient.mobile);
    setEditablePatientAge(String(patient.ageYears));
    setEditablePatientGender(patient.gender);
    setEditablePatientAddress(patient.address || "");
    setPatientDetailsStatus("");
    setStatusMessage("Loading patient records...");
    setShowAddReport(false);
    setReportCategory("External Report");
    setReportNote("");
    setReportFile(null);
    setReportUploadStatus("");
    setReportFileInputKey((current) => current + 1);

    try {
      const [records, patientAttachments] = await Promise.all([
        fetchPatientRecordsFromSupabase(patient.id),
        fetchPatientAttachmentsFromSupabase(patient.id),
      ]);

      setVisits(records);
      setAttachments(patientAttachments);
      setStatusMessage(
        `Loaded ${records.length} visit record(s) and ${patientAttachments.length} attachment(s).`
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not load patient records."
      );
    }
  }

  function handleStartEditPatientDetails() {
    if (!selectedPatient) {
      return;
    }

    setEditablePatientName(selectedPatient.fullName);
    setEditablePatientMobile(selectedPatient.mobile);
    setEditablePatientAge(String(selectedPatient.ageYears));
    setEditablePatientGender(selectedPatient.gender);
    setEditablePatientAddress(selectedPatient.address || "");
    setPatientDetailsStatus("");
    setIsEditingPatientDetails(true);
  }

  function handleCancelEditPatientDetails() {
    setIsEditingPatientDetails(false);
    setPatientDetailsStatus("");
  }

  async function handleSavePatientDetails() {
    if (!selectedPatient) {
      return;
    }

    const trimmedName = editablePatientName.trim();
    const trimmedMobile = editablePatientMobile.trim();
    const ageYears = Number(editablePatientAge);

    if (!trimmedName || !trimmedMobile || editablePatientAge.trim() === "") {
      setPatientDetailsStatus("Name, mobile number, and age are required.");
      return;
    }

    if (!Number.isInteger(ageYears) || ageYears < 0 || ageYears > 130) {
      setPatientDetailsStatus("Please enter a valid age between 0 and 130.");
      return;
    }

    setPatientDetailsStatus("Saving patient details...");

    try {
      const updatedPatient = await updatePatientInSupabase({
        patientId: selectedPatient.id,
        fullName: trimmedName,
        mobile: trimmedMobile,
        ageYears,
        gender: editablePatientGender,
        address: editablePatientAddress,
      });

      setSelectedPatient(updatedPatient);
      setPatients((current) =>
        current.map((patient) =>
          patient.id === updatedPatient.id ? updatedPatient : patient
        )
      );
      setEditablePatientName(updatedPatient.fullName);
      setEditablePatientMobile(updatedPatient.mobile);
      setEditablePatientAge(String(updatedPatient.ageYears));
      setEditablePatientGender(updatedPatient.gender);
      setEditablePatientAddress(updatedPatient.address || "");
      setIsEditingPatientDetails(false);
      setPatientDetailsStatus("Patient details updated successfully.");
    } catch (error) {
      setPatientDetailsStatus(
        error instanceof Error
          ? error.message
          : "Could not update patient details."
      );
    }
  }

  async function handleDeactivatePatient() {
    if (!selectedPatient) {
      return;
    }

    const firstConfirmation = window.confirm(
      `Deactivate ${selectedPatient.fullName} (${selectedPatient.uhid})?\n\nThe patient will disappear from normal active-patient search and cannot be checked in, but all existing visits, receipts, prescriptions, and attachments will remain stored.`
    );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation = window.confirm(
      `Please confirm again: deactivate ${selectedPatient.fullName}?`
    );

    if (!secondConfirmation) {
      return;
    }

    setPatientDetailsStatus("Deactivating patient...");

    try {
      await deactivatePatientInSupabase(selectedPatient.id);

      const deactivatedPatientId = selectedPatient.id;

      setPatients((current) =>
        current.filter((patient) => patient.id !== deactivatedPatientId)
      );
      setSelectedPatient(null);
      setVisits([]);
      setAttachments([]);
      setIsEditingPatientDetails(false);
      setPatientDetailsStatus("");
      setStatusMessage(
        "Patient deactivated. Historical records remain stored and unchanged."
      );
    } catch (error) {
      setPatientDetailsStatus(
        error instanceof Error
          ? error.message
          : "Could not deactivate patient."
      );
    }
  }

  function handleCancelAddReport() {
    setShowAddReport(false);
    setReportCategory("External Report");
    setReportNote("");
    setReportFile(null);
    setReportUploadStatus("");
    setReportFileInputKey((current) => current + 1);
  }

  async function handleUploadReport() {
    if (!selectedPatient) {
      setReportUploadStatus("Select a patient before uploading a report.");
      return;
    }

    if (!reportFile) {
      setReportUploadStatus("Choose a PDF, JPG, JPEG, or PNG file first.");
      return;
    }

    setReportUploadStatus("Uploading report...");

    try {
      const uploaded = await uploadPatientAttachmentToSupabase({
        patientId: selectedPatient.id,
        file: reportFile,
        attachmentCategory: reportCategory,
        notes: reportNote,
      });

      setAttachments((current) => [uploaded, ...current]);
      setReportCategory("External Report");
      setReportNote("");
      setReportFile(null);
      setReportFileInputKey((current) => current + 1);
      setShowAddReport(false);
      setReportUploadStatus("");
      setStatusMessage("Report uploaded and added to patient records.");
    } catch (error) {
      setReportUploadStatus(
        error instanceof Error ? error.message : "Could not upload report."
      );
    }
  }

  async function handlePrintReceipt(
    visit: PatientRecordVisit,
    payment: PatientRecordPayment
  ) {
    const documentType =
      payment.paymentType === "Consultation"
        ? "Consultation Receipt"
        : "Additional Service Receipt";

    try {
      const generatedDocument = await fetchGeneratedReceiptForPayment(
        payment.id,
        documentType
      );

      if (generatedDocument) {
        const signedUrl =
          await createGeneratedDocumentSignedUrl(generatedDocument);

        window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }
    } catch (error) {
      console.warn(
        "Could not open stored receipt PDF; using reconstructed print fallback.",
        error
      );
    }

    setPrintingReceipt({ visit, payment });

    setTimeout(() => {
      window.print();
      setPrintingReceipt(null);
    }, 150);
  }

  async function handlePrintPrescription(visit: PatientRecordVisit) {
    try {
      const generatedDocument = await fetchGeneratedDocumentForVisit(
        visit.visitId,
        "Prescription"
      );

      if (generatedDocument) {
        const signedUrl =
          await createGeneratedDocumentSignedUrl(generatedDocument);

        window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }
    } catch (error) {
      console.warn(
        "Could not open stored prescription PDF; using reconstructed print fallback.",
        error
      );
    }

    setPrintingPrescription(visit);

    setTimeout(() => {
      window.print();
      setPrintingPrescription(null);
    }, 150);
  }

  async function handlePrintSpectacleAdvice(visit: PatientRecordVisit) {
    try {
      const generatedDocument = await fetchGeneratedDocumentForVisit(
        visit.visitId,
        "Spectacle Prescription"
      );

      if (generatedDocument) {
        const signedUrl =
          await createGeneratedDocumentSignedUrl(generatedDocument);

        window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }
    } catch (error) {
      console.warn(
        "Could not open stored spectacle prescription PDF; using reconstructed print fallback.",
        error
      );
    }

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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      Selected Patient
                    </p>

                    {!isEditingPatientDetails && (
                      <>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {selectedPatient.fullName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedPatient.ageYears} yrs / {selectedPatient.gender}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedPatient.uhid} · {selectedPatient.mobile}
                        </p>
                        {selectedPatient.address && (
                          <p className="mt-1 text-sm text-slate-600">
                            {selectedPatient.address}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {!isEditingPatientDetails && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleStartEditPatientDetails}
                        className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        Edit Patient Details
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeactivatePatient()}
                        className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Deactivate Patient
                      </button>
                    </div>
                  )}
                </div>

                {isEditingPatientDetails && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Edit Patient Details
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      UHID {selectedPatient.uhid} will remain unchanged. Historical documents will not be modified.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Patient Name
                        <input
                          type="text"
                          value={editablePatientName}
                          onChange={(event) =>
                            setEditablePatientName(event.target.value)
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Mobile Number
                        <input
                          type="text"
                          value={editablePatientMobile}
                          onChange={(event) =>
                            setEditablePatientMobile(event.target.value)
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Age
                        <input
                          type="number"
                          min="0"
                          max="130"
                          value={editablePatientAge}
                          onChange={(event) =>
                            setEditablePatientAge(event.target.value)
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Gender
                        <select
                          value={editablePatientGender}
                          onChange={(event) =>
                            setEditablePatientGender(
                              event.target.value as SupabasePatient["gender"]
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-slate-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                        Address
                        <textarea
                          value={editablePatientAddress}
                          onChange={(event) =>
                            setEditablePatientAddress(event.target.value)
                          }
                          rows={2}
                          placeholder="Optional"
                          className="rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSavePatientDetails()}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Save Patient Details
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelEditPatientDetails}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {patientDetailsStatus && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                    {patientDetailsStatus}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Reports / Attachments
                    </p>
                    <p className="mt-1 text-xs text-indigo-800">
                      Patient-level uploaded files such as OCT, fundus, perimetry, and external reports.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-800">
                      {attachments.length} file(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (showAddReport) {
                          handleCancelAddReport();
                        } else {
                          setShowAddReport(true);
                          setReportUploadStatus("");
                        }
                      }}
                      className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                    >
                      {showAddReport ? "Cancel" : "Add Report"}
                    </button>
                  </div>
                </div>

                {showAddReport && (
                  <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Add Patient Report
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      This report will be stored against the patient record and will not create a new visit.
                    </p>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Report category
                        <select
                          value={reportCategory}
                          onChange={(event) =>
                            setReportCategory(
                              event.target.value as AttachmentCategory
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-slate-500"
                        >
                          {attachmentCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Report name / note
                        <input
                          type="text"
                          value={reportNote}
                          onChange={(event) => setReportNote(event.target.value)}
                          placeholder="Optional, e.g. Sugar Report, Outside OCT"
                          className="rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        File
                        <input
                          key={reportFileInputKey}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={(event) =>
                            setReportFile(event.target.files?.[0] || null)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                        />
                        <span className="text-xs font-normal text-slate-500">
                          Allowed: PDF, JPG, JPEG, PNG.
                        </span>
                      </label>

                      {reportUploadStatus && (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          {reportUploadStatus}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUploadReport()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Upload Report
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAddReport}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3">
                  {attachments.length === 0 ? (
                    <div className="rounded-xl bg-white p-3 text-sm text-slate-500">
                      No reports or attachments uploaded for this patient.
                    </div>
                  ) : (
                    attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="rounded-xl border border-indigo-100 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="break-words font-semibold text-slate-900">
                              {getAttachmentDisplayName(attachment)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Uploaded {formatDateTime(attachment.createdAt)}
                              {formatFileSize(attachment.fileSizeBytes)
                                ? ` · ${formatFileSize(attachment.fileSizeBytes)}`
                                : ""}
                            </p>
                            <p
                              className="mt-1 max-w-xl truncate text-xs text-slate-500"
                              title={attachment.fileName}
                            >
                              {attachment.fileName}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  attachment.publicUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => printAttachment(attachment)}
                              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                            >
                              Print
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
