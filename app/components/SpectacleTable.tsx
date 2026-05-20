import { SpectacleDraftRow } from "../../types/queue";

type SpectacleRows = {
  od: SpectacleDraftRow;
  os: SpectacleDraftRow;
  add: SpectacleDraftRow;
};

type SpectacleRowKey = keyof SpectacleRows;
type SpectacleFieldKey = keyof SpectacleDraftRow;

type SpectacleTableProps = {
  value: SpectacleRows;
  readOnly?: boolean;
  onChange?: (
    row: SpectacleRowKey,
    field: SpectacleFieldKey,
    value: string
  ) => void;
};

const spectacleRowLabels: Record<SpectacleRowKey, string> = {
  od: "OD",
  os: "OS",
  add: "Add",
};

export default function SpectacleTable({
  value,
  readOnly = false,
  onChange,
}: SpectacleTableProps) {
  function renderCell(row: SpectacleRowKey, field: SpectacleFieldKey) {
    const cellValue = value[row]?.[field] || "";

    if (readOnly) {
      return <span className="text-sm text-slate-800">{cellValue || "—"}</span>;
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
              Eye
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Sph.
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Cyl.
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Axis
            </th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-700">
              Vision
            </th>
          </tr>
        </thead>

        <tbody>
          {(Object.keys(spectacleRowLabels) as SpectacleRowKey[]).map(
            (rowKey) => (
              <tr key={rowKey}>
                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                  {spectacleRowLabels[rowKey]}
                </td>

                <td className="border border-slate-200 p-2">
                  {renderCell(rowKey, "sph")}
                </td>

                <td className="border border-slate-200 p-2">
                  {renderCell(rowKey, "cyl")}
                </td>

                <td className="border border-slate-200 p-2">
                  {renderCell(rowKey, "axis")}
                </td>

                <td className="border border-slate-200 p-2">
                  {renderCell(rowKey, "vision")}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}