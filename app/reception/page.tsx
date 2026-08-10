"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import ReceiptPreview from "../components/ReceiptPreview";
import ConsultationReceiptPdfDocument from "../components/ConsultationReceiptPdfDocument";
import AdditionalServiceReceiptPdfDocument from "../components/AdditionalServiceReceiptPdfDocument";
import AdditionalPaymentPendingCard from "../components/AdditionalPaymentPendingCard";
import AdditionalServiceReceiptPreview from "../components/AdditionalServiceReceiptPreview";
import { clinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";
import { fetchDefaultConsultationFeeFromServices } from "../../lib/servicesDb";
import { getPendingAdditionalService } from "../../lib/additionalServiceUtils";
import { fetchTodayQueueFromSupabase } from "../../lib/queueDb";
import { collectAdditionalServicePaymentInSupabase } from "../../lib/additionalServiceRequestDb";
import { upsertGeneratedDocumentToSupabase } from "../../lib/generatedDocumentsDb";
import {
  FreeFollowUpEntitlement,
  consumeFreeFollowUpEntitlement,
  fetchActiveFreeFollowUpEntitlement,
} from "../../lib/followUpEntitlementDb";
import {
  SupabasePatient,
  createPatientInSupabase,
  fetchPatientByIdFromSupabase,
  searchPatientsFromSupabase,
  updatePatientInSupabase,
} from "../../lib/patientsDb";
import {
  PatientSource,
  fetchActivePatientSourcesFromSupabase,
} from "../../lib/patientSourcesDb";
import {
  ConsultationCheckInResult,
  PaymentMode as SupabasePaymentMode,
  VisitType as SupabaseVisitType,
  createConsultationCheckIn,
  fetchActiveConsultationCheckInForPatientToday,
  updateReceptionCheckIn,
} from "../../lib/checkInDb";
import { Patient } from "../../types/patients";
import {
  AdditionalServiceRequest,
  PaymentMode,
  QueueItem,
  VisitType,
} from "../../types/queue";

type EditablePatientDetails = {
  name: string;
  age: string;
  gender: Patient["gender"];
};

export default function ReceptionPage() {
  const [activeClinicSettings, setActiveClinicSettings] =
    useState(clinicSettings);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [supabasePatientResults, setSupabasePatientResults] = useState<
    SupabasePatient[]
  >([]);
  const [supabasePatientSearchStatus, setSupabasePatientSearchStatus] =
    useState("");
  const [editingSupabaseQueueItem, setEditingSupabaseQueueItem] =
    useState<QueueItem | null>(null);
  const [editingSupabasePatientRecord, setEditingSupabasePatientRecord] =
    useState<SupabasePatient | null>(null);
  const [editablePatientSourceId, setEditablePatientSourceId] = useState("");
  const [editableReferralNotes, setEditableReferralNotes] = useState("");
  const [editablePatientDetails, setEditablePatientDetails] =
    useState<EditablePatientDetails>({
      name: "",
      age: "",
      gender: "Male",
    });

  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientMobile, setNewPatientMobile] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientGender, setNewPatientGender] = useState<
    "Male" | "Female" | "Other"
  >("Male");
  const [newPatientAddress, setNewPatientAddress] = useState("");
  const [newPatientSourceId, setNewPatientSourceId] = useState("");
  const [newPatientNotes, setNewPatientNotes] = useState("");
  const [patientSources, setPatientSources] = useState<PatientSource[]>([]);
  const [patientSourcesStatus, setPatientSourcesStatus] = useState("");

  const [visitType, setVisitType] =
    useState<VisitType>("New Patient Visit");
  const [consultationFee, setConsultationFee] = useState(
    String(activeClinicSettings.defaultConsultationFee)
  );
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");

  const [additionalPaymentMode, setAdditionalPaymentMode] =
    useState<PaymentMode>("Cash");
  const [additionalReceiptService, setAdditionalReceiptService] =
    useState<AdditionalServiceRequest | null>(null);

  const [supabaseQueueItems, setSupabaseQueueItems] = useState<QueueItem[]>([]);
  const [selectedSupabaseQueueItem, setSelectedSupabaseQueueItem] =
    useState<QueueItem | null>(null);
  const [supabaseQueueStatus, setSupabaseQueueStatus] = useState("");
  const [latestSupabaseCheckIn, setLatestSupabaseCheckIn] =
    useState<ConsultationCheckInResult | null>(null);
  const [supabaseCheckInStatus, setSupabaseCheckInStatus] = useState("");
  const [freeFollowUpEntitlement, setFreeFollowUpEntitlement] =
    useState<FreeFollowUpEntitlement | null>(null);
  const [freeFollowUpStatus, setFreeFollowUpStatus] = useState("");

  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isPrintingAdditionalReceipt, setIsPrintingAdditionalReceipt] =
    useState(false);

  const amountPayable = useMemo(() => {
    if (visitType === "Free Follow-Up") {
      return 0;
    }

    const fee = Number(consultationFee) || 0;
    const discount = Number(discountAmount) || 0;

    return Math.max(fee - discount, 0);
  }, [visitType, consultationFee, discountAmount]);

  const effectivePaymentMode: PaymentMode =
    visitType === "Free Follow-Up" ? "None" : paymentMode;

  const supabaseQueueItemBeingEdited = editingSupabaseQueueItem;
  const isEditingAnyQueueItem = Boolean(supabaseQueueItemBeingEdited);

  const canEditPayment =
    !supabaseQueueItemBeingEdited ||
    supabaseQueueItemBeingEdited.status === "Waiting";

  const activeReceptionQueueItem = selectedSupabaseQueueItem;

  const pendingAdditionalService =
    getPendingAdditionalService(activeReceptionQueueItem);

  const selectedPatientActiveSupabaseQueueItem =
    selectedPatient && isSupabasePatient(selectedPatient)
      ? supabaseQueueItems.find((item) => item.uhid === selectedPatient.uhid)
      : null;

  useEffect(() => {
    let isMounted = true;

    async function loadPatientSources() {
      try {
        const sources = await fetchActivePatientSourcesFromSupabase();

        if (!isMounted) {
          return;
        }

        setPatientSources(sources);
        setPatientSourcesStatus("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPatientSourcesStatus(
          error instanceof Error
            ? `Could not load patient sources: ${error.message}`
            : "Could not load patient sources."
        );
      }
    }

    void loadPatientSources();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadClinicSettings() {
      const [settings, consultationFeeFromServices] = await Promise.all([
        fetchClinicSettings(),
        fetchDefaultConsultationFeeFromServices(),
      ]);

      if (!isMounted) {
        return;
      }

      const effectiveSettings = {
        ...settings,
        defaultConsultationFee:
          consultationFeeFromServices ?? settings.defaultConsultationFee,
      };

      setActiveClinicSettings(effectiveSettings);
      setConsultationFee(String(effectiveSettings.defaultConsultationFee));
    }

    loadClinicSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSupabaseQueue() {
      setSupabaseQueueStatus("Loading today's queue...");

      try {
        const queue = await fetchTodayQueueFromSupabase();

        if (!isMounted) {
          return;
        }

        setSupabaseQueueItems(queue);
        setSelectedSupabaseQueueItem((currentSelected) =>
          currentSelected &&
          queue.some((item) => item.id === currentSelected.id)
            ? currentSelected
            : null
        );
        setSupabaseQueueStatus(`Loaded ${queue.length} queue item(s).`);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSupabaseQueueStatus(
          error instanceof Error
            ? `Error loading queue: ${error.message}`
            : "Error loading Supabase queue."
        );
      }
    }

    loadInitialSupabaseQueue();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();

    if (!term || showRegistrationForm || isEditingAnyQueueItem) {
      setSupabasePatientResults([]);
      setSupabasePatientSearchStatus("");
      return;
    }

    let isMounted = true;

    async function runSupabasePatientSearch() {
      setSupabasePatientSearchStatus("Searching patients...");

      try {
        const results = await searchPatientsFromSupabase(term);

        if (!isMounted) {
          return;
        }

        setSupabasePatientResults(results);
        setSupabasePatientSearchStatus(
          `Found ${results.length} patient(s).`
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSupabasePatientResults([]);
        setSupabasePatientSearchStatus(
          error instanceof Error
            ? `Patient search error: ${error.message}`
            : "Supabase patient search error."
        );
      }
    }

    const timeoutId = window.setTimeout(runSupabasePatientSearch, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, showRegistrationForm, isEditingAnyQueueItem]);

  const paidAdditionalServices =
    activeReceptionQueueItem?.additionalServices?.filter(
      (service) => service.status === "Paid"
    ) || [];

  const totalPaidAdditionalAmount = paidAdditionalServices.reduce(
    (total, service) => total + service.netAmount,
    0
  );

  const selectedSupabasePatientRecord =
    selectedPatient && isSupabasePatient(selectedPatient)
      ? supabasePatientResults.find(
          (patient) => patient.id === selectedPatient.id
        ) || null
      : null;

  const selectedPatientSourceName =
    selectedSupabasePatientRecord?.patientSourceId
      ? patientSources.find(
          (source) =>
            source.id === selectedSupabasePatientRecord.patientSourceId
        )?.name || ""
      : "";

  const editingPatientSourceName =
    editingSupabasePatientRecord?.patientSourceId
      ? patientSources.find(
          (source) =>
            source.id === editingSupabasePatientRecord.patientSourceId
        )?.name || ""
      : "";

  const canEditOriginalPatientSource =
    supabaseQueueItemBeingEdited?.visitType === "New Patient Visit" &&
    supabaseQueueItemBeingEdited?.status === "Waiting";

  function mapSupabasePatientToPatient(patient: SupabasePatient): Patient {
    return {
      id: patient.id,
      uhid: patient.uhid,
      mobile: patient.mobile,
      name: patient.fullName,
      age: patient.ageYears,
      gender: patient.gender,
      address: patient.address || undefined,
      notes: patient.referralNotes || undefined,
      createdAt: patient.createdAt,
    };
  }

  useEffect(() => {
    void loadFreeFollowUpEntitlementForPatient(selectedPatient);
  }, [selectedPatient?.id]);

  const receiptPatient: Patient | null =
    selectedPatient ||
      (selectedSupabaseQueueItem
        ? {
            id: selectedSupabaseQueueItem.patientId || selectedSupabaseQueueItem.id,
            uhid: selectedSupabaseQueueItem.uhid,
            mobile: selectedSupabaseQueueItem.mobile || "",
            name: selectedSupabaseQueueItem.patientName,
            age: selectedSupabaseQueueItem.age,
            gender: selectedSupabaseQueueItem.gender,
            createdAt: new Date().toISOString(),
          }
        : null);

  async function loadFreeFollowUpEntitlementForPatient(patient: Patient | null) {
    setFreeFollowUpEntitlement(null);
    setFreeFollowUpStatus("");

    if (!patient || !isSupabasePatient(patient)) {
      return;
    }

    try {
      const entitlement = await fetchActiveFreeFollowUpEntitlement(patient.id);
      setFreeFollowUpEntitlement(entitlement);

      if (entitlement) {
        setFreeFollowUpStatus(
          `Free follow-up available until ${entitlement.validUntil}.`
        );
      }
    } catch (error) {
      setFreeFollowUpStatus(
        error instanceof Error
          ? error.message
          : "Could not check free follow-up eligibility."
      );
    }
  }

  function mapReceptionVisitTypeToSupabase(
    currentVisitType: VisitType
  ): SupabaseVisitType {
    if (currentVisitType === "New Patient Visit") {
      return "New Consultation";
    }

    if (currentVisitType === "Returning Patient") {
      return "Follow-Up";
    }

    return "Free Follow-Up";
  }

  function mapReceptionPaymentModeToSupabase(
    currentPaymentMode: PaymentMode
  ): SupabasePaymentMode {
    return currentPaymentMode;
  }

  function isSupabasePatient(patient: Patient | null) {
    return Boolean(
      patient?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          patient.id
        )
    );
  }

  function resetPaymentState() {
    setVisitType("New Patient Visit");
    setConsultationFee(String(activeClinicSettings.defaultConsultationFee));
    setDiscountAmount("0");
    setPaymentMode("Cash");
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
  }

  function resetNewPatientForm() {
    setNewPatientName("");
    setNewPatientMobile("");
    setNewPatientAge("");
    setNewPatientGender("Male");
    setNewPatientAddress("");
    setNewPatientSourceId("");
    setNewPatientNotes("");
  }

  function resetQueueEditState() {
    setEditingSupabaseQueueItem(null);
    setEditingSupabasePatientRecord(null);
    setEditablePatientSourceId("");
    setEditableReferralNotes("");
    setEditablePatientDetails({
      name: "",
      age: "",
      gender: "Male",
    });
  }

  function handleSearchTermChange(value: string) {
    setSearchTerm(value);
    setSelectedPatient(null);
    setShowRegistrationForm(false);
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    setSupabasePatientResults([]);
    setSupabasePatientSearchStatus("");
    setLatestSupabaseCheckIn(null);
    setSupabaseCheckInStatus("");
    resetQueueEditState();
  }

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setShowRegistrationForm(false);
    setVisitType("Returning Patient");
    setConsultationFee(String(activeClinicSettings.defaultConsultationFee));
    setDiscountAmount("0");
    setPaymentMode("Cash");
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    setLatestSupabaseCheckIn(null);
    setSupabaseCheckInStatus("");
    resetQueueEditState();
  }

  function handleClearSelection() {
    setSelectedPatient(null);
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    resetQueueEditState();
  }

  function handleOpenRegistration() {
    setShowRegistrationForm(true);
    setSelectedPatient(null);
    resetPaymentState();
    resetQueueEditState();

    if (/^\d+$/.test(searchTerm.trim())) {
      setNewPatientMobile(searchTerm.trim());
    }
  }

  async function handleCreateSupabasePatient() {
    if (
      !newPatientName ||
      !newPatientMobile ||
      !newPatientAge ||
      !newPatientSourceId
    ) {
      alert("Please enter name, mobile number, age, and patient source.");
      return;
    }

    setSupabasePatientSearchStatus("Creating patient...");

    try {
      const createdPatient = await createPatientInSupabase({
        fullName: newPatientName,
        mobile: newPatientMobile,
        ageYears: Number(newPatientAge),
        gender: newPatientGender,
        address: newPatientAddress,
        patientSourceId: newPatientSourceId,
        referralNotes: newPatientNotes,
      });

      const mappedPatient = mapSupabasePatientToPatient(createdPatient);

      setSelectedPatient(mappedPatient);
      setShowRegistrationForm(false);
      setSearchTerm(createdPatient.mobile);
      setVisitType("New Patient Visit");
      setConsultationFee(String(activeClinicSettings.defaultConsultationFee));
      setDiscountAmount("0");
      setPaymentMode("Cash");
      setReceiptGenerated(false);
      setShowReceiptPreview(false);
      setSupabasePatientResults([createdPatient]);
      setSupabasePatientSearchStatus(
        `Patient ${createdPatient.uhid} created successfully.`
      );
      resetQueueEditState();
    } catch (error) {
      setSupabasePatientSearchStatus(
        error instanceof Error
          ? `Patient creation error: ${error.message}`
          : "Patient creation error."
      );
    }
  }

  async function handleEditSelectedSupabaseQueuePatient() {
    if (!selectedSupabaseQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    if (selectedSupabaseQueueItem.status !== "Waiting") {
      alert(
        `Original check-in can be edited only while status is Waiting. Current status: ${selectedSupabaseQueueItem.status}.`
      );
      return;
    }

    if (!selectedSupabaseQueueItem.patientId) {
      alert("Selected queue patient is missing patient id.");
      return;
    }

    setEditingSupabaseQueueItem(selectedSupabaseQueueItem);
    setSelectedPatient(null);
    setShowRegistrationForm(false);
    setEditingSupabasePatientRecord(null);
    setEditablePatientSourceId("");
    setEditableReferralNotes("");

    try {
      const patientRecord = await fetchPatientByIdFromSupabase(
        selectedSupabaseQueueItem.patientId
      );

      setEditingSupabasePatientRecord(patientRecord);
      setEditablePatientSourceId(patientRecord?.patientSourceId || "");
      setEditableReferralNotes(patientRecord?.referralNotes || "");
    } catch (error) {
      setEditingSupabasePatientRecord(null);
      setEditablePatientSourceId("");
      setEditableReferralNotes("");

      setSupabaseCheckInStatus(
        error instanceof Error
          ? `Could not load patient details: ${error.message}`
          : "Could not load patient details."
      );
    }

    setEditablePatientDetails({
      name: selectedSupabaseQueueItem.patientName,
      age: String(selectedSupabaseQueueItem.age),
      gender: selectedSupabaseQueueItem.gender,
    });

    setVisitType(selectedSupabaseQueueItem.visitType);
    setConsultationFee(
      String(
        selectedSupabaseQueueItem.consultationGrossAmount ??
          selectedSupabaseQueueItem.amountPaid
      )
    );
    setDiscountAmount(
      String(selectedSupabaseQueueItem.consultationDiscountAmount ?? 0)
    );

    if (selectedSupabaseQueueItem.paymentMode !== "None") {
      setPaymentMode(selectedSupabaseQueueItem.paymentMode);
    } else {
      setPaymentMode("Cash");
    }

    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    setLatestSupabaseCheckIn(null);
    setSupabaseCheckInStatus(
      `Editing original check-in for token #${selectedSupabaseQueueItem.tokenNumber}.`
    );
  }

  async function handleSaveSupabaseQueuePatientCorrections() {
    if (!supabaseQueueItemBeingEdited) {
      alert("Please select a queue patient to edit.");
      return;
    }

    if (!editablePatientDetails.name || !editablePatientDetails.age) {
      alert("Please enter patient name and age.");
      return;
    }

    if (Number(discountAmount) > Number(consultationFee)) {
      alert("Discount cannot be more than consultation fee.");
      return;
    }

    setSupabaseCheckInStatus("Saving check-in corrections...");

    try {
      if (
        canEditOriginalPatientSource &&
        supabaseQueueItemBeingEdited.patientId
      ) {
        if (!editablePatientSourceId) {
          alert("Please select the original patient source.");
          return;
        }

        await updatePatientInSupabase({
          patientId: supabaseQueueItemBeingEdited.patientId,
          fullName: editablePatientDetails.name,
          ageYears: Number(editablePatientDetails.age),
          gender: editablePatientDetails.gender,
          patientSourceId: editablePatientSourceId,
          referralNotes: editableReferralNotes,
        });
      }

      const result = await updateReceptionCheckIn({
        visitId: supabaseQueueItemBeingEdited.id,
        fullName: editablePatientDetails.name,
        ageYears: Number(editablePatientDetails.age),
        gender: editablePatientDetails.gender,
        visitType: mapReceptionVisitTypeToSupabase(visitType),
        grossAmount:
          visitType === "Free Follow-Up" ? 0 : Number(consultationFee) || 0,
        discountAmount:
          visitType === "Free Follow-Up" ? 0 : Number(discountAmount) || 0,
        paymentMode:
          visitType === "Free Follow-Up"
            ? "None"
            : mapReceptionPaymentModeToSupabase(effectivePaymentMode),
      });

      let consultationReceiptPdfWarning = "";

      try {
        const receiptPatient: Patient = {
          id:
            supabaseQueueItemBeingEdited.patientId ||
            result.patientId,
          name: editablePatientDetails.name,
          age: Number(editablePatientDetails.age),
          gender: editablePatientDetails.gender,
          mobile:
            editingSupabasePatientRecord?.mobile ||
            supabaseQueueItemBeingEdited.mobile ||
            "",
          uhid: supabaseQueueItemBeingEdited.uhid,
          createdAt:
            editingSupabasePatientRecord?.createdAt ||
            new Date().toISOString(),
        };

        const receiptPdfBlob = await pdf(
          <ConsultationReceiptPdfDocument
            patient={receiptPatient}
            visitType={visitType}
            paymentMode={effectivePaymentMode}
            grossAmount={result.grossAmount}
            discountAmount={result.discountAmount}
            netAmount={result.netAmount}
            receiptNumber={result.receiptNumber}
            paidAt={result.paidAt}
            clinicSettings={activeClinicSettings}
          />
        ).toBlob();

        await upsertGeneratedDocumentToSupabase({
          patientId: result.patientId,
          visitId: result.visitId,
          paymentId: result.paymentId,
          documentType: "Consultation Receipt",
          fileName: `Consultation-Receipt-${supabaseQueueItemBeingEdited.uhid}-${result.receiptNumber}.pdf`,
          storagePath: `${result.patientId}/${result.visitId}/receipts/${result.paymentId}.pdf`,
          pdfBlob: receiptPdfBlob,
        });
      } catch (pdfError) {
        consultationReceiptPdfWarning =
          pdfError instanceof Error
            ? ` Consultation receipt PDF warning: ${pdfError.message}`
            : " Consultation receipt PDF could not be updated.";
      }

      const queue = await fetchTodayQueueFromSupabase();
      const refreshedItem =
        queue.find((item) => item.id === result.visitId) || null;

      setSupabaseQueueItems(queue);
      setSelectedSupabaseQueueItem(refreshedItem);
      setEditingSupabaseQueueItem(null);
      setSupabaseQueueStatus(`Loaded ${queue.length} queue item(s).`);
      setLatestSupabaseCheckIn(result);
      setReceiptGenerated(true);
      setShowReceiptPreview(true);
      setSupabaseCheckInStatus(
        `Updated token #${result.tokenNumber}. Receipt ${result.receiptNumber} remains unchanged. Stored consultation receipt PDF updated.${consultationReceiptPdfWarning}`
      );
    } catch (error) {
      setSupabaseCheckInStatus(
        error instanceof Error
          ? `Check-in update error: ${error.message}`
          : "Check-in update error."
      );
    }
  }

  async function handleGenerateSupabaseReceipt() {
    if (!selectedPatient) {
      alert("Please select or register a patient first.");
      return;
    }

    if (!isSupabasePatient(selectedPatient)) {
      alert(
        "Please select a saved patient or register a new patient first."
      );
      return;
    }

    if (Number(discountAmount) > Number(consultationFee)) {
      alert("Discount cannot be more than consultation fee.");
      return;
    }

    if (visitType === "Free Follow-Up" && !freeFollowUpEntitlement) {
      setSupabaseCheckInStatus(
        "No active free follow-up entitlement found for this patient."
      );
      return;
    }

    setSupabaseCheckInStatus("Creating check-in...");

    try {
      const result = await createConsultationCheckIn({
        patientId: selectedPatient.id,
        visitType: mapReceptionVisitTypeToSupabase(visitType),
        grossAmount:
          visitType === "Free Follow-Up" ? 0 : Number(consultationFee) || 0,
        discountAmount:
          visitType === "Free Follow-Up" ? 0 : Number(discountAmount) || 0,
        paymentMode:
          visitType === "Free Follow-Up"
            ? "None"
            : mapReceptionPaymentModeToSupabase(effectivePaymentMode),
        notes: "Created from Reception Supabase check-in",
      });

      if (visitType === "Free Follow-Up") {
        await consumeFreeFollowUpEntitlement({
          patientId: selectedPatient.id,
          usedVisitId: result.visitId,
        });

        setFreeFollowUpEntitlement(null);
        setFreeFollowUpStatus("Free follow-up entitlement used for this visit.");
      }

      let consultationReceiptPdfWarning = "";

      try {
        const receiptPdfBlob = await pdf(
          <ConsultationReceiptPdfDocument
            patient={selectedPatient}
            visitType={visitType}
            paymentMode={effectivePaymentMode}
            grossAmount={result.grossAmount}
            discountAmount={result.discountAmount}
            netAmount={result.netAmount}
            receiptNumber={result.receiptNumber}
            paidAt={result.paidAt}
            clinicSettings={activeClinicSettings}
          />
        ).toBlob();

        await upsertGeneratedDocumentToSupabase({
          patientId: result.patientId,
          visitId: result.visitId,
          paymentId: result.paymentId,
          documentType: "Consultation Receipt",
          fileName: `Consultation-Receipt-${selectedPatient.uhid}-${result.receiptNumber}.pdf`,
          storagePath: `${result.patientId}/${result.visitId}/receipts/${result.paymentId}.pdf`,
          pdfBlob: receiptPdfBlob,
        });
      } catch (pdfError) {
        consultationReceiptPdfWarning =
          pdfError instanceof Error
            ? ` Consultation receipt PDF warning: ${pdfError.message}`
            : " Consultation receipt PDF could not be stored.";
      }

      const queue = await fetchTodayQueueFromSupabase();

      setLatestSupabaseCheckIn(result);
      setSupabaseQueueItems(queue);
      setSupabaseQueueStatus(`Loaded ${queue.length} queue item(s).`);
      setReceiptGenerated(true);
      setShowReceiptPreview(true);
      setSupabaseCheckInStatus(
        `Check-in created: token #${result.tokenNumber}, receipt ${result.receiptNumber}. Final consultation receipt PDF stored.${consultationReceiptPdfWarning}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Supabase check-in error.";

      if (errorMessage.includes("Patient already has an active visit today")) {
        const tokenMatch = errorMessage.match(/token (\d+)/);
        const tokenNumber = tokenMatch?.[1];

        const queue = await fetchTodayQueueFromSupabase();
        const existingCheckIn =
          await fetchActiveConsultationCheckInForPatientToday(
            selectedPatient.id
          );

        setSupabaseQueueItems(queue);
        setSelectedSupabaseQueueItem((currentSelected) =>
          currentSelected &&
          queue.some((item) => item.id === currentSelected.id)
            ? currentSelected
            : null
        );
        setSupabaseQueueStatus(`Loaded ${queue.length} queue item(s).`);

        if (existingCheckIn) {
          setLatestSupabaseCheckIn(existingCheckIn);
          setReceiptGenerated(true);
          setShowReceiptPreview(true);
        }

        const resolvedTokenNumber =
          existingCheckIn?.tokenNumber || tokenNumber;

        setSupabaseCheckInStatus(
          resolvedTokenNumber
            ? `This patient is already checked in today as token #${resolvedTokenNumber}. The queue has been refreshed.`
            : "This patient is already checked in today. The queue has been refreshed."
        );
        return;
      }

      setSupabaseCheckInStatus(`Check-in error: ${errorMessage}`);
    }
  }

  function handlePreviewReceipt() {
    if (!receiptPatient) {
      alert("Please select or register a patient first.");
      return;
    }

    setShowReceiptPreview(true);
  }

  function handlePrintReceipt() {
    if (!receiptPatient) {
      alert("Please select or register a patient first.");
      return;
    }

    setShowReceiptPreview(true);
    setIsPrintingReceipt(true);

    setTimeout(() => {
      window.print();
      setIsPrintingReceipt(false);
    }, 150);
  }

  function handleReprintSupabaseConsultationReceipt() {
    if (!selectedSupabaseQueueItem) {
      alert("Please select a queue patient first.");
      return;
    }

    if (!selectedSupabaseQueueItem.consultationReceiptNumber) {
      alert("No consultation receipt number found for this queue patient.");
      return;
    }

    setSelectedPatient(null);
    setShowRegistrationForm(false);
    setVisitType(selectedSupabaseQueueItem.visitType);
    setPaymentMode(selectedSupabaseQueueItem.paymentMode);
    setConsultationFee(
      String(
        selectedSupabaseQueueItem.consultationGrossAmount ??
          selectedSupabaseQueueItem.amountPaid
      )
    );
    setDiscountAmount(
      String(selectedSupabaseQueueItem.consultationDiscountAmount ?? 0)
    );
    setLatestSupabaseCheckIn({
      visitId: selectedSupabaseQueueItem.id,
      patientId:
        selectedSupabaseQueueItem.patientId || selectedSupabaseQueueItem.id,
      visitDate: new Date().toISOString().slice(0, 10),
      tokenNumber: selectedSupabaseQueueItem.tokenNumber,
      visitType: mapReceptionVisitTypeToSupabase(
        selectedSupabaseQueueItem.visitType
      ),
      status: "Waiting",
      paymentId: "",
      receiptNumber: selectedSupabaseQueueItem.consultationReceiptNumber,
      grossAmount:
        selectedSupabaseQueueItem.consultationGrossAmount ??
        selectedSupabaseQueueItem.amountPaid,
      discountAmount:
        selectedSupabaseQueueItem.consultationDiscountAmount ?? 0,
      netAmount:
        selectedSupabaseQueueItem.consultationNetAmount ??
        selectedSupabaseQueueItem.amountPaid,
      paymentMode: mapReceptionPaymentModeToSupabase(
        selectedSupabaseQueueItem.paymentMode
      ),
      paidAt: new Date().toISOString(),
    });
    setReceiptGenerated(true);
    setShowReceiptPreview(false);
    setIsPrintingReceipt(true);

    setTimeout(() => {
      window.print();
      setIsPrintingReceipt(false);
    }, 150);
  }

  async function handleCollectAdditionalPaymentAndPrint(
    serviceRequestId: string
  ) {
    const activeItem = selectedSupabaseQueueItem;

    if (!activeItem) {
      alert("Please select a payment-pending patient first.");
      return;
    }

    const serviceToPrint = getPendingAdditionalService(activeItem);

    if (!serviceToPrint || serviceToPrint.id !== serviceRequestId) {
      alert("No pending additional payment found for this patient.");
      return;
    }

    if (selectedSupabaseQueueItem) {
      try {
        const collectedPayment = await collectAdditionalServicePaymentInSupabase({
          requestId: serviceRequestId,
          paymentMode: additionalPaymentMode,
        });

        const paidService: AdditionalServiceRequest = {
          ...serviceToPrint,
          status: "Paid",
          paidAt: collectedPayment.paid_at,
          paymentMode: additionalPaymentMode,
          receiptNumber: collectedPayment.receipt_number,
        };

        let additionalReceiptPdfWarning = "";

        try {
          const additionalReceiptPdfBlob = await pdf(
            <AdditionalServiceReceiptPdfDocument
              patient={activeItem}
              serviceRequest={paidService}
              paymentMode={additionalPaymentMode}
              receiptNumber={collectedPayment.receipt_number}
              paidAt={collectedPayment.paid_at}
              clinicSettings={activeClinicSettings}
            />
          ).toBlob();

          await upsertGeneratedDocumentToSupabase({
            patientId: collectedPayment.patient_id,
            visitId: collectedPayment.visit_id,
            paymentId: collectedPayment.payment_id,
            documentType: "Additional Service Receipt",
            fileName: `Additional-Service-Receipt-${activeItem.uhid}-${collectedPayment.receipt_number}.pdf`,
            storagePath: `${collectedPayment.patient_id}/${collectedPayment.visit_id}/receipts/${collectedPayment.payment_id}.pdf`,
            pdfBlob: additionalReceiptPdfBlob,
          });
        } catch (pdfError) {
          additionalReceiptPdfWarning =
            pdfError instanceof Error
              ? ` Additional receipt PDF warning: ${pdfError.message}`
              : " Additional receipt PDF could not be stored.";
        }

        setAdditionalReceiptService(paidService);
        setShowReceiptPreview(false);
        setReceiptGenerated(false);

        const refreshedQueue = await fetchTodayQueueFromSupabase();
        setSupabaseQueueItems(refreshedQueue);

        const refreshedSelected =
          refreshedQueue.find((item) => item.id === selectedSupabaseQueueItem.id) ||
          null;

        setSelectedSupabaseQueueItem(refreshedSelected);
        setSupabaseQueueStatus(
          `Collected additional payment receipt ${collectedPayment.receipt_number}. Patient routed to ${collectedPayment.visit_status}. Final additional service receipt PDF stored.${additionalReceiptPdfWarning}`
        );

        setIsPrintingAdditionalReceipt(true);

        setTimeout(() => {
          window.print();
          setIsPrintingAdditionalReceipt(false);
        }, 150);
      } catch (error) {
        setSupabaseQueueStatus(
          error instanceof Error
            ? `Additional payment error: ${error.message}`
            : "Additional payment error."
        );
      }

      return;
    }


  }
  function handlePrintPaidAdditionalReceipt(
    serviceRequest: AdditionalServiceRequest
  ) {
    const activeItem = selectedSupabaseQueueItem;

    if (!activeItem) {
      alert("Please select a patient first.");
      return;
    }

    setAdditionalReceiptService(serviceRequest);
    setAdditionalPaymentMode(serviceRequest.paymentMode || "Cash");
    setShowReceiptPreview(false);
    setIsPrintingAdditionalReceipt(true);

    setTimeout(() => {
      window.print();
      setIsPrintingAdditionalReceipt(false);
    }, 150);
  }

  async function handleLoadSupabaseQueue() {
    setSupabaseQueueStatus("Loading today's queue...");

    try {
      const queue = await fetchTodayQueueFromSupabase();
      setSupabaseQueueItems(queue);
      setSupabaseQueueStatus(`Loaded ${queue.length} queue item(s).`);
    } catch (error) {
      setSupabaseQueueStatus(
        error instanceof Error
          ? `Error loading queue: ${error.message}`
          : "Error loading Supabase queue."
      );
    }
  }

  function handleStartNextPatient() {
    setSelectedSupabaseQueueItem(null);
    setSearchTerm("");
    setSelectedPatient(null);
    setShowRegistrationForm(false);
    resetNewPatientForm();
    resetPaymentState();
    resetQueueEditState();
    setAdditionalPaymentMode("Cash");
    setAdditionalReceiptService(null);
  }

  if (isPrintingReceipt) {
    return (
      <div className="bg-white p-4">
        <ReceiptPreview
          patient={receiptPatient}
          visitType={visitType}
          paymentMode={effectivePaymentMode}
          consultationFee={Number(consultationFee) || 0}
          discount={Number(discountAmount) || 0}
          amountPaid={amountPayable}
          receiptNumberOverride={
            latestSupabaseCheckIn?.receiptNumber ||
            supabaseQueueItemBeingEdited?.consultationReceiptNumber
          }
        />
      </div>
    );
  }

  if (isPrintingAdditionalReceipt) {
    return (
      <div className="bg-white p-4">
        <AdditionalServiceReceiptPreview
          patient={activeReceptionQueueItem}
          serviceRequest={additionalReceiptService}
          paymentMode={additionalPaymentMode}
          clinicSettingsOverride={activeClinicSettings}
        />
      </div>
    );
  }

  return (
    <AppShell
      title="Reception Workspace"
      subtitle="Patient search, registration, payment, receipt, and queue entry"
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
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Live Queue" subtitle="Reception queue overview">
          <div className="mb-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Today's Queue
              </p>
              <p className="mt-1 text-xs text-blue-800">
                Today's patient queue. Use Refresh Queue whenever you want to reload the latest status.
              </p>

              <button
                onClick={handleLoadSupabaseQueue}
                className="mt-3 rounded-xl bg-blue-700 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800"
              >
                Refresh Queue
              </button>

              {supabaseQueueStatus && (
                <p className="mt-3 text-sm text-blue-900">
                  {supabaseQueueStatus}
                </p>
              )}

              {supabaseQueueItems.length > 0 && (
                <div className="mt-4 grid gap-3">
                  {supabaseQueueItems.map((item) => {
                    const isSelected =
                      selectedSupabaseQueueItem?.id === item.id;
                    const itemPendingAdditionalService =
                      getPendingAdditionalService(item);
                    const itemPaidAdditionalServices =
                      item.additionalServices?.filter(
                        (service) => service.status === "Paid"
                      ) || [];

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSupabaseQueueItem(item)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-white ring-2 ring-blue-200"
                            : "border-blue-100 bg-white hover:border-blue-400"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          Token #{item.tokenNumber} · {item.patientName}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.uhid} · {item.age} yrs / {item.gender}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.visitType} · {item.status}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Consultation paid ₹{item.amountPaid} · {item.paymentMode}
                        </p>

                        {itemPendingAdditionalService && (
                          <div className="mt-3 rounded-xl bg-red-600 p-3 text-white">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                              Additional Payment Pending
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {itemPendingAdditionalService.services
                                .map((service) => service.serviceName)
                                .join(", ")}
                            </p>
                            <p className="mt-1 text-base font-bold">
                              Collect ₹{itemPendingAdditionalService.netAmount}
                            </p>
                          </div>
                        )}

                        {itemPaidAdditionalServices.length > 0 && (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                              Additional Paid
                            </p>

                            <div className="mt-2 grid gap-2">
                              {itemPaidAdditionalServices.map((service, index) => (
                                <div
                                  key={service.id}
                                  className="rounded-lg bg-white p-2"
                                >
                                  <p className="text-xs font-semibold text-slate-900">
                                    Receipt {index + 2}
                                    {service.receiptNumber
                                      ? ` · ${service.receiptNumber}`
                                      : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-700">
                                    {service.services
                                      .map((lineItem) => lineItem.serviceName)
                                      .join(", ")}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-emerald-800">
                                    Paid ₹{service.netAmount}
                                    {service.paymentMode
                                      ? ` · ${service.paymentMode}`
                                      : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSupabaseQueueItem && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-700">
                    Selected Queue Patient
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    #{selectedSupabaseQueueItem.tokenNumber} ·{" "}
                    {selectedSupabaseQueueItem.patientName}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {selectedSupabaseQueueItem.uhid} ·{" "}
                    {selectedSupabaseQueueItem.age} yrs /{" "}
                    {selectedSupabaseQueueItem.gender}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {selectedSupabaseQueueItem.visitType} ·{" "}
                    {selectedSupabaseQueueItem.status}
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    Original consult paid: ₹
                    {selectedSupabaseQueueItem.amountPaid} ·{" "}
                    {selectedSupabaseQueueItem.paymentMode}
                  </p>


                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleReprintSupabaseConsultationReceipt}
                      className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                    >
                      Reprint Consultation Receipt
                    </button>
                  </div>

                  {paidAdditionalServices.length > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                      <p className="text-sm font-semibold text-emerald-800">
                        Additional Receipts
                      </p>

                      <div className="mt-3 grid gap-3">
                        {paidAdditionalServices.map((service, index) => (
                          <div
                            key={service.id}
                            className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              Receipt {index + 2}
                              {service.receiptNumber
                                ? ` · ${service.receiptNumber}`
                                : ""}
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {service.services
                                .map((item) => item.serviceName)
                                .join(", ")}
                            </p>

                            <p className="mt-1 text-xs font-medium text-emerald-800">
                              Paid ₹{service.netAmount}
                              {service.paymentMode
                                ? ` · ${service.paymentMode}`
                                : ""}
                            </p>

                            <button
                              onClick={() => handlePrintPaidAdditionalReceipt(service)}
                              className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                            >
                              Reprint Additional Receipt
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSupabaseQueueItem.status === "Waiting" ? (
                    <button
                      onClick={handleEditSelectedSupabaseQueuePatient}
                      className="mt-4 rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
                    >
                      Edit Original Check-in
                    </button>
                  ) : (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                      Original check-in can be edited only while status is Waiting.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </SectionCard>

        <div className="grid gap-6 lg:col-span-2">
          <SectionCard
            title="Patient Search / Registration"
            subtitle="Find existing patient, register, or correct selected queue patient"
          >
            <div className="grid gap-4">
              {activeReceptionQueueItem && pendingAdditionalService && (
                <AdditionalPaymentPendingCard
                  patient={activeReceptionQueueItem}
                  paymentMode={additionalPaymentMode}
                  onPaymentModeChange={setAdditionalPaymentMode}
                  onCollectPayment={handleCollectAdditionalPaymentAndPrint}
                  showActions
                />
              )}

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  handleSearchTermChange(event.target.value)
                }
                placeholder="Search by mobile number / UHID / name"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              />

              {searchTerm &&
                !showRegistrationForm &&
                !isEditingAnyQueueItem && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Search Results
                    </p>

                    {supabasePatientSearchStatus && (
                      <p className="mt-1 text-xs text-blue-800">
                        {supabasePatientSearchStatus}
                      </p>
                    )}

                    {supabasePatientResults.length > 0 && (
                      <div className="mt-3 grid gap-3">
                        {supabasePatientResults.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() =>
                              handleSelectPatient(
                                mapSupabasePatientToPatient(patient)
                              )
                            }
                            className="rounded-xl border border-blue-100 bg-white p-4 text-left hover:border-blue-400"
                          >
                            <p className="font-semibold text-slate-900">
                              {patient.fullName}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {patient.ageYears} yrs / {patient.gender}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {patient.uhid}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {patient.mobile}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {showRegistrationForm && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Register New Patient
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      value={newPatientName}
                      onChange={(event) =>
                        setNewPatientName(event.target.value)
                      }
                      placeholder="Patient name"
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    />

                    <input
                      type="text"
                      value={newPatientMobile}
                      onChange={(event) =>
                        setNewPatientMobile(event.target.value)
                      }
                      placeholder="Mobile number"
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    />

                    <input
                      type="number"
                      value={newPatientAge}
                      onChange={(event) =>
                        setNewPatientAge(event.target.value)
                      }
                      placeholder="Age"
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    />

                    <select
                      value={newPatientGender}
                      onChange={(event) =>
                        setNewPatientGender(
                          event.target.value as "Male" | "Female" | "Other"
                        )
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="text"
                      value={newPatientAddress}
                      onChange={(event) =>
                        setNewPatientAddress(event.target.value)
                      }
                      placeholder="Address / locality optional"
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                    />

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Patient Source *
                      <select
                        value={newPatientSourceId}
                        onChange={(event) =>
                          setNewPatientSourceId(event.target.value)
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                      >
                        <option value="">Select patient source</option>
                        {patientSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Referral Details / Notes
                      <input
                        type="text"
                        value={newPatientNotes}
                        onChange={(event) =>
                          setNewPatientNotes(event.target.value)
                        }
                        placeholder="Optional"
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                      />
                    </label>

                    {patientSourcesStatus && (
                      <p className="text-sm text-red-600 md:col-span-2">
                        {patientSourcesStatus}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleCreateSupabasePatient}
                      className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
                    >
                      Save Patient
                    </button>

                    <button
                      onClick={() => setShowRegistrationForm(false)}
                      className="rounded-xl bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isEditingAnyQueueItem && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    Editing Queue Patient
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    Patient details can be corrected anytime. Original
                    consultation payment can be changed only while status is
                    Waiting.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Patient Name
                      <input
                        type="text"
                        value={editablePatientDetails.name}
                        onChange={(event) =>
                          setEditablePatientDetails((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Age
                      <input
                        type="number"
                        value={editablePatientDetails.age}
                        onChange={(event) =>
                          setEditablePatientDetails((current) => ({
                            ...current,
                            age: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Gender
                      <select
                        value={editablePatientDetails.gender}
                        onChange={(event) =>
                          setEditablePatientDetails((current) => ({
                            ...current,
                            gender: event.target.value as Patient["gender"],
                          }))
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    {editingSupabasePatientRecord && canEditOriginalPatientSource && (
                      <>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Original Patient Source *
                          <select
                            value={editablePatientSourceId}
                            onChange={(event) =>
                              setEditablePatientSourceId(event.target.value)
                            }
                            className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                          >
                            <option value="">Select patient source</option>
                            {patientSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                          Referral Details / Notes
                          <input
                            type="text"
                            value={editableReferralNotes}
                            onChange={(event) =>
                              setEditableReferralNotes(event.target.value)
                            }
                            placeholder="Optional"
                            className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
                          />
                        </label>
                      </>
                    )}

                    {editingSupabasePatientRecord && !canEditOriginalPatientSource && (
                      <>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Original Source
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {editingPatientSourceName || "Not recorded"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Referral Details / Notes
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {editingSupabasePatientRecord.referralNotes ||
                              "No referral details recorded"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {!canEditPayment && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-white p-4 text-sm text-amber-800">
                      Clinical work has already started. Original consultation
                      payment edits are locked for normal workflow.
                    </div>
                  )}
                </div>
              )}

              {selectedPatient && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        Selected Patient
                      </p>

                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedPatient.name}
                      </p>

                      <p className="text-sm text-slate-600">
                        {selectedPatient.age} yrs / {selectedPatient.gender}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {selectedPatient.uhid} · {selectedPatient.mobile}
                      </p>

                      {selectedPatientSourceName && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Original Source:</span>{" "}
                          {selectedPatientSourceName}
                        </p>
                      )}

                      {selectedPatient.notes && (
                        <p className="mt-1 text-sm text-slate-500">
                          <span className="font-medium">
                            Referral Details / Notes:
                          </span>{" "}
                          {selectedPatient.notes}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleClearSelection}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {(selectedPatient || isEditingAnyQueueItem) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Original Consultation Payment Details
                  </p>

                  {freeFollowUpStatus && (
                    <div
                      className={`mt-4 rounded-xl border p-4 text-sm ${
                        freeFollowUpEntitlement
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <p className="font-semibold">
                        {freeFollowUpEntitlement
                          ? "Free follow-up eligible"
                          : "Free follow-up status"}
                      </p>
                      <p className="mt-1">{freeFollowUpStatus}</p>

                      {freeFollowUpEntitlement && visitType !== "Free Follow-Up" && (
                        <button
                          type="button"
                          onClick={() => {
                            setVisitType("Free Follow-Up");
                            setConsultationFee("0");
                            setDiscountAmount("0");
                            setPaymentMode("None");
                            setReceiptGenerated(false);
                            setShowReceiptPreview(false);
                          }}
                          className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          Use Free Follow-Up
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Visit Type
                      <select
                        value={visitType}
                        onChange={(event) => {
                          setVisitType(event.target.value as VisitType);
                          setReceiptGenerated(false);
                          setShowReceiptPreview(false);
                        }}
                        disabled={!canEditPayment}
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                      >
                        <option value="New Patient Visit">
                          New Patient Visit
                        </option>
                        <option value="Returning Patient">
                          Returning Patient
                        </option>
                        <option value="Free Follow-Up">
                          Free Follow-Up
                        </option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Consultation Fee
                      <input
                        type="number"
                        value={consultationFee}
                        onChange={(event) => {
                          setConsultationFee(event.target.value);
                          setReceiptGenerated(false);
                          setShowReceiptPreview(false);
                        }}
                        disabled={
                          visitType === "Free Follow-Up" || !canEditPayment
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Discount
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(event) => {
                          setDiscountAmount(event.target.value);
                          setReceiptGenerated(false);
                          setShowReceiptPreview(false);
                        }}
                        disabled={
                          visitType === "Free Follow-Up" || !canEditPayment
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Payment Mode
                      <select
                        value={paymentMode}
                        onChange={(event) => {
                          setPaymentMode(event.target.value as PaymentMode);
                          setReceiptGenerated(false);
                          setShowReceiptPreview(false);
                        }}
                        disabled={
                          visitType === "Free Follow-Up" || !canEditPayment
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100"
                      >
                        <option value="None">None</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">
                        Original Amount Payable
                      </span>
                      <span className="text-2xl font-bold text-slate-900">
                        ₹{amountPayable}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {canEditPayment
                        ? "Consultation fee can be edited before clinical work starts."
                        : "Original consultation payment is locked because clinical work has already started."}
                    </p>

                    {selectedPatientActiveSupabaseQueueItem && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        This patient is already in today's queue as token #
                        {selectedPatientActiveSupabaseQueueItem.tokenNumber}.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {isEditingAnyQueueItem ? (
                      <button
                        onClick={handleSaveSupabaseQueuePatientCorrections}
                        className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                      >
                        Save Corrections
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateSupabaseReceipt}
                        disabled={Boolean(selectedPatientActiveSupabaseQueueItem)}
                        className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                      >
                        {selectedPatientActiveSupabaseQueueItem
                          ? "Already in Today's Queue"
                          : "Generate Receipt & Send to Queue"}
                      </button>
                    )}

                    <button
                      onClick={handlePreviewReceipt}
                      className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
                    >
                      Preview Receipt
                    </button>

                    <button
                      onClick={handlePrintReceipt}
                      className="rounded-xl bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800"
                    >
                      Print Receipt
                    </button>
                  </div>

                  {supabaseCheckInStatus && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-medium text-emerald-800">
                        {supabaseCheckInStatus}
                      </p>

                      {latestSupabaseCheckIn && (
                        <div className="mt-2 text-sm text-emerald-700">
                          <p>Token: #{latestSupabaseCheckIn.tokenNumber}</p>
                          <p>Receipt: {latestSupabaseCheckIn.receiptNumber}</p>
                          <p>Amount: ₹{latestSupabaseCheckIn.netAmount}</p>
                          <p>Payment Mode: {latestSupabaseCheckIn.paymentMode}</p>
                        </div>
                      )}
                    </div>
                  )}


                </div>
              )}

              {showReceiptPreview && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-4 text-sm font-medium text-slate-700">
                    Original Consultation Receipt Preview
                  </p>

                  <ReceiptPreview
                    patient={receiptPatient}
                    visitType={visitType}
                    paymentMode={effectivePaymentMode}
                    consultationFee={Number(consultationFee) || 0}
                    discount={Number(discountAmount) || 0}
                    amountPaid={amountPayable}
                    receiptNumberOverride={
            latestSupabaseCheckIn?.receiptNumber ||
            supabaseQueueItemBeingEdited?.consultationReceiptNumber
          }
                  />
                </div>
              )}

<div className="grid gap-4 md:grid-cols-3">
<button
  onClick={handleStartNextPatient}
  className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
>
  Search Patient
</button>

  <button
    onClick={handleOpenRegistration}
    className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
  >
    New Patient
  </button>

  <a
    href="/patient-records"
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-xl bg-indigo-700 px-4 py-3 text-center font-medium text-white hover:bg-indigo-800"
  >
    Patient Records
  </a>
</div>

            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}