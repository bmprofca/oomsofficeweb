/**
 * Column mapping helpers. Selected values are column indexes (number).
 */

/** Guess PAN / name column indexes from header labels. */
export function guessColumnIndexes(headers = []) {
  const lower = headers.map((h) => String(h || "").trim().toLowerCase());

  const panIdx = lower.findIndex((h) =>
    /^(pan|pan\s*number|pan\s*no\.?|permanent\s*account\s*number)$/.test(h) ||
    (h.includes("pan") && !h.includes("company")),
  );

  const nameIdx = lower.findIndex((h) =>
    /^(firm\s*name|name|company\s*name|business\s*name)$/.test(h) ||
    (h.includes("firm") && h.includes("name")) ||
    (h.includes("company") && h.includes("name")),
  );

  return {
    panIndex: panIdx >= 0 ? panIdx : null,
    nameIndex: nameIdx >= 0 ? nameIdx : null,
  };
}

export function cellAt(row, index) {
  if (index == null || index < 0 || !Array.isArray(row)) return "";
  return String(row[index] ?? "").trim();
}

/**
 * Build preview rows from raw matrix using column indexes.
 * Empty PAN+Name rows are omitted.
 */
export function buildPreviewRows(rows, panIndex, nameIndex) {
  if (panIndex == null || nameIndex == null) return [];

  const preview = [];
  rows.forEach((row, i) => {
    const pan = cellAt(row, panIndex);
    const name = cellAt(row, nameIndex);
    if (!pan && !name) return;

    preview.push({
      id: `row-${i + 2}-${pan}-${name}`,
      rowNumber: i + 2, // Excel row (1-based header)
      pan,
      name,
      localStatus: "pending",
      serverStatus: "pending",
      importStatus: "pending",
      errors: [],
      message: "",
    });
  });
  return preview;
}
