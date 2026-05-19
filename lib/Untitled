import { QueueItem, QueueStatus } from "../types/queue";

export type QueueRole = "reception" | "optometrist" | "doctor";

const rolePriority: Record<QueueRole, QueueStatus[]> = {
  reception: [
    "Waiting",
    "Dilated Waiting",
    "Ready for Doctor",
    "Under Optometry",
    "Under Consultation",
    "Completed",
  ],
  optometrist: [
    "Waiting",
    "Dilated Waiting",
    "Under Optometry",
    "Ready for Doctor",
    "Under Consultation",
    "Completed",
  ],
  doctor: [
    "Ready for Doctor",
    "Dilated Waiting",
    "Waiting",
    "Under Consultation",
    "Under Optometry",
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