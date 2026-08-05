"use client";

import { useEffect, useState } from "react";
import {
  AttachmentCategory,
  deletePatientAttachmentFromSupabase,
  fetchPatientAttachmentsFromSupabase,
  PatientAttachment,
  uploadPatientAttachmentToSupabase,
} from "../../lib/patientAttachmentsDb";
import { QueueItem } from "../../types/queue";

type PatientAttachmentsPanelProps = {
  patient: QueueItem | null;
  sourceLabel: "Doctor" | "Optometrist";
};

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

function formatDateTime(dateValue: string) {
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

export default function PatientAttachmentsPanel({
  patient,
  sourceLabel,
}: PatientAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>("OCT");
  const [reportNote, setReportNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadAttachments() {
    if (!patient?.patientId) {
      setAttachments([]);
      setStatusMessage(
        patient
          ? "Attachments are available for Supabase patients only."
          : "Select a patient to view attachments."
      );
      return;
    }

    try {
      const rows = await fetchPatientAttachmentsFromSupabase(patient.patientId);
      setAttachments(rows);
      setStatusMessage(
        rows.length
          ? `Loaded ${rows.length} attachment(s).`
          : "No attachments uploaded yet."
      );
    } catch (error) {
      setAttachments([]);
      setStatusMessage(
        error instanceof Error ? error.message : "Could not load attachments."
      );
    }
  }

  useEffect(() => {
    void loadAttachments();
    setSelectedFile(null);
    setReportNote("");
  }, [patient?.patientId, patient?.id]);

  async function handleUpload() {
    if (!patient?.patientId) {
      setStatusMessage("Select a Supabase patient before uploading.");
      return;
    }

    if (!selectedFile) {
      setStatusMessage("Choose a PDF, JPG, JPEG, or PNG file first.");
      return;
    }

    setStatusMessage("Uploading attachment...");

    try {
      const uploaded = await uploadPatientAttachmentToSupabase({
        patientId: patient.patientId,
        file: selectedFile,
        attachmentCategory: category,
        notes: reportNote,
      });

      setAttachments((current) => [uploaded, ...current]);
      setSelectedFile(null);
      setReportNote("");
      setStatusMessage("Attachment uploaded.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not upload attachment."
      );
    }
  }

  async function handleDelete(attachment: PatientAttachment) {
    const confirmed = window.confirm(
      `Delete ${getAttachmentDisplayName(attachment)}?\n\nThis will remove the file from patient attachments.`
    );

    if (!confirmed) {
      return;
    }

    setStatusMessage("Deleting attachment...");

    try {
      await deletePatientAttachmentFromSupabase(attachment);
      setAttachments((current) =>
        current.filter((item) => item.id !== attachment.id)
      );
      setStatusMessage("Attachment deleted.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not delete attachment."
      );
    }
  }

  function handleView(attachment: PatientAttachment) {
    window.open(attachment.publicUrl, "_blank", "noopener,noreferrer");
  }

  function handlePrint(attachment: PatientAttachment) {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setStatusMessage("Could not open attachment for printing.");
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
                max-height: 98vh;
              }

              iframe {
                width: 100%;
                height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div>
              <div class="title">${displayName}</div>
              <div class="meta">Uploaded: ${uploadedAt}</div>
              <div class="helper">${helperText}</div>
            </div>
            <button onclick="window.focus(); window.print();">Print</button>
          </div>

          ${fileDisplay}

          ${
            isPdf
              ? `<script>
                   setTimeout(function () {
                     window.focus();
                   }, 500);
                 </script>`
              : ""
          }
        </body>
      </html>
    `);

    printWindow.document.close();
    setStatusMessage("Opened attachment print view.");
  }

  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to view or upload attachments.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">
          Patient Attachments / Reports
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Uploaded from {sourceLabel}. Upload date/time is the reference date.
        </p>

        {statusMessage && (
          <p className="mt-2 break-words text-xs font-medium text-slate-700">
            {statusMessage}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Report category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as AttachmentCategory)
              }
              className="min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-slate-500"
            >
              {attachmentCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Report name / note
            <input
              value={reportNote}
              onChange={(event) => setReportNote(event.target.value)}
              placeholder="Optional, e.g. Sugar Report, Outside OCT, Max report"
              className="min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-slate-500"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            File
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-normal"
            />
            <span className="text-xs font-normal text-slate-500">
              Allowed: PDF, JPG, JPEG, PNG. iPhone HEIC photos should be
              converted to JPG or PDF before upload.
            </span>
          </label>

          <button
            type="button"
            onClick={handleUpload}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Upload Attachment
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {attachments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No reports or attachments uploaded yet.
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                {getAttachmentDisplayName(attachment)}
              </p>

              <p className="mt-1 text-xs leading-snug text-slate-500">
                Uploaded: {formatDateTime(attachment.createdAt)} ·{" "}
                {formatFileSize(attachment.fileSizeBytes)}
              </p>

              <p
                className="mt-1 truncate text-xs leading-snug text-slate-500"
                title={attachment.fileName}
              >
                {attachment.fileName}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleView(attachment)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(attachment)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibld text-slate-700 hover:bg-slate-50"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(attachment)}
                  className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
