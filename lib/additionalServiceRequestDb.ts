import {
  AdditionalServiceRequest,
  AdditionalServiceRoute,
} from "../types/queue";
import { supabase } from "./supabaseClient";

type AdditionalServiceRequestRow = {
  id: string;
  visit_id: string;
  patient_id: string;
  status: "Payment Pending" | "Paid" | "Cancelled";
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  notes: string | null;
  route_after_payment: AdditionalServiceRoute;
  paid_at: string | null;
  created_at: string;
};

type AdditionalServiceRequestItemRow = {
  id: string;
  request_id: string;
  service_name_snapshot: string;
  amount: number | string;
  sort_order: number;
};

function mapRequestFromDatabase(input: {
  request: AdditionalServiceRequestRow;
  items: AdditionalServiceRequestItemRow[];
}): AdditionalServiceRequest {
  return {
    id: input.request.id,
    services: input.items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        serviceName: item.service_name_snapshot,
        amount: Number(item.amount || 0),
      })),
    grossAmount: Number(input.request.gross_amount || 0),
    discount: Number(input.request.discount_amount || 0),
    netAmount: Number(input.request.net_amount || 0),
    notes: input.request.notes || "",
    status: input.request.status === "Paid" ? "Paid" : "Payment Pending",
    routeAfterPayment: input.request.route_after_payment,
    createdAt: input.request.created_at,
    paidAt: input.request.paid_at || undefined,
  };
}

export async function createOrUpdatePendingAdditionalServiceRequestInSupabase(input: {
  visitId: string;
  patientId: string;
  serviceRequest: AdditionalServiceRequest;
}): Promise<AdditionalServiceRequest> {
  if (input.serviceRequest.services.length === 0) {
    throw new Error("Please select at least one test/procedure.");
  }

  if (input.serviceRequest.discount > input.serviceRequest.grossAmount) {
    throw new Error("Discount cannot be more than gross amount.");
  }

  const existingRequestId =
    input.serviceRequest.id &&
    !input.serviceRequest.id.startsWith("additional-service-")
      ? input.serviceRequest.id
      : null;

  let requestId = existingRequestId;

  if (requestId) {
    const { error: updateError } = await supabase
      .from("additional_service_requests")
      .update({
        gross_amount: input.serviceRequest.grossAmount,
        discount_amount: input.serviceRequest.discount,
        net_amount: input.serviceRequest.netAmount,
        notes: input.serviceRequest.notes || null,
        route_after_payment: input.serviceRequest.routeAfterPayment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "Payment Pending");

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteItemsError } = await supabase
      .from("additional_service_request_items")
      .delete()
      .eq("request_id", requestId);

    if (deleteItemsError) {
      throw new Error(deleteItemsError.message);
    }
  } else {
    const { data: insertedRequest, error: insertError } = await supabase
      .from("additional_service_requests")
      .insert({
        visit_id: input.visitId,
        patient_id: input.patientId,
        status: "Payment Pending",
        gross_amount: input.serviceRequest.grossAmount,
        discount_amount: input.serviceRequest.discount,
        net_amount: input.serviceRequest.netAmount,
        notes: input.serviceRequest.notes || null,
        route_after_payment: input.serviceRequest.routeAfterPayment,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError) {
      throw new Error(insertError.message);
    }

    requestId = insertedRequest.id;
  }

  const requestItems = input.serviceRequest.services.map((service, index) => ({
    request_id: requestId,
    service_name_snapshot: service.serviceName,
    amount: service.amount,
    sort_order: index + 1,
  }));

  const { error: insertItemsError } = await supabase
    .from("additional_service_request_items")
    .insert(requestItems);

  if (insertItemsError) {
    throw new Error(insertItemsError.message);
  }

  const { error: visitError } = await supabase
    .from("visits")
    .update({
      status: "Additional Payment Pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.visitId);

  if (visitError) {
    throw new Error(visitError.message);
  }

  return fetchAdditionalServiceRequestFromSupabase(requestId);
}

export async function cancelPendingAdditionalServiceRequestInSupabase(input: {
  requestId: string;
  visitId: string;
}): Promise<void> {
  const { data: cancelledRequest, error: requestError } = await supabase
    .from("additional_service_requests")
    .update({
      status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .eq("visit_id", input.visitId)
    .eq("status", "Payment Pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!cancelledRequest) {
    throw new Error(
      "This additional service request is no longer pending and cannot be cancelled."
    );
  }

  const { error: visitError } = await supabase
    .from("visits")
    .update({
      status: "Under Consultation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.visitId)
    .eq("status", "Additional Payment Pending");

  if (visitError) {
    throw new Error(visitError.message);
  }
}

export async function fetchAdditionalServiceRequestFromSupabase(
  requestId: string
): Promise<AdditionalServiceRequest> {
  const { data: request, error: requestError } = await supabase
    .from("additional_service_requests")
    .select(
      "id, visit_id, patient_id, status, gross_amount, discount_amount, net_amount, notes, route_after_payment, paid_at, created_at"
    )
    .eq("id", requestId)
    .single<AdditionalServiceRequestRow>();

  if (requestError) {
    throw new Error(requestError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from("additional_service_request_items")
    .select("id, request_id, service_name_snapshot, amount, sort_order")
    .eq("request_id", requestId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return mapRequestFromDatabase({
    request,
    items: items || [],
  });
}

type CollectAdditionalServicePaymentRow = {
  request_id: string;
  visit_id: string;
  patient_id: string;
  payment_id: string;
  receipt_number: string;
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  payment_mode: "Cash" | "UPI" | "Card" | "Bank Transfer" | "None";
  paid_at: string;
  route_after_payment: AdditionalServiceRoute;
  visit_status: string;
};

export async function collectAdditionalServicePaymentInSupabase(input: {
  requestId: string;
  paymentMode: "Cash" | "UPI" | "Card" | "Bank Transfer" | "None";
}): Promise<CollectAdditionalServicePaymentRow> {
  const { data, error } = await supabase
    .rpc("collect_additional_service_payment", {
      p_request_id: input.requestId,
      p_payment_mode: input.paymentMode,
    })
    .single<CollectAdditionalServicePaymentRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
