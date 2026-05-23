type DoctorActionPanelProps = {
    onStartConsultation: () => void;
    onSaveDraft: () => void;
    onPreviewPrescription: () => void;
    onPrintPrescription: () => void;
    onPrintSpectacleAdvice: () => void;
    onCompleteConsultation: () => void;
  };
  
  export default function DoctorActionPanel({
    onStartConsultation,
    onSaveDraft,
    onPreviewPrescription,
    onPrintPrescription,
    onPrintSpectacleAdvice,
    onCompleteConsultation,
  }: DoctorActionPanelProps) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
        <p className="text-sm font-semibold text-slate-900">Doctor Actions</p>
        <p className="mt-1 text-xs text-slate-500">
          Save, preview, print, or complete consultation.
        </p>
  
        <div className="mt-4 grid gap-3">
          <button
            onClick={onStartConsultation}
            className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Start Consultation
          </button>
  
          <button
            onClick={onSaveDraft}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save Draft
          </button>
  
          <button
            onClick={onPreviewPrescription}
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Preview Prescription
          </button>
  
          <button
            onClick={onPrintPrescription}
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            Print Prescription
          </button>
  
          <button
            onClick={onPrintSpectacleAdvice}
            className="rounded-xl bg-indigo-700 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Print Spectacle Advice
          </button>
  
          <button
            onClick={onCompleteConsultation}
            className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Complete Consultation
          </button>
        </div>
      </div>
    );
  }