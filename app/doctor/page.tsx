"use client";

import Link from "next/link";

import { pdf } from "@react-pdf/renderer";
import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import SpectacleTable from "../components/SpectacleTable";
import PrescriptionPreview from "../components/PrescriptionPreview";
import PrescriptionPdfDocument from "../components/PrescriptionPdfDocument";
import SpectaclePdfDocument from "../components/SpectaclePdfDocument";
import MedicineEditor from "../components/MedicineEditor";
import ClinicalTemplatePicker from "../components/ClinicalTemplatePicker";
import PatientHistoryPanel from "../components/PatientHistoryPanel";
import PatientAttachmentsPanel from "../components/PatientAttachmentsPanel";
import SpectacleAdvicePrint from "../components/SpectacleAdvicePrint";
import DoctorActionPanel from "../components/DoctorActionPanel";
import DoctorWorkupOverridePanel from "../components/DoctorWorkupOverridePanel";
import AdditionalServiceRequestPanel from "../components/AdditionalServiceRequestPanel";

import { sortQueueForRole } from "../../lib/queueSorting";
import {
  fetchTodayQueueFromSupabase,
  updateVisitStatusInSupabase,
} from "../../lib/queueDb";
import {
  fetchOptometristWorkupFromSupabase,
  saveOptometristWorkupToSupabase,
} from "../../lib/optometristWorkupDb";
import { getPendingAdditionalService } from "../../lib/additionalServiceUtils";
import { createOrUpdatePendingAdditionalServiceRequestInSupabase } from "../../lib/additionalServiceRequestDb";
import {
  cancelRefundRequestInSupabase,
  createRefundRequestInSupabase,
  fetchRefundRequestForVisitInSupabase,
  RefundRequest,
} from "../../lib/refundRequestDb";
import { fetchClinicalTemplatesFromSupabase } from "../../lib/clinicalTemplatesDb";
import {
  fetchActiveMedicinesFromSupabase,
  MedicineMaster,
} from "../../lib/medicineMasterDb";
import {
  fetchActiveSimpleMasterItemsFromSupabase,
} from "../../lib/simpleMasterDb";
import { updatePatientInSupabase } from "../../lib/patientsDb";
import { upsertFreeFollowUpEntitlementForVisit } from "../../lib/followUpEntitlementDb";
import {
  deleteGeneratedDocumentForVisit,
  upsertGeneratedDocumentToSupabase,
} from "../../lib/generatedDocumentsDb";
import {
  completeDoctorConsultationInSupabase,
  fetchDoctorConsultationFromSupabase,
  reopenDoctorConsultationInSupabase,
  saveDoctorConsultationDraftToSupabase,
} from "../../lib/doctorConsultationDb";
import { clinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";
import { Patient } from "../../types/patients";
import {
  AdditionalServiceRequest,
  DoctorConsultation,
  MedicineRow,
  OptometristWorkup,
  QueueItem,
  QueueStatus,
  SpectacleAdvice,
  SpectacleDraftRow,
} from "../../types/queue";

const emptySpectacleRow: SpectacleDraftRow = {
  sph: "",
  cyl: "",
  axis: "",
  vision: "",
};

const emptySpectacleAdvice: SpectacleAdvice = {
  od: { ...emptySpectacleRow },
  os: { ...emptySpectacleRow },
  add: { ...emptySpectacleRow },
  remarks: "",
};

const emptyWorkup: OptometristWorkup = {
  chiefComplaint: "",
  vision: {
    unaided: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
    withGlasses: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
    withPinHole: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
  },
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  optometristNotes: "",
  spectacleDraft: {
    od: { ...emptySpectacleRow },
    os: { ...emptySpectacleRow },
    add: { ...emptySpectacleRow },
    remarks: "",
  },
};

const emptyConsultation: DoctorConsultation = {
  findings: "",
  diagnosis: "",
  medicines: [],
  advice: "",
  followUpDate: "",
  freeFollowUpValidUntil: "",
  notes: "",
  finalSpectacleAdvice: emptySpectacleAdvice,
};

const emptyOptometristWorkup: OptometristWorkup = {
  chiefComplaint: "",
  vision: {
    unaided: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
    withGlasses: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
    withPinHole: {
      distanceOD: "",
      distanceOS: "",
      nearOD: "",
      nearOS: "",
    },
  },
  refractionRight: "",
  refractionLeft: "",
  iopRight: "",
  iopLeft: "",
  dilationStatus: "Not Done",
  dilationNotes: "",
  optometristNotes: "",
  spectacleDraft: emptySpectacleAdvice,
};

function getLocalTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasInvalidPastFollowUpDate(consultation: DoctorConsultation) {
  const today = getLocalTodayDateValue();

  return (
    Boolean(consultation.followUpDate && consultation.followUpDate < today) ||
    Boolean(
      consultation.freeFollowUpValidUntil &&
        consultation.freeFollowUpValidUntil < today
    )
  );
}

function normalizeOptometristWorkupForDoctor(
  savedWorkup?: Partial<OptometristWorkup> | null
): OptometristWorkup {
  return {
    ...emptyOptometristWorkup,
    ...savedWorkup,
    vision: {
      unaided: {
        ...emptyOptometristWorkup.vision.unaided,
        ...savedWorkup?.vision?.unaided,
      },
      withGlasses: {
        ...emptyOptometristWorkup.vision.withGlasses,
        ...savedWorkup?.vision?.withGlasses,
      },
      withPinHole: {
        ...emptyOptometristWorkup.vision.withPinHole,
        ...savedWorkup?.vision?.withPinHole,
      },
    },
    spectacleDraft: normalizeSpectacleAdvice(savedWorkup?.spectacleDraft),
  };
}

function normalizeSpectacleAdvice(
  savedAdvice?: Partial<SpectacleAdvice>
): SpectacleAdvice {
  return {
    od: {
      ...emptySpectacleAdvice.od,
      ...savedAdvice?.od,
    },
    os: {
      ...emptySpectacleAdvice.os,
      ...savedAdvice?.os,
    },
    add: {
      ...emptySpectacleAdvice.add,
      ...savedAdvice?.add,
    },
    remarks: savedAdvice?.remarks ?? "",
  };
}

function hasSpectacleAdviceValues(advice?: Partial<SpectacleAdvice>) {
  if (!advice) {
    return false;
  }

  const rows = [advice.od, advice.os, advice.add];

  return (
    rows.some((row) =>
      Object.values(row || {}).some((value) => String(value || "").trim())
    ) || Boolean(advice.remarks?.trim())
  );
}

function normalizeConsultation(
  savedConsultation?: Partial<DoctorConsultation>,
  optometristDraft?: SpectacleAdvice
): DoctorConsultation {
  const savedFinalSpectacleAdvice =
    savedConsultation?.finalSpectacleAdvice;

  /*
   * Use the optometrist spectacle draft only before a doctor consultation
   * has ever been saved. Once a doctor draft exists, preserve its final
   * spectacle state even when the doctor intentionally cleared all values.
   */
  const finalSpectacleAdvice = savedConsultation
    ? savedFinalSpectacleAdvice
    : optometristDraft;

  return {
    ...emptyConsultation,
    ...savedConsultation,
    findings: savedConsultation?.findings || "",
    diagnosis: savedConsultation?.diagnosis || "",
    medicines: savedConsultation?.medicines || [],
    finalSpectacleAdvice: normalizeSpectacleAdvice(finalSpectacleAdvice),
    optometristSpectacleBaseline:
      savedConsultation?.optometristSpectacleBaseline ||
      (optometristDraft
        ? normalizeSpectacleAdvice(optometristDraft)
        : undefined),
  };
}

type SpectacleRowKey = "od" | "os" | "add";
type SpectacleFieldKey = keyof SpectacleDraftRow;

type SpectacleConflict = {
  fieldLabel: string;
  doctorValue: string;
  optometristValue: string;
};

type SpectacleMergeResult = {
  mergedAdvice: SpectacleAdvice;
  optometristChanged: boolean;
  conflicts: SpectacleConflict[];
};

function spectacleValueEquals(left?: string, right?: string) {
  return String(left || "").trim() === String(right || "").trim();
}

function mergeReturnedOptometristSpectacleDraft(input: {
  baseline?: SpectacleAdvice;
  doctorAdvice: SpectacleAdvice;
  latestOptometristDraft: SpectacleAdvice;
}): SpectacleMergeResult {
  const doctorAdvice = normalizeSpectacleAdvice(input.doctorAdvice);
  const latestOptometristDraft = normalizeSpectacleAdvice(
    input.latestOptometristDraft
  );

  if (!input.baseline) {
    return {
      mergedAdvice: doctorAdvice,
      optometristChanged: false,
      conflicts: [],
    };
  }

  const baseline = normalizeSpectacleAdvice(input.baseline);
  const mergedAdvice = normalizeSpectacleAdvice(doctorAdvice);
  const conflicts: SpectacleConflict[] = [];
  let optometristChanged = false;

  const rowLabels: Record<SpectacleRowKey, string> = {
    od: "OD",
    os: "OS",
    add: "Add",
  };

  const fieldLabels: Record<SpectacleFieldKey, string> = {
    sph: "Sphere",
    cyl: "Cylinder",
    axis: "Axis",
    vision: "Vision",
  };

  const rowKeys: SpectacleRowKey[] = ["od", "os", "add"];
  const fieldKeys: SpectacleFieldKey[] = ["sph", "cyl", "axis", "vision"];

  for (const rowKey of rowKeys) {
    for (const fieldKey of fieldKeys) {
      const baselineValue = baseline[rowKey][fieldKey];
      const doctorValue = doctorAdvice[rowKey][fieldKey];
      const latestOptometristValue =
        latestOptometristDraft[rowKey][fieldKey];

      const doctorChanged = !spectacleValueEquals(
        doctorValue,
        baselineValue
      );
      const optometristChangedField = !spectacleValueEquals(
        latestOptometristValue,
        baselineValue
      );

      if (optometristChangedField) {
        optometristChanged = true;
      }

      if (optometristChangedField && !doctorChanged) {
        mergedAdvice[rowKey][fieldKey] = latestOptometristValue;
        continue;
      }

      if (
        optometristChangedField &&
        doctorChanged &&
        !spectacleValueEquals(doctorValue, latestOptometristValue)
      ) {
        conflicts.push({
          fieldLabel: `${rowLabels[rowKey]} ${fieldLabels[fieldKey]}`,
          doctorValue: String(doctorValue || ""),
          optometristValue: String(latestOptometristValue || ""),
        });
      }
    }
  }

  const baselineRemarks = baseline.remarks;
  const doctorRemarks = doctorAdvice.remarks;
  const latestOptometristRemarks = latestOptometristDraft.remarks;

  const doctorChangedRemarks = !spectacleValueEquals(
    doctorRemarks,
    baselineRemarks
  );
  const optometristChangedRemarks = !spectacleValueEquals(
    latestOptometristRemarks,
    baselineRemarks
  );

  if (optometristChangedRemarks) {
    optometristChanged = true;
  }

  if (optometristChangedRemarks && !doctorChangedRemarks) {
    mergedAdvice.remarks = latestOptometristRemarks;
  } else if (
    optometristChangedRemarks &&
    doctorChangedRemarks &&
    !spectacleValueEquals(doctorRemarks, latestOptometristRemarks)
  ) {
    conflicts.push({
      fieldLabel: "Remarks",
      doctorValue: String(doctorRemarks || ""),
      optometristValue: String(latestOptometristRemarks || ""),
    });
  }

  return {
    mergedAdvice,
    optometristChanged,
    conflicts,
  };
}

const findingQuickChips = [
  "Conjunctival congestion",
  "Dry eye changes",
  "Early cataract changes",
  "Lens clear",
  "Fundus within normal limits",
  "IOP within normal limits",
];

const diagnosisQuickChips = [
  "Dry eye",
  "Refractive error",
  "Cataract",
  "Allergic conjunctivitis",
  "Conjunctivitis",
  "Glaucoma suspect",
];

const adviceQuickChips = [
  "Continue drops as advised.",
  "Avoid rubbing eyes.",
  "Use lubricating eye drops regularly.",
  "Review with reports.",
  "Follow up if symptoms worsen.",
  "Regular follow-up advised.",
];

const spectacleAdviceQuickChips = [
  "Distance glasses advised",
  "Near glasses advised",
  "Bifocal advised",
  "Progressive lenses advised",
  "Use glasses regularly",
  "Continue current glasses",
];

function appendUniqueLine(existingText: string, textToAdd: string) {
  const cleanText = textToAdd.trim();

  if (!cleanText) {
    return existingText;
  }

  const existingLines = existingText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const alreadyExists = existingLines.some(
    (line) => line.toLowerCase() === cleanText.toLowerCase()
  );

  if (alreadyExists) {
    return existingText;
  }

  return existingLines.length > 0
    ? `${existingLines.join("\n")}\n${cleanText}`
    : cleanText;
}

const doctorRelevantStatuses: QueueStatus[] = [
  "Waiting",
  "Under Optometry",
  "Needs Optometry Review",
  "Additional Payment Pending",
  "Dilated Waiting",
  "Ready for Doctor",
  "Under Consultation",
  "Completed",
];

function isDoctorRelevantQueueItem(item: QueueItem) {
  return doctorRelevantStatuses.includes(item.status);
}

function sortDoctorQueueWithCompletedLast(items: QueueItem[]) {
  return [...items].sort((a, b) => {
    if (a.status === "Completed" && b.status !== "Completed") {
      return 1;
    }

    if (a.status !== "Completed" && b.status === "Completed") {
      return -1;
    }

    return a.tokenNumber - b.tokenNumber;
  });
}

type SpectacleReviewNotice = {
  kind: "updated" | "conflict";
  message: string;
  conflicts?: SpectacleConflict[];
};

export default function DoctorPage() {
  const [activeClinicSettings, setActiveClinicSettings] =
    useState(clinicSettings);

  const [statusMessage, setStatusMessage] = useState("");
  const [spectacleReviewNotice, setSpectacleReviewNotice] =
    useState<SpectacleReviewNotice | null>(null);
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [showAdditionalServicePanel, setShowAdditionalServicePanel] =
    useState(false);
  const additionalServicePanelRef = useRef<HTMLDivElement | null>(null);
  const [additionalServiceMessage, setAdditionalServiceMessage] = useState("");
  const [showRefundPanel, setShowRefundPanel] = useState(false);
  const [refundRequest, setRefundRequest] = useState<RefundRequest | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundMessage, setRefundMessage] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [isPrintingPrescription, setIsPrintingPrescription] = useState(false);
  const [isPrintingSpectacleAdvice, setIsPrintingSpectacleAdvice] =
    useState(false);
  const [consultation, setConsultation] =
    useState<DoctorConsultation>(emptyConsultation);
  const [isEditingPatientWorkup, setIsEditingPatientWorkup] = useState(false);
  const [supabaseDoctorQueueItems, setSupabaseDoctorQueueItems] = useState<
    QueueItem[]
  >([]);
  const [selectedSupabaseQueueItem, setSelectedSupabaseQueueItem] =
    useState<QueueItem | null>(null);
  const [supabaseDoctorQueueStatus, setSupabaseDoctorQueueStatus] =
    useState("");
  const [findingTemplateChips, setFindingTemplateChips] =
    useState<string[]>(findingQuickChips);
  const [diagnosisTemplateChips, setDiagnosisTemplateChips] =
    useState<string[]>(diagnosisQuickChips);
  const [adviceTemplateChips, setAdviceTemplateChips] =
    useState<string[]>(adviceQuickChips);
  const [spectacleAdviceTemplateChips, setSpectacleAdviceTemplateChips] =
    useState<string[]>(spectacleAdviceQuickChips);
  const [medicineMasterOptions, setMedicineMasterOptions] =
    useState<MedicineMaster[]>([]);
  const [frequencyMasterOptions, setFrequencyMasterOptions] =
    useState<string[]>([]);
  const [durationMasterOptions, setDurationMasterOptions] =
    useState<string[]>([]);
  const [instructionTemplateOptions, setInstructionTemplateOptions] =
    useState<string[]>([]);

  const activeQueueItem = selectedSupabaseQueueItem;

  const consultationActive =
    activeQueueItem?.status === "Under Consultation";

  const consultationCompleted =
    activeQueueItem?.status === "Completed";

  const canSendBackToOptometrist = consultationActive;

  const pendingAdditionalService =
    getPendingAdditionalService(activeQueueItem);

  const finalSpectacleAdvice =
    consultation.finalSpectacleAdvice || emptySpectacleAdvice;

  const patientForPrescription = activeQueueItem
    ? {
        ...activeQueueItem,
        doctorConsultation: consultation,
      }
    : null;

  async function loadSupabaseDoctorQueue() {
    setSupabaseDoctorQueueStatus("Loading doctor queue...");

    try {
      const queue = await fetchTodayQueueFromSupabase();
      const doctorQueue = sortDoctorQueueWithCompletedLast(
        sortQueueForRole(queue.filter(isDoctorRelevantQueueItem), "doctor")
      );

      setSupabaseDoctorQueueItems(doctorQueue);

      setSelectedSupabaseQueueItem((current) => {
        if (!current) {
          return current;
        }

        const refreshedItem = doctorQueue.find((item) => item.id === current.id);

        if (!refreshedItem) {
          return null;
        }

        return {
          ...refreshedItem,
          optometristWorkup:
            current.optometristWorkup || refreshedItem.optometristWorkup,
          doctorConsultation:
            current.doctorConsultation || refreshedItem.doctorConsultation,
        };
      });

      setSupabaseDoctorQueueStatus(
        doctorQueue.length
          ? `Loaded ${doctorQueue.length} doctor queue patient(s).`
          : "No patients are currently checked in."
      );
    } catch (error) {
      setSupabaseDoctorQueueStatus(
        error instanceof Error
          ? error.message
          : "Could not load doctor queue."
      );
    }
  }

  useEffect(() => {
    void loadSupabaseDoctorQueue();
  }, []);

  useEffect(() => {
    void fetchClinicSettings().then(setActiveClinicSettings);
  }, []);

  useEffect(() => {
    async function loadDoctorTemplates() {
      try {
        const [
          findingTemplates,
          diagnosisTemplates,
          adviceTemplates,
          spectacleAdviceTemplates,
        ] = await Promise.all([
          fetchClinicalTemplatesFromSupabase("Finding"),
          fetchClinicalTemplatesFromSupabase("Diagnosis"),
          fetchClinicalTemplatesFromSupabase("Advice"),
          fetchClinicalTemplatesFromSupabase("Spectacle Advice"),
        ]);

        const findingChips = findingTemplates
          .map((template) => template.text)
          .filter(Boolean);
        const diagnosisChips = diagnosisTemplates
          .map((template) => template.text)
          .filter(Boolean);
        const adviceChips = adviceTemplates
          .map((template) => template.text)
          .filter(Boolean);
        const spectacleAdviceChips = spectacleAdviceTemplates
          .map((template) => template.text)
          .filter(Boolean);

        if (findingChips.length > 0) {
          setFindingTemplateChips(findingChips);
        }

        if (diagnosisChips.length > 0) {
          setDiagnosisTemplateChips(diagnosisChips);
        }

        if (adviceChips.length > 0) {
          setAdviceTemplateChips(adviceChips);
        }

        if (spectacleAdviceChips.length > 0) {
          setSpectacleAdviceTemplateChips(spectacleAdviceChips);
        }
      } catch (error) {
        console.error("Could not load Supabase doctor templates", error);
      }
    }

    void loadDoctorTemplates();
  }, []);

  useEffect(() => {
    async function loadMedicineEditorMasters() {
      try {
        const [
          medicineOptions,
          frequencyOptions,
          durationOptions,
          instructionOptions,
        ] = await Promise.all([
          fetchActiveMedicinesFromSupabase(),
          fetchActiveSimpleMasterItemsFromSupabase("Frequency"),
          fetchActiveSimpleMasterItemsFromSupabase("Duration"),
          fetchClinicalTemplatesFromSupabase("Instruction"),
        ]);

        setMedicineMasterOptions(medicineOptions);
        setFrequencyMasterOptions(
          frequencyOptions.map((item) => item.label).filter(Boolean)
        );
        setDurationMasterOptions(
          durationOptions.map((item) => item.label).filter(Boolean)
        );
        setInstructionTemplateOptions(
          instructionOptions.map((item) => item.text).filter(Boolean)
        );
      } catch (error) {
        console.error(
          "Could not load medicine editor masters from Supabase",
          error
        );
      }
    }

    void loadMedicineEditorMasters();
  }, []);

  useEffect(() => {
    setConsultation(
      normalizeConsultation(
        activeQueueItem?.doctorConsultation,
        activeQueueItem?.optometristWorkup?.spectacleDraft
      )
    );

    setStatusMessage("");
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);
  }, [activeQueueItem?.id]);

  useEffect(() => {
    function handleAfterPrint() {
      setIsPrintingPrescription(false);
      setIsPrintingSpectacleAdvice(false);
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);


  async function handleSelectSupabaseQueuePatient(item: QueueItem) {
    setSelectedSupabaseQueueItem(item);
    setStatusMessage(`Selected patient #${item.tokenNumber}.`);
    setSpectacleReviewNotice(null);
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setShowRefundPanel(false);
    setRefundRequest(null);
    setRefundAmount("");
    setRefundReason("");
    setRefundNotes("");
    setRefundMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);

    try {
      const [savedWorkup, savedConsultation, savedRefundRequest] =
        await Promise.all([
          fetchOptometristWorkupFromSupabase(item.id),
          fetchDoctorConsultationFromSupabase(item.id),
          fetchRefundRequestForVisitInSupabase(item.id),
        ]);

      setRefundRequest(savedRefundRequest);

      const normalizedWorkup = normalizeOptometristWorkupForDoctor(savedWorkup);

      const updatedItem = {
        ...item,
        optometristWorkup: normalizedWorkup,
        doctorConsultation: savedConsultation || undefined,
      };

      setSelectedSupabaseQueueItem(updatedItem);
      setSupabaseDoctorQueueItems((current) =>
        current.map((queueItem) =>
          queueItem.id === updatedItem.id ? updatedItem : queueItem
        )
      );
      const loadedConsultation = normalizeConsultation(
        savedConsultation || item.doctorConsultation,
        normalizedWorkup.spectacleDraft
      );

      if (savedConsultation) {
        const spectacleMerge = mergeReturnedOptometristSpectacleDraft({
          baseline: savedConsultation.optometristSpectacleBaseline,
          doctorAdvice: loadedConsultation.finalSpectacleAdvice,
          latestOptometristDraft: normalizedWorkup.spectacleDraft,
        });

        setConsultation({
          ...loadedConsultation,
          finalSpectacleAdvice: spectacleMerge.mergedAdvice,
        });

        if (spectacleMerge.conflicts.length > 0) {
          const conflictFields = spectacleMerge.conflicts
            .map((conflict) => conflict.fieldLabel)
            .join(", ");
          const conflictMessage =
            `Optometrist updated the spectacle draft after your edits. ` +
            `Your values have been preserved for: ${conflictFields}. ` +
            `Please review before completing.`;

          setSpectacleReviewNotice({
            kind: "conflict",
            message: conflictMessage,
            conflicts: spectacleMerge.conflicts,
          });
          setStatusMessage(conflictMessage);
        } else if (spectacleMerge.optometristChanged) {
          const updatedMessage =
            "Optometrist updated the spectacle draft. Non-conflicting changes have been applied to the table below. Please review before completing.";

          setSpectacleReviewNotice({
            kind: "updated",
            message: updatedMessage,
          });
          setStatusMessage(updatedMessage);
        } else {
          setStatusMessage(
            `Loaded consultation draft for token #${item.tokenNumber}.`
          );
        }
      } else {
        setConsultation(loadedConsultation);
        setStatusMessage(
          `Loaded optometrist workup for token #${item.tokenNumber}.`
        );
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not load optometrist workup."
      );
    }
  }

  function updateConsultationField<K extends keyof DoctorConsultation>(
    field: K,
    value: DoctorConsultation[K]
  ) {
    setConsultation((current) => ({
      ...current,
      [field]: value,
    }));

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function updateFinalSpectacleField(
    row: SpectacleRowKey,
    field: SpectacleFieldKey,
    value: string
  ) {
    setConsultation((current) => {
      const currentAdvice =
        current.finalSpectacleAdvice || emptySpectacleAdvice;

      return {
        ...current,
        finalSpectacleAdvice: {
          ...currentAdvice,
          [row]: {
            ...currentAdvice[row],
            [field]: value,
          },
        },
      };
    });

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function updateFinalSpectacleRemarks(value: string) {
    setConsultation((current) => {
      const currentAdvice =
        current.finalSpectacleAdvice || emptySpectacleAdvice;

      return {
        ...current,
        finalSpectacleAdvice: {
          ...currentAdvice,
          remarks: value,
        },
      };
    });

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function addMedicineRow() {
    const newMedicine: MedicineRow = {
      id: `medicine-${Date.now()}`,
      medicineName: "",
      eye: "Both Eyes",
      frequency: "",
      duration: "",
      instructions: "",
    };

    setConsultation((current) => ({
      ...current,
      medicines: [...current.medicines, newMedicine],
    }));

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function updateMedicineRow(
    medicineId: string,
    field: keyof MedicineRow,
    value: MedicineRow[keyof MedicineRow]
  ) {
    setConsultation((current) => ({
      ...current,
      medicines: current.medicines.map((medicine) =>
        medicine.id === medicineId
          ? {
              ...medicine,
              [field]: value,
            }
          : medicine
      ),
    }));

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  function removeMedicineRow(medicineId: string) {
    setConsultation((current) => ({
      ...current,
      medicines: current.medicines.filter(
        (medicine) => medicine.id !== medicineId
      ),
    }));

    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
  }

  async function handleStartConsultation() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    const otherOpenConsultations = supabaseDoctorQueueItems.filter(
      (item, index, items) =>
        item.id !== activeQueueItem.id &&
        item.status === "Under Consultation" &&
        items.findIndex((candidate) => candidate.id === item.id) === index
    );

    if (otherOpenConsultations.length > 0) {
      const patientNames = otherOpenConsultations
        .map(
          (item) =>
            `#${item.tokenNumber} ${item.patientName}`
        )
        .join(", ");

      const patientLabel =
        otherOpenConsultations.length === 1
          ? "patient is"
          : "patients are";

      const shouldContinue = window.confirm(
        `${otherOpenConsultations.length} other ${patientLabel} still Under Consultation:\n\n${patientNames}\n\nYou may keep ${
          otherOpenConsultations.length === 1 ? "this consultation" : "these consultations"
        } open, or cancel and review/complete ${
          otherOpenConsultations.length === 1 ? "it" : "them"
        } first.\n\nStart the selected consultation anyway?`
      );

      if (!shouldContinue) {
        return;
      }
    }

    if (activeQueueItem.status === "Completed") {
      const shouldReopen = window.confirm(
        "This consultation is already completed. Do you want to reopen it for editing/advice?"
      );

      if (!shouldReopen) {
        return;
      }

      if (selectedSupabaseQueueItem) {
        try {
          await reopenDoctorConsultationInSupabase({
            visitId: selectedSupabaseQueueItem.id,
          });

          const updatedItem = {
            ...selectedSupabaseQueueItem,
            status: "Under Consultation" as const,
          };

          setSelectedSupabaseQueueItem(updatedItem);
          setSupabaseDoctorQueueItems((current) =>
            sortDoctorQueueWithCompletedLast(
              current.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              )
            )
          );

          setStatusMessage("Completed consultation reopened.");
          setShowPrescriptionPreview(false);
          await loadSupabaseDoctorQueue();
        } catch (error) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Could not reopen consultation."
          );
        }

        return;
      }


      return;
    }

    if (activeQueueItem.status === "Under Consultation") {
      setStatusMessage("Consultation is already active.");
      return;
    }

    if (activeQueueItem.status !== "Ready for Doctor") {
      const shouldOverride = window.confirm(
        `This patient is currently marked as "${activeQueueItem.status}", not "Ready for Doctor". Do you still want to start consultation?`
      );

      if (!shouldOverride) {
        return;
      }
    }

    if (selectedSupabaseQueueItem) {
      try {
        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          "Under Consultation"
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Under Consultation" as const,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          )
        );

        setStatusMessage("Consultation started.");
        setShowPrescriptionPreview(false);
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not start consultation."
        );
      }

      return;
    }


  }

  async function handleSavePatientDetailsFromDoctor(
    patientName: string,
    age: number,
    gender: Patient["gender"]
  ) {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        await updatePatientInSupabase({
          patientId: selectedSupabaseQueueItem.patientId,
          fullName: patientName,
          ageYears: age,
          gender,
        });

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          patientName,
          age,
          gender,
        };

        setSelectedSupabaseQueueItem((current) => {
          if (!current || current.id !== updatedItem.id) {
            return updatedItem;
          }

          return {
            ...current,
            patientName,
            age,
            gender,
          };
        });

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id
              ? {
                  ...item,
                  patientName,
                  age,
                  gender,
                  optometristWorkup:
                    item.optometristWorkup || updatedItem.optometristWorkup,
                  doctorConsultation:
                    item.doctorConsultation || updatedItem.doctorConsultation,
                }
              : item
          )
        );

        setStatusMessage("Patient details corrected by doctor/admin.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update patient details."
        );
      }

      return;
    }


  }

  async function handleSaveWorkupFromDoctor(workup: OptometristWorkup) {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const shouldResumeConsultation =
          selectedSupabaseQueueItem.status === "Dilated Waiting" &&
          workup.dilationStatus === "Done";

        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup,
        });

        if (shouldResumeConsultation) {
          await updateVisitStatusInSupabase(
            selectedSupabaseQueueItem.id,
            "Under Consultation"
          );
        }

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: shouldResumeConsultation
            ? ("Under Consultation" as const)
            : selectedSupabaseQueueItem.status,
          optometristWorkup: workup,
        };

        setSelectedSupabaseQueueItem((current) => {
          if (!current || current.id !== selectedSupabaseQueueItem.id) {
            return updatedItem;
          }

          return {
            ...current,
            status: updatedItem.status,
            optometristWorkup: workup,
          };
        });

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === selectedSupabaseQueueItem.id
              ? {
                  ...item,
                  status: updatedItem.status,
                  optometristWorkup: workup,
                }
              : item
          )
        );

        setConsultation((current) => {
          const hasDoctorFinalSpectacleAdvice = hasSpectacleAdviceValues(
            current.finalSpectacleAdvice
          );

          return {
            ...current,
            finalSpectacleAdvice: hasDoctorFinalSpectacleAdvice
              ? current.finalSpectacleAdvice
              : normalizeSpectacleAdvice(workup.spectacleDraft),
          };
        });

        setStatusMessage(
          shouldResumeConsultation
            ? "Dilation completed. Consultation resumed."
            : "Workup details updated by doctor/admin."
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update workup details."
        );
      }

      return;
    }


  }

  async function handleSendBackToOptometrist() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (activeQueueItem.status === "Completed") {
      alert(
        "This consultation is already completed. Reopen it first if changes are needed."
      );
      return;
    }

    if (
      activeQueueItem.status !== "Under Consultation" &&
      activeQueueItem.status !== "Ready for Doctor" &&
      activeQueueItem.status !== "Needs Optometry Review"
    ) {
      alert("Patient can be sent back only after reaching the doctor workflow.");
      return;
    }

    const shouldSendBack = window.confirm(
      "Send this patient back to optometrist for additional workup?"
    );

    if (!shouldSendBack) {
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        const existingWorkup =
          selectedSupabaseQueueItem.optometristWorkup || emptyWorkup;

        const updatedWorkup: OptometristWorkup = {
          ...existingWorkup,
        };

        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup: updatedWorkup,
        });

        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          "Needs Optometry Review"
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Needs Optometry Review" as const,
          optometristWorkup: updatedWorkup,
          doctorConsultation: savedConsultation,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          sortDoctorQueueWithCompletedLast(
            current.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setShowPrescriptionPreview(false);
        setStatusMessage(
          "Patient sent back to optometrist for additional workup."
        );
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not send patient back to optometrist."
        );
      }

      return;
    }


  }

  async function handleSaveConsultationDraft() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (hasInvalidPastFollowUpDate(consultation)) {
      alert(
        "Follow-up dates cannot be earlier than today. Please choose today or a future date."
      );
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const consultationToSave: DoctorConsultation = {
          ...consultation,
          optometristSpectacleBaseline:
            selectedSupabaseQueueItem.optometristWorkup?.spectacleDraft,
        };

        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation: consultationToSave,
          });

        const consultationWithCurrentMedicines = {
          ...savedConsultation,
          medicines: consultation.medicines,
        };

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          doctorConsultation: consultationWithCurrentMedicines,
        };

        setSelectedSupabaseQueueItem((current) => {
          if (!current || current.id !== updatedItem.id) {
            return updatedItem;
          }

          return {
            ...current,
            doctorConsultation: consultationWithCurrentMedicines,
          };
        });

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id
              ? {
                  ...item,
                  doctorConsultation: consultationWithCurrentMedicines,
                }
              : item
          )
        );

        setConsultation(consultationWithCurrentMedicines);
        setConsultationSaved(true);
        setSpectacleReviewNotice(null);
        setStatusMessage("Consultation draft saved.");
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not save consultation draft."
        );
      }

      return;
    }


  }

  async function handleCompleteConsultation() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (hasInvalidPastFollowUpDate(consultation)) {
      alert(
        "Follow-up dates cannot be earlier than today. Please choose today or a future date."
      );
      return;
    }

    const shouldComplete = window.confirm(
      "Complete this consultation? It will move to Completed Today, and can be reopened if needed."
    );

    if (!shouldComplete) {
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const consultationToComplete: DoctorConsultation = {
          ...consultation,
          optometristSpectacleBaseline:
            selectedSupabaseQueueItem.optometristWorkup?.spectacleDraft,
        };

        const savedConsultation =
          await completeDoctorConsultationInSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation: consultationToComplete,
          });

        const entitlement =
          await upsertFreeFollowUpEntitlementForVisit(
            selectedSupabaseQueueItem.id
          );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Completed" as const,
          doctorConsultation: savedConsultation,
        };

        let prescriptionPdfWarning = "";
        let spectaclePdfWarning = "";

        const finalizedDocumentDate = selectedSupabaseQueueItem.visitDate
          ? new Date(
              `${selectedSupabaseQueueItem.visitDate}T00:00:00`
            ).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN");

        try {
          const prescriptionPdfBlob = await pdf(
            <PrescriptionPdfDocument
              patient={updatedItem}
              clinicSettings={activeClinicSettings}
              dateText={finalizedDocumentDate}
              logoSrc={`${window.location.origin}/clinic-logo.png`}
            />
          ).toBlob();

          await upsertGeneratedDocumentToSupabase({
            patientId: selectedSupabaseQueueItem.patientId,
            visitId: selectedSupabaseQueueItem.id,
            documentType: "Prescription",
            fileName: `Prescription-${selectedSupabaseQueueItem.uhid}.pdf`,
            storagePath: `${selectedSupabaseQueueItem.patientId}/${selectedSupabaseQueueItem.id}/prescription.pdf`,
            pdfBlob: prescriptionPdfBlob,
          });
        } catch (pdfError) {
          prescriptionPdfWarning =
            pdfError instanceof Error
              ? pdfError.message
              : "Unknown PDF generation/storage error.";
        }

        try {
          if (
            hasSpectacleAdviceValues(
              savedConsultation.finalSpectacleAdvice
            )
          ) {
            const spectaclePdfBlob = await pdf(
              <SpectaclePdfDocument
                patient={updatedItem}
                clinicSettings={activeClinicSettings}
                dateText={finalizedDocumentDate}
              />
            ).toBlob();

            await upsertGeneratedDocumentToSupabase({
              patientId: selectedSupabaseQueueItem.patientId,
              visitId: selectedSupabaseQueueItem.id,
              documentType: "Spectacle Prescription",
              fileName: `Spectacle-Prescription-${selectedSupabaseQueueItem.uhid}.pdf`,
              storagePath: `${selectedSupabaseQueueItem.patientId}/${selectedSupabaseQueueItem.id}/spectacle-prescription.pdf`,
              pdfBlob: spectaclePdfBlob,
            });
          } else {
            await deleteGeneratedDocumentForVisit(
              selectedSupabaseQueueItem.id,
              "Spectacle Prescription"
            );
          }
        } catch (pdfError) {
          spectaclePdfWarning =
            pdfError instanceof Error
              ? pdfError.message
              : "Unknown spectacle PDF generation/storage error.";
        }

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          sortDoctorQueueWithCompletedLast(
            current.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setSpectacleReviewNotice(null);

        if (prescriptionPdfWarning || spectaclePdfWarning) {
          const warnings = [
            prescriptionPdfWarning
              ? `Prescription PDF: ${prescriptionPdfWarning}`
              : "",
            spectaclePdfWarning
              ? `Spectacle PDF: ${spectaclePdfWarning}`
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          setStatusMessage(
            `Consultation completed, but one or more finalized PDFs could not be stored: ${warnings}`
          );
        } else {
          const spectacleMessage = hasSpectacleAdviceValues(
            savedConsultation.finalSpectacleAdvice
          )
            ? " Final spectacle PDF stored."
            : "";

          setStatusMessage(
            entitlement
              ? `Consultation completed. Free follow-up valid until ${entitlement.validUntil}. Final prescription PDF stored.${spectacleMessage}`
              : `Consultation completed. Patient moved to Completed Today. Final prescription PDF stored.${spectacleMessage}`
          );
        }
        setShowPrescriptionPreview(false);
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not complete consultation."
        );
      }

      return;
    }


  }

  async function handlePreviewPrescription() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        setSelectedSupabaseQueueItem((current) =>
          current && current.id === selectedSupabaseQueueItem.id
            ? {
                ...current,
                doctorConsultation: savedConsultation,
              }
            : current
        );

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === selectedSupabaseQueueItem.id
              ? {
                  ...item,
                  doctorConsultation: savedConsultation,
                }
              : item
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setShowPrescriptionPreview(true);
        setStatusMessage("Prescription preview generated.");
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not generate prescription preview."
        );
      }

      return;
    }


  }

  async function handlePrintPrescription() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        setSelectedSupabaseQueueItem((current) =>
          current && current.id === selectedSupabaseQueueItem.id
            ? {
                ...current,
                doctorConsultation: savedConsultation,
              }
            : current
        );

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === selectedSupabaseQueueItem.id
              ? {
                  ...item,
                  doctorConsultation: savedConsultation,
                }
              : item
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setShowPrescriptionPreview(true);
        setIsPrintingPrescription(true);
        setStatusMessage("Prescription ready for printing.");

        setTimeout(() => {
          window.print();
        }, 150);
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not print prescription."
        );
      }

      return;
    }


  }

  function handleOpenAdditionalServicePanel() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }
  
    setShowAdditionalServicePanel(true);
    setAdditionalServiceMessage("Additional Test / Payment panel opened below.");
  
    setTimeout(() => {
      additionalServicePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleOpenRefundPanel() {
    if (!activeQueueItem) {
      return;
    }

    setRefundMessage("");

    if (!refundRequest) {
      setRefundAmount(
        activeQueueItem.consultationNetAmount
          ? String(activeQueueItem.consultationNetAmount)
          : ""
      );
      setRefundReason("");
      setRefundNotes("");
    }

    setShowRefundPanel((current) => !current);
  }

  async function handleCreateRefundAdvice() {
    if (!activeQueueItem?.consultationPaymentId) {
      setRefundMessage("Original consultation payment could not be identified.");
      return;
    }

    const amount = Number(refundAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setRefundMessage("Enter a valid refund amount greater than zero.");
      return;
    }

    if (
      activeQueueItem.consultationNetAmount &&
      amount > activeQueueItem.consultationNetAmount
    ) {
      setRefundMessage(
        `Refund cannot exceed ₹${activeQueueItem.consultationNetAmount}.`
      );
      return;
    }

    if (!refundReason.trim()) {
      setRefundMessage("Refund reason is required.");
      return;
    }

    const shouldCreate = window.confirm(
      `Create refund advice for ₹${amount}? Reception will still need to process the actual refund.`
    );

    if (!shouldCreate) {
      return;
    }

    setRefundBusy(true);
    setRefundMessage("Creating refund advice...");

    try {
      const created = await createRefundRequestInSupabase({
        originalPaymentId: activeQueueItem.consultationPaymentId,
        refundAmount: amount,
        reason: refundReason.trim(),
        notes: refundNotes.trim(),
      });

      setRefundRequest(created);
      setRefundMessage(
        "Refund advice created. Awaiting Reception processing."
      );
    } catch (error) {
      setRefundMessage(
        error instanceof Error
          ? error.message
          : "Could not create refund advice."
      );
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleCancelRefundAdvice() {
    if (!refundRequest || refundRequest.status !== "Refund Pending") {
      return;
    }

    const shouldCancel = window.confirm(
      "Cancel this pending refund advice? A corrected advice can be created afterwards."
    );

    if (!shouldCancel) {
      return;
    }

    setRefundBusy(true);
    setRefundMessage("Cancelling refund advice...");

    try {
      await cancelRefundRequestInSupabase(refundRequest.id);
      setRefundRequest(null);
      setRefundAmount("");
      setRefundReason("");
      setRefundNotes("");
      setRefundMessage("Refund advice cancelled.");
    } catch (error) {
      setRefundMessage(
        error instanceof Error
          ? error.message
          : "Could not cancel refund advice."
      );
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleSendForDilation() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (activeQueueItem.status === "Completed") {
      alert(
        "This consultation is already completed. Reopen it first if changes are needed."
      );
      return;
    }

    if (activeQueueItem.status === "Dilated Waiting") {
      alert(
        "This patient is already waiting for dilation. Mark dilation Done before sending again."
      );
      return;
    }

    const shouldSendForDilation = window.confirm(
      "Send this patient for dilation? The patient will move to Dilated Waiting and return to doctor after dilation is marked Done."
    );

    if (!shouldSendForDilation) {
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        const existingWorkup =
          selectedSupabaseQueueItem.optometristWorkup || emptyWorkup;

        const updatedWorkup: OptometristWorkup = {
          ...existingWorkup,
          dilationStatus: "Waiting",
        };

        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup: updatedWorkup,
        });

        await updateVisitStatusInSupabase(
          selectedSupabaseQueueItem.id,
          "Dilated Waiting"
        );

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Dilated Waiting" as const,
          optometristWorkup: updatedWorkup,
          doctorConsultation: savedConsultation,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          sortDoctorQueueWithCompletedLast(
            current.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setShowPrescriptionPreview(false);
        setStatusMessage(
          "Patient sent for dilation. Optometrist can mark dilation done."
        );
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not send patient for dilation."
        );
      }

      return;
    }

  }

  async function handleCreateAdditionalServiceRequest(
    serviceRequest: AdditionalServiceRequest
  ) {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        const savedRequest =
          await createOrUpdatePendingAdditionalServiceRequestInSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            serviceRequest,
          });

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          status: "Additional Payment Pending" as const,
          doctorConsultation: savedConsultation,
          additionalServices: [
            ...(selectedSupabaseQueueItem.additionalServices || []).filter(
              (request) => request.status !== "Payment Pending"
            ),
            savedRequest,
          ],
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          sortDoctorQueueWithCompletedLast(
            current.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          )
        );

        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setShowPrescriptionPreview(false);
        setShowAdditionalServicePanel(false);

        const serviceNames = savedRequest.services
          .map((service) => service.serviceName)
          .join(", ");

        const message = `${serviceNames} sent to reception. Amount to collect: ₹${savedRequest.netAmount}.`;

        setAdditionalServiceMessage(message);
        setStatusMessage(message);
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setConsultationSaved(false);
        setAdditionalServiceMessage(
          error instanceof Error
            ? error.message
            : "Could not send additional service request to reception."
        );
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not send additional service request to reception."
        );
      }

      return;
    }

  }

  async function handlePrintSpectacleAdvice() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
          });

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          doctorConsultation: savedConsultation,
        };

        setSelectedSupabaseQueueItem(updatedItem);
        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          )
        );
        setConsultation(savedConsultation);
        setConsultationSaved(true);
        setIsPrintingSpectacleAdvice(true);
        setStatusMessage("Spectacle advice ready for printing.");

        setTimeout(() => {
          window.print();
        }, 150);
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not save spectacle advice for printing."
        );
      }

      return;
    }


  }

  if (isPrintingPrescription) {
    return (
      <div className="bg-white p-4">
        <PrescriptionPreview
          patient={patientForPrescription}
          showSpectacleAdvice={false}
          clinicSettingsOverride={activeClinicSettings}
        />
      </div>
    );
  }

  if (isPrintingSpectacleAdvice) {
    return (
      <div className="bg-white p-4">
        <SpectacleAdvicePrint
          patient={patientForPrescription}
          clinicSettingsOverride={activeClinicSettings}
        />
      </div>
    );
  }

  return (
    <AppShell
      title="Doctor / Admin Workspace"
      subtitle="Consultation, prescriptions, patient history, reports, and master data"
    >
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap justify-end gap-2">
          {activeQueueItem?.status === "Completed" &&
            Boolean(activeQueueItem.consultationPaymentId) &&
            Number(activeQueueItem.consultationNetAmount || 0) > 0 && (
              <button
                type="button"
                onClick={handleOpenRefundPanel}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-100"
              >
                {refundRequest?.status === "Refund Pending"
                  ? "Refund Pending"
                  : refundRequest?.status === "Refunded"
                    ? "Refund Processed"
                    : "Refund / Fee Adjustment"}
              </button>
            )}

          <Link
            href="/reports"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-700 bg-slate-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
          >
            Reports
          </Link>
        </div>

        {showRefundPanel &&
          activeQueueItem?.status === "Completed" &&
          activeQueueItem.consultationPaymentId &&
          Number(activeQueueItem.consultationNetAmount || 0) > 0 && (
            <div className="ml-auto w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-amber-950">
                    Refund / Fee Adjustment
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    {activeQueueItem.patientName} ·{" "}
                    {activeQueueItem.consultationReceiptNumber || "Consultation receipt"}
                    {" · "}Paid ₹{activeQueueItem.consultationNetAmount || 0}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRefundPanel(false)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Close
                </button>
              </div>

              {refundRequest?.status === "Refunded" ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-semibold">
                    Refund processed: ₹{refundRequest.refundAmount}
                  </p>
                  <p className="mt-1">
                    Reason: {refundRequest.reason}
                  </p>
                  <p className="mt-1 text-xs">
                    No further refund can be issued against this consultation receipt.
                  </p>
                </div>
              ) : refundRequest?.status === "Refund Pending" ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-white p-4">
                  <p className="font-semibold text-amber-950">
                    Refund Pending: ₹{refundRequest.refundAmount}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Reason: {refundRequest.reason}
                  </p>
                  {refundRequest.notes && (
                    <p className="mt-1 text-sm text-slate-600">
                      Notes: {refundRequest.notes}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Awaiting Reception processing.
                  </p>

                  <button
                    type="button"
                    onClick={handleCancelRefundAdvice}
                    disabled={refundBusy}
                    className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel Advice
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Refund Amount
                    <input
                      type="number"
                      min="0.01"
                      max={activeQueueItem.consultationNetAmount || undefined}
                      step="0.01"
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-normal text-slate-500">
                      Maximum ₹{activeQueueItem.consultationNetAmount || 0}.
                    </span>
                  </label>

                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Reason
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      placeholder="Reason for refund / fee adjustment"
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Notes
                    <textarea
                      value={refundNotes}
                      onChange={(event) => setRefundNotes(event.target.value)}
                      placeholder="Optional internal note"
                      className="min-h-20 rounded-xl border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleCreateRefundAdvice}
                    disabled={refundBusy}
                    className="justify-self-start rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refundBusy ? "Saving..." : "Create Refund Advice"}
                  </button>
                </div>
              )}

              {refundMessage && (
                <p className="mt-3 rounded-xl bg-white p-3 text-sm font-medium text-slate-700">
                  {refundMessage}
                </p>
              )}
            </div>
          )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_180px]">
        <div className="grid min-w-0 gap-6">
          <SectionCard
            title="Doctor Queue"
            subtitle="Active patients first, completed today at bottom"
          >
            <div className="mb-3 flex justify-end">
              <button
                onClick={loadSupabaseDoctorQueue}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Refresh Queue
              </button>
            </div>

            {supabaseDoctorQueueStatus && (
              <p className="mb-3 text-xs font-medium text-slate-500">
                {supabaseDoctorQueueStatus}
              </p>
            )}

            <QueuePanel
              items={supabaseDoctorQueueItems}
              selectedItemId={selectedSupabaseQueueItem?.id}
              onSelectItem={handleSelectSupabaseQueuePatient}
            />
          </SectionCard>


          <SectionCard title="Patient Snapshot" subtitle="Current patient context">
            {activeQueueItem ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Selected Patient
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  #{activeQueueItem.tokenNumber} ·{" "}
                  {activeQueueItem.patientName}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {activeQueueItem.age} yrs / {activeQueueItem.gender}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {activeQueueItem.uhid}
                </p>

                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Status: {activeQueueItem.status}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No patient selected
              </div>
            )}
          </SectionCard>

          <SectionCard title="History Timeline" subtitle="Previous visits">
            <PatientHistoryPanel patient={activeQueueItem} />
          </SectionCard>

          <SectionCard
            title="Attachments / Reports"
            subtitle="Patient-level files by upload date"
          >
            <PatientAttachmentsPanel
              patient={activeQueueItem}
              sourceLabel="Doctor"
            />
          </SectionCard>
        </div>

        <SectionCard
          title="Current Consultation"
          subtitle="Patient/workup details, findings, diagnosis, medicines, advice, and follow-up"
          className="min-w-0"
        >
          <div className="grid gap-4">
            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {statusMessage}
              </div>
            )}

            <DoctorWorkupOverridePanel
              patient={activeQueueItem}
              canSendBackToOptometrist={canSendBackToOptometrist}
              onSendBackToOptometrist={handleSendBackToOptometrist}
              onSavePatientDetails={handleSavePatientDetailsFromDoctor}
              onSaveWorkup={handleSaveWorkupFromDoctor}
              onEditModeChange={setIsEditingPatientWorkup}
            />

            {!activeQueueItem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Select a patient before entering consultation details.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Findings, diagnosis, medicines, advice, follow-up, printing, and payment actions will be available after a patient is selected from the queue.
                </p>
              </div>
            ) : isEditingPatientWorkup ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                Edit Patient / Workup mode is active. Save or Cancel the workup edit before entering consultation findings, diagnosis, medicines, advice, or printing.
              </div>
            ) : !consultationActive ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">
                  {consultationCompleted
                    ? "This consultation is completed."
                    : "Start consultation to enter clinical details."}
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  {consultationCompleted
                    ? "Use Reopen Consultation in Doctor Actions before changing findings, diagnosis, medicines, advice, follow-up, or prescription."
                    : "Patient and workup details can be reviewed or corrected first. Findings, diagnosis, medicines, advice, follow-up, additional tests, preview, printing, and completion will become available after Start Consultation."}
                </p>
              </div>
            ) : (
              <>
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Findings
                <textarea
                  value={consultation.findings}
                  onChange={(event) =>
                    updateConsultationField("findings", event.target.value)
                  }
                  placeholder="Enter clinical findings, examination notes, slit lamp/fundus observations, etc."
                  className="min-h-36 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />

                <div className="mt-3">
                  <ClinicalTemplatePicker
                    label="Findings"
                    templates={findingTemplateChips}
                    currentValue={consultation.findings}
                    onSelect={(template) =>
                      updateConsultationField(
                        "findings",
                        appendUniqueLine(
                          consultation.findings,
                          template
                        )
                      )
                    }
                  />
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Diagnosis / Impression
                <textarea
                  value={consultation.diagnosis}
                  onChange={(event) =>
                    updateConsultationField("diagnosis", event.target.value)
                  }
                  placeholder="Optional short diagnosis or impression"
                  className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />

                <div className="mt-3">
                  <ClinicalTemplatePicker
                    label="Diagnosis"
                    templates={diagnosisTemplateChips}
                    currentValue={consultation.diagnosis}
                    onSelect={(template) =>
                      updateConsultationField(
                        "diagnosis",
                        appendUniqueLine(
                          consultation.diagnosis,
                          template
                        )
                      )
                    }
                  />
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-4 text-sm font-medium text-slate-700">
                Final Spectacle Advice
              </p>

              {spectacleReviewNotice && (
                <div
                  className={`mb-4 rounded-xl border p-3 text-sm font-medium ${
                    spectacleReviewNotice.kind === "conflict"
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}
                >
                  <p>{spectacleReviewNotice.message}</p>

                  {spectacleReviewNotice.kind === "conflict" &&
                    spectacleReviewNotice.conflicts &&
                    spectacleReviewNotice.conflicts.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {spectacleReviewNotice.conflicts.map((conflict) => (
                          <div
                            key={conflict.fieldLabel}
                            className="rounded-lg border border-red-200 bg-white/70 p-3"
                          >
                            <p className="font-semibold">
                              {conflict.fieldLabel}
                            </p>
                            <p className="mt-1 font-normal">
                              Doctor:{" "}
                              <span className="font-medium">
                                {conflict.doctorValue || "—"}
                              </span>
                            </p>
                            <p className="font-normal">
                              Optometrist:{" "}
                              <span className="font-medium">
                                {conflict.optometristValue || "—"}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              <SpectacleTable
                value={{
                  od: finalSpectacleAdvice.od,
                  os: finalSpectacleAdvice.os,
                  add: finalSpectacleAdvice.add,
                }}
                onChange={updateFinalSpectacleField}
              />

              <div className="mt-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Final Spectacle Remarks
                  <textarea
                    value={finalSpectacleAdvice.remarks}
                    onChange={(event) =>
                      updateFinalSpectacleRemarks(event.target.value)
                    }
                    placeholder="Final spectacle advice remarks"
                    className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />

                  <div className="mt-3">
                    <ClinicalTemplatePicker
                      label="Spectacle Advice"
                      templates={spectacleAdviceTemplateChips}
                      currentValue={finalSpectacleAdvice.remarks}
                      onSelect={(template) =>
                        updateFinalSpectacleRemarks(
                          appendUniqueLine(
                            finalSpectacleAdvice.remarks,
                            template
                          )
                        )
                      }
                    />
                  </div>
                </label>
              </div>
            </div>

            <MedicineEditor
              medicines={consultation.medicines}
              medicineMasterOptions={medicineMasterOptions}
              frequencyOptions={frequencyMasterOptions}
              durationOptions={durationMasterOptions}
              instructionOptions={instructionTemplateOptions}
              onAddMedicine={addMedicineRow}
              onUpdateMedicine={updateMedicineRow}
              onRemoveMedicine={removeMedicineRow}
            />

{showAdditionalServicePanel && (
  <div
    ref={additionalServicePanelRef}
    className="grid gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4"
  >
    <div>
      <p className="text-base font-semibold text-orange-950">
        Additional Test / Payment
      </p>
      <p className="mt-1 text-sm text-orange-800">
        Select tests or procedures, confirm discount if any, and send the payment request to reception.
      </p>
    </div>

    <AdditionalServiceRequestPanel
      pendingRequest={pendingAdditionalService}
      onCreateRequest={handleCreateAdditionalServiceRequest}
      onCancel={() => setShowAdditionalServicePanel(false)}
    />
                {additionalServiceMessage && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-900">
                    {additionalServiceMessage}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Advice
                <textarea
                  value={consultation.advice}
                  onChange={(event) =>
                    updateConsultationField("advice", event.target.value)
                  }
                  placeholder="General advice, precautions, tests, procedures..."
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                />

                <div className="mt-3">
                  <ClinicalTemplatePicker
                    label="Advice"
                    templates={adviceTemplateChips}
                    currentValue={consultation.advice}
                    onSelect={(template) =>
                      updateConsultationField(
                        "advice",
                        appendUniqueLine(
                          consultation.advice,
                          template
                        )
                      )
                    }
                  />
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Follow-Up Date
                  <input
                    type="date"
                    min={getLocalTodayDateValue()}
                    value={consultation.followUpDate}
                    onChange={(event) => {
                      const value = event.target.value;
                    
                      setConsultation((current) => ({
                        ...current,
                        followUpDate: value,
                        freeFollowUpValidUntil: value ? "" : current.freeFollowUpValidUntil,
                      }));
                    
                      setConsultationSaved(false);
                      setShowPrescriptionPreview(false);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
  Free Follow-Up Valid Until
  <input
    type="date"
    min={getLocalTodayDateValue()}
    value={consultation.freeFollowUpValidUntil || ""}
    onChange={(event) => {
      const value = event.target.value;
    
      setConsultation((current) => ({
        ...current,
        freeFollowUpValidUntil: value,
        followUpDate: value ? "" : current.followUpDate,
      }));
    
      setConsultationSaved(false);
      setShowPrescriptionPreview(false);
    }}
    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
  />
  <span className="text-xs font-normal text-slate-500">
    Optional. Use only when doctor wants to allow a free follow-up until this date.
  </span>
</label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Doctor Notes
                  <input
                    type="text"
                    value={consultation.notes}
                    onChange={(event) =>
                      updateConsultationField("notes", event.target.value)
                    }
                    placeholder="Internal notes optional"
                    className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                  />
                </label>
              </div>
            </div>

            {consultationSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {statusMessage || "Consultation draft saved for selected patient."}
              </div>
            )}

              </>
            )}

            {showPrescriptionPreview && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-4 text-sm font-medium text-slate-700">
                  Prescription Preview
                </p>

                <PrescriptionPreview
                  patient={patientForPrescription}
                  showSpectacleAdvice
                  clinicSettingsOverride={activeClinicSettings}
                />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="grid min-w-0 content-start gap-3 lg:sticky lg:top-6">
          <DoctorActionPanel
            patientSelected={Boolean(activeQueueItem)}
            consultationActive={consultationActive}
            consultationCompleted={consultationCompleted}
            dilationWaiting={activeQueueItem?.status === "Dilated Waiting"}
            onStartConsultation={handleStartConsultation}
            onSaveDraft={handleSaveConsultationDraft}
            onPreviewPrescription={handlePreviewPrescription}
            onPrintPrescription={handlePrintPrescription}
            onPrintSpectacleAdvice={handlePrintSpectacleAdvice}
            onOpenAdditionalServicePanel={handleOpenAdditionalServicePanel}
            onSendForDilation={handleSendForDilation}
            onCompleteConsultation={handleCompleteConsultation}
          />

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-900">
              Patient Records
            </p>
            <p className="mt-1 text-xs text-indigo-800">
              Search old visits, receipts, prescriptions, and reports.
            </p>
            <a
              href="/patient-records"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl bg-indigo-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Records / Reprints
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-900">
              Admin Masters
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Manage clinical chips for doctor and optometrist.
            </p>
            <a
              href="/admin/masters"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Manage Masters
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}