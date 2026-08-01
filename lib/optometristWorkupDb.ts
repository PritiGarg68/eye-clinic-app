import { OptometristWorkup } from "../types/queue";
import { supabase } from "./supabaseClient";

type DatabaseDilationStatus =
  | "Not Dilated"
  | "Dilated Waiting"
  | "Dilated Done";

type OptometristWorkupRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  chief_complaint: string | null;
  history_notes: string | null;
  vision_json: unknown;
  refraction_json: unknown;
  spectacle_draft_json: unknown;
  iop_od: number | string | null;
  iop_os: number | string | null;
  dilation_status: DatabaseDilationStatus;
  dilation_notes: string | null;
  created_at: string;
  updated_at: string;
};

function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalIop(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error("IOP must be a number between 0 and 100.");
  }

  return parsed;
}

function mapDilationStatusToDatabase(
  status: OptometristWorkup["dilationStatus"]
): DatabaseDilationStatus {
  if (status === "Waiting") {
    return "Dilated Waiting";
  }

  if (status === "Done") {
    return "Dilated Done";
  }

  return "Not Dilated";
}

function mapDilationStatusFromDatabase(
  status: DatabaseDilationStatus
): OptometristWorkup["dilationStatus"] {
  if (status === "Dilated Waiting") {
    return "Waiting";
  }

  if (status === "Dilated Done") {
    return "Done";
  }

  return "Not Done";
}

function stringifyNumber(value: number | string | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export async function saveOptometristWorkupToSupabase(input: {
  visitId: string;
  patientId: string;
  workup: OptometristWorkup;
}) {
  const iopOd = parseOptionalIop(input.workup.iopRight);
  const iopOs = parseOptionalIop(input.workup.iopLeft);

  const { error } = await supabase.from("optometrist_workups").upsert(
    {
      visit_id: input.visitId,
      patient_id: input.patientId,
      chief_complaint: blankToNull(input.workup.chiefComplaint),
      history_notes: blankToNull(input.workup.optometristNotes),
      vision_json: input.workup.vision,
      refraction_json: {
        right: input.workup.refractionRight,
        left: input.workup.refractionLeft,
      },
      spectacle_draft_json: input.workup.spectacleDraft,
      iop_od: iopOd,
      iop_os: iopOs,
      dilation_status: mapDilationStatusToDatabase(
        input.workup.dilationStatus
      ),
      dilation_notes: blankToNull(input.workup.dilationNotes),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "visit_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchOptometristWorkupFromSupabase(visitId: string) {
  const { data, error } = await supabase
    .from("optometrist_workups")
    .select(
      `
      id,
      visit_id,
      patient_id,
      chief_complaint,
      history_notes,
      vision_json,
      refraction_json,
      spectacle_draft_json,
      iop_od,
      iop_os,
      dilation_status,
      dilation_notes,
      created_at,
      updated_at
    `
    )
    .eq("visit_id", visitId)
    .maybeSingle<OptometristWorkupRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const refraction =
    data.refraction_json &&
    typeof data.refraction_json === "object" &&
    !Array.isArray(data.refraction_json)
      ? (data.refraction_json as { right?: string; left?: string })
      : {};

  return {
    chiefComplaint: data.chief_complaint || "",
    vision:
      data.vision_json &&
      typeof data.vision_json === "object" &&
      !Array.isArray(data.vision_json)
        ? (data.vision_json as OptometristWorkup["vision"])
        : undefined,
    refractionRight: refraction.right || "",
    refractionLeft: refraction.left || "",
    iopRight: stringifyNumber(data.iop_od),
    iopLeft: stringifyNumber(data.iop_os),
    dilationStatus: mapDilationStatusFromDatabase(data.dilation_status),
    dilationNotes: data.dilation_notes || "",
    optometristNotes: data.history_notes || "",
    spectacleDraft:
      data.spectacle_draft_json &&
      typeof data.spectacle_draft_json === "object" &&
      !Array.isArray(data.spectacle_draft_json)
        ? (data.spectacle_draft_json as OptometristWorkup["spectacleDraft"])
        : undefined,
    updatedAt: data.updated_at,
  };
}
