import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  forwardRef,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  FiPlus,
  FiTrash2,
  FiSend,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiLink,
  FiTag,
  FiMessageSquare,
  FiHash,
  FiUploadCloud,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import getHeaders from "../utils/get-headers";
import { uploadOneSaasFile } from "../utils/onesaas-upload";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const createRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  url: "",
  name: "",
  remark: "",
  fileName: "",
  uploading: false,
  uploadProgress: 0,
  uploadError: "",
  dragActive: false,
  /** Per card: file upload vs manual URL */
  entryTab: "upload",
});

const guessTitleFromFileName = (fileName) => {
  if (!fileName) return "";
  const base = fileName.replace(/\.[^/.]+$/, "");
  return base.replace(/[-_]+/g, " ").trim() || fileName;
};

/**
 * Uploads a single file to OneSaaS public storage (same contract as client DocumentsTab).
 */
export const uploadTaskFileToServer = async (_baseUrl, file, onProgress) => {
  const { url, meta } = await uploadOneSaasFile(file, onProgress);
  return {
    success: true,
    url,
    filename: meta?.storedName || meta?.originalName || file.name,
    message: "File uploaded successfully",
  };
};

/**
 * Headers for task document API: prefers shared getHeaders() (token, username, branch)
 * like dashboard and other pages; falls back with branch_id when getHeaders() is null.
 */
export const getTaskDocumentAuthHeaders = () => {
  const std = getHeaders();
  if (std) {
    return {
      headers: { ...std },
      hasToken: !!std.token,
    };
  }

  const token =
    localStorage.getItem("admin_token") ||
    localStorage.getItem("user_token") ||
    localStorage.getItem("token") ||
    "";

  let username =
    localStorage.getItem("username") ||
    localStorage.getItem("user_username") ||
    "";

  if (!username) {
    const profileKeys = ["admin_profile", "admin", "user", "userData"];
    for (const key of profileKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        username =
          parsed?.username || parsed?.userName || parsed?.user_username || "";
        if (username) break;
      } catch {
        /* ignore */
      }
    }
  }

  const branchId = localStorage.getItem("branch_id") || "";

  const headers = {
    "Content-Type": "application/json",
    token,
  };
  if (username) {
    headers.username = username;
  }
  if (branchId) {
    headers.branch = branchId;
  }
  return { headers, hasToken: !!token };
};

/**
 * Builds the API request body with trimmed values.
 * Omits optional name/remark keys when empty after trim.
 */
export const prepareTaskDocumentCreatePayload = (taskIdValue, documentRows) => {
  const task_id = String(taskIdValue || "").trim();
  const documents = (documentRows || []).map((row) => {
    const url = String(row.url || "").trim();
    const name = String(row.name || "").trim();
    const remark = String(row.remark || "").trim();
    const doc = { url };
    if (name) doc.name = name;
    if (remark) doc.remark = remark;
    return doc;
  });
  return { task_id, documents };
};

const resolveApiErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

const mapUploadHttpError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    if (status === 400) {
      return `Bad request: ${data?.message || "Invalid file"}`;
    }
    if (status === 401) {
      return "Unauthorized. Please login again.";
    }
    if (status === 413) {
      return "File too large. Maximum size is 10MB.";
    }
    if (status === 415) {
      return "Unsupported file type.";
    }
    if (status >= 500) {
      return "Server error. Please try again later.";
    }
    return data?.message || `Upload failed with status ${status}`;
  }
  if (error.request) {
    return "No response from server. Check your internet connection.";
  }
  return error.message || "Upload failed";
};

/** Clears common session keys and sends the user to login (session expired). */
const clearSessionAndGoToLogin = (navigate) => {
  const keys = [
    "user_token",
    "user_username",
    "user_email",
    "branch_id",
    "branch_name",
    "branch_owned",
    "user_branches",
    "token_expire",
    "token",
    "admin_token",
    "username",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
  if (navigate) {
    navigate("/login", { replace: true });
  } else {
    window.location.href = "/login";
  }
};

/**
 * @param {object} props
 * @param {string} props.baseUrl API base (e.g. from api-controller)
 * @param {string} [props.taskId] optional default task id
 * @param {(data: object) => void} [props.onSuccess]
 * @param {boolean} [props.embedded] lighter chrome when nested inside a parent modal shell
 * @param {string} [props.formId] when set, form receives this id (for external footer submit)
 * @param {boolean} [props.hideTaskId] hide task id field (still used from initialTaskId for API)
 * @param {(busy: boolean) => void} [props.onBusyChange] true while submitting or any row uploading
 */
const TaskDocumentCreate = forwardRef(function TaskDocumentCreate(
  {
    baseUrl,
    taskId: initialTaskId = "",
    onSuccess,
    embedded = false,
    formId,
    hideTaskId = false,
    onBusyChange,
  },
  ref,
) {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useState(initialTaskId || "");
  const [rows, setRows] = useState(() => [createRow()]);
  const [fieldErrors, setFieldErrors] = useState({
    taskId: "",
    documents: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (initialTaskId !== undefined && initialTaskId !== null) {
      setTaskId(String(initialTaskId));
    }
  }, [initialTaskId]);

  const endpointUrl = useMemo(() => {
    const root = String(baseUrl || "").replace(/\/+$/, "");
    return `${root}/task/details/document/create`;
  }, [baseUrl]);

  const resetForm = useCallback(() => {
    setTaskId(String(initialTaskId || ""));
    setRows([createRow()]);
    setFieldErrors({ taskId: "", documents: [] });
  }, [initialTaskId]);

  const anyRowUploading = rows.some((r) => r.uploading);
  const busy = submitting || anyRowUploading;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(
    () => () => {
      onBusyChange?.(false);
    },
    [onBusyChange],
  );

  const handleFileForRow = useCallback(
    async (rowId, file) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  uploadError: "File exceeds the 10MB limit.",
                  uploading: false,
                  uploadProgress: 0,
                }
              : r,
          ),
        );
        return;
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                uploading: true,
                uploadError: "",
                uploadProgress: 0,
                fileName: file.name,
                dragActive: false,
              }
            : r,
        ),
      );

      try {
        const result = await uploadTaskFileToServer(baseUrl, file, (pct) => {
          setRows((prev) =>
            prev.map((r) =>
              r.id === rowId ? { ...r, uploadProgress: pct } : r,
            ),
          );
        });

        if (!result.success || !result.url) {
          throw new Error("Upload did not return a file URL");
        }

        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== rowId) return r;
            const nextName = r.name?.trim()
              ? r.name
              : guessTitleFromFileName(file.name);
            return {
              ...r,
              url: result.url,
              name: nextName,
              uploading: false,
              uploadProgress: 100,
              uploadError: "",
            };
          }),
        );
        setFieldErrors((fe) => ({ ...fe, documents: [] }));
      } catch (error) {
        if (error?.response?.status === 401) {
          clearSessionAndGoToLogin(navigate);
          return;
        }
        const msg = mapUploadHttpError(error);
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  uploading: false,
                  uploadProgress: 0,
                  uploadError: msg,
                }
              : r,
          ),
        );
      }
    },
    [baseUrl, navigate],
  );

  const validate = useCallback(() => {
    const nextDocErrors = rows.map(() => ({}));
    let taskErr = "";
    if (!taskId.trim()) {
      taskErr = "Task ID is required";
    }
    if (!rows.length) {
      return {
        ok: false,
        taskId: taskErr,
        documents: [{ url: "Add at least one document" }],
      };
    }
    rows.forEach((row, i) => {
      const u = String(row.url || "").trim();
      if (row.uploading) {
        nextDocErrors[i].url = "Wait for upload to finish";
      } else if (!u) {
        nextDocErrors[i].url =
          row.entryTab === "link" ? "URL is required" : "File is required";
      } else {
        try {
          const parsed = new URL(u);
          if (!/^https?:$/i.test(parsed.protocol)) {
            nextDocErrors[i].url = "URL must use http:// or https://";
          }
        } catch {
          nextDocErrors[i].url =
            "Enter a valid URL (including http:// or https://)";
        }
      }
    });
    const anyUrlMissing = nextDocErrors.some((e) => e.url);
    if (taskErr || anyUrlMissing) {
      return { ok: false, taskId: taskErr, documents: nextDocErrors };
    }
    return { ok: true, taskId: "", documents: [] };
  }, [rows, taskId]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = useCallback(() => {
    setRows((prev) => [createRow(), ...prev]);
    setStatus({ type: "", message: "" });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      addSlot: addRow,
    }),
    [addRow],
  );

  const removeRow = (id) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return [createRow()];
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || anyRowUploading) return;

    const v = validate();
    if (!v.ok) {
      setFieldErrors({
        taskId: v.taskId || "",
        documents: v.documents || [],
      });
      const hasDocErr = (v.documents || []).some(
        (d) => d && Object.keys(d).length > 0,
      );
      const msg =
        hideTaskId && v.taskId && !hasDocErr
          ? v.taskId
          : "Please fix the highlighted fields.";
      setStatus({ type: "error", message: msg });
      return;
    }
    setFieldErrors({ taskId: "", documents: [] });
    setStatus({ type: "", message: "" });

    const { headers, hasToken } = getTaskDocumentAuthHeaders();
    if (!hasToken) {
      setStatus({
        type: "error",
        message: "You are not logged in. Please sign in again.",
      });
      return;
    }

    const payload = prepareTaskDocumentCreatePayload(taskId, rows);
    if (!payload.task_id || !payload.documents.length) {
      setStatus({ type: "error", message: "Invalid form data." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(endpointUrl, payload, { headers });
      if (response.data?.success) {
        setStatus({
          type: "success",
          message:
            response.data.message || "Task documents created successfully",
        });
        if (typeof onSuccess === "function") {
          onSuccess(response.data);
        }
        resetForm();
      } else {
        setStatus({
          type: "error",
          message:
            response.data?.message || "Request did not complete successfully",
        });
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        setStatus({
          type: "error",
          message: "Session expired. Redirecting to login…",
        });
        clearSessionAndGoToLogin(navigate);
        return;
      }
      setStatus({
        type: "error",
        message: resolveApiErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const shellClass = embedded
    ? "w-full"
    : "w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden";

  const headerBlock = !embedded && (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Register task documents
      </h2>
      <motion.button
        type="button"
        onClick={addRow}
        disabled={submitting || anyRowUploading}
        whileHover={{ scale: submitting || anyRowUploading ? 1 : 1.05 }}
        whileTap={{ scale: submitting || anyRowUploading ? 1 : 0.95 }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-800 shadow-sm hover:from-teal-100 hover:to-cyan-100 disabled:opacity-50"
        aria-label="Add document slot"
      >
        <FiPlus className="h-5 w-5" />
      </motion.button>
    </div>
  );

  const showInlineSubmit = !(embedded && formId);
  const cardVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 380, damping: 28 },
    },
  };

  return (
    <div className={embedded ? "w-full" : "w-full max-w-4xl mx-auto"}>
      <div className={shellClass}>
        {headerBlock}

        <form
          id={formId || undefined}
          onSubmit={handleSubmit}
          className={`space-y-6 ${embedded ? "p-0" : "p-4 sm:p-6"}`}
        >
          <AnimatePresence mode="wait">
            {status.message && (
              <motion.div
                key={status.message + status.type}
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className={`relative flex items-start gap-2 rounded-xl border px-3 py-3 pr-10 text-sm shadow-sm ${
                  status.type === "success"
                    ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900"
                    : "border-rose-200/80 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-900"
                }`}
              >
                {status.type === "success" ? (
                  <FiCheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span className="min-w-0 flex-1 pt-0.5">{status.message}</span>
                <button
                  type="button"
                  onClick={() => setStatus({ type: "", message: "" })}
                  className={`absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:bg-white/80 ${
                    status.type === "success"
                      ? "border-emerald-200/60 text-emerald-800"
                      : "border-rose-200/60 text-rose-800"
                  }`}
                  aria-label="Dismiss message"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!hideTaskId && (
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <FiHash className="w-4 h-4 text-cyan-500" />
                Task ID
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 ${
                  fieldErrors.taskId
                    ? "border-red-300 bg-red-50/50"
                    : "border-slate-200 bg-white"
                }`}
                disabled={submitting || anyRowUploading}
                autoComplete="off"
              />
              {fieldErrors.taskId && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.taskId}
                </p>
              )}
            </motion.div>
          )}

          <div className="space-y-4">
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                <div className="contents">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {rows.map((row, index) => {
                      const inputId = `task-doc-file-${row.id}`;
                      const hasUrl = !!String(row.url || "").trim();
                      return (
                        <motion.div
                          key={row.id}
                          layout
                          variants={cardVariants}
                          initial="hidden"
                          animate="show"
                          exit={{
                            opacity: 0,
                            scale: 0.94,
                            y: -6,
                            transition: {
                              duration: 0.22,
                              ease: [0.4, 0, 1, 1],
                            },
                          }}
                          whileHover={{
                            y: -3,
                            transition: { duration: 0.2 },
                          }}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-100 transition-shadow hover:shadow-lg hover:shadow-teal-100/60 hover:ring-teal-100"
                        >
                          <div
                            className={`flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50/40 px-3 py-2.5 ${
                              rows.length > 1 ? "justify-between" : ""
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-[10px] font-extrabold text-white shadow-sm">
                                {index + 1}
                              </span>
                              Slot
                            </span>
                            {rows.length > 1 && (
                              <motion.button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                disabled={submitting || row.uploading}
                                whileTap={{ scale: 0.92 }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                aria-label={`Remove document ${index + 1}`}
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                                Remove
                              </motion.button>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col space-y-3 p-3 sm:p-4">
                            <div
                              className="flex gap-1 rounded-xl bg-slate-100/95 p-1 ring-1 ring-slate-200/70"
                              role="tablist"
                              aria-label={`Document ${index + 1} source`}
                            >
                              <motion.button
                                type="button"
                                role="tab"
                                aria-selected={row.entryTab === "upload"}
                                onClick={() =>
                                  updateRow(row.id, { entryTab: "upload" })
                                }
                                disabled={submitting}
                                whileTap={{ scale: 0.98 }}
                                className={`relative flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition sm:text-sm ${
                                  row.entryTab === "upload"
                                    ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80"
                                    : "text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                }`}
                              >
                                <span className="inline-flex items-center justify-center gap-1">
                                  <FiUploadCloud className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" />
                                  Upload
                                </span>
                              </motion.button>
                              <motion.button
                                type="button"
                                role="tab"
                                aria-selected={row.entryTab === "link"}
                                onClick={() =>
                                  updateRow(row.id, { entryTab: "link" })
                                }
                                disabled={submitting || row.uploading}
                                whileTap={{ scale: 0.98 }}
                                className={`relative flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition sm:text-sm ${
                                  row.entryTab === "link"
                                    ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80"
                                    : "text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                }`}
                              >
                                <span className="inline-flex items-center justify-center gap-1">
                                  <FiLink className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" />
                                  Link
                                </span>
                              </motion.button>
                            </div>

                            {row.entryTab === "upload" ? (
                              <div>
                                <input
                                  id={inputId}
                                  type="file"
                                  className="sr-only"
                                  disabled={submitting || row.uploading}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFileForRow(row.id, f);
                                    e.target.value = "";
                                  }}
                                />

                                <div
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      document.getElementById(inputId)?.click();
                                    }
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateRow(row.id, { dragActive: true });
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateRow(row.id, { dragActive: false });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateRow(row.id, { dragActive: false });
                                    const f = e.dataTransfer.files?.[0];
                                    if (f) handleFileForRow(row.id, f);
                                  }}
                                  className={`relative flex min-h-[128px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-4 text-center transition ${
                                    row.dragActive
                                      ? "scale-[1.02] border-teal-500 bg-gradient-to-b from-teal-50 to-cyan-50 shadow-inner"
                                      : hasUrl && !row.uploadError
                                        ? "border-emerald-400/80 bg-gradient-to-b from-emerald-50/90 to-teal-50/50"
                                        : fieldErrors.documents?.[index]?.url
                                          ? "border-rose-300 bg-rose-50/40"
                                          : "border-slate-300/90 bg-slate-50/30 hover:border-teal-400 hover:bg-gradient-to-b hover:from-teal-50/50 hover:to-cyan-50/30"
                                  } ${row.uploading ? "pointer-events-none opacity-90" : ""}`}
                                  onClick={() =>
                                    !row.uploading &&
                                    document.getElementById(inputId)?.click()
                                  }
                                >
                                  {row.uploading ? (
                                    <>
                                      <FiLoader className="mb-2 h-8 w-8 animate-spin text-teal-600" />
                                      <p className="text-sm font-medium text-slate-700">
                                        Uploading {row.fileName || "…"}
                                      </p>
                                      <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-150"
                                          style={{
                                            width: `${row.uploadProgress}%`,
                                          }}
                                        />
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {row.uploadProgress}%
                                      </p>
                                    </>
                                  ) : hasUrl && !row.uploadError ? (
                                    <>
                                      <FiCheckCircle className="mb-2 h-8 w-8 text-emerald-600" />
                                      <p className="text-sm font-medium text-slate-800">
                                        {row.fileName || "File uploaded"}
                                      </p>
                                      <button
                                        type="button"
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateRow(row.id, {
                                            url: "",
                                            fileName: "",
                                            uploadProgress: 0,
                                            uploadError: "",
                                          });
                                          document
                                            .getElementById(inputId)
                                            ?.click();
                                        }}
                                      >
                                        <FiRefreshCw className="h-3.5 w-3.5" />
                                        Replace file
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <FiUploadCloud className="mb-2 h-9 w-9 text-teal-500/90" />
                                      <p className="text-sm font-semibold text-slate-800">
                                        Drop or click
                                      </p>
                                    </>
                                  )}
                                </div>

                                {row.uploadError && (
                                  <p className="mt-2 text-xs text-red-600">
                                    {row.uploadError}
                                  </p>
                                )}
                                {fieldErrors.documents?.[index]?.url && (
                                  <p className="mt-2 text-xs text-red-600">
                                    {fieldErrors.documents[index].url}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  <FiLink className="h-3.5 w-3.5 text-indigo-600" />
                                  URL
                                </label>
                                <input
                                  type="url"
                                  inputMode="url"
                                  value={row.url}
                                  onChange={(e) =>
                                    updateRow(row.id, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="Enter URL"
                                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 ${
                                    fieldErrors.documents?.[index]?.url
                                      ? "border-red-300 bg-red-50/50"
                                      : "border-slate-200 bg-white"
                                  }`}
                                  disabled={submitting}
                                />
                                {fieldErrors.documents?.[index]?.url && (
                                  <p className="mt-1 text-xs text-red-600">
                                    {fieldErrors.documents[index].url}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-2.5">
                              <div>
                                <label className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  <FiTag className="h-3.5 w-3.5 text-teal-600" />
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) =>
                                    updateRow(row.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Enter name (optional)"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                                  disabled={
                                    submitting ||
                                    (row.entryTab === "upload" && row.uploading)
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  <FiMessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                                  Remark
                                </label>
                                <input
                                  type="text"
                                  value={row.remark}
                                  onChange={(e) =>
                                    updateRow(row.id, {
                                      remark: e.target.value,
                                    })
                                  }
                                  placeholder="Enter remark (optional)"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                                  disabled={
                                    submitting ||
                                    (row.entryTab === "upload" && row.uploading)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            </LayoutGroup>
          </div>

          {showInlineSubmit && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <motion.button
                type="submit"
                disabled={submitting || anyRowUploading}
                whileHover={{ scale: submitting || anyRowUploading ? 1 : 1.02 }}
                whileTap={{ scale: submitting || anyRowUploading ? 1 : 0.98 }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <FiSend className="h-4 w-4" />
                    Submit documents
                  </>
                )}
              </motion.button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
});

TaskDocumentCreate.displayName = "TaskDocumentCreate";

export default TaskDocumentCreate;
