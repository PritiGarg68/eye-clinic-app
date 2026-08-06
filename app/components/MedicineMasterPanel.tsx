"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MedicineMaster,
  MedicineMasterEye,
  createMedicineInSupabase,
  fetchAllMedicinesFromSupabase,
  setMedicineActiveStatusInSupabase,
  updateMedicineInSupabase,
} from "../../lib/medicineMasterDb";

type StatusTone = "info" | "success" | "error";

const medicineEyeOptions: Array<{
  value: MedicineMasterEye | "";
  label: string;
}> = [
  { value: "", label: "No default" },
  { value: "Both Eyes", label: "Both Eyes" },
  { value: "Right Eye", label: "Right Eye" },
  { value: "Left Eye", label: "Left Eye" },
  { value: "Oral", label: "Oral" },
  { value: "Other", label: "Other" },
];

function getStatusClass(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function sortMedicinesForDisplay(medicines: MedicineMaster[]) {
  return [...medicines].sort((a, b) => {
    if (Number(a.isActive) !== Number(b.isActive)) {
      return Number(b.isActive) - Number(a.isActive);
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.medicineName.localeCompare(b.medicineName);
  });
}

export default function MedicineMasterPanel() {
  const [medicines, setMedicines] = useState<MedicineMaster[]>([]);
  const [editingMedicine, setEditingMedicine] =
    useState<MedicineMaster | null>(null);

  const [medicineName, setMedicineName] = useState("");
  const [defaultEye, setDefaultEye] = useState<MedicineMasterEye | "">("");
  const [defaultFrequency, setDefaultFrequency] = useState("");
  const [defaultDuration, setDefaultDuration] = useState("");
  const [defaultInstructions, setDefaultInstructions] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const medicineFormRef = useRef<HTMLDivElement | null>(null);

  const activeMedicines = useMemo(
    () => sortMedicinesForDisplay(medicines).filter(
      (medicine) => medicine.isActive
    ),
    [medicines]
  );

  const activeCount = activeMedicines.length;

  async function renumberActiveMedicines(ordered: MedicineMaster[]) {
    for (const [index, item] of ordered.entries()) {
      await updateMedicineInSupabase({
        id: item.id,
        medicineName: item.medicineName,
        defaultEye: item.defaultEye,
        defaultFrequency: item.defaultFrequency,
        defaultDuration: item.defaultDuration,
        defaultInstructions: item.defaultInstructions,
        sortOrder: index + 1,
        isActive: true,
      });
    }

    const storedActiveMedicines = sortMedicinesForDisplay(
      await fetchAllMedicinesFromSupabase()
    ).filter((item) => item.isActive);

    const orderingIsValid =
      storedActiveMedicines.length === ordered.length &&
      storedActiveMedicines.every(
        (item, index) =>
          item.id === ordered[index].id &&
          item.sortOrder === index + 1
      );

    if (!orderingIsValid) {
      throw new Error(
        "Medicine ordering could not be saved correctly. Please refresh and try again."
      );
    }
  }

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function loadMedicines(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      showStatus("Loading medicines...", "info");
    }

    try {
      const rows = await fetchAllMedicinesFromSupabase();
      setMedicines(rows);

      if (!options?.quiet) {
        showStatus(`Loaded ${rows.length} medicine(s).`, "success");
      }
    } catch (error) {
      setMedicines([]);
      showStatus(
        error instanceof Error ? error.message : "Could not load medicines.",
        "error"
      );
    }
  }

  useEffect(() => {
    void loadMedicines();
  }, []);

  function resetForm() {
    setEditingMedicine(null);
    setMedicineName("");
    setDefaultEye("");
    setDefaultFrequency("");
    setDefaultDuration("");
    setDefaultInstructions("");
  }

  function startEdit(medicine: MedicineMaster) {
    setEditingMedicine(medicine);
    setMedicineName(medicine.medicineName);
    setDefaultEye(medicine.defaultEye || "");
    setDefaultFrequency(medicine.defaultFrequency);
    setDefaultDuration(medicine.defaultDuration);
    setDefaultInstructions(medicine.defaultInstructions);
    showStatus(`Editing: ${medicine.medicineName}`, "info");

    window.requestAnimationFrame(() => {
      medicineFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleSaveMedicine() {
    const cleanName = medicineName.trim();

    if (!cleanName) {
      showStatus("Enter a medicine name first.", "error");
      return;
    }

    showStatus(
      editingMedicine ? "Updating medicine..." : "Adding medicine...",
      "info"
    );

    try {
      if (editingMedicine) {
        await updateMedicineInSupabase({
          id: editingMedicine.id,
          medicineName: cleanName,
          defaultEye: defaultEye || null,
          defaultFrequency,
          defaultDuration,
          defaultInstructions,
          sortOrder: editingMedicine.sortOrder,
          isActive: editingMedicine.isActive,
        });
      } else {
        await createMedicineInSupabase({
          medicineName: cleanName,
          defaultEye: defaultEye || null,
          defaultFrequency,
          defaultDuration,
          defaultInstructions,
          sortOrder: activeMedicines.length + 1,
        });
      }

      const successMessage = editingMedicine
        ? "Medicine updated."
        : "Medicine added.";

      const refreshedMedicines =
        await fetchAllMedicinesFromSupabase();

      const refreshedActiveMedicines =
        sortMedicinesForDisplay(refreshedMedicines).filter(
          (item) => item.isActive
        );

      await renumberActiveMedicines(refreshedActiveMedicines);

      resetForm();
      await loadMedicines({ quiet: true });
      showStatus(successMessage, "success");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Could not save medicine.",
        "error"
      );
    }
  }

  async function handleToggleActive(medicine: MedicineMaster) {
    const nextStatus = !medicine.isActive;

    showStatus(
      nextStatus ? "Reactivating medicine..." : "Deactivating medicine...",
      "info"
    );

    try {
      if (nextStatus) {
        const reactivatedMedicine: MedicineMaster = {
          ...medicine,
          isActive: true,
          sortOrder: activeMedicines.length + 1,
        };

        await updateMedicineInSupabase({
          id: medicine.id,
          medicineName: medicine.medicineName,
          defaultEye: medicine.defaultEye,
          defaultFrequency: medicine.defaultFrequency,
          defaultDuration: medicine.defaultDuration,
          defaultInstructions: medicine.defaultInstructions,
          sortOrder: reactivatedMedicine.sortOrder,
          isActive: true,
        });

        await renumberActiveMedicines([
          ...activeMedicines,
          reactivatedMedicine,
        ]);
      } else {
        await setMedicineActiveStatusInSupabase({
          id: medicine.id,
          isActive: false,
        });

        await renumberActiveMedicines(
          activeMedicines.filter((item) => item.id !== medicine.id)
        );
      }

      await loadMedicines({ quiet: true });
      showStatus(
        nextStatus ? "Medicine reactivated." : "Medicine deactivated.",
        "success"
      );
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update medicine status.",
        "error"
      );
    }
  }

  async function handleMoveMedicine(
    medicine: MedicineMaster,
    direction: "up" | "down"
  ) {
    if (!medicine.isActive) {
      showStatus("Inactive medicines cannot be moved. Reactivate first.", "error");
      return;
    }

    const ordered = [...activeMedicines];
    const currentIndex = ordered.findIndex((item) => item.id === medicine.id);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= ordered.length
    ) {
      return;
    }

    const moved = [...ordered];
    const [currentItem] = moved.splice(currentIndex, 1);
    moved.splice(targetIndex, 0, currentItem);

    showStatus("Updating medicine order...", "info");

    try {
      await renumberActiveMedicines(moved);

      await loadMedicines({ quiet: true });
      showStatus("Medicine order updated.", "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update medicine order.",
        "error"
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Medicine Master
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeCount} active of {medicines.length} total
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {statusMessage && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClass(
                statusTone
              )}`}
            >
              {statusMessage}
            </div>
          )}

          <div
            ref={medicineFormRef}
            className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
          >
            <p className="text-sm font-semibold text-indigo-900">
              {editingMedicine
                ? `Editing: ${editingMedicine.medicineName}`
                : "Add New Medicine"}
            </p>

            <p className="mt-2 text-sm text-indigo-800">
              Suggested values are optional starting points only. The doctor can
              change the eye or route, frequency, duration, and instructions for
              every prescription.
            </p>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Medicine Name
                <input
                  type="text"
                  value={medicineName}
                  onChange={(event) => setMedicineName(event.target.value)}
                  placeholder="Example: Moxifloxacin eye drops"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Suggested Eye / Route
                  <select
                    value={defaultEye}
                    onChange={(event) =>
                      setDefaultEye(
                        event.target.value as MedicineMasterEye | ""
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                  >
                    {medicineEyeOptions.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Display position is managed using the Up and Down buttons.
                </div>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Suggested Frequency
                  <input
                    type="text"
                    value={defaultFrequency}
                    onChange={(event) =>
                      setDefaultFrequency(event.target.value)
                    }
                    placeholder="Example: Four times daily"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Suggested Duration
                  <input
                    type="text"
                    value={defaultDuration}
                    onChange={(event) => setDefaultDuration(event.target.value)}
                    placeholder="Example: 1 week"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Suggested Instructions
                <textarea
                  value={defaultInstructions}
                  onChange={(event) =>
                    setDefaultInstructions(event.target.value)
                  }
                  placeholder="Optional default instructions"
                  className="min-h-20 rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveMedicine}
                  className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                >
                  {editingMedicine ? "Update Medicine" : "Add Medicine"}
                </button>

                {editingMedicine && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {medicines.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No medicines found.
              </div>
            ) : (
              sortMedicinesForDisplay(medicines).map((medicine) => {
                const activeIndex = activeMedicines.findIndex(
                  (item) => item.id === medicine.id
                );

                const canMoveUp =
                  medicine.isActive && activeIndex > 0;

                const canMoveDown =
                  medicine.isActive &&
                  activeIndex >= 0 &&
                  activeIndex < activeMedicines.length - 1;

                return (
                <div
                  key={medicine.id}
                  className={`rounded-xl border p-4 ${
                    medicine.isActive
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50 opacity-75"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {medicine.isActive && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Sort {medicine.sortOrder}
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            medicine.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {medicine.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-3 font-semibold text-slate-900">
                        {medicine.medicineName}
                      </p>

                      <div className="mt-2 grid gap-1 text-sm text-slate-600">
                        <p>
                          Suggested eye / route: {medicine.defaultEye || "None"}
                        </p>
                        <p>
                          Suggested frequency:{" "}
                          {medicine.defaultFrequency || "None"}
                        </p>
                        <p>
                          Suggested duration: {medicine.defaultDuration || "None"}
                        </p>
                        <p className="whitespace-pre-wrap">
                          Suggested instructions:{" "}
                          {medicine.defaultInstructions || "None"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveMedicine(medicine, "up")}
                        disabled={!canMoveUp}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑ Up
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveMedicine(medicine, "down")}
                        disabled={!canMoveDown}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓ Down
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(medicine)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(medicine)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          medicine.isActive
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                        }`}
                      >
                        {medicine.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
