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
