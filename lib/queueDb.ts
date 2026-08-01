import { QueueItem, VisitType, QueueStatus, PaymentMode } from "../types/queue";
import { supabase } from "./supabaseClient";

type SupabaseVisitType =
  | "New Consultation"
  | "Follow-Up"
  | "Free Follow-Up"
  | "Procedure / Test Only";

type SupabaseVisitStatus =
  | "Waiting"
  | "Under Optometry"
  | "Needs Optometry Review"
  | "Dilated Waiting"
  | "Ready for Doctor"
  | "Under Consultation"
  | "Additional Payment Pending"
  | "Completed"
  | "Cancelled";

type SupabasePaymentMode =
  | "Cash"
  | "UPI"
  | "Card"
  | "Bank Transfer"
  | "None";

type QueueVisitRow = {
  id: string;
  token_number: number;
  visit_type: SupabaseVisitType;
  status: SupabaseVisitStatus;
  patients:
    | {
        id: string;
        uhid: string;
        full_name: string;
        mobile: string;
        age_years: number;
        gender: "Male" | "Female" | "Other";
      }
    | {
        id: string;
        uhid: string;
        full_name: string;
        mobile: string;
        age_years: number;
        gender: "Male" | "Female" | "Other";
      }[]
    | null;
  payments:
    | {
        payment_mode: SupabasePaymentMode;
        gross_amount: number | string;
        discount_amount: number | string;
        net_amount: number | string;
        payment_type: string;
        payment_status: string;
        receipt_number: string;
      }[]
    | null;
};

function mapVisitType(visitType: SupabaseVisitType): VisitType {
  if (visitType === "New Consultation") {
    return "New Patient Visit";
  }

  if (visitType === "Follow-Up") {
    return "Returning Patient";
  }

  if (visitType === "Free Follow-Up") {
    return "Free Follow-Up";
  }

  return "Returning Patient";
}

function mapStatus(status: SupabaseVisitStatus): QueueStatus {
  if (status === "Cancelled") {
    return "Completed";
  }

  return status;
}

function mapPaymentMode(paymentMode: SupabasePaymentMode): PaymentMode {
  if (paymentMode === "Bank Transfer") {
    return "UPI";
  }

  return paymentMode;
}

export async function fetchTodayQueueFromSupabase(): Promise<QueueItem[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("visits")
    .select(
      `
        id,
        token_number,
        visit_type,
        status,
        patients (
          id,
          uhid,
          full_name,
          mobile,
          age_years,
          gender
        ),
        payments (
          payment_mode,
          gross_amount,
          discount_amount,
          net_amount,
          payment_type,
          payment_status,
          receipt_number
        )
      `
    )
    .eq("visit_date", today)
    .order("token_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as unknown as QueueVisitRow[]).map((visit) => {
    const patient = Array.isArray(visit.patients)
      ? visit.patients[0]
      : visit.patients;

    const consultationPayment = visit.payments?.find(
      (payment) =>
        payment.payment_type === "Consultation" &&
        payment.payment_status === "Paid"
    );

    return {
      id: visit.id,
      patientId: patient?.id,
      tokenNumber: visit.token_number,
      patientName: patient?.full_name || "Unknown Patient",
      age: patient?.age_years || 0,
      gender: patient?.gender || "Other",
      uhid: patient?.uhid || "-",
      mobile: patient?.mobile,
      visitType: mapVisitType(visit.visit_type),
      paymentMode: mapPaymentMode(consultationPayment?.payment_mode || "None"),
      amountPaid: Number(consultationPayment?.net_amount || 0),
      consultationReceiptNumber: consultationPayment?.receipt_number,
      consultationGrossAmount: Number(consultationPayment?.gross_amount || 0),
      consultationDiscountAmount: Number(
        consultationPayment?.discount_amount || 0
      ),
      consultationNetAmount: Number(consultationPayment?.net_amount || 0),
      status: mapStatus(visit.status),
      additionalServices: [],
    };
  });
}

export async function updateVisitStatusInSupabase(
  visitId: string,
  status: QueueStatus
) {
  const { error } = await supabase
    .from("visits")
    .update({
      status,
      clinical_started_at:
        status === "Under Optometry" || status === "Under Consultation"
          ? new Date().toISOString()
          : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) {
    throw new Error(error.message);
  }
}
