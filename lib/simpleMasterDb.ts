import { supabase } from "./supabaseClient";

export type SimpleMasterType = "Frequency" | "Duration" | "Patient Source";

export type SimpleMasterItem = {
  id: string;
  masterType: SimpleMasterType;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type SimpleMasterRow = {
  id: string;
  frequency_label?: string | null;
  duration_label?: string | null;
  source_name?: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function getConfiguration(masterType: SimpleMasterType) {
  if (masterType === "Frequency") {
    return {
      tableName: "frequency_master",
      labelColumn: "frequency_label",
    } as const;
  }

  if (masterType === "Duration") {
    return {
      tableName: "duration_master",
      labelColumn: "duration_label",
    } as const;
  }

  return {
    tableName: "patient_sources",
    labelColumn: "source_name",
  } as const;
}

function mapSimpleMaster(
  row: SimpleMasterRow,
  masterType: SimpleMasterType
): SimpleMasterItem {
  return {
    id: row.id,
    masterType,
    label:
      masterType === "Frequency"
        ? row.frequency_label || ""
        : masterType === "Duration"
          ? row.duration_label || ""
          : row.source_name || "",
    sortOrder: row.sort_order ?? 1,
    isActive: row.is_active ?? true,
  };
}

export async function fetchActiveSimpleMasterItemsFromSupabase(
  masterType: SimpleMasterType
): Promise<SimpleMasterItem[]> {
  const { tableName, labelColumn } = getConfiguration(masterType);

  const { data, error } = await supabase
    .from(tableName)
    .select(`id, ${labelColumn}, sort_order, is_active`)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order(labelColumn, { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SimpleMasterRow[]).map((row) =>
    mapSimpleMaster(row, masterType)
  );
}

export async function fetchAllSimpleMasterItemsFromSupabase(
  masterType: SimpleMasterType
): Promise<SimpleMasterItem[]> {
  const { tableName, labelColumn } = getConfiguration(masterType);

  const { data, error } = await supabase
    .from(tableName)
    .select(`id, ${labelColumn}, sort_order, is_active`)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order(labelColumn, { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SimpleMasterRow[]).map((row) =>
    mapSimpleMaster(row, masterType)
  );
}

export async function createSimpleMasterItemInSupabase(input: {
  masterType: SimpleMasterType;
  label: string;
  sortOrder: number;
}): Promise<SimpleMasterItem> {
  const cleanLabel = input.label.trim();

  if (!cleanLabel) {
    throw new Error(`${input.masterType} label is required.`);
  }

  const { tableName, labelColumn } = getConfiguration(input.masterType);

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      [labelColumn]: cleanLabel,
      sort_order: input.sortOrder || 1,
      is_active: true,
    })
    .select(`id, ${labelColumn}, sort_order, is_active`)
    .single<SimpleMasterRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapSimpleMaster(data, input.masterType);
}

export async function updateSimpleMasterItemInSupabase(input: {
  id: string;
  masterType: SimpleMasterType;
  label: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<SimpleMasterItem> {
  const cleanLabel = input.label.trim();

  if (!cleanLabel) {
    throw new Error(`${input.masterType} label is required.`);
  }

  const { tableName, labelColumn } = getConfiguration(input.masterType);

  const { data, error } = await supabase
    .from(tableName)
    .update({
      [labelColumn]: cleanLabel,
      sort_order: input.sortOrder || 1,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .select(`id, ${labelColumn}, sort_order, is_active`)
    .single<SimpleMasterRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapSimpleMaster(data, input.masterType);
}

export async function setSimpleMasterItemActiveStatusInSupabase(input: {
  id: string;
  masterType: SimpleMasterType;
  isActive: boolean;
}): Promise<void> {
  const { tableName } = getConfiguration(input.masterType);

  const { error } = await supabase
    .from(tableName)
    .update({ is_active: input.isActive })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}
