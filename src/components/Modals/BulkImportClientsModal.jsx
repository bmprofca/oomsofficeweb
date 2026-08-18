import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FiUpload,
  FiX,
  FiCheck,
  FiFileText,
  FiSettings,
  FiSearch,
  FiDownload,
} from "react-icons/fi";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

const DEFAULT_MAPPINGS = {
  name: "",
  mobile: "",
  email: "",
  pan_number: "",
  gender: "",
  date_of_birth: "",
  state: "",
  district: "",
  city: "",
  pincode: "",
  care_of: "",
  guardian_name: "",
  firm_name: "",
  firm_type: "",
  gst: "",
  firm_pan: "",
  opening_balance: "",
  opening_balance_type: "",
  opening_balance_date: "",
};

const REQUIRED_FIELD_DEFS = [
  {
    key: "name",
    label: "Client Name *",
    placeholder: "-- Map Name Column --",
  },
  {
    key: "mobile",
    label: "Mobile Number *",
    placeholder: "-- Map Mobile Column --",
  },
  {
    key: "email",
    label: "Email Address *",
    placeholder: "-- Map Email Column --",
  },
  {
    key: "pan_number",
    label: "PAN Number *",
    placeholder: "-- Map PAN Column --",
  },
  {
    key: "gender",
    label: "Gender *",
    placeholder: "-- Map Gender Column --",
  },
  {
    key: "date_of_birth",
    label: "Date of Birth *",
    placeholder: "-- Map DOB Column --",
  },
  {
    key: "state",
    label: "State *",
    placeholder: "-- Map State Column --",
  },
  {
    key: "district",
    label: "District *",
    placeholder: "-- Map District Column --",
  },
  {
    key: "city",
    label: "City/Town/Village *",
    placeholder: "-- Map City Column --",
  },
  {
    key: "pincode",
    label: "Pincode *",
    placeholder: "-- Map Pincode Column --",
  },
];

const OPTIONAL_FIELD_DEFS = [
  { key: "care_of", label: "Care Of (C/O)" },
  { key: "guardian_name", label: "Guardian Name" },
  { key: "firm_name", label: "Firm Name" },
  { key: "firm_type", label: "Business Type" },
  { key: "gst", label: "GSTIN" },
  { key: "firm_pan", label: "Firm PAN" },
  { key: "opening_balance", label: "Opening Balance" },
  { key: "opening_balance_type", label: "Balance Type" },
  { key: "opening_balance_date", label: "Balance Date" },
];

const STANDARD_IMPORT_HEADERS = [
  "Client Name",
  "Mobile",
  "Email",
  "PAN",
  "Gender",
  "DOB",
  "State",
  "District",
  "City",
  "Pincode",
  "Care Of",
  "Guardian",
  "firm",
  "business type",
  "gst",
  "firm pan",
  "opening balance",
  "opening balance type",
  "opening balance date",
];

const escapeCsvCell = (value) => {
  const cellString = String(value ?? "");
  if (
    cellString.includes(",") ||
    cellString.includes('"') ||
    cellString.includes("\n")
  ) {
    return `"${cellString.replace(/"/g, '""')}"`;
  }
  return cellString;
};

const downloadCsvFile = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Bulk client import via CSV/Excel — reusable across pages.
 */
export default function BulkImportClientsModal({
  open,
  onClose,
  onImported,
}) {
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  const [bulkSuccessResult, setBulkSuccessResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({ ...DEFAULT_MAPPINGS });
  const [disputeRows, setDisputeRows] = useState([]);
  const bulkFileInputRef = useRef(null);

  const resetBulkState = () => {
    setBulkFile(null);
    setBulkPreview(null);
    setBulkError(null);
    setBulkSuccessResult(null);
    setDragActive(false);
    setFileHeaders([]);
    setParsedRows([]);
    setColumnMappings({ ...DEFAULT_MAPPINGS });
    setDisputeRows([]);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!open) {
      resetBulkState();
      return undefined;
    }

    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
    return undefined;
  }, [open]);

  const handleClose = () => {
    if (bulkLoading) return;
    resetBulkState();
    onClose?.();
  };

  const downloadSampleCSV = () => {
    const headers = [
      "Client Name",
      "Mobile",
      "Email",
      "PAN",
      "Gender",
      "DOB",
      "State",
      "District",
      "City",
      "Pincode",
      "Care Of",
      "Guardian",
      "Firm Name",
      "Business Type",
      "GSTIN",
      "Firm PAN",
      "Opening Balance",
      "Opening Balance Type",
      "Opening Balance Date",
    ];

    const row1 = [
      "Alice Smith",
      "9876543210",
      "alice@example.com",
      "ABCDE1234F",
      "female",
      "1993-04-12",
      "West Bengal",
      "Cooch Behar",
      "Cooch Behar",
      "736134",
      "S/O",
      "Robert Smith",
      "Alice Smith",
      "Individual",
      "19ABCDE1234F1Z5",
      "ABCDE1234F",
      "500",
      "credit",
      "2026-06-02",
    ];

    const row2 = [
      "John Doe",
      "9998887776",
      "john.doe@example.com",
      "WXYZS9876Q",
      "male",
      "1988-11-23",
      "Delhi",
      "New Delhi",
      "New Delhi",
      "110001",
      "S/O",
      "Arthur Doe",
      "Doe Consulting",
      "Proprietorship",
      "07WXYZS9876Q1Z9",
      "WXYZS9876Q",
      "1200",
      "debit",
      "2026-06-02",
    ];

    const csvContent = [headers.join(","), row1.join(","), row2.join(",")].join(
      "\n",
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_clients_import.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadBlankTemplate = () => {
    const headers = [
      "Client Name",
      "Mobile",
      "Email",
      "PAN",
      "Gender",
      "DOB",
      "State",
      "District",
      "City",
      "Pincode",
      "Care Of",
      "Guardian",
      "Firm Name",
      "Business Type",
      "GSTIN",
      "Firm PAN",
      "Opening Balance",
      "Opening Balance Type",
      "Opening Balance Date",
    ];

    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blank_clients_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseFile = (file) => {
    if (!window.XLSX) {
      setBulkError(
        "Spreadsheet parser library is loading. Please try again in a few seconds.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, {
          type: "array",
          cellDates: true,
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length === 0) {
          setBulkError("The selected file is empty.");
          return;
        }

        const headers = rows[0].map((h) => String(h || "").trim());
        setFileHeaders(headers);

        const validRows = rows
          .slice(1)
          .filter((row) =>
            row.some(
              (cell) => cell !== null && cell !== undefined && cell !== "",
            ),
          );
        setParsedRows(validRows);

        const newMappings = { ...DEFAULT_MAPPINGS };
        const aliasMap = {
          name: ["client name", "name", "full name", "fullname"],
          mobile: ["mobile", "phone", "mobile number", "mobile_no", "contact"],
          email: ["email", "email address", "e-mail", "mail"],
          pan_number: ["pan", "pan number", "pan_no", "client_pan"],
          gender: ["gender", "male/female", "m/f"],
          date_of_birth: [
            "dob",
            "date of birth",
            "date_of_birth",
            "birth date",
          ],
          state: ["state"],
          district: ["district"],
          city: ["city", "town", "village", "city/town/village"],
          pincode: ["pincode", "pin", "zipcode", "postal code"],
          care_of: ["care of", "care_of", "c/o"],
          guardian_name: ["guardian", "guardian name", "guardian_name"],
          firm_name: ["firm", "firm name", "company name", "business name"],
          firm_type: ["business type", "firm type", "company type"],
          gst: ["gst", "gstin", "gst number"],
          firm_pan: ["firm pan", "business pan"],
          opening_balance: ["opening balance", "balance", "opening_bal"],
          opening_balance_type: ["opening balance type", "type", "bal_type"],
          opening_balance_date: ["opening balance date", "bal_date"],
        };

        Object.keys(aliasMap).forEach((key) => {
          const matchedHeader = headers.find((h) => {
            const cleanH = h.toLowerCase().trim();
            return (
              aliasMap[key].includes(cleanH) ||
              cleanH.includes(key.replace("_", ""))
            );
          });
          if (matchedHeader) {
            newMappings[key] = matchedHeader;
          }
        });

        setColumnMappings(newMappings);
      } catch (err) {
        console.error("Error parsing file:", err);
        setBulkError(
          "Failed to parse the file. Please ensure it is a valid Excel or CSV file.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const acceptFile = (file) => {
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (["csv", "xlsx", "xls"].includes(fileExt)) {
      setBulkFile(file);
      setBulkPreview(null);
      setBulkError(null);
      setBulkSuccessResult(null);
      setDisputeRows([]);
      parseFile(file);
    } else {
      setBulkError(
        "Invalid file format. Please upload a .csv, .xlsx, or .xls file.",
      );
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      acceptFile(e.dataTransfer.files[0]);
    }
  };

  const handleBulkFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      acceptFile(e.target.files[0]);
    }
  };

  const generateMappedCSVFile = () => {
    const required = {
      name: "Client Name",
      mobile: "Mobile",
      email: "Email",
      pan_number: "PAN",
      gender: "Gender",
      date_of_birth: "DOB",
      state: "State",
      district: "District",
      city: "City",
      pincode: "Pincode",
    };

    const missing = [];
    Object.keys(required).forEach((key) => {
      if (!columnMappings[key]) {
        missing.push(required[key]);
      }
    });

    if (missing.length > 0) {
      setBulkError(
        `Please map all required columns before proceeding. Missing: ${missing.join(", ")}`,
      );
      return null;
    }

    const standardHeaders = [
      "Client Name",
      "Mobile",
      "Email",
      "PAN",
      "Gender",
      "DOB",
      "State",
      "District",
      "City",
      "Pincode",
      "Care Of",
      "Guardian",
      "firm",
      "business type",
      "gst",
      "firm pan",
      "opening balance",
      "opening balance type",
      "opening balance date",
    ];

    const keyToHeaderIndex = {
      name: 0,
      mobile: 1,
      email: 2,
      pan_number: 3,
      gender: 4,
      date_of_birth: 5,
      state: 6,
      district: 7,
      city: 8,
      pincode: 9,
      care_of: 10,
      guardian_name: 11,
      firm_name: 12,
      firm_type: 13,
      gst: 14,
      firm_pan: 15,
      opening_balance: 16,
      opening_balance_type: 17,
      opening_balance_date: 18,
    };

    const csvRows = [standardHeaders.join(",")];

    parsedRows.forEach((row) => {
      const mappedRow = Array(standardHeaders.length).fill("");

      Object.keys(columnMappings).forEach((key) => {
        const fileHeader = columnMappings[key];
        if (fileHeader) {
          const headerIdx = fileHeaders.indexOf(fileHeader);
          if (headerIdx !== -1) {
            let cellValue = row[headerIdx];
            if (cellValue === undefined || cellValue === null) {
              cellValue = "";
            }

            let cellString = "";
            if (key === "date_of_birth" || key === "opening_balance_date") {
              if (cellValue instanceof Date) {
                const yyyy = cellValue.getFullYear();
                const mm = String(cellValue.getMonth() + 1).padStart(2, "0");
                const dd = String(cellValue.getDate()).padStart(2, "0");
                cellString = `${yyyy}-${mm}-${dd}`;
              } else if (
                typeof cellValue === "number" ||
                (!isNaN(cellValue) && cellValue !== "")
              ) {
                const num = Number(cellValue);
                if (num > 10000 && num < 100000) {
                  const dateObj = new Date((num - 25569) * 86400 * 1000);
                  if (!isNaN(dateObj.getTime())) {
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const dd = String(dateObj.getDate()).padStart(2, "0");
                    cellString = `${yyyy}-${mm}-${dd}`;
                  } else {
                    cellString = String(cellValue).trim();
                  }
                } else {
                  cellString = String(cellValue).trim();
                }
              } else {
                cellString = String(cellValue).trim();
              }
            } else if (key === "mobile") {
              cellString = String(cellValue)
                .trim()
                .replace(/[^0-9]/g, "");
            } else {
              cellString = String(cellValue).trim();
            }

            if (
              cellString.includes(",") ||
              cellString.includes('"') ||
              cellString.includes("\n")
            ) {
              cellString = `"${cellString.replace(/"/g, '""')}"`;
            }

            const targetIdx = keyToHeaderIndex[key];
            mappedRow[targetIdx] = cellString;
          }
        }
      });

      csvRows.push(mappedRow.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return new File([blob], "transformed_clients.csv", { type: "text/csv" });
  };

  const downloadDisputeRecords = () => {
    const disputes =
      (Array.isArray(disputeRows) && disputeRows.length > 0
        ? disputeRows
        : bulkPreview?.errors) || [];
    if (!disputes.length) return;

    const mappingByHeader = {
      "Client Name": columnMappings.name,
      Mobile: columnMappings.mobile,
      Email: columnMappings.email,
      PAN: columnMappings.pan_number,
      Gender: columnMappings.gender,
      DOB: columnMappings.date_of_birth,
      State: columnMappings.state,
      District: columnMappings.district,
      City: columnMappings.city,
      Pincode: columnMappings.pincode,
      "Care Of": columnMappings.care_of,
      Guardian: columnMappings.guardian_name,
      firm: columnMappings.firm_name,
      "business type": columnMappings.firm_type,
      gst: columnMappings.gst,
      "firm pan": columnMappings.firm_pan,
      "opening balance": columnMappings.opening_balance,
      "opening balance type": columnMappings.opening_balance_type,
      "opening balance date": columnMappings.opening_balance_date,
    };

    const csvRows = [
      [...STANDARD_IMPORT_HEADERS, "Issues"].map(escapeCsvCell).join(","),
    ];

    disputes.forEach((err) => {
      const record = err.record && typeof err.record === "object" ? err.record : {};
      const fallbackRow =
        Array.isArray(parsedRows) && Number(err.row) >= 2
          ? parsedRows[Number(err.row) - 2]
          : null;

      const cells = STANDARD_IMPORT_HEADERS.map((header) => {
        if (record[header] !== undefined && record[header] !== null && record[header] !== "") {
          return escapeCsvCell(record[header]);
        }
        const matchedKey = Object.keys(record).find(
          (key) => String(key).toLowerCase() === header.toLowerCase(),
        );
        if (matchedKey) return escapeCsvCell(record[matchedKey]);

        if (fallbackRow && fileHeaders.length) {
          const sourceHeader = mappingByHeader[header];
          const headerIdx = sourceHeader ? fileHeaders.indexOf(sourceHeader) : -1;
          if (headerIdx >= 0) {
            return escapeCsvCell(fallbackRow[headerIdx]);
          }
        }
        return "";
      });

      cells.push(escapeCsvCell((err.errors || []).join("; ")));
      csvRows.push(cells.join(","));
    });

    downloadCsvFile("client_import_disputes.csv", csvRows.join("\n"));
  };

  const handleBulkPreview = async () => {
    const mappedFile = generateMappedCSVFile();
    if (!mappedFile) return;

    setBulkLoading(true);
    setBulkError(null);
    setBulkPreview(null);

    const formDataPayload = new FormData();
    formDataPayload.append("file", mappedFile);

    try {
      const authHeaders = getHeaders(true);
      if (!authHeaders) {
        setBulkError("Authentication session expired. Please log in again.");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/client/import?preview=true`,
        formDataPayload,
        { headers: authHeaders },
      );

      if (response.data.success) {
        setBulkPreview(response.data.data);
        setDisputeRows(response.data.data?.errors || []);
      } else {
        setBulkError(response.data.message || "Failed to analyze the file.");
      }
    } catch (err) {
      console.error("Bulk Import Preview Error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "An error occurred while analyzing the file.";
      setBulkError(errMsg);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const mappedFile = generateMappedCSVFile();
    if (!mappedFile) return;

    setBulkLoading(true);
    setBulkError(null);

    const formDataPayload = new FormData();
    formDataPayload.append("file", mappedFile);

    try {
      const authHeaders = getHeaders(true);
      if (!authHeaders) {
        setBulkError("Authentication session expired. Please log in again.");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/client/import`,
        formDataPayload,
        { headers: authHeaders },
      );

      if (response.data.success) {
        const result = response.data.data || {};
        setBulkSuccessResult(result);
        setDisputeRows(result.errors || disputeRows);
        setBulkPreview(null);
        onImported?.(result);
      } else {
        if (response.data.errors) {
          setDisputeRows(response.data.errors);
          setBulkPreview((prev) => ({
            ...prev,
            invalid_count: response.data.errors.length,
            errors: response.data.errors,
          }));
        }
        setBulkError(response.data.message || "Failed to import clients.");
      }
    } catch (err) {
      console.error("Bulk Import Commit Error:", err);
      const errs = err.response?.data?.errors;
      if (errs && Array.isArray(errs)) {
        setDisputeRows(errs);
        setBulkPreview((prev) => ({
          ...prev,
          invalid_count: errs.length,
          errors: errs,
        }));
        setBulkError(
          err.response?.data?.message ||
            "No valid rows were imported. Download the dispute records, fix them, and re-import.",
        );
      } else {
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Internal server error. Please try again.";
        setBulkError(errMsg);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FiUpload className="w-5 h-5 animate-bounce" />
              Bulk Client Import
            </h3>
            <p className="text-xs text-indigo-100 mt-0.5">
              Upload a spreadsheet to import clients in bulk
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {bulkError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <div className="bg-rose-500 text-white p-1 rounded-full shrink-0">
                <FiX className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-800">
                  Error Occurred
                </h4>
                <p className="text-xs text-rose-600 mt-0.5">{bulkError}</p>
              </div>
            </div>
          )}

          {bulkSuccessResult ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-emerald-100">
                <FiCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">
                  {Number(bulkSuccessResult.skipped_count || 0) > 0
                    ? "Partial import complete"
                    : "Import Successful!"}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Successfully imported{" "}
                  <strong>{bulkSuccessResult.imported_count}</strong> clients.
                </p>
                {Number(bulkSuccessResult.skipped_count || disputeRows.length || 0) > 0 && (
                  <p className="text-sm text-rose-600 mt-1">
                    {bulkSuccessResult.skipped_count || disputeRows.length} row
                    {(Number(bulkSuccessResult.skipped_count || disputeRows.length) === 1)
                      ? ""
                      : "s"}{" "}
                    had issues and were skipped.
                  </p>
                )}
                {bulkSuccessResult.opening_balance_applied > 0 && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    Opening balance applied to{" "}
                    {bulkSuccessResult.opening_balance_applied} client(s).
                  </p>
                )}
              </div>
              {disputeRows.length > 0 && (
                <button
                  type="button"
                  onClick={downloadDisputeRecords}
                  className="px-5 py-2.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FiDownload className="w-4 h-4" />
                  Download {disputeRows.length} dispute record
                  {disputeRows.length === 1 ? "" : "s"}
                </button>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 relative cursor-pointer group ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50 shadow-inner"
                    : bulkFile
                      ? "border-emerald-500 bg-emerald-50/20"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
                onClick={() => bulkFileInputRef.current?.click()}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleBulkFileChange}
                />

                <div
                  className={`p-4 rounded-full mb-3 transition-transform duration-300 group-hover:scale-110 ${
                    bulkFile
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-indigo-50 text-indigo-600"
                  }`}
                >
                  <FiFileText className="w-8 h-8" />
                </div>

                {bulkFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {bulkFile.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(bulkFile.size / 1024).toFixed(1)} KB • Click or drag to
                      replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag and drop your spreadsheet here, or{" "}
                      <span className="text-indigo-600 hover:underline">
                        browse
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Excel (.xlsx, .xls) and CSV (.csv) files
                    </p>
                  </div>
                )}
              </div>

              {bulkFile &&
                fileHeaders.length > 0 &&
                !bulkPreview &&
                !bulkSuccessResult && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 space-y-4 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FiSettings className="w-4 h-4 text-indigo-600" />
                        Define Column Mappings
                      </h4>
                      <p className="text-[11px] text-slate-505 mt-1">
                        Map the expected client profile details to the headers
                        in your uploaded spreadsheet. Required columns must be
                        selected.
                      </p>
                    </div>

                    <div className="space-y-3 pb-2 border-b border-slate-200/60">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Required Fields
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {REQUIRED_FIELD_DEFS.map((field) => (
                          <div
                            key={field.key}
                            className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-1 shadow-sm"
                          >
                            <label className="block text-[11px] font-bold text-slate-700">
                              {field.label}
                            </label>
                            <select
                              value={columnMappings[field.key] || ""}
                              onChange={(e) =>
                                setColumnMappings((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className={`w-full px-2 py-1 border rounded text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                                !columnMappings[field.key]
                                  ? "border-amber-350 bg-amber-50/10"
                                  : "border-slate-300"
                              }`}
                            >
                              <option value="">{field.placeholder}</option>
                              {fileHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Optional Fields
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {OPTIONAL_FIELD_DEFS.map((field) => (
                          <div
                            key={field.key}
                            className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-1 shadow-sm"
                          >
                            <label className="block text-[10px] font-bold text-slate-600">
                              {field.label}
                            </label>
                            <select
                              value={columnMappings[field.key] || ""}
                              onChange={(e) =>
                                setColumnMappings((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">-- Skip Column --</option>
                              {fileHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {!bulkFile && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-200/60 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Column Headers Guideline
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Reference headers & templates below. PAN must be unique
                        per branch; mobile and email may repeat.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadBlankTemplate();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white border border-slate-250 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        <FiUpload className="w-3.5 h-3.5 rotate-180" />
                        Blank Template
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSampleCSV();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white border border-slate-250 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        <FiUpload className="w-3.5 h-3.5 rotate-180" />
                        Demo Template
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                            <th className="px-3 py-2">Expected Column Header</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Aliases Accepted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              Client Name
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              name, full name, fullname
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              Mobile
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal font-mono">
                              phone, mobile number, mobile_no
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              Email
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              email address, e-mail, mail
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              PAN
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal font-mono">
                              pan number, pan_no, client_pan
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              Gender
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              gender, male/female
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              DOB
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              date of birth, date_of_birth
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              State / District
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              -
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              City
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              town, village, city/town/village
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              Pincode
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                Required
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal">
                              pin, zipcode, postal code
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/20">
                            <td className="px-3 py-2 text-slate-600 font-semibold">
                              Other Fields
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                Optional
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-normal text-[10px]">
                              Care Of, Guardian, Firm Name, Business Type,
                              GSTIN, Firm PAN, Opening Balance/Type/Date
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bulkPreview && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center shadow-sm">
                      <p className="text-xs text-slate-500 font-medium uppercase">
                        Total Rows
                      </p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">
                        {bulkPreview.total_rows}
                      </p>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center shadow-sm">
                      <p className="text-xs text-emerald-600 font-semibold uppercase">
                        Valid Entries
                      </p>
                      <p className="text-xl font-extrabold text-emerald-700 mt-1">
                        {bulkPreview.valid_count}
                      </p>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-center shadow-sm">
                      <p className="text-xs text-rose-600 font-semibold uppercase">
                        Invalid Entries
                      </p>
                      <p className="text-xl font-extrabold text-rose-700 mt-1">
                        {bulkPreview.invalid_count}
                      </p>
                    </div>
                  </div>

                  {bulkPreview.invalid_count > 0 &&
                    bulkPreview.errors &&
                    bulkPreview.errors.length > 0 && (
                      <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
                            Dispute records ({bulkPreview.invalid_count}) — skipped on import
                          </h4>
                          <button
                            type="button"
                            onClick={downloadDisputeRecords}
                            className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <FiDownload className="w-3.5 h-3.5" />
                            Download dispute records
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {bulkPreview.errors.map((err, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-rose-100 p-2.5 rounded-lg text-xs flex flex-col gap-1 shadow-sm"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-rose-900">
                                  Row {err.row}
                                </span>
                                {err.name && (
                                  <span className="text-slate-500 italic font-medium">
                                    {err.name}
                                  </span>
                                )}
                              </div>
                              <ul className="list-disc list-inside pl-1 text-slate-700 space-y-0.5">
                                {err.errors.map((subErr, subIdx) => (
                                  <li key={subIdx}>{subErr}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {bulkPreview.preview && bulkPreview.preview.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Previewing Valid Entries
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded-full">
                          Showing up to 5 rows
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                              <th className="px-4 py-2 font-medium">Name</th>
                              <th className="px-4 py-2 font-medium">Mobile</th>
                              <th className="px-4 py-2 font-medium">Email</th>
                              <th className="px-4 py-2 font-medium">PAN</th>
                              <th className="px-4 py-2 font-medium">
                                Location
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {bulkPreview.preview.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/40">
                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                  {row.name}
                                </td>
                                <td className="px-4 py-2.5">{row.mobile}</td>
                                <td className="px-4 py-2.5">{row.email}</td>
                                <td className="px-4 py-2.5 font-mono">
                                  {row.pan_number || row.pan}
                                </td>
                                <td className="px-4 py-2.5">
                                  {row.city ||
                                    row.city_town_village ||
                                    "N/A"}
                                  , {row.state}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!bulkSuccessResult && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            <div>
              {bulkFile && (
                <button
                  type="button"
                  onClick={resetBulkState}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                  disabled={bulkLoading}
                >
                  Clear / Reset
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                disabled={bulkLoading}
              >
                Cancel
              </button>

              {!bulkPreview ? (
                <button
                  type="button"
                  onClick={handleBulkPreview}
                  disabled={bulkLoading || !bulkFile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-indigo-100 transition-all cursor-pointer"
                >
                  {bulkLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <FiSearch className="w-4 h-4" />
                      <span>Analyze Spreadsheet</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  {disputeRows.length > 0 && (
                    <button
                      type="button"
                      onClick={downloadDisputeRecords}
                      disabled={bulkLoading}
                      className="px-4 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold rounded-lg flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download disputes
                    </button>
                  )}
                  <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={bulkLoading || bulkPreview.valid_count === 0}
                  className={`px-5 py-2 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                    bulkPreview.valid_count === 0
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  }`}
                >
                  {bulkLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      <span>
                        Import {bulkPreview.valid_count} valid client
                        {bulkPreview.valid_count === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
