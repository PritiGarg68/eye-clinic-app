import { QueueItem } from "../../types/queue";

type QueuePanelProps = {
  items: QueueItem[];
};

export default function QueuePanel({ items }: QueuePanelProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Queue will appear here
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                #{item.tokenNumber} · {item.patientName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {item.age} yrs / {item.gender}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {item.uhid}
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {item.status}
            </span>
          </div>

          <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-600">
            <p>{item.visitType}</p>
            <p>
              Paid: ₹{item.amountPaid} · {item.paymentMode}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}