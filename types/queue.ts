import { Patient } from "./patient";

export type VisitType =
  | "New Patient Visit"
  | "Returning Patient"
  | "Free Follow-Up";

export type PaymentMode = "Cash" | "UPI" | "Card" | "None";

export type QueueStatus =
  | "Waiting"
  | "Under Optometry"
  | "Needs Optometry Review"
  | "Dilated Waiting"
  | "Ready for Doctor"
  | "Under Consultation"
  | "Completed";

export type OptometristWorkup = {
  chiefComplaint: string;
  visionRight: string;
  visionLeft: string;
  refractionRight: string;
  refractionLeft: string;
  iopRight: string;
  iopLeft: string;
  dilationStatus: "Not Done" | "Waiting" | "Done";
  dilationNotes: string;
  spectacleDraftNotes: string;
  updatedAt?: string;
};

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
  optometristWorkup?: OptometristWorkup;
};