import {
  DoctorConsultation,
  MedicineRow,
  SpectacleAdvice,
} from "../types/queue";
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
  optometrist_spectacle_baseline_json: unknown;
  status: DoctorConsultationStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConsultationMedicineRow = {
  id: string;
  consultation_id: string;
  visit_id: string;
  patient_id: string;
  medicine_id: string | null;
  medicine_name_snapshot: string;
  eye: MedicineRow["eye"] | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  sort_order: number;
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

function mapMedicinesFromDatabase(
  medicineRows: ConsultationMedicineRow[]
): MedicineRow[] {
  return medicineRows
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      medicineName: row.medicine_name_snapshot || "",
      eye: row.eye || "Both Eyes",
      frequency: row.frequency || "",
      duration: row.duration || "",
      instructions: row.instructions || "",
    }));
}

function mapDoctorConsultationFromDatabase(input: {
  consultation: DoctorConsultationRow;
  medicines: ConsultationMedicineRow[];
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
    medicines: mapMedicinesFromDatabase(input.medicines),
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
    optometristSpectacleBaseline:
      input.consultation.optometrist_spectacle_baseline_json &&
      typeof input.consultation.optometrist_spectacle_baseline_json === "object" &&
      !Array.isArray(input.consultation.optometrist_spectacle_baseline_json)
        ? normalizeSpectacleAdvice(
            input.consultation
              .optometrist_spectacle_baseline_json as Partial<SpectacleAdvice>
          )
        : undefined,
    updatedAt: input.consultation.updated_at,
  };
}

export async function completeDoctorConsultationInSupabase(input: {
  visitId: string;
  patientId: string;
  consultation: DoctorConsultation;
}): Promise<DoctorConsultation> {
  const saved = await saveDoctorConsultationDraftToSupabase(input);
  const now = new Date().toISOString();

  const { error: consultationError } = await supabase
    .from("doctor_consultations")
    .update({
      status: "Completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("visit_id", input.visitId);

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  const { error: visitError } = await supabase
    .from("visits")
    .update({
      status: "Completed",
      updated_at: now,
    })
    .eq("id", input.visitId);

  if (visitError) {
    throw new Error(visitError.message);
  }

  return {
    ...saved,
    updatedAt: now,
  };
}

export async function reopenDoctorConsultationInSupabase(input: {
  visitId: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const { error: consultationError } = await supabase
    .from("doctor_consultations")
    .update({
      status: "Draft",
      completed_at: null,
      started_at: now,
      updated_at: now,
    })
    .eq("visit_id", input.visitId);

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  const { error: visitError } = await supabase
    .from("visits")
    .update({
      status: "Under Consultation",
      clinical_started_at: now,
      updated_at: now,
    })
    .eq("id", input.visitId);

  if (visitError) {
    throw new Error(visitError.message);
  }
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
        optometrist_spectacle_baseline_json:
          input.consultation.optometristSpectacleBaseline || null,
        status: "Draft",
        started_at: now,
        updated_at: now,
      },
      {
        onConflict: "visit_id",
      }
    )
    .select(
      "id, visit_id, patient_id, findings, diagnosis, advice, notes, follow_up_date, free_follow_up_valid_until, optometrist_spectacle_baseline_json, status, started_at, completed_at, created_at, updated_at"
    )
    .single<DoctorConsultationRow>();

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  const { error: deleteMedicinesError } = await supabase
    .from("consultation_medicines")
    .delete()
    .eq("visit_id", input.visitId);

  if (deleteMedicinesError) {
    throw new Error(deleteMedicinesError.message);
  }

  const medicineRows = input.consultation.medicines
    .map((medicine, index) => ({
      consultation_id: consultationRow.id,
      visit_id: input.visitId,
      patient_id: input.patientId,
      medicine_name_snapshot: medicine.medicineName.trim(),
      eye: medicine.eye || null,
      frequency: blankToNull(medicine.frequency),
      duration: blankToNull(medicine.duration),
      instructions: blankToNull(medicine.instructions),
      sort_order: index + 1,
      updated_at: now,
    }))
    .filter((medicine) => medicine.medicine_name_snapshot);

  if (medicineRows.length > 0) {
    const { error: insertMedicinesError } = await supabase
      .from("consultation_medicines")
      .insert(medicineRows);

    if (insertMedicinesError) {
      throw new Error(insertMedicinesError.message);
    }
  }

  const finalSpectacleAdvice = normalizeSpectacleAdvice(
    input.consultation.finalSpectacleAdvice
  );

  /*
   * Always persist the complete final spectacle state, even when every
   * value has been cleared. This ensures an earlier saved prescription
   * is overwritten instead of silently returning after Save Draft.
   */
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
      "id, visit_id, patient_id, findings, diagnosis, advice, notes, follow_up_date, free_follow_up_valid_until, optometrist_spectacle_baseline_json, status, started_at, completed_at, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .maybeSingle<DoctorConsultationRow>();

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  if (!consultationRow) {
    return null;
  }

  const { data: medicineRows, error: medicinesError } = await supabase
    .from("consultation_medicines")
    .select(
      "id, consultation_id, visit_id, patient_id, medicine_id, medicine_name_snapshot, eye, frequency, duration, instructions, sort_order, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .order("sort_order", { ascending: true });

  if (medicinesError) {
    throw new Error(medicinesError.message);
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
    medicines: medicineRows || [],
    spectaclePrescription: spectacleRow,
  });
}
