import { PaymentMode, VisitType } from "../../types/queue";
import { Patient } from "../../types/patient";
import { clinicSettings } from "../../lib/clinicSettings";
type ReceiptPreviewProps = {
  patient: Patient | null;
  visitType: VisitType;
  paymentMode: PaymentMode;
  consultationFee: number;
  discount: number;
  amountPaid: number;
};

export default function ReceiptPreview({
  patient,
  visitType,
  paymentMode,
  consultationFee,
  discount,
  amountPaid,
}: ReceiptPreviewProps) {
  const receiptDate = new Date().toLocaleString();
  const netAmount = Math.max(consultationFee - discount, 0);

  if (!patient) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        Select or register a patient to preview receipt.
      </div>
    );
  }

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
  Receipt for consultation payment
</p>
          </div>

          <div className="rounded-lg border border-slate-200 px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Receipt
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              TEMP-{Date.now().toString().slice(-6)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-500">Patient</p>
          <p className="font-semibold text-slate-900">{patient.name}</p>
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

        <div>
          <p className="text-xs font-medium text-slate-500">Mobile</p>
          <p className="font-semibold text-slate-900">{patient.mobile}</p>
        </div>

        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-500">Visit Type</p>
          <p className="font-semibold text-slate-900">{visitType}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Payment Details</p>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Consultation Fee
            </div>
            <div className="px-4 py-3 text-right font-semibold">
              ₹{consultationFee}
            </div>
          </div>

          {discount > 0 && (
  <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
    <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
      Discount
    </div>
    <div className="px-4 py-3 text-right font-semibold">
      ₹{discount}
    </div>
  </div>
)}

          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Net Amount
            </div>
            <div className="px-4 py-3 text-right font-semibold">
              ₹{netAmount}
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 px-4 py-3 font-medium text-slate-600">
              Amount Paid
            </div>
            <div className="px-4 py-3 text-right font-bold text-emerald-700">
              ₹{amountPaid}
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
      </div>

      <div className="mt-6 flex justify-between border-t border-slate-300 pt-5 text-xs text-slate-500">
        <p>Thank you.</p>
        <p>Generated by Eye Clinic App</p>
      </div>
    </div>
  );
}