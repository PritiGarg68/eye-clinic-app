import { Patient } from "../types/patient";

export const samplePatients: Patient[] = [
  {
    id: "1",
    uhid: "EC-0001",
    mobile: "9876543210",
    name: "Ramesh Kumar",
    age: 58,
    gender: "Male",
    address: "Delhi",
    notes: "Regular follow-up patient",
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    uhid: "EC-0002",
    mobile: "9876543210",
    name: "Sita Kumar",
    age: 54,
    gender: "Female",
    address: "Delhi",
    notes: "Same mobile number as family member",
    createdAt: "2026-01-02",
  },
  {
    id: "3",
    uhid: "EC-0003",
    mobile: "9999999999",
    name: "Aarav Sharma",
    age: 12,
    gender: "Male",
    address: "Noida",
    notes: "Child patient",
    createdAt: "2026-01-03",
  },
];