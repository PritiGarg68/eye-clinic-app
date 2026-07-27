"use client";

import { useEffect, useState } from "react";
import { ClinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";

export default function SupabaseTestPage() {
  const [data, setData] = useState<ClinicSettings | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadClinicSettings() {
      try {
        const settings = await fetchClinicSettings();
        setData(settings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    loadClinicSettings();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Supabase Connection Test</h1>

      {error && (
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </pre>
      )}

      {!error && !data && <p>Loading from Supabase...</p>}

      {data && (
        <div>
          <p><strong>Clinic:</strong> {data.clinicName}</p>
          <p><strong>Doctor:</strong> {data.doctorName}</p>
          <p><strong>Qualification:</strong> {data.doctorQualification}</p>
          <p><strong>Registration:</strong> {data.medicalRegistrationNumber}</p>
          <p><strong>Address:</strong> {data.address}</p>
          <p><strong>Phone:</strong> {data.phone}</p>
          <p><strong>Email:</strong> {data.email}</p>
          <p><strong>Consultation Fee:</strong> ₹{data.defaultConsultationFee}</p>
        </div>
      )}
    </main>
  );
}
