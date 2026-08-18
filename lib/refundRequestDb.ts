import { supabase } from "./supabaseClient";

export type RefundRequestStatus =
  | "Refund Pending"
  | "Refunded"
  | "Cancelled";

export type RefundRequest = {
  id: string;
  visitId: string;
  patientId: string;
  originalPaymentId: string;
  originalReceiptNumber: string;
  originalPaidAmount: number;
  refundAmount: number;
  reason: string;
  notes: string;
  status: RefundRequestStatus;
  createdAt: string;
  refundedAt?: string;
  linkedRefundPaymentId?: string;
};

export type RefundPaymentMode =
  | "Cash"
  | "UPI"
  | "Card"
  | "Bank Transfer";

type CreateRefundRequestRow = {
  request_id: string;
  visit_id: string;
  patient_id: string;
  original_payment_id: string;
  original_receipt_number: string;
  original_paid_amount: number | string;
  refund_amount: number | string;
  reason: string;
  notes: string | null;
  status: RefundRequestStatus;
  created_at: string;
};

type RefundRequestRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  original_payment_id: string;
  refund_amount: number | string;
  reason: string;
  notes: string | null;
  status: RefundRequestStatus;
  linked_refund_payment_id: string | null;
  refunded_at: string | null;
  created_at: string;
  payments:
    | {
        receipt_number: string;
        net_amount: number | string;
      }
    | {
        receipt_number: string;
        net_amount: number | string;
      }[]
    | null;
};

export type ProcessRefundRequestResult = {
  requestId: string;
  refundPaymentId: string;
  refundReceiptNumber: string;
  originalPaymentId: string;
  originalReceiptNumber: string;
  refundAmount: number;
  paymentMode: RefundPaymentMode;
  refundedAt: string;
};

type ProcessRefundRequestRow = {
  request_id: string;
  refund_payment_id: string;
  refund_receipt_number: string;
  original_payment_id: string;
  original_receipt_number: string;
  refund_amount: number | string;
  payment_mode: RefundPaymentMode;
  refunded_at: string;
};

function getOriginalPayment(
  row: RefundRequestRow
): { receipt_number: string; net_amount: number | string } | null {
  if (Array.isArray(row.payments)) {
    return row.payments[0] || null;
  }

  return row.payments;
}

function mapRefundRequest(row: RefundRequestRow): RefundRequest {
  const originalPayment = getOriginalPayment(row);

  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    originalPaymentId: row.original_payment_id,
    originalReceiptNumber: originalPayment?.receipt_number || "",
    originalPaidAmount: Number(originalPayment?.net_amount || 0),
    refundAmount: Number(row.refund_amount || 0),
    reason: row.reason,
    notes: row.notes || "",
    status: row.status,
    createdAt: row.created_at,
    refundedAt: row.refunded_at || undefined,
    linkedRefundPaymentId: row.linked_refund_payment_id || undefined,
  };
}

export async function createRefundRequestInSupabase(input: {
  originalPaymentId: string;
  refundAmount: number;
  reason: string;
  notes?: string;
}): Promise<RefundRequest> {
  const { data, error } = await supabase
    .rpc("create_refund_request", {
      p_original_payment_id: input.originalPaymentId,
      p_refund_amount: input.refundAmount,
      p_reason: input.reason,
      p_notes: input.notes || null,
    })
    .single<CreateRefundRequestRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.request_id,
    visitId: data.visit_id,
    patientId: data.patient_id,
    originalPaymentId: data.original_payment_id,
    originalReceiptNumber: data.original_receipt_number,
    originalPaidAmount: Number(data.original_paid_amount || 0),
    refundAmount: Number(data.refund_amount || 0),
    reason: data.reason,
    notes: data.notes || "",
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function fetchRefundRequestForVisitInSupabase(
  visitId: string
): Promise<RefundRequest | null> {
  const { data, error } = await supabase
    .from("refund_requests")
    .select(
      `
      id,
      visit_id,
      patient_id,
      original_payment_id,
      refund_amount,
      reason,
      notes,
      status,
      linked_refund_payment_id,
      refunded_at,
      created_at,
      payments!refund_requests_original_payment_id_fkey (
        receipt_number,
        net_amount
      )
      `
    )
    .eq("visit_id", visitId)
    .in("status", ["Refund Pending", "Refunded"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<RefundRequestRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRefundRequest(data) : null;
}

export async function fetchPendingRefundRequestsInSupabase(): Promise<
  RefundRequest[]
> {
  const { data, error } = await supabase
    .from("refund_requests")
    .select(
      `
      id,
      visit_id,
      patient_id,
      original_payment_id,
      refund_amount,
      reason,
      notes,
      status,
      linked_refund_payment_id,
      refunded_at,
      created_at,
      payments!refund_requests_original_payment_id_fkey (
        receipt_number,
        net_amount
      )
      `
    )
    .eq("status", "Refund Pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RefundRequestRow[]).map(mapRefundRequest);
}

export async function processRefundRequestInSupabase(input: {
  requestId: string;
  paymentMode: RefundPaymentMode;
}): Promise<ProcessRefundRequestResult> {
  const { data, error } = await supabase
    .rpc("process_refund_request", {
      p_request_id: input.requestId,
      p_payment_mode: input.paymentMode,
    })
    .single<ProcessRefundRequestRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    requestId: data.request_id,
    refundPaymentId: data.refund_payment_id,
    refundReceiptNumber: data.refund_receipt_number,
    originalPaymentId: data.original_payment_id,
    originalReceiptNumber: data.original_receipt_number,
    refundAmount: Number(data.refund_amount || 0),
    paymentMode: data.payment_mode,
    refundedAt: data.refunded_at,
  };
}

export async function cancelRefundRequestInSupabase(
  requestId: string
): Promise<void> {
  const { error } = await supabase.rpc("cancel_refund_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
