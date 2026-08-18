import { ClinicSettings, clinicSettings } from "../../lib/clinicSettings";
import {
  RefundPaymentMode,
  RefundRequest,
} from "../../lib/refundRequestDb";
import { QueueItem } from "../../types/queue";

type RefundReceiptPreviewProps = {
  patient: QueueItem | null;
  refundRequest: RefundRequest | null;
  paymentMode: RefundPaymentMode;
  receiptNumber: string;
  refundedAt: string;
  clinicSettingsOverride?: ClinicSettings;
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

export default function RefundReceiptPreview({
  patient,
  refundRequest,
  paymentMode,
  receiptNumber,
  refundedAt,
  clinicSettingsOverride,
}: RefundReceiptPreviewProps) {
  const activeClinicSettings = clinicSettingsOverride || clinicSettings;

  if (!patient || !refundRequest) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a processed refund to print the refund receipt.
      </div>
    );
  }

  return (
    <div className="receipt-print-area rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold tracking-tight">
              {activeClinicSettings.clinicName}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {activeClinicSettings.address}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {activeClinicSettings.phone}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Refund against consultation payment
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Refund Receipt
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {receiptNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-500">Patient</p>
          <p className="font-semibold text-slate-900">
            {patient.patientName}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">UHID</p>
          <p className="font-semibold text-slate-900">{patient.uhid}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Date / Time</p>
          <p className="font-semibold text-slate-900">
            {formatDateTime(refundedAt)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Age / Gender</p>
          <p className="font-semibold text-slate-900">
            {patient.age} yrs / {patient.gender}
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="text-xs font-medium text-slate-500">
            Original Consultation Receipt
          </p>
          <p className="font-semibold text-slate-900">
            {refundRequest.originalReceiptNumber || "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Refund Details
        </p>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Original Amount Paid
            </div>

            <div className="px-4 py-3 text-right font-semibold">
              ₹{refundRequest.originalPaidAmount}
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Amount Refunded
            </div>

            <div className="px-4 py-3 text-right font-bold text-red-700">
              ₹{refundRequest.refundAmount}
            </div>
          </div>

          <div className="grid grid-cols-2 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Refund Mode
            </div>

            <div className="px-4 py-3 text-right font-semibold">
              {paymentMode}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Refund Reason
          </p>

          <p className="mt-1 text-sm text-slate-800">
            {refundRequest.reason}
          </p>
        </div>

        {refundRequest.notes && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Doctor Note
            </p>

            <p className="mt-1 text-sm text-slate-800">
              {refundRequest.notes}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between border-t border-slate-300 pt-5 text-xs text-slate-500">
        <p>Refund processed.</p>
        <p>Generated by Eye Clinic App</p>
      </div>
    </div>
  );
}
