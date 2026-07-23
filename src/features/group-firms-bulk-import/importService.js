import { IMPORT_STATUS, SERVER_STATUS } from "./constants";
import { downloadImportReportExcel } from "./excelParse";

export function applyServerValidation(rows, serverData) {
  const byPan = new Map();
  (serverData || []).forEach((item) => {
    const pan = String(item.pan || "")
      .trim()
      .toUpperCase();
    if (pan) byPan.set(pan, item);
  });

  return rows.map((row) => {
    if (row.localStatus !== "valid") {
      return {
        ...row,
        serverStatus: SERVER_STATUS.PENDING,
        importStatus: IMPORT_STATUS.PENDING,
      };
    }

    const info = byPan.get(row.pan);
    if (!info) {
      return {
        ...row,
        serverStatus: SERVER_STATUS.ERROR,
        errors: [...(row.errors || []), "No server response for PAN"],
        message: "No server response for PAN",
      };
    }

    if (info.exists === true) {
      return {
        ...row,
        serverStatus: SERVER_STATUS.ALREADY_EXISTS,
        message: "Already exists in group",
      };
    }

    if (info.found === false) {
      return {
        ...row,
        serverStatus: SERVER_STATUS.NOT_FOUND,
        message: "Firm not found",
      };
    }

    return {
      ...row,
      serverStatus: SERVER_STATUS.READY,
      message: "Ready to import",
      firm_id: info.firm_id || null,
    };
  });
}

export function applyImportResults(rows, results) {
  const byPan = new Map();
  (results || []).forEach((item) => {
    const pan = String(item.pan || "")
      .trim()
      .toUpperCase();
    if (pan) byPan.set(pan, item);
  });

  return rows.map((row) => {
    if (row.serverStatus !== SERVER_STATUS.READY) {
      return {
        ...row,
        importStatus:
          row.localStatus === "valid"
            ? IMPORT_STATUS.SKIPPED
            : IMPORT_STATUS.PENDING,
      };
    }

    const info = byPan.get(row.pan);
    if (!info) {
      return {
        ...row,
        importStatus: IMPORT_STATUS.FAILED,
        message: "No import result returned",
      };
    }

    const statusRaw = String(info.status || "").toLowerCase();
    const imported =
      statusRaw === "imported" ||
      statusRaw === "success" ||
      statusRaw === "ok";

    let message =
      info.message ||
      info.status ||
      (imported ? "Successfully imported" : "Failed");

    if (!imported && !info.message) {
      if (statusRaw.includes("already")) message = "Already exists in group";
      else if (statusRaw.includes("not found")) message = "Firm not found";
    }

    return {
      ...row,
      importStatus: imported ? IMPORT_STATUS.IMPORTED : IMPORT_STATUS.FAILED,
      message,
    };
  });
}

export function isImportable(row) {
  return (
    row.localStatus === "valid" && row.serverStatus === SERVER_STATUS.READY
  );
}

export function summarizeImport(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return {
    total: list.length,
    valid: list.filter((r) => r.localStatus === "valid").length,
    invalid: list.filter((r) => r.localStatus === "invalid").length,
    ready: list.filter((r) => isImportable(r)).length,
    imported: list.filter((r) => r.importStatus === IMPORT_STATUS.IMPORTED)
      .length,
    failed: list.filter((r) => r.importStatus === IMPORT_STATUS.FAILED).length,
  };
}

export function buildReportRows(rows) {
  return (rows || []).map((row) => {
    let status = "Pending";
    let message = row.message || "";

    if (row.importStatus === IMPORT_STATUS.IMPORTED) {
      status = "Imported";
      message = message || "Successfully imported";
    } else if (row.importStatus === IMPORT_STATUS.FAILED) {
      status = "Failed";
      message = message || "Import failed";
    } else if (row.localStatus === "invalid") {
      status = "Invalid";
      message = (row.errors || []).join("; ") || "Local validation failed";
    } else if (row.serverStatus === SERVER_STATUS.ALREADY_EXISTS) {
      status = "Already Exists";
      message = "Already exists in group";
    } else if (row.serverStatus === SERVER_STATUS.NOT_FOUND) {
      status = "Firm Not Found";
      message = "Firm not found";
    } else if (row.serverStatus === SERVER_STATUS.READY) {
      status = "Ready";
      message = "Ready to import";
    } else if (row.localStatus === "valid") {
      status = "Valid";
      message = message || "Passed local validation";
    }

    return {
      pan: row.pan,
      name: row.name,
      status,
      message,
    };
  });
}

export async function downloadGroupImportReport(rows) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `Group_Import_Report_${date}.xlsx`;
  await downloadImportReportExcel(filename, buildReportRows(rows));
  return filename;
}
