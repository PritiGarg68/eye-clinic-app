import { supabase } from "./supabaseClient";

export type ServiceCategory =
  | "Consultation"
  | "Investigation"
  | "Procedure"
  | "Other";

export type ServiceRoute =
  | "Ready for Doctor"
  | "Needs Optometry Review";

export type ServiceMasterItem = {
  id: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  defaultAmount: number;
  routeAfterPayment: ServiceRoute;
  sortOrder: number;
  isActive: boolean;
};

type ServiceRow = {
  id: string;
  service_name: string | null;
  service_category: ServiceCategory | null;
  default_amount: number | string | null;
  route_after_payment: ServiceRoute | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function mapService(row: ServiceRow): ServiceMasterItem {
  return {
    id: row.id,
    serviceName: row.service_name || "",
    serviceCategory: row.service_category || "Other",
    defaultAmount: Number(row.default_amount) || 0,
    routeAfterPayment:
      row.route_after_payment || "Needs Optometry Review",
    sortOrder: row.sort_order ?? 1,
    isActive: row.is_active ?? true,
  };
}

const serviceSelect =
  "id, service_name, service_category, default_amount, route_after_payment, sort_order, is_active";

export async function fetchAllServicesFromSupabase(): Promise<
  ServiceMasterItem[]
> {
  const { data, error } = await supabase
    .from("services")
    .select(serviceSelect)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("service_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ServiceRow[]).map(mapService);
}

export async function createServiceInSupabase(input: {
  serviceName: string;
  serviceCategory: ServiceCategory;
  defaultAmount: number;
  routeAfterPayment: ServiceRoute;
  sortOrder: number;
}): Promise<ServiceMasterItem> {
  const serviceName = input.serviceName.trim();

  if (!serviceName) {
    throw new Error("Service name is required.");
  }

  if (!Number.isFinite(input.defaultAmount) || input.defaultAmount < 0) {
    throw new Error("Default amount must be zero or more.");
  }

  const routeAfterPayment =
    input.serviceCategory === "Consultation"
      ? "Ready for Doctor"
      : input.routeAfterPayment;

  const { data, error } = await supabase
    .from("services")
    .insert({
      service_name: serviceName,
      service_category: input.serviceCategory,
      default_amount: input.defaultAmount,
      route_after_payment: routeAfterPayment,
      sort_order: input.sortOrder || 1,
      is_active: true,
    })
    .select(serviceSelect)
    .single<ServiceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapService(data);
}

export async function updateServiceInSupabase(input: {
  id: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  defaultAmount: number;
  routeAfterPayment: ServiceRoute;
  sortOrder: number;
  isActive: boolean;
}): Promise<ServiceMasterItem> {
  const serviceName = input.serviceName.trim();

  if (!serviceName) {
    throw new Error("Service name is required.");
  }

  if (!Number.isFinite(input.defaultAmount) || input.defaultAmount < 0) {
    throw new Error("Default amount must be zero or more.");
  }

  const routeAfterPayment =
    input.serviceCategory === "Consultation"
      ? "Ready for Doctor"
      : input.routeAfterPayment;

  const { data, error } = await supabase
    .from("services")
    .update({
      service_name: serviceName,
      service_category: input.serviceCategory,
      default_amount: input.defaultAmount,
      route_after_payment: routeAfterPayment,
      sort_order: input.sortOrder || 1,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .select(serviceSelect)
    .single<ServiceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapService(data);
}

export async function setServiceActiveStatusInSupabase(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("services")
    .update({ is_active: input.isActive })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchDefaultConsultationFeeFromServices(): Promise<
  number | null
> {
  const { data, error } = await supabase
    .from("services")
    .select("default_amount")
    .eq("service_name", "Consultation Fee")
    .eq("service_category", "Consultation")
    .eq("is_active", true)
    .maybeSingle<{ default_amount: number | string | null }>();

  if (error) {
    console.warn(
      "Could not load Consultation Fee from Services Master:",
      error.message
    );
    return null;
  }

  if (!data) {
    return null;
  }

  const amount = Number(data.default_amount);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return amount;
}
