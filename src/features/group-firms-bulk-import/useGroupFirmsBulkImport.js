import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  SAMPLE_HEADERS,
  SAMPLE_ROWS,
  STEPS,
  SERVER_STATUS,
} from "./constants";
import { guessColumnIndexes, buildPreviewRows } from "./columnMapping";
import {
  parseExcelFile,
  downloadSampleExcel,
} from "./excelParse";
import { runLocalValidation, summarizeLocal } from "./localValidation";
import { validateBulkImportPans, commitBulkImport } from "./api";
import {
  applyServerValidation,
  applyImportResults,
  isImportable,
  summarizeImport,
  downloadGroupImportReport,
} from "./importService";

const initialState = () => ({
  step: STEPS.UPLOAD,
  file: null,
  headers: [],
  rows: [],
  panIndex: null,
  nameIndex: null,
  previewRows: [],
  previewBaseline: [],
  serverValidated: false,
  importDone: false,
  busy: false,
  error: null,
});

export function useGroupFirmsBulkImport({ groupId, onImported } = {}) {
  const [state, setState] = useState(initialState);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState());
  }, []);

  const setError = useCallback((message) => {
    setState((prev) => ({ ...prev, error: message || null }));
  }, []);

  const downloadSample = useCallback(async () => {
    try {
      await downloadSampleExcel(
        "Group_Firms_Bulk_Import_Sample.xlsx",
        SAMPLE_HEADERS,
        SAMPLE_ROWS,
      );
    } catch (err) {
      toast.error(err.message || "Could not download sample file");
    }
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const { headers, rows } = await parseExcelFile(file);
      const guessed = guessColumnIndexes(headers);
      setState((prev) => ({
        ...prev,
        busy: false,
        file,
        headers,
        rows,
        panIndex: guessed.panIndex,
        nameIndex: guessed.nameIndex,
        previewRows: [],
        previewBaseline: [],
        serverValidated: false,
        importDone: false,
        step: STEPS.UPLOAD,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        busy: false,
        file: null,
        previewRows: [],
        previewBaseline: [],
        error: err.message || "Failed to read Excel file",
      }));
    }
  }, []);

  const goToMapping = useCallback(() => {
    setState((prev) => {
      if (!prev.file || !prev.headers.length) {
        return { ...prev, error: "Please upload an Excel file first" };
      }
      return { ...prev, step: STEPS.MAPPING, error: null };
    });
  }, []);

  const goToUpload = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: STEPS.UPLOAD,
      previewRows: [],
      previewBaseline: [],
      serverValidated: false,
      importDone: false,
      error: null,
    }));
  }, []);

  const goToMappingFromPreview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: STEPS.MAPPING,
      previewRows: [],
      previewBaseline: [],
      serverValidated: false,
      importDone: false,
      error: null,
    }));
  }, []);

  const setPanIndex = useCallback((value) => {
    const panIndex = value === "" || value == null ? null : Number(value);
    setState((prev) => ({
      ...prev,
      panIndex: Number.isFinite(panIndex) ? panIndex : null,
      previewRows: [],
      serverValidated: false,
      importDone: false,
    }));
  }, []);

  const setNameIndex = useCallback((value) => {
    const nameIndex = value === "" || value == null ? null : Number(value);
    setState((prev) => ({
      ...prev,
      nameIndex: Number.isFinite(nameIndex) ? nameIndex : null,
      previewRows: [],
      serverValidated: false,
      importDone: false,
    }));
  }, []);

  const generatePreview = useCallback(() => {
    setState((prev) => {
      if (prev.panIndex == null || prev.nameIndex == null) {
        return {
          ...prev,
          error: "Please map both PAN and Firm Name columns",
        };
      }
      if (prev.panIndex === prev.nameIndex) {
        return {
          ...prev,
          error: "PAN and Firm Name must map to different columns",
        };
      }
      const raw = buildPreviewRows(prev.rows, prev.panIndex, prev.nameIndex);
      if (raw.length === 0) {
        return {
          ...prev,
          error: "No data rows found for the selected columns",
        };
      }
      const previewRows = runLocalValidation(raw);
      return {
        ...prev,
        previewRows,
        previewBaseline: previewRows.map((r) => ({ ...r })),
        step: STEPS.PREVIEW,
        serverValidated: false,
        importDone: false,
        error: null,
      };
    });
  }, []);

  const deleteRow = useCallback((id) => {
    setState((prev) => {
      const next = runLocalValidation(
        prev.previewRows.filter((r) => r.id !== id),
      );
      return {
        ...prev,
        previewRows: next,
        serverValidated: false,
        importDone: false,
      };
    });
  }, []);

  const resetPreviewRows = useCallback(() => {
    setState((prev) => {
      const restored = runLocalValidation(
        (prev.previewBaseline || []).map((r) => ({ ...r })),
      );
      return {
        ...prev,
        previewRows: restored,
        serverValidated: false,
        importDone: false,
        error: null,
      };
    });
  }, []);

  const runServerValidation = useCallback(async () => {
    if (!groupId) {
      toast.error("Missing group");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const pans = state.previewRows
        .filter((r) => r.localStatus === "valid")
        .map((r) => r.pan);

      if (pans.length === 0) {
        setState((prev) => ({
          ...prev,
          busy: false,
          error: "No locally valid PANs to validate",
        }));
        return;
      }

      const data = await validateBulkImportPans(groupId, pans, {
        signal: controller.signal,
      });

      setState((prev) => ({
        ...prev,
        busy: false,
        previewRows: applyServerValidation(prev.previewRows, data),
        serverValidated: true,
        importDone: false,
        error: null,
      }));
      toast.success("Server validation complete");
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        busy: false,
        error: err.message || "Server validation failed",
      }));
      toast.error(err.message || "Server validation failed");
    }
  }, [groupId, state.previewRows]);

  const runImport = useCallback(async () => {
    if (!groupId) {
      toast.error("Missing group");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const firms = state.previewRows
        .filter(isImportable)
        .map((r) => ({ pan: r.pan, name: r.name }));

      if (firms.length === 0) {
        setState((prev) => ({
          ...prev,
          busy: false,
          error: "No rows ready to import",
        }));
        return;
      }

      const result = await commitBulkImport(groupId, firms, {
        signal: controller.signal,
      });

      setState((prev) => ({
        ...prev,
        busy: false,
        previewRows: applyImportResults(prev.previewRows, result),
        importDone: true,
        step: STEPS.DONE,
        error: null,
      }));
      toast.success("Import finished");
      onImported?.();
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        busy: false,
        error: err.message || "Import failed",
      }));
      toast.error(err.message || "Import failed");
    }
  }, [groupId, state.previewRows, onImported]);

  const downloadReport = useCallback(async () => {
    try {
      await downloadGroupImportReport(state.previewRows);
      toast.success("Report downloaded");
    } catch (err) {
      toast.error(err.message || "Could not download report");
    }
  }, [state.previewRows]);

  const summary = useMemo(
    () => summarizeImport(state.previewRows),
    [state.previewRows],
  );

  const localSummary = useMemo(
    () => summarizeLocal(state.previewRows),
    [state.previewRows],
  );

  const canValidate =
    !state.busy &&
    state.previewRows.some((r) => r.localStatus === "valid") &&
    !state.importDone;

  const canImport =
    !state.busy &&
    state.serverValidated &&
    state.previewRows.some(isImportable) &&
    !state.importDone;

  const canDownloadReport =
    !state.busy && state.previewRows.length > 0;

  const hasDeletedRows =
    (state.previewBaseline?.length || 0) > (state.previewRows?.length || 0) &&
    !state.importDone;

  const mappingReady =
    state.panIndex != null &&
    state.nameIndex != null &&
    state.panIndex !== state.nameIndex;

  return {
    ...state,
    summary,
    localSummary,
    canValidate,
    canImport,
    canDownloadReport,
    hasDeletedRows,
    mappingReady,
    reset,
    setError,
    downloadSample,
    handleFile,
    goToMapping,
    goToUpload,
    goToMappingFromPreview,
    setPanIndex,
    setNameIndex,
    generatePreview,
    deleteRow,
    resetPreviewRows,
    runServerValidation,
    runImport,
    downloadReport,
    SERVER_STATUS,
  };
}
