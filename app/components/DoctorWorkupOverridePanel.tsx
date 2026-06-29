"use client";

import { useEffect, useState } from "react";
import { Patient } from "../../types/patient";
import { OptometristWorkup, QueueItem } from "../../types/queue";
import VisionTable from "./VisionTable";

type DoctorWorkupOverridePanelProps = {
  patient: QueueItem | null;
  canSendBackToOptometrist: boolean;
  onSendBackToOptometrist: () => void;
  onSavePatientDetails: (
    patientName: string,
    age: number,
    gender: Patient["gender"]
  ) => void;
  onSaveWorkup: (workup: OptometristWorkup) => void;
  onEditModeChange?: (isEditing: boolean) => void;
};

const emptyVisionEntry = {
  distanceOD: "",
  distanceOS: "",
  nearOD: "",
  nearOS: "",
};

const emptySpectacleRow = {
  sph: "",
  cyl: "",
  axis: "",
  vision: "",
};

const emptySpectacleAdvice = {
  od: { ...emptySpectacleRow },
  os: { ...emptySpectacleRow },
  add: { ...emptySpectacleRow },
  remarks: "",
};

const emptyWorkup: OptometristWorkup = {
  chiefComplaint: "",
  vision: {
    unaided: { ...emptyVisionEntry },
    withGlasses: { ...emptyVisionEntry },
    withPinHole: { ...emptyVisionEntry },
  },
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  spectacleDraft: emptySpectacleAdvice,
};

export default function DoctorWorkupOverridePanel({
  patient,
  canSendBackToOptometrist,
  onSendBackToOptometrist,
  onSavePatientDetails,
  onSaveWorkup,
  onEditModeChange,
}: DoctorWorkupOverridePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Patient["gender"]>("Male");
  const [workup, setWorkup] = useState<OptometristWorkup>(emptyWorkup);

  useEffect(() => {
    if (!patient) {
      setPatientName("");
      setAge("");
      setGender("Male");
      setWorkup(emptyWorkup);
      setIsEditing(false);
      onEditModeChange?.(false);
      return;
    }

    setPatientName(patient.patientName);
    setAge(String(patient.age));
    setGender(patient.gender);

    setWorkup({
      ...emptyWorkup,
      ...patient.optometristWorkup,
      vision: {
        ...emptyWorkup.vision,
        ...patient.optometristWorkup?.vision,
      },
      spectacleDraft: {
        ...emptyWorkup.spectacleDraft,
        ...patient.optometristWorkup?.spectacleDraft,
      },
    });

    setIsEditing(false);
    onEditModeChange?.(false);
  }, [patient?.id, onEditModeChange]);

  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a patient to view patient and workup details.
      </div>
    );
  }

  function updateWorkupField<K extends keyof OptometristWorkup>(
    field: K,
    value: OptometristWorkup[K]
  ) {
    setWorkup((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSave() {
    if (!patientName.trim() || !age) {
      alert("Please enter patient name and age.");
      return;
    }

    onSavePatientDetails(patientName.trim(), Number(age), gender);
    onSaveWorkup(workup);
    setIsEditing(false);
    onEditModeChange?.(false);
  }

  if (!isEditing) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Current Patient & Workup
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              #{patient.tokenNumber} · {patient.patientName}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {patient.age} yrs / {patient.gender} · {patient.uhid}
            </p>

            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Status: {patient.status}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canSendBackToOptometrist && (
              <button
                onClick={onSendBackToOptometrist}
                className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
              >
                Send Back to Optometrist
              </button>
            )}

            <button
              onClick={() => {
                setIsEditing(true);
                onEditModeChange?.(true);
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Edit Patient / Workup
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Chief Complaint
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {workup.chiefComplaint || "Not entered"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">IOP / Pressure</p>
            <p className="mt-1 text-sm text-slate-800">
              Right: {workup.iopRight || "Not entered"} · Left:{" "}
              {workup.iopLeft || "Not entered"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Refraction</p>
            <p className="mt-1 text-sm text-slate-800">
              Right: {workup.refractionRight || "Not entered"} · Left:{" "}
              {workup.refractionLeft || "Not entered"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Dilation</p>
            <p className="mt-1 text-sm text-slate-800">
              {workup.dilationStatus}
              {workup.dilationNotes ? ` · ${workup.dilationNotes}` : ""}
            </p>
          </div>
        </div>
        {workup.optometristNotes ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Optometrist Notes / Workup Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-blue-900">
              {workup.optometristNotes}
            </p>
            <p className="mt-2 text-xs text-blue-700">
              Internal note only. Doctor may copy and edit relevant points into
              findings or advice if needed.
            </p>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Vision / VA
          </p>

          <VisionTable value={workup.vision} readOnly />
        </div>

        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-xs font-medium text-indigo-700">
            Spectacle Draft
          </p>
          <p className="mt-1 text-sm text-indigo-900">
            Optometrist spectacle draft is used to prefill the editable doctor
            spectacle advice section below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Edit Patient / Workup
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Doctor/admin can correct patient details or complete workup directly
            when needed.
          </p>
        </div>

        <button
          onClick={() => {
            setIsEditing(false);
            onEditModeChange?.(false);
          }}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Patient Details</p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Age
              <input
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Gender
              <select
                value={gender}
                onChange={(event) =>
                  setGender(event.target.value as Patient["gender"])
                }
                className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Workup Details</p>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Chief Complaint
              <textarea
                value={workup.chiefComplaint}
                onChange={(event) =>
                  updateWorkupField("chiefComplaint", event.target.value)
                }
                placeholder="Chief complaint"
                className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
              />
            </label>

            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Vision / VA
              </p>

              <VisionTable
                value={workup.vision}
                onChange={(row, field, value) => {
                  setWorkup((current) => ({
                    ...current,
                    vision: {
                      ...current.vision,
                      [row]: {
                        ...current.vision[row],
                        [field]: value,
                      },
                    },
                  }));
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Refraction Right
                <input
                  type="text"
                  value={workup.refractionRight}
                  onChange={(event) =>
                    updateWorkupField("refractionRight", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Refraction Left
                <input
                  type="text"
                  value={workup.refractionLeft}
                  onChange={(event) =>
                    updateWorkupField("refractionLeft", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                IOP / Pressure Right
                <input
                  type="text"
                  value={workup.iopRight}
                  onChange={(event) =>
                    updateWorkupField("iopRight", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                IOP / Pressure Left
                <input
                  type="text"
                  value={workup.iopLeft}
                  onChange={(event) =>
                    updateWorkupField("iopLeft", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Dilation Status
                <select
                  value={workup.dilationStatus}
                  onChange={(event) =>
                    updateWorkupField(
                      "dilationStatus",
                      event.target.value as OptometristWorkup["dilationStatus"]
                    )
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                >
                  <option value="Not Done">Not Done</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Done">Done</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Dilation Notes
                <input
                  type="text"
                  value={workup.dilationNotes}
                  onChange={(event) =>
                    updateWorkupField("dilationNotes", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
          >
            Save Patient / Workup Corrections
          </button>

          <button
            onClick={() => {
              setIsEditing(false);
              onEditModeChange?.(false);
            }}
            className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}