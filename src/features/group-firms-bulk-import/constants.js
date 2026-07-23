/** Shared constants for group firms bulk import. */

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const STEPS = {
  UPLOAD: "upload",
  MAPPING: "mapping",
  PREVIEW: "preview",
  DONE: "done",
};

export const LOCAL_STATUS = {
  PENDING: "pending",
  VALID: "valid",
  INVALID: "invalid",
  SKIPPED: "skipped",
};

export const SERVER_STATUS = {
  PENDING: "pending",
  READY: "ready",
  ALREADY_EXISTS: "already_exists",
  NOT_FOUND: "not_found",
  ERROR: "error",
};

export const IMPORT_STATUS = {
  PENDING: "pending",
  IMPORTED: "imported",
  FAILED: "failed",
  SKIPPED: "skipped",
};

export const SAMPLE_HEADERS = ["PAN", "Firm Name"];

export const SAMPLE_ROWS = [
  ["ABCDE1234F", "ABC PRIVATE LIMITED"],
  ["AAAAA1111A", "XYZ TRADERS"],
];
