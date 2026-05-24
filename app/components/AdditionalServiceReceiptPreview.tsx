import { clinicSettings } from "../../lib/clinicSettings";
import {
  AdditionalServiceRequest,
  PaymentMode,
  QueueItem,
} from "../../types/queue";
import { getAdditionalServiceNames } from "../../lib/additionalServiceUtils";

type AdditionalServiceReceiptPreviewProps = {
  patient: QueueItem | null;
  serviceRequest: AdditionalServiceRequest | null;
  paymentMode: PaymentMode;
};

export default function AdditionalServiceReceiptPreview({
  patient,
  serviceRequest,
  paymentMode,
}: AdditionalServiceReceiptPreviewProps) {
  const receiptDate = new Date().toLocaleString();

  if (!patient || !serviceRequest) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select a payment-pending patient to preview additional service receipt.
      </div>
    );
  }

  const serviceNames = getAdditionalServiceNames(serviceRequest);

  return (
    <div className="receipt-print-area rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="border-b border-slate-300 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold tracking-tight">
              {clinicSettings.clinicName}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {clinicSettings.address}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {clinicSettings.phone}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Receipt for additional test / procedure payment
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Additional Receipt
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              TEMP-ADD-{Date.now().toString().slice(-6)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-500">Patient</p>
          <p className="font-semibold text-slate-900">{patient.patientName}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">UHID</p>
          <p className="font-semibold text-slate-900">{patient.uhid}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Date / Time</p>
          <p className="font-semibold text-slate-900">{receiptDate}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Age / Gender</p>
          <p className="font-semibold text-slate-900">
            {patient.age} yrs / {patient.gender}
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="text-xs font-medium text-slate-500">Tests / Services</p>
          <p className="font-semibold text-slate-900">{serviceNames}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Payment Details</p>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Gross Amount
            </div>
            <div className="px-4 py-3 text-right font-semibold">
              ₹{serviceRequest.grossAmount}
            </div>
          </div>

          {serviceRequest.discount > 0 && (
            <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
              <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
                Doctor Discount
              </div>
              <div className="px-4 py-3 text-right font-semibold">
                ₹{serviceRequest.discount}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Amount Paid
            </div>
            <div className="px-4 py-3 text-right font-bold text-emerald-700">
              ₹{serviceRequest.netAmount}
            </div>
          </div>

          <div className="grid grid-cols-2 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Payment Mode
            </div>
            <div className="px-4 py-3 text-right font-semibold">
              {paymentMode}
            </div>
          </div>
        </div>

        {serviceRequest.notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Doctor Note</p>
            <p className="mt-1 text-sm text-slate-800">
              {serviceRequest.notes}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between border-t border-slate-300 pt-5 text-xs text-slate-500">
        <p>Thank you.</p>
        <p>Generated by Eye Clinic App</p>
      </div>
    </div>
  );
}