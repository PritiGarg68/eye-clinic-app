"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ServiceCategory,
  ServiceMasterItem,
  ServiceRoute,
  createServiceInSupabase,
  fetchAllServicesFromSupabase,
  setServiceActiveStatusInSupabase,
  updateServiceInSupabase,
} from "../../lib/servicesDb";

type StatusTone = "info" | "success" | "error";

const categories: ServiceCategory[] = [
  "Consultation",
  "Investigation",
  "Procedure",
  "Other",
];

const routes: ServiceRoute[] = [
  "Ready for Doctor",
  "Needs Optometry Review",
];

function getStatusClass(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function sortServicesForDisplay(services: ServiceMasterItem[]) {
  return [...services].sort((a, b) => {
    if (Number(a.isActive) !== Number(b.isActive)) {
      return Number(b.isActive) - Number(a.isActive);
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.serviceName.localeCompare(b.serviceName);
  });
}

export default function ServicesMasterPanel() {
  const [services, setServices] = useState<ServiceMasterItem[]>([]);
  const [editingService, setEditingService] =
    useState<ServiceMasterItem | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] =
    useState<ServiceCategory>("Investigation");
  const [defaultAmount, setDefaultAmount] = useState("0");
  const [routeAfterPayment, setRouteAfterPayment] =
    useState<ServiceRoute>("Needs Optometry Review");

  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");

  const formRef = useRef<HTMLDivElement | null>(null);

  const activeServices = useMemo(
    () => sortServicesForDisplay(services).filter((service) => service.isActive),
    [services]
  );

  const activeCount = activeServices.length;

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function loadServices(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      showStatus("Loading services...", "info");
    }

    try {
      const rows = await fetchAllServicesFromSupabase();
      setServices(rows);

      if (!options?.quiet) {
        showStatus(`Loaded ${rows.length} service(s).`, "success");
      }

      return rows;
    } catch (error) {
      setServices([]);
      showStatus(
        error instanceof Error ? error.message : "Could not load services.",
        "error"
      );
      return [];
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  function resetForm() {
    setEditingService(null);
    setServiceName("");
    setServiceCategory("Investigation");
    setDefaultAmount("0");
    setRouteAfterPayment("Needs Optometry Review");
  }

  function startEdit(service: ServiceMasterItem) {
    setEditingService(service);
    setServiceName(service.serviceName);
    setServiceCategory(service.serviceCategory);
    setDefaultAmount(String(service.defaultAmount));
    setRouteAfterPayment(service.routeAfterPayment);

    showStatus(`Editing: ${service.serviceName}`, "info");

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function renumberActiveServices(ordered: ServiceMasterItem[]) {
    for (const [index, service] of ordered.entries()) {
      await updateServiceInSupabase({
        id: service.id,
        serviceName: service.serviceName,
        serviceCategory: service.serviceCategory,
        defaultAmount: service.defaultAmount,
        routeAfterPayment: service.routeAfterPayment,
        sortOrder: index + 1,
        isActive: true,
      });
    }

    const storedActiveServices = sortServicesForDisplay(
      await fetchAllServicesFromSupabase()
    ).filter((service) => service.isActive);

    const orderingIsValid =
      storedActiveServices.length === ordered.length &&
      storedActiveServices.every(
        (service, index) =>
          service.id === ordered[index].id &&
          service.sortOrder === index + 1
      );

    if (!orderingIsValid) {
      throw new Error(
        "Service ordering could not be saved correctly. Please refresh and try again."
      );
    }
  }

  async function handleSave() {
    const cleanName = serviceName.trim();
    const amount = Number(defaultAmount);

    if (!cleanName) {
      showStatus("Enter a service name first.", "error");
      return;
    }

    if (
      defaultAmount.trim() === "" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      showStatus("Enter a valid default amount of zero or more.", "error");
      return;
    }

    const effectiveRoute: ServiceRoute =
      serviceCategory === "Consultation"
        ? "Ready for Doctor"
        : routeAfterPayment;

    showStatus(
      editingService ? "Updating service..." : "Adding service...",
      "info"
    );

    try {
      if (editingService) {
        await updateServiceInSupabase({
          id: editingService.id,
          serviceName: cleanName,
          serviceCategory,
          defaultAmount: amount,
          routeAfterPayment: effectiveRoute,
          sortOrder: editingService.sortOrder,
          isActive: editingService.isActive,
        });
      } else {
        await createServiceInSupabase({
          serviceName: cleanName,
          serviceCategory,
          defaultAmount: amount,
          routeAfterPayment: effectiveRoute,
          sortOrder: activeServices.length + 1,
        });
      }

      const refreshedServices = await fetchAllServicesFromSupabase();
      const refreshedActiveServices = sortServicesForDisplay(
        refreshedServices
      ).filter((service) => service.isActive);

      await renumberActiveServices(refreshedActiveServices);

      const successMessage = editingService
        ? "Service updated."
        : "Service added.";

      resetForm();
      await loadServices({ quiet: true });
      showStatus(successMessage, "success");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Could not save service.",
        "error"
      );
    }
  }

  async function handleToggleActive(service: ServiceMasterItem) {
    const nextStatus = !service.isActive;

    showStatus(
      nextStatus ? "Reactivating service..." : "Deactivating service...",
      "info"
    );

    try {
      if (nextStatus) {
        const reactivatedService: ServiceMasterItem = {
          ...service,
          isActive: true,
          sortOrder: activeServices.length + 1,
        };

        await updateServiceInSupabase({
          id: reactivatedService.id,
          serviceName: reactivatedService.serviceName,
          serviceCategory: reactivatedService.serviceCategory,
          defaultAmount: reactivatedService.defaultAmount,
          routeAfterPayment: reactivatedService.routeAfterPayment,
          sortOrder: reactivatedService.sortOrder,
          isActive: true,
        });

        await renumberActiveServices([
          ...activeServices,
          reactivatedService,
        ]);
      } else {
        await setServiceActiveStatusInSupabase({
          id: service.id,
          isActive: false,
        });

        await renumberActiveServices(
          activeServices.filter((item) => item.id !== service.id)
        );
      }

      await loadServices({ quiet: true });

      showStatus(
        nextStatus ? "Service reactivated." : "Service deactivated.",
        "success"
      );
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update service status.",
        "error"
      );
    }
  }

  async function handleMove(
    service: ServiceMasterItem,
    direction: "up" | "down"
  ) {
    if (!service.isActive) {
      showStatus(
        "Inactive services cannot be moved. Reactivate first.",
        "error"
      );
      return;
    }

    const ordered = [...activeServices];
    const currentIndex = ordered.findIndex((item) => item.id === service.id);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= ordered.length
    ) {
      return;
    }

    const moved = [...ordered];
    const [currentItem] = moved.splice(currentIndex, 1);
    moved.splice(targetIndex, 0, currentItem);

    showStatus("Updating service order...", "info");

    try {
      await renumberActiveServices(moved);
      await loadServices({ quiet: true });
      showStatus("Service order updated.", "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update service order.",
        "error"
      );
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Services Master
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {activeCount} active of {services.length} total
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        {statusMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClass(
              statusTone
            )}`}
          >
            {statusMessage}
          </div>
        )}

        <div
          ref={formRef}
          className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
        >
          <p className="text-sm font-semibold text-indigo-900">
            {editingService
              ? `Editing: ${editingService.serviceName}`
              : "Add New Service"}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Service Name
              <input
                type="text"
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                placeholder="Example: OCT"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Category
              <select
                value={serviceCategory}
                onChange={(event) => {
                  const nextCategory = event.target.value as ServiceCategory;
                  setServiceCategory(nextCategory);

                  if (nextCategory === "Consultation") {
                    setRouteAfterPayment("Ready for Doctor");
                  }
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Default Amount (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={defaultAmount}
                onChange={(event) => setDefaultAmount(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
              />
            </label>

            {serviceCategory === "Consultation" ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 md:col-span-2">
                <p className="font-semibold">Normal consultation workflow</p>
                <p className="mt-1">
                  Consultation payments do not control patient routing. A normal
                  check-in enters Waiting, where the Optometrist can start the
                  workup. The Doctor can also deliberately start the consultation
                  directly when needed.
                </p>
              </div>
            ) : (
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Route After Payment
                <select
                  value={routeAfterPayment}
                  onChange={(event) =>
                    setRouteAfterPayment(event.target.value as ServiceRoute)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
                >
                  {routes.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
              >
                {editingService ? "Update Service" : "Add Service"}
              </button>

              {editingService && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {services.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No services found.
            </div>
          ) : (
            sortServicesForDisplay(services).map((service) => {
              const activeIndex = activeServices.findIndex(
                (item) => item.id === service.id
              );

              const canMoveUp = service.isActive && activeIndex > 0;
              const canMoveDown =
                service.isActive &&
                activeIndex >= 0 &&
                activeIndex < activeServices.length - 1;

              return (
                <div
                  key={service.id}
                  className={`rounded-xl border p-4 ${
                    service.isActive
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50 opacity-75"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {service.isActive && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Sort {service.sortOrder}
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            service.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </span>

                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {service.serviceCategory}
                        </span>
                      </div>

                      <p className="mt-3 font-semibold text-slate-900">
                        {service.serviceName}
                      </p>

                      <div className="mt-2 grid gap-1 text-sm text-slate-600">
                        <p>
                          Default amount: ₹
                          {service.defaultAmount.toLocaleString("en-IN")}
                        </p>
                        {service.serviceCategory !== "Consultation" && (
                          <p>
                            Route after payment: {service.routeAfterPayment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMove(service, "up")}
                        disabled={!canMoveUp}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑ Up
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMove(service, "down")}
                        disabled={!canMoveDown}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓ Down
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(service)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(service)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          service.isActive
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {service.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
