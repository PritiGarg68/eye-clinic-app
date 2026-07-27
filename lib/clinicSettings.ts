import { supabase } from "./supabaseClient";

export type ClinicSettings = {
  clinicName: string;
  doctorName: string;
  doctorQualification: string;
  medicalRegistrationNumber: string;
  address: string;
  phone: string;
  email: string;
  defaultConsultationFee: number;
  defaultFollowUpFee: number;
};

export const clinicSettings: ClinicSettings = {
  clinicName: "Garg Eye Clinic",
  doctorName: "Dr Priti Garg",
  doctorQualification: "MBBS, MS (Ophthalmology)",
  medicalRegistrationNumber: "13414 (DMC)",
  address: "C-18 Sai Chowk, Madhu Vihar, Near Geetanjali Salon, 110092",
  phone: "+91 9810090866, +91 9910426490, 011-41043002",
  email: "dr.pritigarg@gmail.com",
  defaultConsultationFee: 1000,
  defaultFollowUpFee: 0,
};

type ClinicSettingsRow = {
  clinic_name: string | null;
  doctor_name: string | null;
  qualification: string | null;
  registration_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  default_consultation_fee: number | string | null;
};

export async function fetchClinicSettings(): Promise<ClinicSettings> {
  const { data, error } = await supabase
    .from("clinic_settings")
    .select(
      "clinic_name, doctor_name, qualification, registration_number, address, phone, email, default_consultation_fee"
    )
    .limit(1)
    .single<ClinicSettingsRow>();

  if (error || !data) {
    console.warn("Using fallback clinic settings:", error?.message);
    return clinicSettings;
  }

  return {
    clinicName: data.clinic_name || clinicSettings.clinicName,
    doctorName: data.doctor_name || clinicSettings.doctorName,
    doctorQualification: data.qualification || clinicSettings.doctorQualification,
    medicalRegistrationNumber:
      data.registration_number || clinicSettings.medicalRegistrationNumber,
    address: data.address || clinicSettings.address,
    phone: data.phone || clinicSettings.phone,
    email: data.email || clinicSettings.email,
    defaultConsultationFee:
      Number(data.default_consultation_fee) ||
      clinicSettings.defaultConsultationFee,
    defaultFollowUpFee: clinicSettings.defaultFollowUpFee,
  };
}
