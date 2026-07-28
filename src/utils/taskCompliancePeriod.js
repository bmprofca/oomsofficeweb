/**
 * Format compliance period/year label for task list "Task" column (after fees).
 * Mirrors office-assistance/compliance.jsx getPeriodLabel behavior.
 */
export function isComplianceTask(task) {
  if (String(task?.task_type || "").toLowerCase() === "compliance") return true;
  if (task?.is_recurring === true || task?.is_recurring === 1 || task?.is_recurring === "1") {
    return true;
  }
  if (String(task?.task_details?.task_kind || "").toLowerCase() === "recurring") {
    return true;
  }
  return false;
}

export function getTaskCompliancePeriodLabel(task) {
  if (!isComplianceTask(task)) {
    return null;
  }

  const dates = task?.dates || {};
  const year =
    dates.compliance_year ??
    task?.compliance_year ??
    dates.financial_year ??
    task?.financial_year ??
    null;
  const yearLabel = year != null && String(year).trim() !== ""
    ? String(year).trim()
    : "";

  const candidates = [
    dates.compliance_period,
    dates.period,
    dates.compliance_period_label,
    dates.period_name,
    task?.compliance_period,
    task?.period,
    task?.period_name,
  ];

  let raw = null;
  for (const value of candidates) {
    if (value != null && String(value).trim() !== "") {
      raw = String(value).trim();
      break;
    }
  }

  if (raw) {
    if (yearLabel && !raw.includes(yearLabel)) {
      return `${raw} · ${yearLabel}`;
    }
    return raw;
  }

  const frequency = String(
    task?.service?.frequency || task?.frequency || "",
  ).toLowerCase();
  if (frequency === "yearly") {
    return yearLabel ? `Yearly · ${yearLabel}` : "Yearly";
  }

  return yearLabel || null;
}
