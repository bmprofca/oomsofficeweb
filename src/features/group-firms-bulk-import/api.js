import axios from "axios";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const base = () => API_BASE_URL.replace(/\/$/, "");

function friendlyApiError(error, fallback) {
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }
  if (!error?.response) {
    return "Network error. Please check your connection and try again.";
  }
  const msg = error.response?.data?.message;
  if (msg) return msg;
  if (error.response?.status >= 500) {
    return "Server error. Please try again later.";
  }
  return fallback;
}

/**
 * Validate PANs against group membership / firm master.
 * POST /groups/{groupId}/bulk-import/validate
 */
export async function validateBulkImportPans(groupId, pans, { signal } = {}) {
  try {
    const res = await axios.post(
      `${base()}/groups/${encodeURIComponent(groupId)}/bulk-import/validate`,
      { pans },
      { headers: getHeaders(), signal, timeout: 60000 },
    );
    if (!res.data?.success) {
      throw new Error(res.data?.message || "Server validation failed");
    }
    return Array.isArray(res.data.data) ? res.data.data : [];
  } catch (error) {
    if (
      axios.isCancel?.(error) ||
      error?.name === "CanceledError" ||
      error?.name === "AbortError"
    ) {
      throw error;
    }
    throw new Error(friendlyApiError(error, "Server validation failed"));
  }
}

/**
 * Import firms into group.
 * POST /groups/{groupId}/bulk-import
 */
export async function commitBulkImport(groupId, firms, { signal } = {}) {
  try {
    const res = await axios.post(
      `${base()}/groups/${encodeURIComponent(groupId)}/bulk-import`,
      { firms },
      { headers: getHeaders(), signal, timeout: 120000 },
    );
    if (!res.data?.success) {
      throw new Error(res.data?.message || "Import failed");
    }
    return Array.isArray(res.data.result) ? res.data.result : [];
  } catch (error) {
    if (
      axios.isCancel?.(error) ||
      error?.name === "CanceledError" ||
      error?.name === "AbortError"
    ) {
      throw error;
    }
    throw new Error(friendlyApiError(error, "Import failed"));
  }
}
