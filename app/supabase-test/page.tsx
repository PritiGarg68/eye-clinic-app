"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ClinicSettings = {
  clinic_name: string;
  doctor_name: string;
  default_consultation_fee: number;
};

export default function SupabaseTestPage() {
  const [data, setData] = useState<ClinicSettings | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadClinicSettings() {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("clinic_name, doctor_name, default_consultation_fee")
        .limit(1)
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      setData(data);
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
          <p><strong>Clinic:</strong> {data.clinic_name}</p>
          <p><strong>Doctor:</strong> {data.doctor_name}</p>
          <p><strong>Consultation Fee:</strong> ₹{data.default_consultation_fee}</p>
        </div>
      )}
    </main>
  );
}
