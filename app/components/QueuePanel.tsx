import { QueueItem } from "../../types/queue";
import {
  getAdditionalServiceNames,
  getAdditionalServiceTotalPaid,
  getLatestPaidAdditionalService,
  getPaidAdditionalServices,
  getPendingAdditionalService,
} from "../../lib/additionalServiceUtils";

type QueuePanelProps = {
  items: QueueItem[];
  selectedItemId?: string;
  onSelectItem: (item: QueueItem) => void;
};

function getStatusStyles(status: QueueItem["status"]) {
  if (status === "Additional Payment Pending") {
    return {
      card: "border-red-300 bg-red-50 hover:border-red-500",
      badge: "bg-red-600 text-white",
    };
  }

  if (status === "Ready for Doctor") {
    return {
      card: "border-emerald-200 bg-emerald-50 hover:border-emerald-400",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "Under Consultation") {
    return {
      card: "border-blue-200 bg-blue-50 hover:border-blue-400",
      badge: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "Under Optometry" || status === "Needs Optometry Review") {
    return {
      card: "border-amber-200 bg-amber-50 hover:border-amber-400",
      badge: "bg-amber-100 text-amber-700",
    };
  }

  if (status === "Completed") {
    return {
      card: "border-slate-200 bg-slate-50 hover:border-slate-400",
      badge: "bg-slate-200 text-slate-700",
    };
  }

  return {
    card: "border-slate-200 bg-white hover:border-slate-400",
    badge: "bg-slate-100 text-slate-700",
  };
}

export default function QueuePanel({
  items,
  selectedItemId,
  onSelectItem,
}: QueuePanelProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        No patients in this queue.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const pendingService = getPendingAdditionalService(item);
        const latestPaidService = getLatestPaidAdditionalService(item);
        const paidServices = getPaidAdditionalServices(item);
        const totalAdditionalPaid = getAdditionalServiceTotalPaid(item);
        const pendingServiceNames = getAdditionalServiceNames(pendingService);
        const latestPaidServiceNames =
          getAdditionalServiceNames(latestPaidService);

        const styles = getStatusStyles(item.status);
        const isSelected = selectedItemId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className={`rounded-xl border p-4 text-left transition ${
              styles.card
            } ${isSelected ? "ring-2 ring-slate-900" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  #{item.tokenNumber} · {item.patientName}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {item.age} yrs / {item.gender}
                </p>

                <p className="mt-1 text-xs text-slate-500">{item.uhid}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}
              >
                {item.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white px-3 py-1">
                {item.visitType}
              </span>

              <span className="rounded-full bg-white px-3 py-1">
                Consultation paid ₹{item.amountPaid}
              </span>

              <span className="rounded-full bg-white px-3 py-1">
                {item.paymentMode}
              </span>
            </div>

            {pendingService && (
              <div className="mt-3 rounded-xl bg-red-600 p-3 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                  Additional Payment Pending
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {pendingServiceNames}
                </p>

                <p className="mt-1 text-lg font-bold">
                  Collect ₹{pendingService.netAmount}
                </p>
              </div>
            )}

            {!pendingService && latestPaidService && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Additional Tests Paid
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {latestPaidServiceNames}
                </p>

                <p className="mt-1 text-sm font-bold text-emerald-800">
                  Paid ₹{latestPaidService.netAmount}
                  {latestPaidService.paymentMode
                    ? ` · ${latestPaidService.paymentMode}`
                    : ""}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Next: {item.status}
                </p>

                {paidServices.length > 1 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Total additional paid this visit: ₹{totalAdditionalPaid}
                  </p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}