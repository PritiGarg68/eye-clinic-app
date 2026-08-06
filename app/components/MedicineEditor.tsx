import { useMemo, useState } from "react";
import { MedicineMaster } from "../../lib/medicineMasterDb";
import { MedicineRow } from "../../types/queue";

type MedicineEditorProps = {
  medicines: MedicineRow[];
  medicineMasterOptions: MedicineMaster[];
  frequencyOptions: string[];
  durationOptions: string[];
  instructionOptions: string[];
  onAddMedicine: () => void;
  onUpdateMedicine: (
    medicineId: string,
    field: keyof MedicineRow,
    value: MedicineRow[keyof MedicineRow]
  ) => void;
  onRemoveMedicine: (medicineId: string) => void;
};

function mapMasterEyeToPrescriptionEye(
  eye: MedicineMaster["defaultEye"]
): MedicineRow["eye"] | null {
  switch (eye) {
    case "OD":
    case "Right Eye":
      return "Right Eye";

    case "OS":
    case "Left Eye":
      return "Left Eye";

    case "OU":
    case "Both Eyes":
      return "Both Eyes";

    case "Oral":
      return "Oral";

    case "Other":
      return "Other";

    default:
      return null;
  }
}

type EditableSuggestionInputProps = {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
};

function EditableSuggestionInput({
  label,
  value,
  options,
  placeholder,
  onChange,
}: EditableSuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const filteredOptions = useMemo(() => {
    if (showAllOptions) {
      return options;
    }

    const searchText = value.trim().toLowerCase();

    if (!searchText) {
      return options;
    }

    const matchingOptions = options.filter((option) =>
      option.toLowerCase().includes(searchText)
    );

    /*
     * When the value exactly matches one option, still show the complete
     * list so the doctor can immediately choose an alternative.
     */
    const hasExactMatch = options.some(
      (option) => option.toLowerCase() === searchText
    );

    return hasExactMatch ? options : matchingOptions;
  }, [options, showAllOptions, value]);

  return (
    <label className="relative grid gap-1.5 text-xs font-medium text-slate-600">
      {label}

      <div className="relative">
        <input
          type="text"
          value={value}
          onFocus={() => {
            setShowAllOptions(true);
            setIsOpen(true);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setShowAllOptions(false);
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
        />

        <button
          type="button"
          aria-label={`Show ${label.toLowerCase()} suggestions`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setShowAllOptions(true);
            setIsOpen((current) => !current);
          }}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-600 hover:text-slate-900"
        >
          <span className="text-xs">▼</span>
        </button>

        {isOpen && (
          <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option);
                    setShowAllOptions(false);
                    setIsOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 ${
                    option.toLowerCase() === value.trim().toLowerCase()
                      ? "bg-indigo-50 font-semibold text-indigo-900"
                      : "text-slate-800"
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">
                No matching master value. Continue typing to use your own value.
              </div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

export default function MedicineEditor({
  medicines,
  medicineMasterOptions,
  frequencyOptions,
  durationOptions,
  instructionOptions,
  onAddMedicine,
  onUpdateMedicine,
  onRemoveMedicine,
}: MedicineEditorProps) {
  const [pendingSuggestionByMedicineId, setPendingSuggestionByMedicineId] =
    useState<Record<string, string>>({});

  function clearPendingSuggestion(medicineId: string) {
    setPendingSuggestionByMedicineId((current) => {
      if (!current[medicineId]) {
        return current;
      }

      const next = { ...current };
      delete next[medicineId];
      return next;
    });
  }

  function updatePrescriptionField(
    medicineId: string,
    field: "eye" | "frequency" | "duration" | "instructions",
    value: MedicineRow[typeof field]
  ) {
    clearPendingSuggestion(medicineId);
    onUpdateMedicine(medicineId, field, value);
  }

  function medicineHasSuggestedValues(master: MedicineMaster) {
    return Boolean(
      mapMasterEyeToPrescriptionEye(master.defaultEye) ||
        master.defaultFrequency.trim() ||
        master.defaultDuration.trim() ||
        master.defaultInstructions.trim()
    );
  }

  function suggestionsDifferFromRow(
    medicine: MedicineRow,
    master: MedicineMaster
  ) {
    const suggestedEye = mapMasterEyeToPrescriptionEye(master.defaultEye);

    return Boolean(
      (suggestedEye && suggestedEye !== medicine.eye) ||
        (master.defaultFrequency.trim() &&
          master.defaultFrequency.trim() !== medicine.frequency.trim()) ||
        (master.defaultDuration.trim() &&
          master.defaultDuration.trim() !== medicine.duration.trim()) ||
        (master.defaultInstructions.trim() &&
          master.defaultInstructions.trim() !== medicine.instructions.trim())
    );
  }

  function applyMasterSuggestions(
    medicine: MedicineRow,
    master: MedicineMaster
  ) {
    const suggestedEye = mapMasterEyeToPrescriptionEye(master.defaultEye);

    if (suggestedEye) {
      onUpdateMedicine(medicine.id, "eye", suggestedEye);
    }

    if (master.defaultFrequency.trim()) {
      onUpdateMedicine(
        medicine.id,
        "frequency",
        master.defaultFrequency
      );
    }

    if (master.defaultDuration.trim()) {
      onUpdateMedicine(
        medicine.id,
        "duration",
        master.defaultDuration
      );
    }

    if (master.defaultInstructions.trim()) {
      onUpdateMedicine(
        medicine.id,
        "instructions",
        master.defaultInstructions
      );
    }

    clearPendingSuggestion(medicine.id);
  }

  function handleMedicineNameChange(
    medicine: MedicineRow,
    medicineName: string
  ) {
    onUpdateMedicine(medicine.id, "medicineName", medicineName);

    const selectedMaster = medicineMasterOptions.find(
      (option) =>
        option.medicineName.trim().toLowerCase() ===
        medicineName.trim().toLowerCase()
    );

    if (!selectedMaster) {
      clearPendingSuggestion(medicine.id);
      return;
    }

    const rowLooksUntouched =
      medicine.eye === "Both Eyes" &&
      !medicine.frequency.trim() &&
      !medicine.duration.trim() &&
      !medicine.instructions.trim();

    if (rowLooksUntouched) {
      applyMasterSuggestions(medicine, selectedMaster);
      return;
    }

    if (
      medicineHasSuggestedValues(selectedMaster) &&
      suggestionsDifferFromRow(medicine, selectedMaster)
    ) {
      setPendingSuggestionByMedicineId((current) => ({
        ...current,
        [medicine.id]: selectedMaster.id,
      }));
      return;
    }

    clearPendingSuggestion(medicine.id);
  }

  function applyInstructionSuggestion(
    medicine: MedicineRow,
    instruction: string
  ) {
    clearPendingSuggestion(medicine.id);

    const currentInstructions = medicine.instructions.trim();

    if (!currentInstructions) {
      onUpdateMedicine(medicine.id, "instructions", instruction);
      return;
    }

    if (
      currentInstructions.toLowerCase().includes(
        instruction.trim().toLowerCase()
      )
    ) {
      return;
    }

    onUpdateMedicine(
      medicine.id,
      "instructions",
      `${currentInstructions}\n${instruction}`
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Medicines</p>
          <p className="mt-1 text-xs text-slate-500">
            Select master suggestions or type freely. Suggested values remain
            fully editable for each prescription.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddMedicine}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No medicines added yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {medicines.map((medicine, index) => {
            const pendingMasterId =
              pendingSuggestionByMedicineId[medicine.id];

            const pendingMaster = pendingMasterId
              ? medicineMasterOptions.find(
                  (option) => option.id === pendingMasterId
                )
              : undefined;

            return (
              <div
                key={medicine.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">
                    Medicine #{index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => onRemoveMedicine(medicine.id)}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <EditableSuggestionInput
                    label="Medicine Name"
                    value={medicine.medicineName}
                    options={medicineMasterOptions.map(
                      (option) => option.medicineName
                    )}
                    placeholder="Select or type medicine name"
                    onChange={(value) =>
                      handleMedicineNameChange(medicine, value)
                    }
                  />

                  <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                    Eye / Route
                    <select
                      value={medicine.eye}
                      onChange={(event) =>
                        updatePrescriptionField(
                          medicine.id,
                          "eye",
                          event.target.value as MedicineRow["eye"]
                        )
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                    >
                      <option value="Both Eyes">Both Eyes</option>
                      <option value="Right Eye">Right Eye</option>
                      <option value="Left Eye">Left Eye</option>
                      <option value="Oral">Oral</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  {pendingMaster && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 md:col-span-2">
                      <span>
                        Suggested values are available for{" "}
                        <strong>{pendingMaster.medicineName}</strong>.
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          applyMasterSuggestions(
                            medicine,
                            pendingMaster
                          )
                        }
                        className="font-semibold text-indigo-800 underline underline-offset-2 hover:text-indigo-950"
                      >
                        Apply suggested values
                      </button>
                    </div>
                  )}

                  <EditableSuggestionInput
                    label="Frequency"
                    value={medicine.frequency}
                    options={frequencyOptions}
                    placeholder="Select or type frequency"
                    onChange={(value) =>
                      updatePrescriptionField(
                        medicine.id,
                        "frequency",
                        value
                      )
                    }
                  />

                  <EditableSuggestionInput
                    label="Duration"
                    value={medicine.duration}
                    options={durationOptions}
                    placeholder="Select or type duration"
                    onChange={(value) =>
                      updatePrescriptionField(
                        medicine.id,
                        "duration",
                        value
                      )
                    }
                  />

                  <label className="grid gap-1.5 text-xs font-medium text-slate-600 md:col-span-2">
                    Instructions
                    <textarea
                      value={medicine.instructions}
                      onChange={(event) =>
                        updatePrescriptionField(
                          medicine.id,
                          "instructions",
                          event.target.value
                        )
                      }
                      placeholder="Instructions optional"
                      className="min-h-20 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                    />
                  </label>

                  {instructionOptions.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium text-slate-500">
                        Instruction suggestions
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {instructionOptions.map((instruction) => (
                          <button
                            key={instruction}
                            type="button"
                            onClick={() =>
                              applyInstructionSuggestion(
                                medicine,
                                instruction
                              )
                            }
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                          >
                            {instruction}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAddMedicine}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add Another Medicine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
