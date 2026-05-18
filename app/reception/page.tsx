"use client";

import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import { samplePatients } from "../../lib/samplePatients";
import { Patient } from "../../types/patient";

export default function ReceptionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientMobile, setNewPatientMobile] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientGender, setNewPatientGender] = useState<
    "Male" | "Female" | "Other"
  >("Male");
  const [newPatientAddress, setNewPatientAddress] = useState("");
  const [newPatientNotes, setNewPatientNotes] = useState("");

  const matchingPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return samplePatients.filter((patient) => {
      return (
        patient.mobile.includes(term) ||
        patient.uhid.toLowerCase().includes(term) ||
        patient.name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setShowRegistrationForm(false);
  }

  function handleClearSelection() {
    setSelectedPatient(null);
  }

  function handleOpenRegistration() {
    setShowRegistrationForm(true);
    setSelectedPatient(null);

    if (/^\d+$/.test(searchTerm.trim())) {
      setNewPatientMobile(searchTerm.trim());
    }
  }

  function handleCreateTemporaryPatient() {
    if (!newPatientName || !newPatientMobile || !newPatientAge) {
      alert("Please enter name, mobile number, and age.");
      return;
    }

    const temporaryPatient: Patient = {
      id: `temp-${Date.now()}`,
      uhid: "TEMP-UHID",
      mobile: newPatientMobile,
      name: newPatientName,
      age: Number(newPatientAge),
      gender: newPatientGender,
      address: newPatientAddress || undefined,
      notes: newPatientNotes || undefined,
      createdAt: new Date().toISOString(),
    };

    setSelectedPatient(temporaryPatient);
    setShowRegistrationForm(false);
    setSearchTerm(newPatientMobile);
  }

  return (
    <AppShell
      title="Reception Workspace"
      subtitle="Patient check-in, billing, and queue management"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Live Queue"
          subtitle="Patients waiting for consultation"
        >
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Queue will appear here
          </div>
        </SectionCard>

        <SectionCard
          title="Patient Check-In"
          subtitle="Search or register patient and collect payment"
          className="lg:col-span-2"
        >
          <div className="grid gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by mobile number / UHID / name"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            {searchTerm && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Search Results
                </p>

                {matchingPatients.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No matching patient found. You can register a new patient.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {matchingPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-400"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {patient.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {patient.age} yrs / {patient.gender}
                            </p>
                          </div>

                          <div className="text-right text-sm text-slate-500">
                            <p>{patient.uhid}</p>
                            <p>{patient.mobile}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showRegistrationForm && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-700">
                  Register New Patient
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={newPatientName}
                    onChange={(event) => setNewPatientName(event.target.value)}
                    placeholder="Patient name"
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />

                  <input
                    type="text"
                    value={newPatientMobile}
                    onChange={(event) => setNewPatientMobile(event.target.value)}
                    placeholder="Mobile number"
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />

                  <input
                    type="number"
                    value={newPatientAge}
                    onChange={(event) => setNewPatientAge(event.target.value)}
                    placeholder="Age"
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />

                  <select
                    value={newPatientGender}
                    onChange={(event) =>
                      setNewPatientGender(
                        event.target.value as "Male" | "Female" | "Other"
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    type="text"
                    value={newPatientAddress}
                    onChange={(event) => setNewPatientAddress(event.target.value)}
                    placeholder="Address / locality optional"
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                  />

                  <textarea
                    value={newPatientNotes}
                    onChange={(event) => setNewPatientNotes(event.target.value)}
                    placeholder="Notes optional"
                    className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleCreateTemporaryPatient}
                    className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                  >
                    Create Patient
                  </button>

                  <button
                    onClick={() => setShowRegistrationForm(false)}
                    className="rounded-xl bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedPatient && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">
                      Selected Patient
                    </p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {selectedPatient.name}
                    </p>

                    <p className="text-sm text-slate-600">
                      {selectedPatient.age} yrs / {selectedPatient.gender}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {selectedPatient.uhid} · {selectedPatient.mobile}
                    </p>

                    {selectedPatient.notes && (
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedPatient.notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleClearSelection}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Change
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                    Proceed to Payment
                  </button>

                  <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
                    Mark as Follow-Up
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Search Patient
              </button>

              <button
                onClick={handleOpenRegistration}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
              >
                Register New Patient
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}