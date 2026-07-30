"use client";

import { useState } from "react";
import {
  SupabasePatient,
  createPatientInSupabase,
  searchPatientsFromSupabase,
} from "../../lib/patientsDb";

export default function SupabasePatientsTestPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<SupabasePatient[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleCreateDummyPatient() {
    setStatus("Creating dummy patient...");
    setError("");

    try {
      const patient = await createPatientInSupabase({
        fullName: "Test Supabase Patient",
        mobile: "9999999999",
        ageYears: 45,
        gender: "Male",
        address: "Test Address",
        referralNotes: "Created from Supabase patient test page",
      });

      setStatus(`Created patient ${patient.uhid} - ${patient.fullName}`);
      setSearchTerm(patient.mobile);
      setPatients([patient]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }

  async function handleSearch() {
    setStatus("Searching...");
    setError("");

    try {
      const results = await searchPatientsFromSupabase(searchTerm);
      setPatients(results);
      setStatus(`Found ${results.length} patient(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Supabase Patients Test</h1>

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <button onClick={handleCreateDummyPatient}>
          Create Dummy Supabase Patient
        </button>

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name, mobile, or UHID"
          style={{ padding: 8 }}
        />

        <button onClick={handleSearch}>Search Patients</button>
      </div>

      {status && <p style={{ color: "green" }}>{status}</p>}
      {error && (
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </pre>
      )}

      <div style={{ marginTop: 24 }}>
        {patients.map((patient) => (
          <div
            key={patient.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <p><strong>UHID:</strong> {patient.uhid}</p>
            <p><strong>Name:</strong> {patient.fullName}</p>
            <p><strong>Mobile:</strong> {patient.mobile}</p>
            <p><strong>Age/Gender:</strong> {patient.ageYears} / {patient.gender}</p>
            <p><strong>Address:</strong> {patient.address || "-"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
