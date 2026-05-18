import { Patient } from "./patient";

export type VisitType =
  | "New Patient Visit"
  | "Returning Patient"
  | "Free Follow-Up";

export type PaymentMode = "Cash" | "UPI" | "Card" | "None";

export type QueueStatus =
  | "Waiting"
  | "Under Optometry"
  | "Dilated Waiting"
  | "Ready for Doctor"
  | "Under Consultation"
  | "Completed";

export type QueueItem = {
  id: string;
  tokenNumber: number;
  patientName: string;
  age: number;
  gender: Patient["gender"];
  uhid: string;
  visitType: VisitType;
  paymentMode: PaymentMode;
  amountPaid: number;
  status: QueueStatus;
};