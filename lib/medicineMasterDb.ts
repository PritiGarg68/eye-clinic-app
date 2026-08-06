import { supabase } from "./supabaseClient";

export type MedicineMasterEye =
  | "OD"
  | "OS"
  | "OU"
  | "Both Eyes"
  | "Right Eye"
  | "Left Eye"
  | "Oral"
  | "Other";

export type MedicineMaster = {
  id: string;
  medicineName: string;
  defaultEye: MedicineMasterEye | null;
  defaultFrequency: string;
  defaultDuration: string;
  defaultInstructions: string;
  sortOrder: number;
  isActive: boolean;
};

type MedicineMasterRow = {
  id: string;
  medicine_name: string;
  default_eye: MedicineMasterEye | null;
  default_frequency: string | null;
  default_duration: string | null;
  default_instructions: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function mapMedicineMaster(row: MedicineMasterRow): MedicineMaster {
  return {
    id: row.id,
    medicineName: row.medicine_name,
    defaultEye: row.default_eye,
    defaultFrequency: row.default_frequency || "",
    defaultDuration: row.default_duration || "",
    defaultInstructions: row.default_instructions || "",
    sortOrder: row.sort_order ?? 1,
    isActive: row.is_active ?? true,
  };
}

const medicineMasterSelect =
  "id, medicine_name, default_eye, default_frequency, default_duration, default_instructions, sort_order, is_active";

export async function fetchActiveMedicinesFromSupabase(): Promise<
  MedicineMaster[]
> {
  const { data, error } = await supabase
    .from("medicine_master")
    .select(medicineMasterSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("medicine_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MedicineMasterRow[]).map(mapMedicineMaster);
}

export async function fetchAllMedicinesFromSupabase(): Promise<
  MedicineMaster[]
> {
  const { data, error } = await supabase
    .from("medicine_master")
    .select(medicineMasterSelect)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("medicine_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MedicineMasterRow[]).map(mapMedicineMaster);
}

export async function createMedicineInSupabase(input: {
  medicineName: string;
  defaultEye: MedicineMasterEye | null;
  defaultFrequency: string;
  defaultDuration: string;
  defaultInstructions: string;
  sortOrder: number;
}): Promise<MedicineMaster> {
  const cleanName = input.medicineName.trim();

  if (!cleanName) {
    throw new Error("Medicine name is required.");
  }

  const { data, error } = await supabase
    .from("medicine_master")
    .insert({
      medicine_name: cleanName,
      default_eye: input.defaultEye,
      default_frequency: input.defaultFrequency.trim() || null,
      default_duration: input.defaultDuration.trim() || null,
      default_instructions: input.defaultInstructions.trim() || null,
      sort_order: input.sortOrder || 1,
      is_active: true,
    })
    .select(medicineMasterSelect)
    .single<MedicineMasterRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapMedicineMaster(data);
}

export async function updateMedicineInSupabase(input: {
  id: string;
  medicineName: string;
  defaultEye: MedicineMasterEye | null;
  defaultFrequency: string;
  defaultDuration: string;
  defaultInstructions: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<MedicineMaster> {
  const cleanName = input.medicineName.trim();

  if (!cleanName) {
    throw new Error("Medicine name is required.");
  }

  const { data, error } = await supabase
    .from("medicine_master")
    .update({
      medicine_name: cleanName,
      default_eye: input.defaultEye,
      default_frequency: input.defaultFrequency.trim() || null,
      default_duration: input.defaultDuration.trim() || null,
      default_instructions: input.defaultInstructions.trim() || null,
      sort_order: input.sortOrder || 1,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .select(medicineMasterSelect)
    .single<MedicineMasterRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapMedicineMaster(data);
}

export async function setMedicineActiveStatusInSupabase(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("medicine_master")
    .update({ is_active: input.isActive })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}
