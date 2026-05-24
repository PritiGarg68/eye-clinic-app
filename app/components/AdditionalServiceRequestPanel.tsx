"use client";

import { useEffect, useMemo, useState } from "react";
import { additionalServiceMasters } from "../../lib/additionalServices";
import {
  AdditionalServiceRequest,
  AdditionalServiceRoute,
} from "../../types/queue";

type AdditionalServiceRequestPanelProps = {
  pendingRequest?: AdditionalServiceRequest | null;
  onCreateRequest: (serviceRequest: AdditionalServiceRequest) => void;
  onCancel?: () => void;
};

export default function AdditionalServiceRequestPanel({
  pendingRequest,
  onCreateRequest,
  onCancel,
}: AdditionalServiceRequestPanelProps) {
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>(
    []
  );
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!pendingRequest) {
      setSelectedServiceNames([]);
      setDiscount("0");
      setNotes("");
      return;
    }

    setSelectedServiceNames(
      pendingRequest.services.map((service) => service.serviceName)
    );
    setDiscount(String(pendingRequest.discount || 0));
    setNotes(pendingRequest.notes || "");
  }, [pendingRequest?.id]);

  const selectedServices = useMemo(() => {
    return additionalServiceMasters.filter((service) =>
      selectedServiceNames.includes(service.serviceName)
    );
  }, [selectedServiceNames]);

  const grossAmount = selectedServices.reduce(
    (total, service) => total + service.amount,
    0
  );

  const discountAmount = Number(discount) || 0;
  const netAmount = Math.max(grossAmount - discountAmount, 0);

  const routeAfterPayment: AdditionalServiceRoute = selectedServices.some(
    (service) => service.routeAfterPayment === "Needs Optometry Review"
  )
    ? "Needs Optometry Review"
    : "Ready for Doctor";

  function toggleService(serviceName: string) {
    setSelectedServiceNames((current) =>
      current.includes(serviceName)
        ? current.filter((name) => name !== serviceName)
        : [...current, serviceName]
    );
  }

  function handleCreateRequest() {
    if (selectedServices.length === 0) {
      alert("Please select at least one test/procedure.");
      return;
    }

    if (discountAmount > grossAmount) {
      alert("Discount cannot be more than gross amount.");
      return;
    }

    const serviceRequest: AdditionalServiceRequest = {
      id: pendingRequest?.id || `additional-service-${Date.now()}`,
      services: selectedServices.map((service) => ({
        serviceName: service.serviceName,
        amount: service.amount,
      })),
      grossAmount,
      discount: discountAmount,
      netAmount,
      notes,
      status: "Payment Pending",
      routeAfterPayment,
      createdAt: pendingRequest?.createdAt || new Date().toISOString(),
    };

    onCreateRequest(serviceRequest);
  }

  return (
    <div className="rounded-xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-orange-950">
            {pendingRequest
              ? "Edit Pending Additional Test / Payment"
              : "Additional Test / Procedure Payment"}
          </p>
          <p className="mt-1 text-xs text-orange-800">
            Select one or more services. Reception will only collect the final
            amount shown here.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        )}
      </div>

      {pendingRequest && (
        <div className="mt-4 rounded-xl border border-orange-300 bg-white p-3 text-xs text-orange-900">
          This unpaid request can still be revised. Once reception collects
          payment, create a new request for any further test/procedure.
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {additionalServiceMasters.map((service) => {
          const isSelected = selectedServiceNames.includes(
            service.serviceName
          );

          return (
            <button
              key={service.serviceName}
              type="button"
              onClick={() => toggleService(service.serviceName)}
              className={`rounded-xl border p-3 text-left text-sm transition ${
                isSelected
                  ? "border-orange-500 bg-white shadow-sm"
                  : "border-orange-100 bg-orange-100/60 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {isSelected ? "✓ " : ""}
                    {service.serviceName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Route after payment: {service.routeAfterPayment}
                  </p>
                </div>

                <p className="text-sm font-bold text-slate-900">
                  ₹{service.amount}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-white p-4">
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Gross Amount</span>
            <span className="font-semibold text-slate-900">
              ₹{grossAmount}
            </span>
          </div>

          <label className="grid gap-2 font-medium text-slate-700">
            Doctor Discount
            <input
              type="number"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
            />
          </label>

          <div className="rounded-xl bg-orange-50 p-3">
            <p className="text-xs font-medium text-orange-800">
              Reception should collect
            </p>
            <p className="mt-1 text-2xl font-bold text-orange-950">
              ₹{netAmount}
            </p>
            <p className="mt-1 text-xs text-orange-800">
              Route after payment: {routeAfterPayment}
            </p>
          </div>

          <label className="grid gap-2 font-medium text-slate-700">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional doctor note for reception / test"
              className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-slate-500"
            />
          </label>
        </div>
      </div>

      <button
        onClick={handleCreateRequest}
        className="mt-4 w-full rounded-xl bg-orange-700 px-4 py-3 font-medium text-white hover:bg-orange-800"
      >
        {pendingRequest
          ? "Update Pending Request for Reception"
          : "Send Selected Tests to Reception"}
      </button>
    </div>
  );
}