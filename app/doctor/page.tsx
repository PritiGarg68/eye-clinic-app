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
import { useQueue } from "../components/QueueProvider";
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
  };
}

type SpectacleRowKey = "od" | "os" | "add";
type SpectacleFieldKey = keyof SpectacleDraftRow;

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

export default function DoctorPage() {
  const [activeClinicSettings, setActiveClinicSettings] =
    useState(clinicSettings);
  const {
    queueItems,
    selectedQueueItem,
    selectQueueItem,
    updateQueueItemStatus,
    updateQueueItemPatientDetails,
    addOrReplacePendingAdditionalServiceRequest,
    saveOptometristWorkup,
    saveDoctorConsultation,
  } = useQueue();

  const [statusMessage, setStatusMessage] = useState("");
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [showAdditionalServicePanel, setShowAdditionalServicePanel] =
    useState(false);
    const additionalServicePanelRef = useRef<HTMLDivElement | null>(null);
  const [additionalServiceMessage, setAdditionalServiceMessage] = useState("");
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

  const activeQueueItem = selectedSupabaseQueueItem || selectedQueueItem;

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
    setSupabaseDoctorQueueStatus("Loading Supabase doctor queue...");

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
          return current;
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
          ? `Loaded ${doctorQueue.length} Supabase doctor queue patient(s).`
          : "No patients are currently checked in."
      );
    } catch (error) {
      setSupabaseDoctorQueueStatus(
        error instanceof Error
          ? error.message
          : "Could not load Supabase doctor queue."
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

  function handleSelectPatientFromQueue(item: typeof selectedQueueItem) {
    setSelectedSupabaseQueueItem(null);
    selectQueueItem(item);
    setStatusMessage("");
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);
  }

  async function handleSelectSupabaseQueuePatient(item: QueueItem) {
    setSelectedSupabaseQueueItem(item);
    selectQueueItem(null);
    setStatusMessage(`Selected Supabase patient #${item.tokenNumber}.`);
    setConsultationSaved(false);
    setShowPrescriptionPreview(false);
    setShowAdditionalServicePanel(false);
    setAdditionalServiceMessage("");
    setIsPrintingPrescription(false);
    setIsPrintingSpectacleAdvice(false);
    setIsEditingPatientWorkup(false);

    try {
      const [savedWorkup, savedConsultation] = await Promise.all([
        fetchOptometristWorkupFromSupabase(item.id),
        fetchDoctorConsultationFromSupabase(item.id),
      ]);

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
      setConsultation(
        normalizeConsultation(
          savedConsultation || item.doctorConsultation,
          normalizedWorkup.spectacleDraft
        )
      );
      setStatusMessage(
        savedConsultation
          ? `Loaded Supabase consultation draft for token #${item.tokenNumber}.`
          : `Loaded Supabase optometrist workup for token #${item.tokenNumber}.`
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not load Supabase optometrist workup."
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

    const otherOpenConsultations = [
      ...supabaseDoctorQueueItems,
      ...queueItems,
    ].filter(
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

          setStatusMessage("Supabase completed consultation reopened.");
          setShowPrescriptionPreview(false);
          await loadSupabaseDoctorQueue();
        } catch (error) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Could not reopen Supabase consultation."
          );
        }

        return;
      }

      if (selectedQueueItem) {
        updateQueueItemStatus(selectedQueueItem.id, "Under Consultation");
        setStatusMessage("Completed consultation reopened.");
        setShowPrescriptionPreview(false);
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

        setStatusMessage("Supabase consultation started.");
        setShowPrescriptionPreview(false);
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not start Supabase consultation."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      updateQueueItemStatus(selectedQueueItem.id, "Under Consultation");
      setStatusMessage("Consultation started.");
      setShowPrescriptionPreview(false);
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
        alert("Supabase patient ID is missing for this queue item.");
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

        setStatusMessage("Supabase patient details corrected by doctor/admin.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update Supabase patient details."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      updateQueueItemPatientDetails(
        selectedQueueItem.id,
        patientName,
        age,
        gender
      );

      setStatusMessage("Patient details corrected by doctor/admin.");
    }
  }

  async function handleSaveWorkupFromDoctor(workup: OptometristWorkup) {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
        return;
      }

      try {
        await saveOptometristWorkupToSupabase({
          visitId: selectedSupabaseQueueItem.id,
          patientId: selectedSupabaseQueueItem.patientId,
          workup,
        });

        const updatedItem = {
          ...selectedSupabaseQueueItem,
          optometristWorkup: workup,
        };

        setSelectedSupabaseQueueItem((current) => {
          if (!current || current.id !== selectedSupabaseQueueItem.id) {
            return updatedItem;
          }

          return {
            ...current,
            optometristWorkup: workup,
          };
        });

        setSupabaseDoctorQueueItems((current) =>
          current.map((item) =>
            item.id === selectedSupabaseQueueItem.id
              ? {
                  ...item,
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

        setStatusMessage("Supabase workup details updated by doctor/admin.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not update Supabase workup details."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveOptometristWorkup(selectedQueueItem.id, workup);
      setStatusMessage("Workup details updated by doctor/admin.");
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
        alert("Supabase patient ID is missing for this queue item.");
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
          optometristNotes: existingWorkup.optometristNotes
            ? `${existingWorkup.optometristNotes}\nSent back by doctor for additional optometry review.`
            : "Sent back by doctor for additional optometry review.",
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

    if (selectedQueueItem) {
      updateQueueItemStatus(selectedQueueItem.id, "Needs Optometry Review");
      setStatusMessage("Patient sent back to optometrist for additional workup.");
      setShowPrescriptionPreview(false);
    }
  }

  async function handleSaveConsultationDraft() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await saveDoctorConsultationDraftToSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
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
        setStatusMessage("Supabase consultation draft saved.");
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not save Supabase consultation draft."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);
      setConsultationSaved(true);
      setStatusMessage("Consultation draft saved.");
    }
  }

  async function handleCompleteConsultation() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
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
        alert("Supabase patient ID is missing for this queue item.");
        return;
      }

      try {
        const savedConsultation =
          await completeDoctorConsultationInSupabase({
            visitId: selectedSupabaseQueueItem.id,
            patientId: selectedSupabaseQueueItem.patientId,
            consultation,
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
              ? `Supabase consultation completed. Free follow-up valid until ${entitlement.validUntil}. Final prescription PDF stored.${spectacleMessage}`
              : `Supabase consultation completed. Patient moved to Completed Today. Final prescription PDF stored.${spectacleMessage}`
          );
        }
        setShowPrescriptionPreview(false);
        await loadSupabaseDoctorQueue();
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not complete Supabase consultation."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);
      updateQueueItemStatus(selectedQueueItem.id, "Completed");
      setConsultationSaved(true);
      setStatusMessage("Consultation completed.");
      setShowPrescriptionPreview(false);
    }
  }

  async function handlePreviewPrescription() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
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
        setStatusMessage("Prescription preview generated from Supabase-saved consultation.");
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not generate Supabase prescription preview."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);
      setConsultationSaved(true);
      setShowPrescriptionPreview(true);
      setStatusMessage("Prescription preview generated.");
    }
  }

  async function handlePrintPrescription() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
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
        setStatusMessage("Prescription ready for printing from Supabase-saved consultation.");

        setTimeout(() => {
          window.print();
        }, 150);
      } catch (error) {
        setConsultationSaved(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not print Supabase prescription."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);
      setConsultationSaved(true);
      setShowPrescriptionPreview(true);
      setIsPrintingPrescription(true);
      setStatusMessage("Prescription ready for printing.");

      setTimeout(() => {
        window.print();
      }, 150);
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

    const shouldSendForDilation = window.confirm(
      "Send this patient for dilation? The patient will move to Dilated Waiting and return to doctor after dilation is marked Done."
    );

    if (!shouldSendForDilation) {
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
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
          dilationNotes: existingWorkup.dilationNotes
            ? `${existingWorkup.dilationNotes}\nSent for dilation by doctor.`
            : "Sent for dilation by doctor.",
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

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);

      const existingWorkup = selectedQueueItem.optometristWorkup || emptyWorkup;

      const updatedWorkup: OptometristWorkup = {
        ...existingWorkup,
        dilationStatus: "Waiting",
        dilationNotes: existingWorkup.dilationNotes
          ? `${existingWorkup.dilationNotes}\nSent for dilation by doctor.`
          : "Sent for dilation by doctor.",
      };

      saveOptometristWorkup(selectedQueueItem.id, updatedWorkup);
      updateQueueItemStatus(selectedQueueItem.id, "Dilated Waiting");

      setConsultationSaved(true);
      setShowPrescriptionPreview(false);
      setStatusMessage(
        "Patient sent for dilation. Dilation status marked Waiting."
      );
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
        alert("Supabase patient ID is missing for this queue item.");
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

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);

      addOrReplacePendingAdditionalServiceRequest(
        selectedQueueItem.id,
        serviceRequest
      );

      setConsultationSaved(true);
      setShowPrescriptionPreview(false);
      setShowAdditionalServicePanel(false);

      const serviceNames = serviceRequest.services
        .map((service) => service.serviceName)
        .join(", ");

      const message = pendingAdditionalService
        ? `Pending request updated: ${serviceNames}. Revised amount to collect: ₹${serviceRequest.netAmount}.`
        : `${serviceNames} sent to reception. Amount to collect: ₹${serviceRequest.netAmount}.`;

      setAdditionalServiceMessage(message);
      setStatusMessage(message);
    }
  }

  async function handlePrintSpectacleAdvice() {
    if (!activeQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      if (!selectedSupabaseQueueItem.patientId) {
        alert("Supabase patient ID is missing for this queue item.");
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
        setStatusMessage("Supabase spectacle advice ready for printing.");

        setTimeout(() => {
          window.print();
        }, 150);
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Could not save Supabase spectacle advice for printing."
        );
      }

      return;
    }

    if (selectedQueueItem) {
      saveDoctorConsultation(selectedQueueItem.id, consultation);
      setConsultationSaved(true);
      setIsPrintingSpectacleAdvice(true);
      setStatusMessage("Spectacle advice ready for printing.");

      setTimeout(() => {
        window.print();
      }, 150);
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
      <div className="mb-6 flex justify-end">
        <Link
          href="/reports"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-700 bg-slate-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
        >
          Reports
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_180px]">
        <div className="grid min-w-0 gap-6">
          <SectionCard
            title="Supabase Doctor Queue"
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

          <SectionCard title="Local Queue" subtitle="Temporary local fallback">
            <QueuePanel
              items={sortQueueForRole(queueItems, "doctor")}
              selectedItemId={selectedQueueItem?.id}
              onSelectItem={handleSelectPatientFromQueue}
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