import { SpectacleAdvice } from "../types/queue";
import { supabase } from "./supabaseClient";

export type PatientHistoryMedicine = {
  id: string;
  medicineName: string;
  eye: string;
  frequency: string;
  duration: string;
  instructions: string;
  sortOrder: number;
};

export type PatientHistoryAdditionalService = {
  id: string;
  status: string;
  services: string[];
  netAmount: number;
  receiptNumber?: string;
  paidAt?: string;
};

export type PatientHistoryVisit = {
  visitId: string;
  visitDate: string;
  tokenNumber: number;
  visitType: string;
  status: string;
  createdAt: string;

  chiefComplaint: string;
  historyNotes: string;
  vision: {
    unaided: {
      distanceOD: string;
      distanceOS: string;
      nearOD: string;
      nearOS: string;
    };
    withGlasses: {
      distanceOD: string;
      distanceOS: string;
      nearOD: string;
      nearOS: string;
    };
    withPinHole: {
      distanceOD: string;
      distanceOS: string;
      nearOD: string;
      nearOS: string;
    };
  };
  refractionRight: string;
  refractionLeft: string;
  iopRight: string;
  iopLeft: string;
  dilationStatus: string;
  dilationNotes: string;

  findings: string;
  diagnosis: string;
  advice: string;
  followUpDate: string;
  freeFollowUpValidUntil: string;

  medicines: PatientHistoryMedicine[];
  spectacleAdvice: SpectacleAdvice | null;
  additionalServices: PatientHistoryAdditionalService[];
};

type VisitRow = {
  id: string;
  visit_date: string;
  token_number: number;
  visit_type: string;
  status: string;
  created_at: string;
};

type WorkupRow = {
  visit_id: string;
  chief_complaint: string | null;
  history_notes: string | null;
  vision_json: unknown;
  refraction_json: unknown;
  iop_od: number | string | null;
  iop_os: number | string | null;
  dilation_status: string | null;
  dilation_notes: string | null;
};

type ConsultationRow = {
  id: string;
  visit_id: string;
  findings: string | null;
  diagnosis: string | null;
  advice: string | null;
  follow_up_date: string | null;
  free_follow_up_valid_until: string | null;
};

type MedicineRow = {
  id: string;
  visit_id: string;
  medicine_name_snapshot: string | null;
  eye: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  sort_order: number;
};

type SpectacleRow = {
  visit_id: string;
  spectacle_json: unknown;
  remarks: string | null;
};

type PaymentRow = {
  id: string;
  visit_id: string;
  receipt_number: string | null;
  paid_at: string | null;
};

type AdditionalRequestRow = {
  id: string;
  visit_id: string;
  status: string;
  net_amount: number | string;
  linked_payment_id: string | null;
  paid_at: string | null;
};

type AdditionalRequestItemRow = {
  request_id: string;
  service_name_snapshot: string;
  sort_order: number;
};

function valueToString(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

const emptyVision = {
  unaided: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
  withGlasses: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
  withPinHole: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
};

function normalizeVisionJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyVision;
  }

  const vision = value as Partial<typeof emptyVision>;

  return {
    unaided: {
      ...emptyVision.unaided,
      ...vision.unaided,
    },
    withGlasses: {
      ...emptyVision.withGlasses,
      ...vision.withGlasses,
    },
    withPinHole: {
      ...emptyVision.withPinHole,
      ...vision.withPinHole,
    },
  };
}

function normalizeRefractionJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { right: "", left: "" };
  }

  const refraction = value as { right?: string; left?: string };

  return {
    right: refraction.right || "",
    left: refraction.left || "",
  };
}

function groupByVisit<T extends { visit_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((grouped, row) => {
    grouped[row.visit_id] = grouped[row.visit_id] || [];
    grouped[row.visit_id].push(row);
    return grouped;
  }, {});
}

function normalizeSpectacleAdvice(
  row: SpectacleRow | undefined
): SpectacleAdvice | null {
  if (
    !row?.spectacle_json ||
    typeof row.spectacle_json !== "object" ||
    Array.isArray(row.spectacle_json)
  ) {
    return null;
  }

  const advice = row.spectacle_json as Partial<SpectacleAdvice>;

  return {
    od: {
      sph: advice.od?.sph || "",
      cyl: advice.od?.cyl || "",
      axis: advice.od?.axis || "",
      vision: advice.od?.vision || "",
    },
    os: {
      sph: advice.os?.sph || "",
      cyl: advice.os?.cyl || "",
      axis: advice.os?.axis || "",
      vision: advice.os?.vision || "",
    },
    add: {
      sph: advice.add?.sph || "",
      cyl: advice.add?.cyl || "",
      axis: advice.add?.axis || "",
      vision: advice.add?.vision || "",
    },
    remarks: advice.remarks || row.remarks || "",
  };
}

export async function fetchPatientHistoryFromSupabase(
  patientId: string
): Promise<PatientHistoryVisit[]> {
  const { data: visits, error: visitsError } = await supabase
    .from("visits")
    .select("id, visit_date, token_number, visit_type, status, created_at")
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (visitsError) {
    throw new Error(visitsError.message);
  }

  const visitRows = (visits || []) as VisitRow[];
  const visitIds = visitRows.map((visit) => visit.id);

  if (visitIds.length === 0) {
    return [];
  }

  const [
    workupsResult,
    consultationsResult,
    medicinesResult,
    spectaclesResult,
    paymentsResult,
    requestsResult,
  ] = await Promise.all([
    supabase
      .from("optometrist_workups")
      .select(
        "visit_id, chief_complaint, history_notes, vision_json, refraction_json, iop_od, iop_os, dilation_status, dilation_notes"
      )
      .in("visit_id", visitIds),
    supabase
      .from("doctor_consultations")
      .select(
        "id, visit_id, findings, diagnosis, advice, follow_up_date, free_follow_up_valid_until"
      )
      .in("visit_id", visitIds),
    supabase
      .from("consultation_medicines")
      .select(
        "id, visit_id, medicine_name_snapshot, eye, frequency, duration, instructions, sort_order"
      )
      .in("visit_id", visitIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("spectacle_prescriptions")
      .select("visit_id, spectacle_json, remarks")
      .in("visit_id", visitIds),
    supabase
      .from("payments")
      .select("id, visit_id, receipt_number, paid_at")
      .in("visit_id", visitIds),
    supabase
      .from("additional_service_requests")
      .select("id, visit_id, status, net_amount, linked_payment_id, paid_at")
      .in("visit_id", visitIds)
      .neq("status", "Cancelled"),
  ]);

  const results = [
    workupsResult,
    consultationsResult,
    medicinesResult,
    spectaclesResult,
    paymentsResult,
    requestsResult,
  ];

  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const requestRows = (requestsResult.data || []) as AdditionalRequestRow[];
  const requestIds = requestRows.map((request) => request.id);

  let requestItemRows: AdditionalRequestItemRow[] = [];

  if (requestIds.length > 0) {
    const { data, error } = await supabase
      .from("additional_service_request_items")
      .select("request_id, service_name_snapshot, sort_order")
      .in("request_id", requestIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    requestItemRows = (data || []) as AdditionalRequestItemRow[];
  }

  const workupsByVisit = groupByVisit((workupsResult.data || []) as WorkupRow[]);
  const consultationsByVisit = groupByVisit(
    (consultationsResult.data || []) as ConsultationRow[]
  );
  const medicinesByVisit = groupByVisit(
    (medicinesResult.data || []) as MedicineRow[]
  );
  const spectaclesByVisit = groupByVisit(
    (spectaclesResult.data || []) as SpectacleRow[]
  );
  const paymentsById = ((paymentsResult.data || []) as PaymentRow[]).reduce<
    Record<string, PaymentRow>
  >((grouped, payment) => {
    grouped[payment.id] = payment;
    return grouped;
  }, {});
  const requestsByVisit = groupByVisit(requestRows);
  const requestItemsByRequest = requestItemRows.reduce<
    Record<string, AdditionalRequestItemRow[]>
  >((grouped, item) => {
    grouped[item.request_id] = grouped[item.request_id] || [];
    grouped[item.request_id].push(item);
    return grouped;
  }, {});

  return visitRows.map((visit) => {
    const workup = workupsByVisit[visit.id]?.[0];
    const consultation = consultationsByVisit[visit.id]?.[0];
    const spectacle = spectaclesByVisit[visit.id]?.[0];
    const refraction = normalizeRefractionJson(workup?.refraction_json);

    return {
      visitId: visit.id,
      visitDate: visit.visit_date,
      tokenNumber: visit.token_number,
      visitType: visit.visit_type,
      status: visit.status,
      createdAt: visit.created_at,

      chiefComplaint: workup?.chief_complaint || "",
      historyNotes: workup?.history_notes || "",
      vision: normalizeVisionJson(workup?.vision_json),
      refractionRight: refraction.right,
      refractionLeft: refraction.left,
      iopRight: valueToString(workup?.iop_od),
      iopLeft: valueToString(workup?.iop_os),
      dilationStatus: workup?.dilation_status || "",
      dilationNotes: workup?.dilation_notes || "",

      findings: consultation?.findings || "",
      diagnosis: consultation?.diagnosis || "",
      advice: consultation?.advice || "",
      followUpDate: consultation?.follow_up_date || "",
      freeFollowUpValidUntil: consultation?.free_follow_up_valid_until || "",

      medicines: (medicinesByVisit[visit.id] || []).map((medicine) => ({
        id: medicine.id,
        medicineName: medicine.medicine_name_snapshot || "",
        eye: medicine.eye || "",
        frequency: medicine.frequency || "",
        duration: medicine.duration || "",
        instructions: medicine.instructions || "",
        sortOrder: medicine.sort_order,
      })),

      spectacleAdvice: normalizeSpectacleAdvice(spectacle),

      additionalServices: (requestsByVisit[visit.id] || []).map((request) => {
        const linkedPayment = request.linked_payment_id
          ? paymentsById[request.linked_payment_id]
          : undefined;

        return {
          id: request.id,
          status: request.status,
          services: (requestItemsByRequest[request.id] || []).map(
            (item) => item.service_name_snapshot
          ),
          netAmount: Number(request.net_amount || 0),
          receiptNumber: linkedPayment?.receipt_number || undefined,
          paidAt: request.paid_at || linkedPayment?.paid_at || undefined,
        };
      }),
    };
  });
}
