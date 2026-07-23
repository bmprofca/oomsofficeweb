import { LOCAL_STATUS, PAN_REGEX } from "./constants";

export function normalizePan(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function normalizeName(value) {
  return String(value ?? "").trim();
}

/**
 * Validate a single row's PAN/name (no duplicate check).
 * @returns {string[]} error messages
 */
export function validateRowFields(panRaw, nameRaw) {
  const errors = [];
  const pan = normalizePan(panRaw);
  const name = normalizeName(nameRaw);

  if (!pan) errors.push("PAN is required");
  else if (!PAN_REGEX.test(pan)) errors.push("PAN format invalid");

  if (!name) errors.push("Firm name is required");

  return errors;
}

/**
 * Run local validation across all preview rows.
 * - Normalizes PAN to uppercase
 * - Marks duplicate PANs on ALL occurrences
 * - Reusable after row deletion
 *
 * @returns {typeof rows} new array (immutable)
 */
export function runLocalValidation(rows) {
  const list = Array.isArray(rows) ? rows : [];

  const panCounts = new Map();
  list.forEach((row) => {
    const pan = normalizePan(row.pan);
    if (!pan) return;
    panCounts.set(pan, (panCounts.get(pan) || 0) + 1);
  });

  return list.map((row) => {
    const pan = normalizePan(row.pan);
    const name = normalizeName(row.name);
    const errors = validateRowFields(pan, name);

    if (pan && (panCounts.get(pan) || 0) > 1) {
      errors.push("Duplicate PAN");
    }

    const uniqueErrors = [...new Set(errors)];
    const isValid = uniqueErrors.length === 0;

    return {
      ...row,
      pan,
      name,
      localStatus: isValid ? LOCAL_STATUS.VALID : LOCAL_STATUS.INVALID,
      serverStatus: "pending",
      importStatus: "pending",
      errors: uniqueErrors,
      message: uniqueErrors.join("; "),
    };
  });
}

export function summarizeLocal(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;
  const valid = list.filter((r) => r.localStatus === LOCAL_STATUS.VALID).length;
  const invalid = total - valid;
  return { total, valid, invalid };
}
