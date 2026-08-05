import { supabase } from "./supabaseClient";

export type AttachmentCategory =
  | "OCT"
  | "Fundus Photo"
  | "Perimetry"
  | "IOP Report"
  | "External Report"
  | "Prescription"
  | "Spectacle Prescription"
  | "Other";

export type PatientAttachment = {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  storageBucket: string;
  storagePath: string;
  attachmentCategory: AttachmentCategory;
  notes: string;
  createdAt: string;
  publicUrl: string;
};

type AttachmentRow = {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  attachment_category: AttachmentCategory;
  notes: string | null;
  created_at: string;
};

const ATTACHMENT_BUCKET = "patient-attachments";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function mapAttachment(row: AttachmentRow): PatientAttachment {
  const { data } = supabase.storage
    .from(row.storage_bucket)
    .getPublicUrl(row.storage_path);

  return {
    id: row.id,
    patientId: row.patient_id,
    fileName: row.file_name,
    fileType: row.file_type || "",
    fileSizeBytes: row.file_size_bytes || 0,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    attachmentCategory: row.attachment_category,
    notes: row.notes || "",
    createdAt: row.created_at,
    publicUrl: data.publicUrl,
  };
}

export async function fetchPatientAttachmentsFromSupabase(
  patientId: string
): Promise<PatientAttachment[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select(
      "id, patient_id, file_name, file_type, file_size_bytes, storage_bucket, storage_path, attachment_category, notes, created_at"
    )
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AttachmentRow[]).map(mapAttachment);
}

export async function uploadPatientAttachmentToSupabase(input: {
  patientId: string;
  file: File;
  attachmentCategory: AttachmentCategory;
  notes: string;
}): Promise<PatientAttachment> {
  if (!allowedMimeTypes.has(input.file.type)) {
    throw new Error("Only PDF, JPG, JPEG, and PNG files are allowed. HEIC/iPhone photo format is not supported; please convert to JPG or PDF before uploading.");
  }

  const safeFileName = sanitizeFileName(input.file.name);
  const storagePath = `${input.patientId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error: insertError } = await supabase
    .from("attachments")
    .insert({
      patient_id: input.patientId,
      visit_id: null,
      file_name: input.file.name,
      file_type: input.file.type,
      file_size_bytes: input.file.size,
      storage_bucket: ATTACHMENT_BUCKET,
      storage_path: storagePath,
      attachment_category: input.attachmentCategory,
      notes: input.notes.trim() || null,
    })
    .select(
      "id, patient_id, file_name, file_type, file_size_bytes, storage_bucket, storage_path, attachment_category, notes, created_at"
    )
    .single<AttachmentRow>();

  if (insertError) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  return mapAttachment(data);
}

export async function deletePatientAttachmentFromSupabase(
  attachment: PatientAttachment
): Promise<void> {
  const now = new Date().toISOString();

  const { error: metadataError } = await supabase
    .from("attachments")
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", attachment.id);

  if (metadataError) {
    throw new Error(metadataError.message);
  }

  const { error: storageError } = await supabase.storage
    .from(attachment.storageBucket)
    .remove([attachment.storagePath]);

  if (storageError) {
    throw new Error(storageError.message);
  }
}
