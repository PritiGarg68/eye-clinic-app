import { supabase } from "./supabaseClient";

export type GeneratedDocumentType =
  | "Prescription"
  | "Spectacle Prescription"
  | "Consultation Receipt"
  | "Additional Service Receipt";

export type GeneratedDocument = {
  id: string;
  patientId: string;
  visitId: string;
  paymentId: string | null;
  documentType: GeneratedDocumentType;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  storageBucket: string;
  storagePath: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

type GeneratedDocumentRow = {
  id: string;
  patient_id: string;
  visit_id: string;
  payment_id: string | null;
  document_type: GeneratedDocumentType;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

const GENERATED_DOCUMENT_BUCKET = "generated-documents";

function mapGeneratedDocument(
  row: GeneratedDocumentRow
): GeneratedDocument {
  return {
    id: row.id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    paymentId: row.payment_id,
    documentType: row.document_type,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes || 0,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertGeneratedDocumentToSupabase(input: {
  patientId: string;
  visitId: string;
  paymentId?: string | null;
  documentType: GeneratedDocumentType;
  fileName: string;
  storagePath: string;
  pdfBlob: Blob;
}): Promise<GeneratedDocument> {
  if (input.pdfBlob.type !== "application/pdf") {
    throw new Error("Generated document must be a PDF.");
  }

  const { error: uploadError } = await supabase.storage
    .from(GENERATED_DOCUMENT_BUCKET)
    .upload(input.storagePath, input.pdfBlob, {
      cacheControl: "0",
      upsert: true,
      contentType: "application/pdf",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("generated_documents")
    .upsert(
      {
        patient_id: input.patientId,
        visit_id: input.visitId,
        payment_id: input.paymentId || null,
        document_type: input.documentType,
        file_name: input.fileName,
        file_type: "application/pdf",
        file_size_bytes: input.pdfBlob.size,
        storage_bucket: GENERATED_DOCUMENT_BUCKET,
        storage_path: input.storagePath,
        generated_at: now,
        updated_at: now,
      },
      {
        onConflict: "storage_bucket,storage_path",
      }
    )
    .select(
      "id, patient_id, visit_id, payment_id, document_type, file_name, file_type, file_size_bytes, storage_bucket, storage_path, generated_at, created_at, updated_at"
    )
    .single<GeneratedDocumentRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapGeneratedDocument(data);
}

export async function fetchGeneratedDocumentForVisit(
  visitId: string,
  documentType: Extract<
    GeneratedDocumentType,
    "Prescription" | "Spectacle Prescription"
  >
): Promise<GeneratedDocument | null> {
  const { data, error } = await supabase
    .from("generated_documents")
    .select(
      "id, patient_id, visit_id, payment_id, document_type, file_name, file_type, file_size_bytes, storage_bucket, storage_path, generated_at, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .eq("document_type", documentType)
    .maybeSingle<GeneratedDocumentRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapGeneratedDocument(data) : null;
}

export async function createGeneratedDocumentSignedUrl(
  document: GeneratedDocument,
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, expiresInSeconds);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}
