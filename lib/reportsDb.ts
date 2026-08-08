import { supabase } from "./supabaseClient";

export type ReportPaymentType =
  | "Consultation"
  | "Additional Service"
  | "Refund"
  | "Adjustment"
  | "Membership";

export type ReportPaymentMode =
  | "Cash"
  | "UPI"
  | "Card"
  | "Bank Transfer"
  | "None";

export type ReportTransaction = {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  uhid: string;
  visitDate: string;
  visitType: string;
  paymentType: ReportPaymentType;
  receiptNumber: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMode: ReportPaymentMode;
  paidAt: string;
};

export type FollowUpCallItem = {
  consultationId: string;
  patientId: string;
  patientName: string;
  uhid: string;
  mobile: string;
  followUpDate: string;
  sourceVisitId: string;
  sourceVisitDate: string;
  sourceVisitType: string;
};

type PaymentRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  payment_type: ReportPaymentType;
  gross_amount: number | string | null;
  discount_amount: number | string | null;
  net_amount: number | string | null;
  payment_mode: ReportPaymentMode;
  receipt_number: string;
  paid_at: string | null;
};

type PatientRow = {
  id: string;
  full_name: string;
  uhid: string;
  mobile?: string | null;
};

type VisitRow = {
  id: string;
  patient_id?: string;
  visit_date: string;
  visit_type: string;
};

type FollowUpConsultationRow = {
  id: string;
  patient_id: string;
  visit_id: string;
  follow_up_date: string;
};

function addOneDay(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function fetchPaidTransactionsForDateRange(input: {
  startDate: string;
  endDate: string;
}): Promise<ReportTransaction[]> {
  if (!input.startDate || !input.endDate) {
    throw new Error("Start date and end date are required.");
  }

  if (input.endDate < input.startDate) {
    throw new Error("End date cannot be before start date.");
  }

  const startTimestamp = `${input.startDate}T00:00:00+05:30`;
  const endExclusiveTimestamp = `${addOneDay(input.endDate)}T00:00:00+05:30`;

  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, visit_id, patient_id, payment_type, gross_amount, discount_amount, net_amount, payment_mode, receipt_number, paid_at"
    )
    .eq("payment_status", "Paid")
    .gte("paid_at", startTimestamp)
    .lt("paid_at", endExclusiveTimestamp)
    .order("paid_at", { ascending: false });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const payments = (paymentData ?? []) as PaymentRow[];

  if (payments.length === 0) {
    return [];
  }

  const patientIds = [...new Set(payments.map((row) => row.patient_id))];
  const visitIds = [...new Set(payments.map((row) => row.visit_id))];

  const [
    { data: patientData, error: patientError },
    { data: visitData, error: visitError },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, uhid")
      .in("id", patientIds),
    supabase
      .from("visits")
      .select("id, visit_date, visit_type")
      .in("id", visitIds),
  ]);

  if (patientError) {
    throw new Error(patientError.message);
  }

  if (visitError) {
    throw new Error(visitError.message);
  }

  const patients = new Map(
    ((patientData ?? []) as PatientRow[]).map((row) => [row.id, row])
  );

  const visits = new Map(
    ((visitData ?? []) as VisitRow[]).map((row) => [row.id, row])
  );

  return payments.map((payment) => {
    const patient = patients.get(payment.patient_id);
    const visit = visits.get(payment.visit_id);

    return {
      id: payment.id,
      visitId: payment.visit_id,
      patientId: payment.patient_id,
      patientName: patient?.full_name || "Unknown Patient",
      uhid: patient?.uhid || "",
      visitDate: visit?.visit_date || "",
      visitType: visit?.visit_type || "",
      paymentType: payment.payment_type,
      receiptNumber: payment.receipt_number,
      grossAmount: Number(payment.gross_amount) || 0,
      discountAmount: Number(payment.discount_amount) || 0,
      netAmount: Number(payment.net_amount) || 0,
      paymentMode: payment.payment_mode,
      paidAt: payment.paid_at || "",
    };
  });
}

export async function fetchPendingFollowUpsForDateRange(input: {
  startDate: string;
  endDate: string;
}): Promise<FollowUpCallItem[]> {
  if (!input.startDate || !input.endDate) {
    throw new Error("Follow-up start and end dates are required.");
  }

  if (input.endDate < input.startDate) {
    throw new Error("Follow-up end date cannot be before start date.");
  }

  const { data: consultationData, error: consultationError } = await supabase
    .from("doctor_consultations")
    .select("id, patient_id, visit_id, follow_up_date")
    .eq("status", "Completed")
    .not("follow_up_date", "is", null)
    .gte("follow_up_date", input.startDate)
    .lte("follow_up_date", input.endDate)
    .order("follow_up_date", { ascending: true });

  if (consultationError) {
    throw new Error(consultationError.message);
  }

  const consultations = (consultationData ?? []) as FollowUpConsultationRow[];

  if (consultations.length === 0) {
    return [];
  }

  const patientIds = [
    ...new Set(consultations.map((row) => row.patient_id)),
  ];
  const sourceVisitIds = [
    ...new Set(consultations.map((row) => row.visit_id)),
  ];

  const [
    { data: patientData, error: patientError },
    { data: sourceVisitData, error: sourceVisitError },
    { data: allVisitData, error: allVisitError },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, uhid, mobile")
      .in("id", patientIds),
    supabase
      .from("visits")
      .select("id, patient_id, visit_date, visit_type")
      .in("id", sourceVisitIds),
    supabase
      .from("visits")
      .select("id, patient_id, visit_date, visit_type")
      .in("patient_id", patientIds)
      .neq("status", "Cancelled")
      .order("visit_date", { ascending: false }),
  ]);

  if (patientError) {
    throw new Error(patientError.message);
  }

  if (sourceVisitError) {
    throw new Error(sourceVisitError.message);
  }

  if (allVisitError) {
    throw new Error(allVisitError.message);
  }

  const patients = new Map(
    ((patientData ?? []) as PatientRow[]).map((row) => [row.id, row])
  );

  const sourceVisits = new Map(
    ((sourceVisitData ?? []) as VisitRow[]).map((row) => [row.id, row])
  );

  const visitsByPatient = new Map<string, VisitRow[]>();

  for (const visit of (allVisitData ?? []) as VisitRow[]) {
    if (!visit.patient_id) {
      continue;
    }

    const existing = visitsByPatient.get(visit.patient_id) || [];
    existing.push(visit);
    visitsByPatient.set(visit.patient_id, existing);
  }

  return consultations
    .filter((consultation) => {
      const sourceVisit = sourceVisits.get(consultation.visit_id);

      if (!sourceVisit) {
        return false;
      }

      const laterVisitExists = (
        visitsByPatient.get(consultation.patient_id) || []
      ).some(
        (visit) =>
          visit.id !== consultation.visit_id &&
          visit.visit_date > sourceVisit.visit_date
      );

      return !laterVisitExists;
    })
    .map((consultation) => {
      const patient = patients.get(consultation.patient_id);
      const visit = sourceVisits.get(consultation.visit_id);

      return {
        consultationId: consultation.id,
        patientId: consultation.patient_id,
        patientName: patient?.full_name || "Unknown Patient",
        uhid: patient?.uhid || "",
        mobile: patient?.mobile || "",
        followUpDate: consultation.follow_up_date,
        sourceVisitId: consultation.visit_id,
        sourceVisitDate: visit?.visit_date || "",
        sourceVisitType: visit?.visit_type || "",
      };
    })
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
}
