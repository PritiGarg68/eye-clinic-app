import { supabase } from "./supabaseClient";

export type SupabasePatient = {
  id: string;
  uhid: string;
  fullName: string;
  mobile: string;
  ageYears: number;
  dateOfBirth: string | null;
  gender: "Male" | "Female" | "Other";
  address: string | null;
  patientSourceId: string | null;
  referralNotes: string | null;
  createdAt: string;
};

type PatientRow = {
  id: string;
  uhid: string;
  full_name: string;
  mobile: string;
  age_years: number;
  date_of_birth: string | null;
  gender: "Male" | "Female" | "Other";
  address: string | null;
  patient_source_id: string | null;
  referral_notes: string | null;
  created_at: string;
};

function mapPatientRow(row: PatientRow): SupabasePatient {
  return {
    id: row.id,
    uhid: row.uhid,
    fullName: row.full_name,
    mobile: row.mobile,
    ageYears: row.age_years,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    patientSourceId: row.patient_source_id,
    referralNotes: row.referral_notes,
    createdAt: row.created_at,
  };
}

export async function searchPatientsFromSupabase(
  searchTerm: string
): Promise<SupabasePatient[]> {
  const term = searchTerm.trim();

  if (!term) {
    return [];
  }

  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, uhid, full_name, mobile, age_years, date_of_birth, gender, address, patient_source_id, referral_notes, created_at"
    )
    .eq("is_active", true)
    .or(
      `full_name.ilike.%${term}%,mobile.ilike.%${term}%,uhid.ilike.%${term}%`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as PatientRow[]).map(mapPatientRow);
}

export type CreatePatientInput = {
  fullName: string;
  mobile: string;
  ageYears: number;
  gender: "Male" | "Female" | "Other";
  address?: string;
  patientSourceId?: string | null;
  referralNotes?: string;
};

export async function createPatientInSupabase(
  input: CreatePatientInput
): Promise<SupabasePatient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      full_name: input.fullName.trim(),
      mobile: input.mobile.trim(),
      age_years: input.ageYears,
      gender: input.gender,
      address: input.address?.trim() || null,
      patient_source_id: input.patientSourceId || null,
      referral_notes: input.referralNotes?.trim() || null,
    })
    .select(
      "id, uhid, full_name, mobile, age_years, date_of_birth, gender, address, patient_source_id, referral_notes, created_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPatientRow(data as PatientRow);
}

export type UpdatePatientInput = {
  patientId: string;
  fullName: string;
  ageYears: number;
  gender: "Male" | "Female" | "Other";
};

export async function updatePatientInSupabase(
  input: UpdatePatientInput
): Promise<SupabasePatient> {
  const { data, error } = await supabase
    .from("patients")
    .update({
      full_name: input.fullName.trim(),
      age_years: input.ageYears,
      gender: input.gender,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.patientId)
    .select(
      "id, uhid, full_name, mobile, age_years, date_of_birth, gender, address, patient_source_id, referral_notes, created_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPatientRow(data as PatientRow);
}
