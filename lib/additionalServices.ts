import { AdditionalServiceRoute } from "../types/queue";

export type AdditionalServiceMaster = {
  serviceName: string;
  amount: number;
  routeAfterPayment: AdditionalServiceRoute;
};

export const additionalServiceMasters: AdditionalServiceMaster[] = [
  {
    serviceName: "OCT",
    amount: 1500,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Visual Field",
    amount: 1500,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Fundus Photo",
    amount: 800,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "B-Scan",
    amount: 1200,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Repeat IOP",
    amount: 300,
    routeAfterPayment: "Needs Optometry Review",
  },
  {
    serviceName: "Other Test / Procedure",
    amount: 0,
    routeAfterPayment: "Ready for Doctor",
  },
];