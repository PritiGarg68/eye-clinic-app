import {
  AdditionalServiceRequest,
  AdditionalServiceRoute,
  QueueItem,
  VisitType,
  QueueStatus,
  PaymentMode,
} from "../types/queue";
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
        id: string;
        payment_mode: SupabasePaymentMode;
        gross_amount: number | string;
        discount_amount: number | string;
        net_amount: number | string;
        payment_type: string;
        payment_status: string;
        receipt_number: string;
        paid_at: string | null;
      }[]
    | null;
  additional_service_requests:
    | AdditionalServiceRequestRow[]
    | null;
};

type AdditionalServiceRequestRow = {
  id: string;
  status: "Payment Pending" | "Paid" | "Cancelled";
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  notes: string | null;
  route_after_payment: AdditionalServiceRoute;
  paid_at: string | null;
  linked_payment_id: string | null;
  created_at: string;
  additional_service_request_items:
    | {
        service_name_snapshot: string;
        amount: number | string;
        sort_order: number;
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

function mapAdditionalServiceRequests(
  requests: AdditionalServiceRequestRow[] | null | undefined,
  payments: QueueVisitRow["payments"]
): AdditionalServiceRequest[] {
  return (requests || [])
    .filter((request) => request.status !== "Cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((request) => {
      const linkedPayment = payments?.find(
        (payment) => payment.id === request.linked_payment_id
      );

      return {
      id: request.id,
      services: (request.additional_service_request_items || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          serviceName: item.service_name_snapshot,
          amount: Number(item.amount || 0),
        })),
      grossAmount: Number(request.gross_amount || 0),
      discount: Number(request.discount_amount || 0),
      netAmount: Number(request.net_amount || 0),
      notes: request.notes || "",
      status: request.status === "Paid" ? "Paid" : "Payment Pending",
      routeAfterPayment: request.route_after_payment,
      createdAt: request.created_at,
      paidAt: request.paid_at || linkedPayment?.paid_at || undefined,
      paymentMode: linkedPayment
        ? mapPaymentMode(linkedPayment.payment_mode)
        : undefined,
      receiptNumber: linkedPayment?.receipt_number,
    };
    });
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
          id,
          payment_mode,
          gross_amount,
          discount_amount,
          net_amount,
          payment_type,
          payment_status,
          receipt_number,
          paid_at
        ),
        additional_service_requests (
          id,
          status,
          gross_amount,
          discount_amount,
          net_amount,
          notes,
          route_after_payment,
          paid_at,
          linked_payment_id,
          created_at,
          additional_service_request_items (
            service_name_snapshot,
            amount,
            sort_order
          )
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
      additionalServices: mapAdditionalServiceRequests(
        visit.additional_service_requests,
        visit.payments
      ),
    };
  });
}

export async function updateVisitStatusInSupabase(
  visitId: string,
  status: QueueStatus
) {
  const updatePayload: {
    status: QueueStatus;
    updated_at: string;
    clinical_started_at?: string;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "Under Optometry" || status === "Under Consultation") {
    updatePayload.clinical_started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("visits")
    .update(updatePayload)
    .eq("id", visitId);

  if (error) {
    throw new Error(error.message);
  }
}
