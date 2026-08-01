"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import ReceiptPreview from "../components/ReceiptPreview";
import AdditionalPaymentPendingCard from "../components/AdditionalPaymentPendingCard";
import AdditionalServiceReceiptPreview from "../components/AdditionalServiceReceiptPreview";
import { useQueue } from "../components/QueueProvider";
import { samplePatients } from "../../lib/samplePatients";
import { sortQueueForRole } from "../../lib/queueSorting";
import { clinicSettings, fetchClinicSettings } from "../../lib/clinicSettings";
import { getPendingAdditionalService } from "../../lib/additionalServiceUtils";
import { fetchTodayQueueFromSupabase } from "../../lib/queueDb";
import {
  SupabasePatient,
  createPatientInSupabase,
  searchPatientsFromSupabase,
} from "../../lib/patientsDb";
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
    const {
        queueItems,
        selectedQueueItem,
        addQueueItem,
        selectQueueItem,
        clearQueueData,
        updateQueueItemPayment,
        updateQueueItemPatientDetails,
        markAdditionalServicePaid,
      } = useQueue();

  const [activeClinicSettings, setActiveClinicSettings] =
    useState(clinicSettings);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [supabasePatientResults, setSupabasePatientResults] = useState<
    SupabasePatient[]
  >([]);
  const [supabasePatientSearchStatus, setSupabasePatientSearchStatus] =
    useState("");
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(
    null
  );
  const [editingSupabaseQueueItem, setEditingSupabaseQueueItem] =
    useState<QueueItem | null>(null);
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
  const [newPatientNotes, setNewPatientNotes] = useState("");

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

  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isPrintingAdditionalReceipt, setIsPrintingAdditionalReceipt] =
    useState(false);

  const matchingPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return samplePatients.filter((patient) => {
      return (
        patient.mobile.includes(term) ||
        patient.uhid.toLowerCase().includes(term) ||
        patient.name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

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

  const queueItemBeingEdited =
    queueItems.find((item) => item.id === editingQueueItemId) || null;

  const supabaseQueueItemBeingEdited = editingSupabaseQueueItem;
  const isEditingAnyQueueItem = Boolean(
    queueItemBeingEdited || supabaseQueueItemBeingEdited
  );

  const canEditPayment =
    !queueItemBeingEdited || queueItemBeingEdited.status === "Waiting";

  const pendingAdditionalService =
    getPendingAdditionalService(selectedQueueItem);

  const selectedPatientActiveSupabaseQueueItem =
    selectedPatient && isSupabasePatient(selectedPatient)
      ? supabaseQueueItems.find((item) => item.uhid === selectedPatient.uhid)
      : null;

  useEffect(() => {
    let isMounted = true;

    async function loadClinicSettings() {
      const settings = await fetchClinicSettings();

      if (!isMounted) {
        return;
      }

      setActiveClinicSettings(settings);
      setConsultationFee(String(settings.defaultConsultationFee));
    }

    loadClinicSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSupabaseQueue() {
      setSupabaseQueueStatus("Loading today's Supabase queue...");

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
        setSupabaseQueueStatus(`Loaded ${queue.length} Supabase queue item(s).`);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSupabaseQueueStatus(
          error instanceof Error
            ? `Error loading Supabase queue: ${error.message}`
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
      setSupabasePatientSearchStatus("Searching Supabase patients...");

      try {
        const results = await searchPatientsFromSupabase(term);

        if (!isMounted) {
          return;
        }

        setSupabasePatientResults(results);
        setSupabasePatientSearchStatus(
          `Found ${results.length} Supabase patient(s).`
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSupabasePatientResults([]);
        setSupabasePatientSearchStatus(
          error instanceof Error
            ? `Supabase patient search error: ${error.message}`
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
    selectedQueueItem?.additionalServices?.filter(
      (service) => service.status === "Paid"
    ) || [];

  const totalPaidAdditionalAmount = paidAdditionalServices.reduce(
    (total, service) => total + service.netAmount,
    0
  );

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

  const receiptPatient: Patient | null = queueItemBeingEdited
    ? {
        id: queueItemBeingEdited.id,
        uhid: queueItemBeingEdited.uhid,
        mobile: selectedPatient?.mobile || "",
        name: editablePatientDetails.name || queueItemBeingEdited.patientName,
        age: Number(editablePatientDetails.age) || queueItemBeingEdited.age,
        gender: editablePatientDetails.gender,
        createdAt: new Date().toISOString(),
      }
    : selectedPatient ||
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
    setNewPatientNotes("");
  }

  function resetQueueEditState() {
    setEditingQueueItemId(null);
    setEditingSupabaseQueueItem(null);
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

  function handleCreateTemporaryPatient() {
    if (!newPatientName || !newPatientMobile || !newPatientAge) {
      alert("Please enter name, mobile number, and age.");
      return;
    }

    const temporaryPatient: Patient = {
      id: `temp-${Date.now()}`,
      uhid: `EC-TEMP-${Date.now()}`,
      mobile: newPatientMobile,
      name: newPatientName,
      age: Number(newPatientAge),
      gender: newPatientGender,
      address: newPatientAddress || undefined,
      notes: newPatientNotes || undefined,
      createdAt: new Date().toISOString(),
    };

    setSelectedPatient(temporaryPatient);
    setShowRegistrationForm(false);
    setSearchTerm(newPatientMobile);
    setVisitType("New Patient Visit");
    setConsultationFee(String(activeClinicSettings.defaultConsultationFee));
    setDiscountAmount("0");
    setPaymentMode("Cash");
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    resetQueueEditState();
  }

  async function handleCreateSupabasePatient() {
    if (!newPatientName || !newPatientMobile || !newPatientAge) {
      alert("Please enter name, mobile number, and age.");
      return;
    }

    setSupabasePatientSearchStatus("Creating patient in Supabase...");

    try {
      const createdPatient = await createPatientInSupabase({
        fullName: newPatientName,
        mobile: newPatientMobile,
        ageYears: Number(newPatientAge),
        gender: newPatientGender,
        address: newPatientAddress,
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
        `Created Supabase patient ${createdPatient.uhid}.`
      );
      resetQueueEditState();
    } catch (error) {
      setSupabasePatientSearchStatus(
        error instanceof Error
          ? `Supabase patient creation error: ${error.message}`
          : "Supabase patient creation error."
      );
    }
  }

  function handleSelectQueueItem(item: QueueItem | null) {
    selectQueueItem(item);

    if (!item) {
      return;
    }

    setShowRegistrationForm(false);
    setSelectedPatient(null);
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    setAdditionalPaymentMode("Cash");
    setAdditionalReceiptService(null);
  }

  function handleEditSelectedQueuePatient() {
    if (!selectedQueueItem) {
      alert("Please select a patient from the queue first.");
      return;
    }

    setEditingQueueItemId(selectedQueueItem.id);
    setSelectedPatient(null);
    setShowRegistrationForm(false);

    setEditablePatientDetails({
      name: selectedQueueItem.patientName,
      age: String(selectedQueueItem.age),
      gender: selectedQueueItem.gender,
    });

    setVisitType(selectedQueueItem.visitType);
    setConsultationFee(String(selectedQueueItem.amountPaid));
    setDiscountAmount("0");

    if (selectedQueueItem.paymentMode !== "None") {
      setPaymentMode(selectedQueueItem.paymentMode);
    } else {
      setPaymentMode("Cash");
    }

    setReceiptGenerated(false);
    setShowReceiptPreview(false);
  }

  function handleEditSelectedSupabaseQueuePatient() {
    if (!selectedSupabaseQueueItem) {
      alert("Please select a patient from the Supabase queue first.");
      return;
    }

    if (selectedSupabaseQueueItem.status !== "Waiting") {
      alert(
        `Original check-in can be edited only while status is Waiting. Current status: ${selectedSupabaseQueueItem.status}.`
      );
      return;
    }

    if (!selectedSupabaseQueueItem.patientId) {
      alert("Selected Supabase queue patient is missing patient id.");
      return;
    }

    setEditingSupabaseQueueItem(selectedSupabaseQueueItem);
    setEditingQueueItemId(null);
    setSelectedPatient(null);
    setShowRegistrationForm(false);

    setEditablePatientDetails({
      name: selectedSupabaseQueueItem.patientName,
      age: String(selectedSupabaseQueueItem.age),
      gender: selectedSupabaseQueueItem.gender,
    });

    setVisitType(selectedSupabaseQueueItem.visitType);
    setConsultationFee(String(activeClinicSettings.defaultConsultationFee));
    setDiscountAmount("0");

    if (selectedSupabaseQueueItem.paymentMode !== "None") {
      setPaymentMode(selectedSupabaseQueueItem.paymentMode);
    } else {
      setPaymentMode("Cash");
    }

    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    setLatestSupabaseCheckIn(null);
    setSupabaseCheckInStatus(
      `Editing original Supabase check-in for token #${selectedSupabaseQueueItem.tokenNumber}.`
    );
  }

  async function handleSaveSupabaseQueuePatientCorrections() {
    if (!supabaseQueueItemBeingEdited) {
      alert("Please select a Supabase queue patient to edit.");
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

    setSupabaseCheckInStatus("Saving Supabase check-in corrections...");

    try {
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

      const queue = await fetchTodayQueueFromSupabase();
      const refreshedItem =
        queue.find((item) => item.id === result.visitId) || null;

      setSupabaseQueueItems(queue);
      setSelectedSupabaseQueueItem(refreshedItem);
      setEditingSupabaseQueueItem(null);
      setSupabaseQueueStatus(`Loaded ${queue.length} Supabase queue item(s).`);
      setLatestSupabaseCheckIn(result);
      setReceiptGenerated(true);
      setShowReceiptPreview(true);
      setSupabaseCheckInStatus(
        `Updated token #${result.tokenNumber}. Receipt ${result.receiptNumber} remains unchanged.`
      );
    } catch (error) {
      setSupabaseCheckInStatus(
        error instanceof Error
          ? `Supabase check-in update error: ${error.message}`
          : "Supabase check-in update error."
      );
    }
  }

  function handleSaveQueuePatientCorrections() {
    if (!queueItemBeingEdited) {
      alert("Please select a queue patient to edit.");
      return;
    }

    if (!editablePatientDetails.name || !editablePatientDetails.age) {
      alert("Please enter patient name and age.");
      return;
    }

    updateQueueItemPatientDetails(
      queueItemBeingEdited.id,
      editablePatientDetails.name,
      Number(editablePatientDetails.age),
      editablePatientDetails.gender
    );

    if (canEditPayment) {
      updateQueueItemPayment(
        queueItemBeingEdited.id,
        effectivePaymentMode,
        amountPayable,
        visitType
      );
    }

    setReceiptGenerated(true);
    setShowReceiptPreview(true);
    alert(
      canEditPayment
        ? "Patient details and payment updated."
        : "Patient details updated. Payment was not changed because clinical work has already started."
    );
  }

  async function handleGenerateSupabaseReceipt() {
    if (!selectedPatient) {
      alert("Please select or register a Supabase patient first.");
      return;
    }

    if (!isSupabasePatient(selectedPatient)) {
      alert(
        "This patient is not saved in Supabase yet. Please use a Supabase search result or Save Patient to Supabase."
      );
      return;
    }

    if (Number(discountAmount) > Number(consultationFee)) {
      alert("Discount cannot be more than consultation fee.");
      return;
    }

    setSupabaseCheckInStatus("Creating Supabase check-in...");

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

      const queue = await fetchTodayQueueFromSupabase();

      setLatestSupabaseCheckIn(result);
      setSupabaseQueueItems(queue);
      setSupabaseQueueStatus(`Loaded ${queue.length} Supabase queue item(s).`);
      setReceiptGenerated(true);
      setShowReceiptPreview(true);
      setSupabaseCheckInStatus(
        `Supabase check-in created: token #${result.tokenNumber}, receipt ${result.receiptNumber}.`
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
        setSupabaseQueueStatus(`Loaded ${queue.length} Supabase queue item(s).`);

        if (existingCheckIn) {
          setLatestSupabaseCheckIn(existingCheckIn);
          setReceiptGenerated(true);
          setShowReceiptPreview(true);
        }

        const resolvedTokenNumber =
          existingCheckIn?.tokenNumber || tokenNumber;

        setSupabaseCheckInStatus(
          resolvedTokenNumber
            ? `This patient is already checked in today as token #${resolvedTokenNumber}. The Supabase queue has been refreshed.`
            : "This patient is already checked in today. The Supabase queue has been refreshed."
        );
        return;
      }

      setSupabaseCheckInStatus(`Supabase check-in error: ${errorMessage}`);
    }
  }

  function handleGenerateReceipt() {
    if (!selectedPatient) {
      alert("Please select a patient first.");
      return;
    }

    const existingActiveQueueItem = queueItems.find(
      (item) =>
        item.uhid === selectedPatient.uhid && item.status !== "Completed"
    );

    if (existingActiveQueueItem) {
      selectQueueItem(existingActiveQueueItem);
      alert(
        `${selectedPatient.name} is already in the queue as token #${existingActiveQueueItem.tokenNumber}.`
      );
      return;
    }

    const nextTokenNumber = queueItems.length + 1;

    const queueItem: QueueItem = {
      id: `${selectedPatient.id}-${Date.now()}`,
      tokenNumber: nextTokenNumber,
      patientName: selectedPatient.name,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      uhid: selectedPatient.uhid,
      visitType,
      paymentMode: effectivePaymentMode,
      amountPaid: amountPayable,
      status: "Waiting",
    };

    addQueueItem(queueItem);
    setReceiptGenerated(true);
    setShowReceiptPreview(true);
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
      alert("Please select a Supabase queue patient first.");
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
    setShowReceiptPreview(true);
  }

  function handleCollectAdditionalPaymentAndPrint(
    serviceRequestId: string
  ) {
    if (!selectedQueueItem) {
      alert("Please select a payment-pending patient first.");
      return;
    }

    const serviceToPrint = getPendingAdditionalService(selectedQueueItem);

    if (!serviceToPrint || serviceToPrint.id !== serviceRequestId) {
      alert("No pending additional payment found for this patient.");
      return;
    }

    setAdditionalReceiptService(serviceToPrint);

    markAdditionalServicePaid(
      selectedQueueItem.id,
      serviceRequestId,
      additionalPaymentMode
    );

    setIsPrintingAdditionalReceipt(true);

    setTimeout(() => {
      window.print();
      setIsPrintingAdditionalReceipt(false);
    }, 150);
  }
  function handlePrintPaidAdditionalReceipt(
    serviceRequest: AdditionalServiceRequest
  ) {
    if (!selectedQueueItem) {
      alert("Please select a patient first.");
      return;
    }

    setAdditionalReceiptService(serviceRequest);
    setAdditionalPaymentMode(serviceRequest.paymentMode || "Cash");
    setIsPrintingAdditionalReceipt(true);

    setTimeout(() => {
      window.print();
      setIsPrintingAdditionalReceipt(false);
    }, 150);
  }

  async function handleLoadSupabaseQueue() {
    setSupabaseQueueStatus("Loading today's Supabase queue...");

    try {
      const queue = await fetchTodayQueueFromSupabase();
      setSupabaseQueueItems(queue);
      setSupabaseQueueStatus(`Loaded ${queue.length} Supabase queue item(s).`);
    } catch (error) {
      setSupabaseQueueStatus(
        error instanceof Error
          ? `Error loading Supabase queue: ${error.message}`
          : "Error loading Supabase queue."
      );
    }
  }

  function handleClearLocalQueueData() {
    const shouldClear = window.confirm(
      "Clear local test queue data? This will remove only local queue/visit test data. Sample patients will remain."
    );
  
    if (!shouldClear) {
      return;
    }
  
    clearQueueData();
  
    setSearchTerm("");
    setSelectedPatient(null);
    setShowRegistrationForm(false);
    resetNewPatientForm();
    resetPaymentState();
    resetQueueEditState();
    setAdditionalPaymentMode("Cash");
    setAdditionalReceiptService(null);
  
    alert("Local test queue data cleared.");
  }
  function handleStartNextPatient() {
    selectQueueItem(null);
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
          receiptNumberOverride={latestSupabaseCheckIn?.receiptNumber}
        />
      </div>
    );
  }

  if (isPrintingAdditionalReceipt) {
    return (
      <div className="bg-white p-4">
        <AdditionalServiceReceiptPreview
          patient={selectedQueueItem}
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
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Live Queue" subtitle="Reception queue overview">
          <div className="mb-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Supabase Queue
              </p>
              <p className="mt-1 text-xs text-blue-800">
                Today's database queue. This is now loaded automatically and can be refreshed manually.
              </p>

              <button
                onClick={handleLoadSupabaseQueue}
                className="mt-3 rounded-xl bg-blue-700 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800"
              >
                Refresh Supabase Queue
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
                          Paid ₹{item.amountPaid} · {item.paymentMode}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSupabaseQueueItem && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-700">
                    Selected Supabase Queue Patient
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

                  <p className="mt-3 text-xs text-emerald-700">
                    Database queue selection is active. Local queue actions are still separate during migration.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleReprintSupabaseConsultationReceipt}
                      className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                    >
                      Reprint Consultation Receipt
                    </button>
                  </div>

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

          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Temporary Local Queue
            </p>
            <p className="mt-1 text-xs text-amber-700">
              This local browser queue is still available during migration, but the Supabase queue above is the database source.
            </p>
          </div>
          <QueuePanel
            items={sortQueueForRole(queueItems, "reception")}
            selectedItemId={selectedQueueItem?.id}
            onSelectItem={handleSelectQueueItem}
          />

          {selectedQueueItem && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">
                Selected Queue Patient
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                #{selectedQueueItem.tokenNumber} ·{" "}
                {selectedQueueItem.patientName}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {selectedQueueItem.age} yrs / {selectedQueueItem.gender}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {selectedQueueItem.visitType}
              </p>

              <p className="mt-2 text-sm text-slate-700">
                Original consult paid: ₹{selectedQueueItem.amountPaid} ·{" "}
                {selectedQueueItem.paymentMode}
              </p>

              {pendingAdditionalService && (
                <div className="mt-4 rounded-xl bg-red-600 p-3 text-white">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                    Additional Payment Pending
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    Collect ₹{pendingAdditionalService.netAmount}
                  </p>
                </div>
              )}

              <button
                onClick={handleEditSelectedQueuePatient}
                className="mt-4 rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
              >
                Edit Patient / Original Payment
              </button>

              {paidAdditionalServices.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Paid Additional Tests / Services
                  </p>

                  <p className="mt-1 text-sm text-blue-800">
                    Total additional amount paid: ₹{totalPaidAdditionalAmount}
                  </p>

                  <div className="mt-3 grid gap-3">
                    {paidAdditionalServices.map((service, index) => (
                      <div
                        key={service.id}
                        className="rounded-xl border border-blue-100 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Additional Receipt {index + 1}
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {service.services
                                .map((item) => item.serviceName)
                                .join(", ")}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Paid: ₹{service.netAmount} ·{" "}
                              {service.paymentMode || "Cash"}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              handlePrintPaidAdditionalReceipt(service)
                            }
                            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                          >
                            Print Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:col-span-2">
          <SectionCard
            title="Patient Search / Registration"
            subtitle="Find existing patient, register, or correct selected queue patient"
          >
            <div className="grid gap-4">
              {selectedQueueItem && pendingAdditionalService && (
                <AdditionalPaymentPendingCard
                  patient={selectedQueueItem}
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

              {searchTerm && !showRegistrationForm && !isEditingAnyQueueItem && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Search Results
                  </p>

                  {matchingPatients.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      No matching patient found. Click New Patient to register.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {matchingPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-400"
                        >
                          <p className="font-semibold text-slate-900">
                            {patient.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {patient.age} yrs / {patient.gender}
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

              {searchTerm &&
                !showRegistrationForm &&
                !isEditingAnyQueueItem && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Supabase Patient Results
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

                    <textarea
                      value={newPatientNotes}
                      onChange={(event) =>
                        setNewPatientNotes(event.target.value)
                      }
                      placeholder="Notes optional"
                      className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 md:col-span-2"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleCreateSupabasePatient}
                      className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
                    >
                      Save Patient to Supabase
                    </button>

                    <button
                      onClick={handleCreateTemporaryPatient}
                      className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                    >
                      Save Local Test Patient
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

                      {selectedPatient.notes && (
                        <p className="mt-2 text-sm text-slate-500">
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
                        This patient is already in today's Supabase queue as token #
                        {selectedPatientActiveSupabaseQueueItem.tokenNumber}.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {isEditingAnyQueueItem ? (
                      <button
                        onClick={
                          supabaseQueueItemBeingEdited
                            ? handleSaveSupabaseQueuePatientCorrections
                            : handleSaveQueuePatientCorrections
                        }
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

                  {!isEditingAnyQueueItem && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Development fallback
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        Use only if we need to compare against the old local browser queue during migration.
                      </p>
                      <button
                        onClick={handleGenerateReceipt}
                        className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        Local Test Only
                      </button>
                    </div>
                  )}

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

                  {receiptGenerated && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-medium text-emerald-800">
                        {queueItemBeingEdited
                          ? "Corrections saved successfully."
                          : "Receipt generated successfully."}
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        {queueItemBeingEdited
                          ? canEditPayment
                            ? "Patient details and original payment were updated."
                            : "Patient details were updated. Original payment remained locked."
                          : "Patient has been added to the queue."}
                      </p>

                      <button
                        onClick={handleStartNextPatient}
                        className="mt-4 rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800"
                      >
                        Start Next Patient
                      </button>
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
                    receiptNumberOverride={latestSupabaseCheckIn?.receiptNumber}
                  />
                </div>
              )}

<div className="grid gap-4 md:grid-cols-2">
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
</div>

<div className="rounded-xl border border-red-200 bg-red-50 p-4">
  <p className="text-sm font-semibold text-red-800">
    Test Utility
  </p>
  <p className="mt-1 text-xs text-red-700">
    Clears only local browser queue/test data. Sample patients remain.
  </p>

  <button
    onClick={handleClearLocalQueueData}
    className="mt-3 rounded-xl bg-red-700 px-4 py-3 text-sm font-medium text-white hover:bg-red-800"
  >
    Clear Local Test Queue Data
  </button>
</div>

            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}