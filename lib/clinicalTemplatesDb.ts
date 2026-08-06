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
  isActive: boolean;
};

type ClinicalTemplateRow = {
  id: string;
  template_type: ClinicalTemplateType;
  template_text: string;
  sort_order: number | null;
  is_active: boolean | null;
};

function mapClinicalTemplate(row: ClinicalTemplateRow): ClinicalTemplate {
  return {
    id: row.id,
    templateType: row.template_type,
    text: row.template_text,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
  };
}

export async function fetchClinicalTemplatesFromSupabase(
  templateType: ClinicalTemplateType
): Promise<ClinicalTemplate[]> {
  const { data, error } = await supabase
    .from("clinical_templates")
    .select("id, template_type, template_text, sort_order, is_active")
    .eq("template_type", templateType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("template_text", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ClinicalTemplateRow[]).map(mapClinicalTemplate);
}

export async function fetchAllClinicalTemplatesFromSupabase(
  templateType: ClinicalTemplateType
): Promise<ClinicalTemplate[]> {
  const { data, error } = await supabase
    .from("clinical_templates")
    .select("id, template_type, template_text, sort_order, is_active")
    .eq("template_type", templateType)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("template_text", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ClinicalTemplateRow[]).map(mapClinicalTemplate);
}

export async function createClinicalTemplateInSupabase(input: {
  templateType: ClinicalTemplateType;
  text: string;
  sortOrder: number;
}): Promise<ClinicalTemplate> {
  const cleanText = input.text.trim();

  if (!cleanText) {
    throw new Error("Template text is required.");
  }

  const { data, error } = await supabase
    .from("clinical_templates")
    .insert({
      template_type: input.templateType,
      template_text: cleanText,
      sort_order: input.sortOrder || 1,
      is_active: true,
    })
    .select("id, template_type, template_text, sort_order, is_active")
    .single<ClinicalTemplateRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapClinicalTemplate(data);
}

export async function updateClinicalTemplateInSupabase(input: {
  id: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<ClinicalTemplate> {
  const cleanText = input.text.trim();

  if (!cleanText) {
    throw new Error("Template text is required.");
  }

  const { data, error } = await supabase
    .from("clinical_templates")
    .update({
      template_text: cleanText,
      sort_order: input.sortOrder || 1,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .select("id, template_type, template_text, sort_order, is_active")
    .single<ClinicalTemplateRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapClinicalTemplate(data);
}

export async function setClinicalTemplateActiveStatusInSupabase(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("clinical_templates")
    .update({
      is_active: input.isActive,
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}
