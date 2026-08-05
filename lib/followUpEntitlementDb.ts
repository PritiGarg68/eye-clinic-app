import { supabase } from "./supabaseClient";

export type FreeFollowUpEntitlement = {
  id: string;
  patientId: string;
  sourceVisitId: string;
  validUntil: string;
  status: "Active" | "Used" | "Cancelled" | "Expired";
};

type ActiveEntitlementRow = {
  entitlement_id: string;
  returned_patient_id: string;
  source_visit_id: string;
  valid_until: string;
  status: "Active" | "Used" | "Cancelled" | "Expired";
};

type UsedEntitlementRow = {
  entitlement_id: string;
  returned_patient_id: string;
  used_visit_id: string;
  valid_until: string;
  status: "Active" | "Used" | "Cancelled" | "Expired";
};

function mapEntitlement(row: ActiveEntitlementRow): FreeFollowUpEntitlement {
  return {
    id: row.entitlement_id,
    patientId: row.returned_patient_id,
    sourceVisitId: row.source_visit_id,
    validUntil: row.valid_until,
    status: row.status,
  };
}

export async function upsertFreeFollowUpEntitlementForVisit(
  visitId: string
): Promise<FreeFollowUpEntitlement | null> {
  const { data, error } = await supabase.rpc(
    "upsert_free_follow_up_entitlement_for_visit",
    {
      p_visit_id: visitId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as ActiveEntitlementRow[];

  if (rows.length === 0) {
    return null;
  }

  return mapEntitlement(rows[0]);
}

export async function fetchActiveFreeFollowUpEntitlement(
  patientId: string
): Promise<FreeFollowUpEntitlement | null> {
  const { data, error } = await supabase.rpc(
    "get_active_free_follow_up_entitlement",
    {
      p_patient_id: patientId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as ActiveEntitlementRow[];

  if (rows.length === 0) {
    return null;
  }

  return mapEntitlement(rows[0]);
}

export async function consumeFreeFollowUpEntitlement(input: {
  patientId: string;
  usedVisitId: string;
}): Promise<FreeFollowUpEntitlement> {
  const { data, error } = await supabase.rpc(
    "consume_free_follow_up_entitlement",
    {
      p_patient_id: input.patientId,
      p_used_visit_id: input.usedVisitId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as UsedEntitlementRow[];

  if (rows.length === 0) {
    throw new Error("Free follow-up entitlement was not consumed.");
  }

  return {
    id: rows[0].entitlement_id,
    patientId: rows[0].returned_patient_id,
    sourceVisitId: "",
    validUntil: rows[0].valid_until,
    status: rows[0].status,
  };
}
