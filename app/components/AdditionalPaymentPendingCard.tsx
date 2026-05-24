import { PaymentMode, QueueItem } from "../../types/queue";
import {
  getAdditionalServiceNames,
  getPendingAdditionalService,
} from "../../lib/additionalServiceUtils";

type AdditionalPaymentPendingCardProps = {
  patient: QueueItem | null;
  paymentMode?: PaymentMode;
  onPaymentModeChange?: (paymentMode: PaymentMode) => void;
  onCollectPayment?: (serviceRequestId: string) => void;
  showActions?: boolean;
};

export default function AdditionalPaymentPendingCard({
  patient,
  paymentMode = "Cash",
  onPaymentModeChange,
  onCollectPayment,
  showActions = false,
}: AdditionalPaymentPendingCardProps) {
  const pendingService = getPendingAdditionalService(patient);

  if (!patient || !pendingService) {
    return null;
  }

  const serviceNames = getAdditionalServiceNames(pendingService);

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-700">
            Additional Payment Pending
          </p>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            #{patient.tokenNumber} · {patient.patientName}
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {patient.age} yrs / {patient.gender} · {patient.uhid}
          </p>
        </div>

        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
          COLLECT PAYMENT
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Tests / Services</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {serviceNames}
        </p>

        {pendingService.notes && (
          <p className="mt-2 text-sm text-slate-600">
            Note: {pendingService.notes}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-medium text-slate-500">Gross</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            ₹{pendingService.grossAmount}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-medium text-slate-500">Doctor Discount</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            ₹{pendingService.discount}
          </p>
        </div>

        <div className="rounded-xl bg-red-600 p-3 text-white">
          <p className="text-xs font-medium text-red-100">Amount to Collect</p>
          <p className="mt-1 text-2xl font-bold">
            ₹{pendingService.netAmount}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-3">
        <p className="text-xs font-medium text-slate-500">
          Route after payment
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {pendingService.routeAfterPayment}
        </p>
      </div>

      {showActions && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Payment Mode
            <select
              value={paymentMode}
              onChange={(event) =>
                onPaymentModeChange?.(event.target.value as PaymentMode)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-slate-500"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </label>

          <button
            onClick={() => onCollectPayment?.(pendingService.id)}
            className="self-end rounded-xl bg-red-700 px-4 py-3 font-medium text-white hover:bg-red-800"
          >
            Collect Payment
          </button>
        </div>
      )}
    </div>
  );
}