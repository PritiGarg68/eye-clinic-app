"use client";

import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import SectionCard from "../components/SectionCard";
import QueuePanel from "../components/QueuePanel";
import ReceiptPreview from "../components/ReceiptPreview";
import AdditionalPaymentPendingCard from "../components/AdditionalPaymentPendingCard";
import AdditionalServiceReceiptPreview from "../components/AdditionalServiceReceiptPreview";
import { useQueue } from "../components/QueueProvider";
import { samplePatients } from "../../lib/samplePatients";
import { sortQueueForRole } from "../../lib/queueSorting";
import { clinicSettings } from "../../lib/clinicSettings";
import { getPendingAdditionalService } from "../../lib/additionalServiceUtils";
import { Patient } from "../../types/patient";
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
    updateQueueItemPayment,
    updateQueueItemPatientDetails,
    markAdditionalServicePaid,
  } = useQueue();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(
    null
  );
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
    String(clinicSettings.defaultConsultationFee)
  );
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");

  const [additionalPaymentMode, setAdditionalPaymentMode] =
    useState<PaymentMode>("Cash");
  const [additionalReceiptService, setAdditionalReceiptService] =
    useState<AdditionalServiceRequest | null>(null);

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

  const canEditPayment =
    !queueItemBeingEdited || queueItemBeingEdited.status === "Waiting";

  const pendingAdditionalService =
    getPendingAdditionalService(selectedQueueItem);

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
    : selectedPatient;

  function resetPaymentState() {
    setVisitType("New Patient Visit");
    setConsultationFee(String(clinicSettings.defaultConsultationFee));
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
    resetQueueEditState();
  }

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setShowRegistrationForm(false);
    setVisitType("Returning Patient");
    setConsultationFee(String(clinicSettings.defaultConsultationFee));
    setDiscountAmount("0");
    setPaymentMode("Cash");
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
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
    setConsultationFee(String(clinicSettings.defaultConsultationFee));
    setDiscountAmount("0");
    setPaymentMode("Cash");
    setReceiptGenerated(false);
    setShowReceiptPreview(false);
    resetQueueEditState();
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

  function handleStartNextPatient() {
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

              {searchTerm && !showRegistrationForm && !queueItemBeingEdited && (
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
                      onClick={handleCreateTemporaryPatient}
                      className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
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

              {queueItemBeingEdited && (
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

              {(selectedPatient || queueItemBeingEdited) && (
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
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {queueItemBeingEdited ? (
                      <button
                        onClick={handleSaveQueuePatientCorrections}
                        className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                      >
                        Save Corrections
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateReceipt}
                        className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
                      >
                        Generate Receipt & Send to Queue
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
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
                  Search Patient
                </button>

                <button
                  onClick={handleOpenRegistration}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
                >
                  New Patient
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}