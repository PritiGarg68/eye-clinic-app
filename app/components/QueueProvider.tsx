"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DoctorConsultation,
  OptometristWorkup,
  QueueItem,
  QueueStatus,
} from "../../types/queue";

type QueueContextValue = {
  queueItems: QueueItem[];
  selectedQueueItem: QueueItem | null;
  addQueueItem: (item: QueueItem) => void;
  selectQueueItem: (item: QueueItem | null) => void;
  updateQueueItemStatus: (itemId: string, status: QueueStatus) => void;
  saveOptometristWorkup: (
    itemId: string,
    workup: OptometristWorkup
  ) => void;
  saveDoctorConsultation: (
    itemId: string,
    consultation: DoctorConsultation
  ) => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

const QUEUE_STORAGE_KEY = "eye-clinic-queue-items";
const SELECTED_QUEUE_STORAGE_KEY = "eye-clinic-selected-queue-item";

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<QueueItem | null>(null);

  useEffect(() => {
    const savedQueue = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    const savedSelectedQueueItem = window.localStorage.getItem(
      SELECTED_QUEUE_STORAGE_KEY
    );

    if (savedQueue) {
      setQueueItems(JSON.parse(savedQueue));
    }

    if (savedSelectedQueueItem) {
      setSelectedQueueItem(JSON.parse(savedSelectedQueueItem));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify(queueItems)
    );
  }, [queueItems]);

  useEffect(() => {
    if (selectedQueueItem) {
      window.localStorage.setItem(
        SELECTED_QUEUE_STORAGE_KEY,
        JSON.stringify(selectedQueueItem)
      );
    } else {
      window.localStorage.removeItem(SELECTED_QUEUE_STORAGE_KEY);
    }
  }, [selectedQueueItem]);

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
        item.id === itemId ? { ...item, status } : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? { ...currentSelected, status }
        : currentSelected
    );
  }

  function saveOptometristWorkup(
    itemId: string,
    workup: OptometristWorkup
  ) {
    const updatedWorkup: OptometristWorkup = {
      ...workup,
      updatedAt: new Date().toISOString(),
    };

    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? { ...item, optometristWorkup: updatedWorkup }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? { ...currentSelected, optometristWorkup: updatedWorkup }
        : currentSelected
    );
  }

  function saveDoctorConsultation(
    itemId: string,
    consultation: DoctorConsultation
  ) {
    const updatedConsultation: DoctorConsultation = {
      ...consultation,
      updatedAt: new Date().toISOString(),
    };

    setQueueItems((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId
          ? { ...item, doctorConsultation: updatedConsultation }
          : item
      )
    );

    setSelectedQueueItem((currentSelected) =>
      currentSelected?.id === itemId
        ? { ...currentSelected, doctorConsultation: updatedConsultation }
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
    throw new Error("useQueue must be used inside QueueProvider");
  }

  return context;
}