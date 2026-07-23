/**
 * Excel parsing helpers (SheetJS / window.XLSX).
 */

export function ensureXlsxLoaded() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.XLSX) {
      resolve(window.XLSX);
      return;
    }
    const existing = document.querySelector('script[data-sheetjs="xlsx"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.XLSX));
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Excel library")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    script.async = true;
    script.dataset.sheetjs = "xlsx";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load Excel library"));
    document.body.appendChild(script);
  });
}

/**
 * Read first sheet: headers = row 0, rows = remaining.
 * @returns {{ headers: string[], rows: any[][], sheetName: string }}
 */
export async function parseExcelFile(file) {
  if (!file) throw new Error("No file selected");

  const name = String(file.name || "").toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("Please upload an Excel file (.xlsx or .xls)");
  }

  const XLSX = await ensureXlsxLoaded();
  const buffer = await file.arrayBuffer();
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new Error("Invalid Excel file. Please upload a valid .xlsx/.xls file.");
  }

  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error("The Excel file has no sheets.");

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("The selected file is empty.");
  }

  const headerRow = matrix[0] || [];
  const headers = headerRow.map((h, i) => {
    const label = String(h ?? "").trim();
    return label || `Column ${i + 1}`;
  });

  if (headers.every((h) => /^Column \d+$/.test(h))) {
    throw new Error("Could not read column headers from the first row.");
  }

  const rows = matrix.slice(1).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return headers.map((_, i) => {
      const v = cells[i];
      return v == null ? "" : String(v);
    });
  });

  return { headers, rows, sheetName };
}

/**
 * Build a simple sample workbook and trigger download.
 */
export async function downloadSampleExcel(
  filename = "Group_Firms_Bulk_Import_Sample.xlsx",
  headers = ["PAN", "Firm Name"],
  sampleRows = [],
) {
  const XLSX = await ensureXlsxLoaded();
  const aoa = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Firms");
  XLSX.writeFile(wb, filename);
}

/**
 * Write an import report workbook and download it.
 */
export async function downloadImportReportExcel(filename, rows) {
  const XLSX = await ensureXlsxLoaded();
  const aoa = [
    ["PAN", "Firm Name", "Status", "Message"],
    ...rows.map((r) => [
      r.pan || "",
      r.name || "",
      r.status || "",
      r.message || "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Report");
  XLSX.writeFile(wb, filename);
}
