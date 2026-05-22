import { MedicineRow } from "../../types/queue";

type MedicineEditorProps = {
  medicines: MedicineRow[];
  onAddMedicine: () => void;
  onUpdateMedicine: (
    medicineId: string,
    field: keyof MedicineRow,
    value: MedicineRow[keyof MedicineRow]
  ) => void;
  onRemoveMedicine: (medicineId: string) => void;
};

export default function MedicineEditor({
  medicines,
  onAddMedicine,
  onUpdateMedicine,
  onRemoveMedicine,
}: MedicineEditorProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Medicines</p>
          <p className="mt-1 text-xs text-slate-500">
            Add medicine rows for prescription draft.
          </p>
        </div>

        <button
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
          {medicines.map((medicine, index) => (
            <div
              key={medicine.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">
                  Medicine #{index + 1}
                </p>

                <button
                  onClick={() => onRemoveMedicine(medicine.id)}
                  className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={medicine.medicineName}
                  onChange={(event) =>
                    onUpdateMedicine(
                      medicine.id,
                      "medicineName",
                      event.target.value
                    )
                  }
                  placeholder="Medicine name"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />

                <select
                  value={medicine.eye}
                  onChange={(event) =>
                    onUpdateMedicine(
                      medicine.id,
                      "eye",
                      event.target.value as MedicineRow["eye"]
                    )
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                >
                  <option value="Both Eyes">Both Eyes</option>
                  <option value="Right Eye">Right Eye</option>
                  <option value="Left Eye">Left Eye</option>
                  <option value="Oral">Oral</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="text"
                  value={medicine.frequency}
                  onChange={(event) =>
                    onUpdateMedicine(
                      medicine.id,
                      "frequency",
                      event.target.value
                    )
                  }
                  placeholder="Frequency e.g. 4 times/day"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />

                <input
                  type="text"
                  value={medicine.duration}
                  onChange={(event) =>
                    onUpdateMedicine(
                      medicine.id,
                      "duration",
                      event.target.value
                    )
                  }
                  placeholder="Duration e.g. 7 days"
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />

                <textarea
                  value={medicine.instructions}
                  onChange={(event) =>
                    onUpdateMedicine(
                      medicine.id,
                      "instructions",
                      event.target.value
                    )
                  }
                  placeholder="Instructions optional"
                  className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
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