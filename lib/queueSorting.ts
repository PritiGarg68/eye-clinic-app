import { QueueItem, QueueStatus } from "../types/queue";

export type QueueRole = "reception" | "optometrist" | "doctor";

const rolePriority: Record<QueueRole, QueueStatus[]> = {
  reception: [
    "Waiting",
    "Under Optometry",
    "Under Consultation",
    "Needs Optometry Review",
    "Dilated Waiting",
    "Ready for Doctor",
    "Additional Payment Pending",
    "Completed",
  ],
  optometrist: [
    "Needs Optometry Review",
    "Waiting",
    "Dilated Waiting",
    "Under Optometry",
    "Ready for Doctor",
    "Under Consultation",
    "Additional Payment Pending",
    "Completed",
  ],
  doctor: [
    "Under Consultation",
    "Ready for Doctor",
    "Dilated Waiting",
    "Waiting",
    "Under Optometry",
    "Needs Optometry Review",
    "Additional Payment Pending",
    "Completed",
  ],
};

export function sortQueueForRole(
  items: QueueItem[],
  role: QueueRole
): QueueItem[] {
  const priority = rolePriority[role];

  return [...items].sort((a, b) => {
    const statusDifference =
      priority.indexOf(a.status) - priority.indexOf(b.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return a.tokenNumber - b.tokenNumber;
  });
}