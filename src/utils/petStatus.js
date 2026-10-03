export const OPEN_STATUSES = [
  "available",
  "pending",
  "in_contact",
  "Lost",
  "Abandoned",
];

export const CLOSED_STATUSES = [
  "closed",
  "delivered",
  "completed",
  "Found",
];

export function isClosedStatus(status) {
  return CLOSED_STATUSES.some(
    (value) => value.toLowerCase() === String(status || "").toLowerCase(),
  );
}
