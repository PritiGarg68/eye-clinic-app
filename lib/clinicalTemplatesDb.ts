import { supabase } from "./supabaseClient";

export type ClinicalTemplateType =
  | "Chief Complaint"
  | "History"
  | "Finding"
  | "Diagnosis"
  | "Advice"
  | "Instruction";

export type ClinicalTemplate = {
  id: string;
  templateType: ClinicalTemplateType;
  text: string;
  sortOrder: number;
};

type ClinicalTemplateRow = {
  id: string;
  template_type: ClinicalTemplateType;
  template_text: string;
  sort_order: number | null;
};

export async function fetchClinicalTemplatesFromSupabase(
  templateType: ClinicalTemplateType
): Promise<ClinicalTemplate[]> {
  const { data, error } = await supabase
    .from("clinical_templates")
    .select("id, template_type, template_text, sort_order")
    .eq("template_type", templateType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("template_text", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ClinicalTemplateRow[]).map((row) => ({
    id: row.id,
    templateType: row.template_type,
    text: row.template_text,
    sortOrder: row.sort_order ?? 0,
  }));
}
