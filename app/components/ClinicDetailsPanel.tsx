"use client";

import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import {
  ClinicIdentityInput,
  fetchClinicIdentityForAdmin,
  updateClinicIdentityInSupabase,
} from "../../lib/clinicSettings";

type StatusTone = "info" | "success" | "error";

const emptyClinicIdentity: ClinicIdentityInput = {
  clinicName: "",
  doctorName: "",
  doctorQualification: "",
  medicalRegistrationNumber: "",
  address: "",
  phone: "",
  email: "",
};

function getStatusClass(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

export default function ClinicDetailsPanel() {
  const [details, setDetails] =
    useState<ClinicIdentityInput>(emptyClinicIdentity);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function loadClinicDetails(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      showStatus("Loading clinic details...", "info");
    }

    try {
      const storedDetails = await fetchClinicIdentityForAdmin();
      setDetails(storedDetails);
      setLoaded(true);

      if (!options?.quiet) {
        showStatus("Clinic details loaded.", "success");
      }

      return storedDetails;
    } catch (error) {
      setLoaded(false);
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not load clinic details.",
        "error"
      );
      return null;
    }
  }

  useEffect(() => {
    void loadClinicDetails();
  }, []);

  function updateField(
    field: keyof ClinicIdentityInput,
    value: string
  ) {
    setDetails((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!loaded || saving) {
      return;
    }

    if (!details.clinicName.trim()) {
      showStatus("Clinic name is required.", "error");
      return;
    }

    if (!details.doctorName.trim()) {
      showStatus("Doctor name is required.", "error");
      return;
    }

    setSaving(true);
    showStatus("Saving clinic details...", "info");

    try {
      await updateClinicIdentityInSupabase(details);

      const refreshedDetails = await fetchClinicIdentityForAdmin();
      setDetails(refreshedDetails);

      showStatus("Clinic details saved.", "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not save clinic details.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Clinic Details"
      subtitle="Clinic identity used on receipts, prescriptions, and other clinic documents."
    >
      <div className="grid gap-4">
        {statusMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClass(
              statusTone
            )}`}
          >
            {statusMessage}
          </div>
        )}

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">
            Clinic Identity
          </p>

          <p className="mt-1 text-sm text-indigo-700">
            Changes here affect future clinic documents. Consultation fees are
            managed separately under Services.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Clinic Name
              <input
                type="text"
                value={details.clinicName}
                onChange={(event) =>
                  updateField("clinicName", event.target.value)
                }
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Phone Number(s)
              <input
                type="text"
                value={details.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+91 ..."
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Doctor Name
              <input
                type="text"
                value={details.doctorName}
                onChange={(event) =>
                  updateField("doctorName", event.target.value)
                }
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Qualification
              <input
                type="text"
                value={details.doctorQualification}
                onChange={(event) =>
                  updateField("doctorQualification", event.target.value)
                }
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Registration Number
              <input
                type="text"
                value={details.medicalRegistrationNumber}
                onChange={(event) =>
                  updateField("medicalRegistrationNumber", event.target.value)
                }
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={details.email}
                onChange={(event) => updateField("email", event.target.value)}
                disabled={!loaded || saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Address
              <textarea
                value={details.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                disabled={!loaded || saving}
                className="min-h-24 rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!loaded || saving}
                className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Clinic Details"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
