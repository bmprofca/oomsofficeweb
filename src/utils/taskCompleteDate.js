/** Resolve completion timestamp from common task payload shapes. */
export function getTaskCompleteDateValue(task) {
  return (
    task?.dates?.complete_date ||
    task?.complete_date ||
    task?.task_details?.complete_date ||
    task?.dates?.completed_at ||
    null
  );
}

export function isTaskCompleteStatus(status) {
  return String(status || "").toLowerCase() === "complete";
}
