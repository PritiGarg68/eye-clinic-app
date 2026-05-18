export type Patient = {
    id: string;
    uhid: string;
    mobile: string;
    name: string;
    age: number;
    gender: "Male" | "Female" | "Other";
    address?: string;
    notes?: string;
    createdAt: string;
  };