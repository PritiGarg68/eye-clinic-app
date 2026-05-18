"use client";

import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import { samplePatients } from "../../lib/samplePatients";

export default function ReceptionPage() {
  const [searchTerm, setSearchTerm] = useState("");

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

            <div className="grid gap-4 md:grid-cols-2">
              <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                Search Patient
              </button>

              <button className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300">
                Register New Patient
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}