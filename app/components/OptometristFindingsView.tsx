import { OptometristWorkup } from "../../types/queue";
import VisionTable from "./VisionTable";

type OptometristFindingsViewProps = {
  workup?: OptometristWorkup;
  canSendBackToOptometrist: boolean;
  onSendBackToOptometrist: () => void;
};

export default function OptometristFindingsView({
  workup,
  canSendBackToOptometrist,
  onSendBackToOptometrist,
}: OptometristFindingsViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Optometrist Findings
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Workup entered by optometrist for doctor review.
          </p>
        </div>

        {canSendBackToOptometrist && (
          <button
            onClick={onSendBackToOptometrist}
            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
          >
            Send Back to Optometrist
          </button>
        )}
      </div>

      {workup ? (
        <div className="mt-4 grid gap-4">
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">
              Vision / VA
            </p>

            <VisionTable value={workup.vision} readOnly />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                Refraction Right
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.refractionRight || "Not entered"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                Refraction Left
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.refractionLeft || "Not entered"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">IOP Right</p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.iopRight || "Not entered"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">IOP Left</p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.iopLeft || "Not entered"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                Dilation Status
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.dilationStatus}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                Dilation Notes
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {workup.dilationNotes || "Not entered"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs font-medium text-indigo-700">
              Spectacle Draft
            </p>
            <p className="mt-1 text-sm text-indigo-900">
              Optometrist spectacle draft has been prefilled into the editable
              doctor spectacle advice section below.
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              Doctor may edit/finalise those values before printing spectacle
              advice.
            </p>
          </div>

          {workup.updatedAt && (
            <p className="text-xs text-slate-400">
              Last saved: {new Date(workup.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No optometrist workup saved yet.
        </div>
      )}
    </div>
  );
}