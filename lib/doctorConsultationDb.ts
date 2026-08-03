import { DoctorConsultation, SpectacleAdvice } from "../types/queue";
import { supabase } from "./supabaseClient";

type DoctorConsultationStatus = "Draft" | "Completed" | "Cancelled";

type DoctorConsultationRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  findings: string | null;
  diagnosis: string | null;
  advice: string | null;
  notes: string | null;
  follow_up_date: string | null;
  free_follow_up_valid_until: string | null;
  status: DoctorConsultationStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SpectaclePrescriptionRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  consultation_id: string | null;
  spectacle_json: unknown;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

const emptySpectacleAdvice: SpectacleAdvice = {
  od: { sph: "", cyl: "", axis: "", vision: "" },
  os: { sph: "", cyl: "", axis: "", vision: "" },
  add: { sph: "", cyl: "", axis: "", vision: "" },
  remarks: "",
};

function blankToNull(value?: string) {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
}

function hasSpectacleAdviceValues(advice: SpectacleAdvice) {
  const rows = [advice.od, advice.os, advice.add];

  return (
    rows.some((row) =>
      Object.values(row || {}).some((value) => String(value || "").trim())
    ) || Boolean(advice.remarks?.trim())
  );
}

function normalizeSpectacleAdvice(
  savedAdvice?: Partial<SpectacleAdvice> | null
): SpectacleAdvice {
  return {
    od: {
      ...emptySpectacleAdvice.od,
      ...savedAdvice?.od,
    },
    os: {
      ...emptySpectacleAdvice.os,
      ...savedAdvice?.os,
    },
    add: {
      ...emptySpectacleAdvice.add,
      ...savedAdvice?.add,
    },
    remarks: savedAdvice?.remarks || "",
  };
}

function mapDoctorConsultationFromDatabase(input: {
  consultation: DoctorConsultationRow;
  spectaclePrescription?: SpectaclePrescriptionRow | null;
}): DoctorConsultation {
  const spectacleJson =
    input.spectaclePrescription?.spectacle_json &&
    typeof input.spectaclePrescription.spectacle_json === "object" &&
    !Array.isArray(input.spectaclePrescription.spectacle_json)
      ? (input.spectaclePrescription.spectacle_json as SpectacleAdvice)
      : undefined;

  return {
    findings: input.consultation.findings || "",
    diagnosis: input.consultation.diagnosis || "",
    medicines: [],
    advice: input.consultation.advice || "",
    followUpDate: input.consultation.follow_up_date || "",
    freeFollowUpValidUntil:
      input.consultation.free_follow_up_valid_until || "",
    notes: input.consultation.notes || "",
    finalSpectacleAdvice: normalizeSpectacleAdvice(
      spectacleJson || {
        ...emptySpectacleAdvice,
        remarks: input.spectaclePrescription?.remarks || "",
      }
    ),
    updatedAt: input.consultation.updated_at,
  };
}

export async function saveDoctorConsultationDraftToSupabase(input: {
  visitId: string;
  patientId: string;
  consultation: DoctorConsultation;
}): Promise<DoctorConsultation> {
  if (
    input.consultation.followUpDate &&
    input.consultation.freeFollowUpValidUntil
  ) {
    throw new Error(
      "Follow-Up Date and Free Follow-Up Valid Until cannot both be selected."
    );
  }

  const now = new Date().toISOString();

  const { data: consultationRow, error: consultationError } = await supabase
    .from("doctor_consultations")
    .upsert(
      {
        visit_id: input.visitId,
        patient_id: input.patientId,
        findings: blankToNull(input.consultation.findings),
        diagnosis: blankToNull(input.consultation.diagnosis),
        advice: blankToNull(input.consultation.advice),
        notes: blankToNull(input.consultation.notes),
        follow_up_date: input.consultation.followUpDate || null,
        free_follow_up_valid_until:
          input.consultation.freeFollowUpValidUntil || null,
        status: "Draft",
        started_at: now,
        updated_at: now,
      },
      {
        onConflict: "visit_id",
      }
    )
    .select(
      "id, visit_id, patient_id, findings, diagnosis, advice, notes, follow_up_date, free_follow_up_valid_until, status, started_at, completed_at, created_at, updated_at"
    )
    .single<DoctorConsultationRow>();

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  const finalSpectacleAdvice = input.consultation.finalSpectacleAdvice;

  if (hasSpectacleAdviceValues(finalSpectacleAdvice)) {
    const { error: spectacleError } = await supabase
      .from("spectacle_prescriptions")
      .upsert(
        {
          visit_id: input.visitId,
          patient_id: input.patientId,
          consultation_id: consultationRow.id,
          spectacle_json: finalSpectacleAdvice,
          remarks: blankToNull(finalSpectacleAdvice.remarks),
          updated_at: now,
        },
        {
          onConflict: "visit_id",
        }
      );

    if (spectacleError) {
      throw new Error(spectacleError.message);
    }
  }

  const saved = await fetchDoctorConsultationFromSupabase(input.visitId);

  if (!saved) {
    throw new Error("Doctor consultation was saved but could not be reloaded.");
  }

  return saved;
}

export async function fetchDoctorConsultationFromSupabase(
  visitId: string
): Promise<DoctorConsultation | null> {
  const { data: consultationRow, error: consultationError } = await supabase
    .from("doctor_consultations")
    .select(
      "id, visit_id, patient_id, findings, diagnosis, advice, notes, follow_up_date, free_follow_up_valid_until, status, started_at, completed_at, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .maybeSingle<DoctorConsultationRow>();

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  if (!consultationRow) {
    return null;
  }

  const { data: spectacleRow, error: spectacleError } = await supabase
    .from("spectacle_prescriptions")
    .select(
      "id, visit_id, patient_id, consultation_id, spectacle_json, remarks, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .maybeSingle<SpectaclePrescriptionRow>();

  if (spectacleError) {
    throw new Error(spectacleError.message);
  }

  return mapDoctorConsultationFromDatabase({
    consultation: consultationRow,
    spectaclePrescription: spectacleRow,
  });
}
