"use client";

import { useState } from "react";
import {
  SupabasePatient,
  createPatientInSupabase,
  searchPatientsFromSupabase,
} from "../../lib/patientsDb";
import {
  ConsultationCheckInResult,
  createConsultationCheckIn,
} from "../../lib/checkInDb";
import { fetchTodayQueueFromSupabase } from "../../lib/queueDb";
import { QueueItem } from "../../types/queue";

export default function SupabasePatientsTestPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<SupabasePatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SupabasePatient | null>(null);
  const [checkInResult, setCheckInResult] =
    useState<ConsultationCheckInResult | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
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
      setSelectedPatient(patient);
      setCheckInResult(null);
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
      setSelectedPatient(results[0] || null);
      setCheckInResult(null);
      setStatus(`Found ${results.length} patient(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }

  async function handleCreateCheckIn() {
    if (!selectedPatient) {
      setError("Please create or search/select a patient first.");
      return;
    }

    setStatus("Creating consultation check-in...");
    setError("");

    try {
      const result = await createConsultationCheckIn({
        patientId: selectedPatient.id,
        visitType: "New Consultation",
        grossAmount: 1000,
        discountAmount: 0,
        paymentMode: "Cash",
        notes: "Created from Supabase patients test page",
      });

      setCheckInResult(result);
      setStatus(
        `Created visit token ${result.tokenNumber}, receipt ${result.receiptNumber}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }

  async function handleFetchTodayQueue() {
    setStatus("Fetching today's Supabase queue...");
    setError("");

    try {
      const queue = await fetchTodayQueueFromSupabase();
      setQueueItems(queue);
      setStatus(`Fetched ${queue.length} queue item(s).`);
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

        <button onClick={handleCreateCheckIn} disabled={!selectedPatient}>
          Create Consultation Check-In
        </button>

        <button onClick={handleFetchTodayQueue}>
          Fetch Today's Supabase Queue
        </button>
      </div>

      {status && <p style={{ color: "green" }}>{status}</p>}
      {error && (
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </pre>
      )}

      {checkInResult && (
        <div
          style={{
            marginTop: 24,
            border: "2px solid green",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <h2>Check-In Created</h2>
          <p><strong>Visit ID:</strong> {checkInResult.visitId}</p>
          <p><strong>Token:</strong> {checkInResult.tokenNumber}</p>
          <p><strong>Status:</strong> {checkInResult.status}</p>
          <p><strong>Receipt:</strong> {checkInResult.receiptNumber}</p>
          <p><strong>Gross:</strong> ₹{checkInResult.grossAmount}</p>
          <p><strong>Discount:</strong> ₹{checkInResult.discountAmount}</p>
          <p><strong>Net:</strong> ₹{checkInResult.netAmount}</p>
          <p><strong>Payment Mode:</strong> {checkInResult.paymentMode}</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h2>Today's Supabase Queue</h2>
        {queueItems.length === 0 && <p>No queue items loaded.</p>}
        {queueItems.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #0f766e",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <p><strong>Token:</strong> {item.tokenNumber}</p>
            <p><strong>Patient:</strong> {item.patientName}</p>
            <p><strong>UHID:</strong> {item.uhid}</p>
            <p><strong>Visit Type:</strong> {item.visitType}</p>
            <p><strong>Status:</strong> {item.status}</p>
            <p><strong>Paid:</strong> ₹{item.amountPaid}</p>
            <p><strong>Payment Mode:</strong> {item.paymentMode}</p>
          </div>
        ))}
      </div>

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
