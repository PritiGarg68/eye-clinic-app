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
  | "Additional Payment Pending"
  | "Dilated Waiting"
  | "Ready for Doctor"
  | "Under Consultation"
  | "Completed";

export type AdditionalServiceStatus = "Payment Pending" | "Paid";

export type AdditionalServiceRoute =
  | "Needs Optometry Review"
  | "Ready for Doctor";

  export type AdditionalServiceLineItem = {
    serviceName: string;
    amount: number;
  };
  
  export type AdditionalServiceRequest = {
    id: string;
    services: AdditionalServiceLineItem[];
    grossAmount: number;
    discount: number;
    netAmount: number;
    notes: string;
    status: AdditionalServiceStatus;
    routeAfterPayment: AdditionalServiceRoute;
    createdAt: string;
    paidAt?: string;
    paymentMode?: PaymentMode;
  };

export type VisionEntry = {
  distanceOD: string;
  distanceOS: string;
  nearOD: string;
  nearOS: string;
};

export type SpectacleDraftRow = {
  sph: string;
  cyl: string;
  axis: string;
  vision: string;
};

export type SpectacleAdvice = {
  od: SpectacleDraftRow;
  os: SpectacleDraftRow;
  add: SpectacleDraftRow;
  remarks: string;
};

export type OptometristWorkup = {
  chiefComplaint: string;
  vision: {
    unaided: VisionEntry;
    withGlasses: VisionEntry;
    withPinHole: VisionEntry;
  };
  refractionRight: string;
  refractionLeft: string;
  iopRight: string;
  iopLeft: string;
  dilationStatus: "Not Done" | "Waiting" | "Done";
  dilationNotes: string;
  optometristNotes: string;
  spectacleDraft: SpectacleAdvice;
  updatedAt?: string;
};

export type MedicineRow = {
  id: string;
  medicineName: string;
  eye: "Both Eyes" | "Right Eye" | "Left Eye" | "Oral" | "Other";
  frequency: string;
  duration: string;
  instructions: string;
};

export type DoctorConsultation = {
  findings: string;
  diagnosis: string;
  medicines: MedicineRow[];
  advice: string;
  followUpDate: string;
  freeFollowUpValidUntil?: string;
  notes: string;
  finalSpectacleAdvice: SpectacleAdvice;
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
  doctorConsultation?: DoctorConsultation;
  additionalServices?: AdditionalServiceRequest[];
};