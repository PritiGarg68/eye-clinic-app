import {
  DoctorConsultation,
  MedicineRow,
  OptometristWorkup,
  QueueItem,
  SpectacleAdvice,
} from "../types/queue";
import { Patient } from "../types/patients";
import { supabase } from "./supabaseClient";

export type PatientRecordPaymentItem = {
  id: string;
  itemName: string;
  quantity: number;
  unitAmount: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  sortOrder: number;
};

export type PatientRecordPayment = {
  id: string;
  visitId: string;
  paymentType: "Consultation" | "Additional Service" | string;
  paymentStatus: string;
  receiptNumber: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMode: string;
  paidAt: string;
  notes: string;
  items: PatientRecordPaymentItem[];
};

export type PatientRecordVisit = {
  visitId: string;
  visitDate: string;
  tokenNumber: number;
  visitType: string;
  status: string;
  createdAt: string;
  payments: PatientRecordPayment[];
  queueItem: QueueItem;
  hasPrescription: boolean;
  hasSpectacleAdvice: boolean;
};

type VisitRow = {
  id: string;
  visit_date: string;
  token_number: number;
  visit_type: string;
  status: string;
  created_at: string;
};

type PaymentRow = {
  id: string;
  visit_id: string;
  payment_type: string;
  payment_status: string;
  receipt_number: string | null;
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  payment_mode: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

type PaymentItemRow = {
  id: string;
  payment_id: string;
  item_name: string;
  quantity: number | string;
  unit_amount: number | string;
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  sort_order: number;
};

type WorkupRow = {
  visit_id: string;
  chief_complaint: string | null;
  history_notes: string | null;
  vision_json: unknown;
  refraction_json: unknown;
  spectacle_draft_json: unknown;
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
  notes: string | null;
  updated_at: string | null;
};

type MedicineDbRow = {
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

const emptySpectacleAdvice: SpectacleAdvice = {
  od: { sph: "", cyl: "", axis: "", vision: "" },
  os: { sph: "", cyl: "", axis: "", vision: "" },
  add: { sph: "", cyl: "", axis: "", vision: "" },
  remarks: "",
};

const emptyWorkup: OptometristWorkup = {
  chiefComplaint: "",
  vision: {
    unaided: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
    withGlasses: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
    withPinHole: { distanceOD: "", distanceOS: "", nearOD: "", nearOS: "" },
  },
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  optometristNotes: "",
  spectacleDraft: emptySpectacleAdvice,
};

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

function textValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalizeVisionJson(value: unknown): OptometristWorkup["vision"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyWorkup.vision;
  }

  const vision = value as Partial<OptometristWorkup["vision"]>;

  return {
    unaided: {
      ...emptyWorkup.vision.unaided,
      ...vision.unaided,
    },
    withGlasses: {
      ...emptyWorkup.vision.withGlasses,
      ...vision.withGlasses,
    },
    withPinHole: {
      ...emptyWorkup.vision.withPinHole,
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

function normalizeSpectacleDraftJson(value: unknown): SpectacleAdvice {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySpectacleAdvice;
  }

  const advice = value as Partial<SpectacleAdvice>;

  return {
    od: {
      ...emptySpectacleAdvice.od,
      ...advice.od,
    },
    os: {
      ...emptySpectacleAdvice.os,
      ...advice.os,
    },
    add: {
      ...emptySpectacleAdvice.add,
      ...advice.add,
    },
    remarks: advice.remarks || "",
  };
}

function groupByVisit<T extends { visit_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((grouped, row) => {
    grouped[row.visit_id] = grouped[row.visit_id] || [];
    grouped[row.visit_id].push(row);
    return grouped;
  }, {});
}

function normalizeDilationStatus(
  status: string | null | undefined
): OptometristWorkup["dilationStatus"] {
  if (status === "Dilated Waiting" || status === "Waiting") {
    return "Waiting";
  }

  if (status === "Dilated Done" || status === "Done") {
    return "Done";
  }

  return "Not Done";
}

function normalizeMedicineEye(eye: string | null | undefined): MedicineRow["eye"] {
  if (
    eye === "Both Eyes" ||
    eye === "Right Eye" ||
    eye === "Left Eye" ||
    eye === "Oral" ||
    eye === "Other"
  ) {
    return eye;
  }

  return "Both Eyes";
}

function normalizeSpectacleAdvice(
  row: SpectacleRow | undefined
): SpectacleAdvice {
  if (
    !row?.spectacle_json ||
    typeof row.spectacle_json !== "object" ||
    Array.isArray(row.spectacle_json)
  ) {
    return emptySpectacleAdvice;
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

function hasSpectacleValues(advice: SpectacleAdvice) {
  return Boolean(
    advice.remarks.trim() ||
      Object.values(advice.od).some(Boolean) ||
      Object.values(advice.os).some(Boolean) ||
      Object.values(advice.add).some(Boolean)
  );
}

export async function fetchPatientRecordsFromSupabase(
  patientId: string
): Promise<PatientRecordVisit[]> {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, uhid, full_name, mobile, age_years, gender")
    .eq("id", patientId)
    .single();

  if (patientError) {
    throw new Error(patientError.message);
  }

  const patientRow = patient as {
    id: string;
    uhid: string;
    full_name: string;
    mobile: string;
    age_years: number;
    gender: Patient["gender"];
  };

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
    paymentsResult,
    workupsResult,
    consultationsResult,
    medicinesResult,
    spectaclesResult,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, visit_id, payment_type, payment_status, receipt_number, gross_amount, discount_amount, net_amount, payment_mode, paid_at, notes, created_at"
      )
      .in("visit_id", visitIds)
      .eq("payment_status", "Paid")
      .order("paid_at", { ascending: true }),
    supabase
      .from("optometrist_workups")
      .select(
        "visit_id, chief_complaint, history_notes, vision_json, refraction_json, spectacle_draft_json, iop_od, iop_os, dilation_status, dilation_notes"
      )
      .in("visit_id", visitIds),
    supabase
      .from("doctor_consultations")
      .select(
        "id, visit_id, findings, diagnosis, advice, follow_up_date, free_follow_up_valid_until, notes, updated_at"
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
  ]);

  const firstError = [
    paymentsResult,
    workupsResult,
    consultationsResult,
    medicinesResult,
    spectaclesResult,
  ].find((result) => result.error)?.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const paymentRows = (paymentsResult.data || []) as PaymentRow[];
  const paymentIds = paymentRows.map((payment) => payment.id);

  let paymentItemRows: PaymentItemRow[] = [];

  if (paymentIds.length > 0) {
    const { data: paymentItems, error: paymentItemsError } = await supabase
      .from("payment_items")
      .select(
        "id, payment_id, item_name, quantity, unit_amount, gross_amount, discount_amount, net_amount, sort_order"
      )
      .in("payment_id", paymentIds)
      .order("sort_order", { ascending: true });

    if (paymentItemsError) {
      throw new Error(paymentItemsError.message);
    }

    paymentItemRows = (paymentItems || []) as PaymentItemRow[];
  }

  const itemsByPayment = paymentItemRows.reduce<Record<string, PaymentItemRow[]>>(
    (grouped, item) => {
      grouped[item.payment_id] = grouped[item.payment_id] || [];
      grouped[item.payment_id].push(item);
      return grouped;
    },
    {}
  );

  const paymentsByVisit = paymentRows.reduce<Record<string, PatientRecordPayment[]>>(
    (grouped, payment) => {
      grouped[payment.visit_id] = grouped[payment.visit_id] || [];
      grouped[payment.visit_id].push({
        id: payment.id,
        visitId: payment.visit_id,
        paymentType: payment.payment_type,
        paymentStatus: payment.payment_status,
        receiptNumber: payment.receipt_number || "",
        grossAmount: numberValue(payment.gross_amount),
        discountAmount: numberValue(payment.discount_amount),
        netAmount: numberValue(payment.net_amount),
        paymentMode: payment.payment_mode || "None",
        paidAt: payment.paid_at || payment.created_at,
        notes: payment.notes || "",
        items: (itemsByPayment[payment.id] || []).map((item) => ({
          id: item.id,
          itemName: item.item_name,
          quantity: numberValue(item.quantity),
          unitAmount: numberValue(item.unit_amount),
          grossAmount: numberValue(item.gross_amount),
          discountAmount: numberValue(item.discount_amount),
          netAmount: numberValue(item.net_amount),
          sortOrder: item.sort_order,
        })),
      });
      return grouped;
    },
    {}
  );

  const workupsByVisit = groupByVisit((workupsResult.data || []) as WorkupRow[]);
  const consultationsByVisit = groupByVisit(
    (consultationsResult.data || []) as ConsultationRow[]
  );
  const medicinesByVisit = groupByVisit(
    (medicinesResult.data || []) as MedicineDbRow[]
  );
  const spectaclesByVisit = groupByVisit(
    (spectaclesResult.data || []) as SpectacleRow[]
  );

  return visitRows.map((visit) => {
    const workupRow = workupsByVisit[visit.id]?.[0];
    const consultationRow = consultationsByVisit[visit.id]?.[0];
    const spectacleAdvice = normalizeSpectacleAdvice(
      spectaclesByVisit[visit.id]?.[0]
    );

    const refraction = normalizeRefractionJson(workupRow?.refraction_json);

    const workup: OptometristWorkup = {
      ...emptyWorkup,
      chiefComplaint: workupRow?.chief_complaint || "",
      vision: normalizeVisionJson(workupRow?.vision_json),
      refractionRight: refraction.right,
      refractionLeft: refraction.left,
      iopRight: textValue(workupRow?.iop_od),
      iopLeft: textValue(workupRow?.iop_os),
      dilationStatus: normalizeDilationStatus(workupRow?.dilation_status),
      dilationNotes: workupRow?.dilation_notes || "",
      optometristNotes: workupRow?.history_notes || "",
      spectacleDraft: normalizeSpectacleDraftJson(workupRow?.spectacle_draft_json),
    };

    const medicines: MedicineRow[] = (medicinesByVisit[visit.id] || []).map(
      (medicine) => ({
        id: medicine.id,
        medicineName: medicine.medicine_name_snapshot || "",
        eye: normalizeMedicineEye(medicine.eye),
        frequency: medicine.frequency || "",
        duration: medicine.duration || "",
        instructions: medicine.instructions || "",
      })
    );

    const consultation: DoctorConsultation = {
      findings: consultationRow?.findings || "",
      diagnosis: consultationRow?.diagnosis || "",
      medicines,
      advice: consultationRow?.advice || "",
      followUpDate: consultationRow?.follow_up_date || "",
      freeFollowUpValidUntil:
        consultationRow?.free_follow_up_valid_until || "",
      notes: consultationRow?.notes || "",
      finalSpectacleAdvice: spectacleAdvice,
      updatedAt: consultationRow?.updated_at || undefined,
    };

    const payments = paymentsByVisit[visit.id] || [];

    const queueItem: QueueItem = {
      id: visit.id,
      patientId,
      tokenNumber: visit.token_number,
      patientName: patientRow.full_name,
      age: patientRow.age_years,
      gender: patientRow.gender,
      uhid: patientRow.uhid,
      mobile: patientRow.mobile,
      visitType:
        visit.visit_type === "Free Follow-Up"
          ? "Free Follow-Up"
          : visit.visit_type === "Follow-Up"
            ? "Returning Patient"
            : "New Patient Visit",
      paymentMode: "None",
      amountPaid: payments[0]?.netAmount || 0,
      consultationReceiptNumber: payments.find(
        (payment) => payment.paymentType === "Consultation"
      )?.receiptNumber,
      status: "Completed",
      optometristWorkup: workup,
      doctorConsultation: consultation,
    };

    const hasPrescription = Boolean(
      consultationRow &&
        (workup.chiefComplaint ||
          workup.optometristNotes ||
          consultation.findings ||
          consultation.diagnosis ||
          consultation.advice ||
          consultation.followUpDate ||
          consultation.freeFollowUpValidUntil ||
          consultation.medicines.length > 0)
    );

    return {
      visitId: visit.id,
      visitDate: visit.visit_date,
      tokenNumber: visit.token_number,
      visitType: visit.visit_type,
      status: visit.status,
      createdAt: visit.created_at,
      payments,
      queueItem,
      hasPrescription,
      hasSpectacleAdvice: hasSpectacleValues(spectacleAdvice),
    };
  });
}
