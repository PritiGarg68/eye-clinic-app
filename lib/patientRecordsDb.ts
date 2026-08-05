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

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

export async function fetchPatientRecordsFromSupabase(
  patientId: string
): Promise<PatientRecordVisit[]> {
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

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select(
      "id, visit_id, payment_type, payment_status, receipt_number, gross_amount, discount_amount, net_amount, payment_mode, paid_at, notes, created_at"
    )
    .in("visit_id", visitIds)
    .eq("payment_status", "Paid")
    .order("paid_at", { ascending: true });

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const paymentRows = (payments || []) as PaymentRow[];
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

  return visitRows.map((visit) => ({
    visitId: visit.id,
    visitDate: visit.visit_date,
    tokenNumber: visit.token_number,
    visitType: visit.visit_type,
    status: visit.status,
    createdAt: visit.created_at,
    payments: paymentsByVisit[visit.id] || [],
  }));
}
