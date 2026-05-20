import { VisionEntry } from "../../types/queue";

type VisionRows = {
  unaided: VisionEntry;
  withGlasses: VisionEntry;
  withPinHole: VisionEntry;
};

type VisionRowKey = keyof VisionRows;
type VisionFieldKey = keyof VisionEntry;

type VisionTableProps = {
  value: VisionRows;
  readOnly?: boolean;
  onChange?: (
    row: VisionRowKey,
    field: VisionFieldKey,
    value: string
  ) => void;
};

const visionRowLabels: Record<VisionRowKey, string> = {
  unaided: "Unaided",
  withGlasses: "With Glasses",
  withPinHole: "With Pin Hole",
};

export default function VisionTable({
  value,
  readOnly = false,
  onChange,
}: VisionTableProps) {
  function renderCell(row: VisionRowKey, field: VisionFieldKey) {
    const cellValue = value[row]?.[field] || "";

    if (readOnly) {
      return (
        <span className="text-sm text-slate-800">
          {cellValue || "—"}
        </span>
      );
    }

    return (
      <input
        type="text"
        value={cellValue}
        onChange={(event) => onChange?.(row, field, event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-slate-500"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
              Vision
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Distance OD
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Distance OS
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Near OD
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Near OS
            </th>
          </tr>
        </thead>

        <tbody>
          {(Object.keys(visionRowLabels) as VisionRowKey[]).map((rowKey) => (
            <tr key={rowKey}>
              <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                {visionRowLabels[rowKey]}
              </td>

              <td className="border border-slate-200 p-2">
                {renderCell(rowKey, "distanceOD")}
              </td>

              <td className="border border-slate-200 p-2">
                {renderCell(rowKey, "distanceOS")}
              </td>

              <td className="border border-slate-200 p-2">
                {renderCell(rowKey, "nearOD")}
              </td>

              <td className="border border-slate-200 p-2">
                {renderCell(rowKey, "nearOS")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}