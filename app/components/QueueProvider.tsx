"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AdditionalServiceRequest,
  DoctorConsultation,
  OptometristWorkup,
  PaymentMode,
  QueueItem,
  QueueStatus,
  VisitType,
} from "../../types/queue";
import { Patient } from "../../types/patient";

type QueueContextValue = {
  queueItems: QueueItem[];
  selectedQueueItem: QueueItem | null;
  addQueueItem: (item: QueueItem) => void;
  selectQueueItem: (item: QueueItem | null) => void;
  updateQueueItemStatus: (itemId: string, status: QueueStatus) => void;
  updateQueueItemPayment: (
    itemId: string,
    paymentMode: PaymentMode,
    amountPaid: number,
    visitType: VisitType
  ) => void;
  updateQueueItemPatientDetails: (
    itemId: string,
    patientName: string,
    age: number,
    gender: Patient["gender"]
  ) => void;
  addOrReplacePendingAdditionalServiceRequest: (
    itemId: string,
    serviceRequest: AdditionalServiceRequest
  ) => void;
  markAdditionalServicePaid: (
    itemId: string,
    serviceRequestId: string,
    paymentMode: PaymentMode
  ) => void;
  saveOptometristWorkup: (
    itemId: string,
    workup: OptometristWorkup
  ) => void;
  saveDoctorConsultation: (
    itemId: string,
    consultation: DoctorConsultation
  ) => void;
};

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

const STORAGE_KEY = "eye-clinic-queue";

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<QueueItem | null>(null);

  useEffect(() => {
    const savedQueue = window.localStorage.getItem(STORAGE_KEY);

    if (savedQueue) {
      try {
        setQueueItems(JSON.parse(savedQueue));
      } catch {
        setQueueItems([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queueItems));
  }, [queueItems]);

  function addQueueItem(item: QueueItem) {
    setQueueItems((currentQueue) => [...currentQueue, item]);
    setSelectedQueueItem(item);
  }

  function selectQueueItem(item: QueueItem | null) {
    setSelectedQueueItem(item);
  }

  function updateQueueItemStatus(itemId: string, status: QueueStatus) {
    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status,
            }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? {
            ...currentSelected,
            status,
          }
        : currentSelected
    );
  }

  function updateQueueItemPayment(
    itemId: string,
    paymentMode: PaymentMode,
    amountPaid: number,
    visitType: VisitType
  ) {
    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              paymentMode,
              amountPaid,
              visitType,
            }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? {
            ...currentSelected,
            paymentMode,
            amountPaid,
            visitType,
          }
        : currentSelected
    );
  }

  function updateQueueItemPatientDetails(
    itemId: string,
    patientName: string,
    age: number,
    gender: Patient["gender"]
  ) {
    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              patientName,
              age,
              gender,
            }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? {
            ...currentSelected,
            patientName,
            age,
            gender,
          }
        : currentSelected
    );
  }

  function addOrReplacePendingAdditionalServiceRequest(
    itemId: string,
    serviceRequest: AdditionalServiceRequest
  ) {
    setQueueItems((currentQueue) =>
      currentQueue.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const existingPaidServices = (item.additionalServices || []).filter(
          (service) => service.status === "Paid"
        );

        return {
          ...item,
          status: "Additional Payment Pending",
          additionalServices: [...existingPaidServices, serviceRequest],
        };
      })
    );

    setSelectedQueueItem((currentSelected) => {
      if (!currentSelected || currentSelected.id !== itemId) {
        return currentSelected;
      }

      const existingPaidServices = (
        currentSelected.additionalServices || []
      ).filter((service) => service.status === "Paid");

      return {
        ...currentSelected,
        status: "Additional Payment Pending",
        additionalServices: [...existingPaidServices, serviceRequest],
      };
    });
  }

  function markAdditionalServicePaid(
    itemId: string,
    serviceRequestId: string,
    paymentMode: PaymentMode
  ) {
    let routeAfterPayment: QueueStatus = "Ready for Doctor";
    const paidAt = new Date().toISOString();

    setQueueItems((currentQueue) =>
      currentQueue.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const updatedServices = (item.additionalServices || []).map(
          (service) => {
            if (service.id !== serviceRequestId) {
              return service;
            }

            routeAfterPayment = service.routeAfterPayment;

            return {
              ...service,
              status: "Paid" as const,
              paymentMode,
              paidAt,
            };
          }
        );

        return {
          ...item,
          status: routeAfterPayment,
          additionalServices: updatedServices,
        };
      })
    );

    setSelectedQueueItem((currentSelected) => {
      if (!currentSelected || currentSelected.id !== itemId) {
        return currentSelected;
      }

      const updatedServices = (currentSelected.additionalServices || []).map(
        (service) => {
          if (service.id !== serviceRequestId) {
            return service;
          }

          return {
            ...service,
            status: "Paid" as const,
            paymentMode,
            paidAt,
          };
        }
      );

      const paidService = updatedServices.find(
        (service) => service.id === serviceRequestId
      );

      return {
        ...currentSelected,
        status: paidService?.routeAfterPayment || "Ready for Doctor",
        additionalServices: updatedServices,
      };
    });
  }

  function saveOptometristWorkup(
    itemId: string,
    workup: OptometristWorkup
  ) {
    const workupWithTimestamp: OptometristWorkup = {
      ...workup,
      updatedAt: new Date().toISOString(),
    };

    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              optometristWorkup: workupWithTimestamp,
            }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? {
            ...currentSelected,
            optometristWorkup: workupWithTimestamp,
          }
        : currentSelected
    );
  }

  function saveDoctorConsultation(
    itemId: string,
    consultation: DoctorConsultation
  ) {
    const consultationWithTimestamp: DoctorConsultation = {
      ...consultation,
      updatedAt: new Date().toISOString(),
    };

    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              doctorConsultation: consultationWithTimestamp,
            }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? {
            ...currentSelected,
            doctorConsultation: consultationWithTimestamp,
          }
        : currentSelected
    );
  }

  return (
    <QueueContext.Provider
      value={{
        queueItems,
        selectedQueueItem,
        addQueueItem,
        selectQueueItem,
        updateQueueItemStatus,
        updateQueueItemPayment,
        updateQueueItemPatientDetails,
        addOrReplacePendingAdditionalServiceRequest,
        markAdditionalServicePaid,
        saveOptometristWorkup,
        saveDoctorConsultation,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);

  if (!context) {
    throw new Error("useQueue must be used within QueueProvider");
  }

  return context;
}