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
        uhid: string;
        full_name: string;
        age_years: number;
        gender: "Male" | "Female" | "Other";
      }
    | {
        uhid: string;
        full_name: string;
        age_years: number;
        gender: "Male" | "Female" | "Other";
      }[]
    | null;
  payments:
    | {
        payment_mode: SupabasePaymentMode;
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
          uhid,
          full_name,
          age_years,
          gender
        ),
        payments (
          payment_mode,
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
      tokenNumber: visit.token_number,
      patientName: patient?.full_name || "Unknown Patient",
      age: patient?.age_years || 0,
      gender: patient?.gender || "Other",
      uhid: patient?.uhid || "-",
      visitType: mapVisitType(visit.visit_type),
      paymentMode: mapPaymentMode(consultationPayment?.payment_mode || "None"),
      amountPaid: Number(consultationPayment?.net_amount || 0),
      status: mapStatus(visit.status),
      additionalServices: [],
    };
  });
}
