/** SMS provider mode helpers for Fast2SMS vs OOMS System campaign UIs. */

export function getSmsModeFromPath(pathname = "") {
  const path = String(pathname || "");
  if (path.includes("/broadcast/sms/ooms-system")) return "ooms_system";
  return "fast2sms";
}

export function smsModeBasePath(mode) {
  return mode === "ooms_system"
    ? "/broadcast/sms/ooms-system"
    : "/broadcast/sms/fast2sms";
}

export function smsModeLabel(mode) {
  return mode === "ooms_system" ? "OOMS System" : "Fast2SMS";
}
