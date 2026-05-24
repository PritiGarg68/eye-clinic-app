import { AdditionalServiceRequest, QueueItem } from "../types/queue";

export function getPendingAdditionalService(
  patient: QueueItem | null | undefined
): AdditionalServiceRequest | null {
  if (!patient?.additionalServices) {
    return null;
  }

  return (
    patient.additionalServices.find(
      (service) => service.status === "Payment Pending"
    ) || null
  );
}

export function getPaidAdditionalServices(
  patient: QueueItem | null | undefined
): AdditionalServiceRequest[] {
  if (!patient?.additionalServices) {
    return [];
  }

  return patient.additionalServices.filter(
    (service) => service.status === "Paid"
  );
}

export function getLatestPaidAdditionalService(
  patient: QueueItem | null | undefined
): AdditionalServiceRequest | null {
  const paidServices = getPaidAdditionalServices(patient);

  if (paidServices.length === 0) {
    return null;
  }

  return [...paidServices].sort((first, second) => {
    const firstTime = first.paidAt ? new Date(first.paidAt).getTime() : 0;
    const secondTime = second.paidAt ? new Date(second.paidAt).getTime() : 0;

    return secondTime - firstTime;
  })[0];
}

export function getAdditionalServiceNames(
  serviceRequest: AdditionalServiceRequest | null | undefined
) {
  if (!serviceRequest) {
    return "";
  }

  return serviceRequest.services
    .map((service) => service.serviceName)
    .join(", ");
}

export function hasPendingAdditionalPayment(
  patient: QueueItem | null | undefined
) {
  return Boolean(getPendingAdditionalService(patient));
}

export function hasPaidAdditionalServices(
  patient: QueueItem | null | undefined
) {
  return getPaidAdditionalServices(patient).length > 0;
}

export function getAdditionalServiceTotalPaid(
  patient: QueueItem | null | undefined
) {
  return getPaidAdditionalServices(patient).reduce(
    (total, service) => total + service.netAmount,
    0
  );
}