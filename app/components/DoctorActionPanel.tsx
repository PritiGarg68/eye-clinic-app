type DoctorActionPanelProps = {
  patientSelected: boolean;
  consultationActive: boolean;
  consultationCompleted: boolean;
  dilationWaiting: boolean;
  onStartConsultation: () => void;
  onSaveDraft: () => void;
  onPreviewPrescription: () => void;
  onPrintPrescription: () => void;
  onPrintSpectacleAdvice: () => void;
  onOpenAdditionalServicePanel: () => void;
  onSendForDilation: () => void;
  onCompleteConsultation: () => void;
};

const enabledButton =
  "rounded-xl px-3 py-2 text-sm font-medium transition-colors";

const disabledButton =
  "cursor-not-allowed rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400";

export default function DoctorActionPanel({
  patientSelected,
  consultationActive,
  consultationCompleted,
  dilationWaiting,
  onStartConsultation,
  onSaveDraft,
  onPreviewPrescription,
  onPrintPrescription,
  onPrintSpectacleAdvice,
  onOpenAdditionalServicePanel,
  onSendForDilation,
  onCompleteConsultation,
}: DoctorActionPanelProps) {
  const consultationActionsDisabled = !consultationActive;

  const startLabel = !patientSelected
    ? "Select Patient First"
    : consultationActive
      ? "Consultation Started"
      : dilationWaiting
        ? "Waiting for Dilation"
        : consultationCompleted
          ? "Reopen Consultation"
          : "Start Consultation";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Doctor Actions</p>
      <p className="mt-1 text-xs text-slate-500">
        Start the consultation before entering or issuing clinical advice.
      </p>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={!patientSelected || consultationActive || dilationWaiting}
          onClick={onStartConsultation}
          className={
            !patientSelected || consultationActive || dilationWaiting
              ? disabledButton
              : `${enabledButton} bg-slate-200 text-slate-700 hover:bg-slate-300`
          }
        >
          {startLabel}
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onSaveDraft}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-slate-900 text-white hover:bg-slate-800`
          }
        >
          Save Draft
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onPreviewPrescription}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-slate-100 text-slate-700 hover:bg-slate-200`
          }
        >
          Preview Prescription
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onPrintPrescription}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-blue-700 text-white hover:bg-blue-800`
          }
        >
          Print Prescription
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onPrintSpectacleAdvice}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-indigo-700 text-white hover:bg-indigo-800`
          }
        >
          Print Spectacle Advice
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onOpenAdditionalServicePanel}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-orange-700 text-white hover:bg-orange-800`
          }
        >
          Additional Test / Payment
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onSendForDilation}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-amber-700 text-white hover:bg-amber-800`
          }
        >
          Send for Dilation
        </button>

        <button
          type="button"
          disabled={consultationActionsDisabled}
          onClick={onCompleteConsultation}
          className={
            consultationActionsDisabled
              ? disabledButton
              : `${enabledButton} bg-emerald-700 text-white hover:bg-emerald-800`
          }
        >
          Complete Consultation
        </button>
      </div>
    </div>
  );
}
