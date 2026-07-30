import { supabase } from "./supabaseClient";

export type VisitType =
  | "New Consultation"
  | "Follow-Up"
  | "Free Follow-Up"
  | "Procedure / Test Only";

export type PaymentMode = "Cash" | "UPI" | "Card" | "Bank Transfer" | "None";

export type ConsultationCheckInInput = {
  patientId: string;
  visitType: VisitType;
  grossAmount: number;
  discountAmount: number;
  paymentMode: PaymentMode;
  notes?: string;
};

export type ConsultationCheckInResult = {
  visitId: string;
  patientId: string;
  visitDate: string;
  tokenNumber: number;
  visitType: VisitType;
  status: "Waiting";
  paymentId: string;
  receiptNumber: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMode: PaymentMode;
  paidAt: string;
};

type CheckInRow = {
  visit_id: string;
  returned_patient_id: string;
  returned_visit_date: string;
  returned_token_number: number;
  returned_visit_type: VisitType;
  returned_status: "Waiting";
  payment_id: string;
  receipt_number: string;
  payment_gross_amount: number | string;
  payment_discount_amount: number | string;
  payment_net_amount: number | string;
  returned_payment_mode: PaymentMode;
  returned_paid_at: string;
};

export async function createConsultationCheckIn(
  input: ConsultationCheckInInput
): Promise<ConsultationCheckInResult> {
  const { data, error } = await supabase
    .rpc("create_consultation_check_in", {
      p_patient_id: input.patientId,
      p_visit_type: input.visitType,
      p_gross_amount: input.grossAmount,
      p_discount_amount: input.discountAmount,
      p_payment_mode: input.paymentMode,
      p_notes: input.notes || null,
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as CheckInRow;

  return {
    visitId: row.visit_id,
    patientId: row.returned_patient_id,
    visitDate: row.returned_visit_date,
    tokenNumber: row.returned_token_number,
    visitType: row.returned_visit_type,
    status: row.returned_status,
    paymentId: row.payment_id,
    receiptNumber: row.receipt_number,
    grossAmount: Number(row.payment_gross_amount),
    discountAmount: Number(row.payment_discount_amount),
    netAmount: Number(row.payment_net_amount),
    paymentMode: row.returned_payment_mode,
    paidAt: row.returned_paid_at,
  };
}

type ActiveCheckInVisitRow = {
  id: string;
  patient_id: string;
  visit_date: string;
  token_number: number;
  visit_type: VisitType;
  status: string;
  payments:
    | {
        id: string;
        receipt_number: string;
        gross_amount: number | string;
        discount_amount: number | string;
        net_amount: number | string;
        payment_mode: PaymentMode;
        paid_at: string;
        payment_type: string;
        payment_status: string;
      }[]
    | null;
};

export async function fetchActiveConsultationCheckInForPatientToday(
  patientId: string
): Promise<ConsultationCheckInResult | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("visits")
    .select(
      `
        id,
        patient_id,
        visit_date,
        token_number,
        visit_type,
        status,
        payments (
          id,
          receipt_number,
          gross_amount,
          discount_amount,
          net_amount,
          payment_mode,
          paid_at,
          payment_type,
          payment_status
        )
      `
    )
    .eq("patient_id", patientId)
    .eq("visit_date", today)
    .neq("status", "Completed")
    .neq("status", "Cancelled")
    .order("token_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const visit = data as unknown as ActiveCheckInVisitRow;
  const consultationPayment = visit.payments?.find(
    (payment) =>
      payment.payment_type === "Consultation" &&
      payment.payment_status === "Paid"
  );

  if (!consultationPayment) {
    return null;
  }

  return {
    visitId: visit.id,
    patientId: visit.patient_id,
    visitDate: visit.visit_date,
    tokenNumber: visit.token_number,
    visitType: visit.visit_type,
    status: "Waiting",
    paymentId: consultationPayment.id,
    receiptNumber: consultationPayment.receipt_number,
    grossAmount: Number(consultationPayment.gross_amount || 0),
    discountAmount: Number(consultationPayment.discount_amount || 0),
    netAmount: Number(consultationPayment.net_amount || 0),
    paymentMode: consultationPayment.payment_mode,
    paidAt: consultationPayment.paid_at,
  };
}

