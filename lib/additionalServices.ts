import { AdditionalServiceRoute } from "../types/queue";
import { supabase } from "./supabaseClient";

export type AdditionalServiceMaster = {
  serviceName: string;
  amount: number;
  routeAfterPayment: AdditionalServiceRoute;
};

export const additionalServiceMasters: AdditionalServiceMaster[] = [
  {
    serviceName: "OCT",
    amount: 1500,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Visual Field",
    amount: 1500,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Fundus Photo",
    amount: 800,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "B-Scan",
    amount: 1200,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Repeat IOP",
    amount: 300,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Other Test / Procedure",
    amount: 0,
    routeAfterPayment: "Ready for Doctor",
  },
];

type ServiceRow = {
  service_name: string | null;
  default_amount: number | string | null;
  route_after_payment: AdditionalServiceRoute | null;
};

export async function fetchAdditionalServiceMasters(): Promise<
  AdditionalServiceMaster[]
> {
  const { data, error } = await supabase
    .from("services")
    .select("service_name, default_amount, route_after_payment")
    .eq("is_active", true)
    .neq("service_category", "Consultation")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.warn("Using fallback additional services:", error?.message);
    return additionalServiceMasters;
  }

  const services = (data as ServiceRow[])
    .filter((service) => service.service_name)
    .map((service) => ({
      serviceName: service.service_name || "",
      amount: Number(service.default_amount) || 0,
      routeAfterPayment:
        service.route_after_payment || "Needs Optometry Review",
    }));

  return services.length > 0 ? services : additionalServiceMasters;
}
