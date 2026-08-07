import { supabase } from "./supabaseClient";

export type PatientSource = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type PatientSourceRow = {
  id: string;
  source_name: string;
  sort_order: number | null;
  is_active: boolean | null;
};

function mapPatientSource(row: PatientSourceRow): PatientSource {
  return {
    id: row.id,
    name: row.source_name,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
  };
}

export async function fetchActivePatientSourcesFromSupabase(): Promise<
  PatientSource[]
> {
  const { data, error } = await supabase
    .from("patient_sources")
    .select("id, source_name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PatientSourceRow[]).map(mapPatientSource);
}
