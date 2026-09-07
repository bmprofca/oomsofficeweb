export const STATIC_TYPE_LIST = [
  "Payment Reminder",
  "Task Create",
  "Payment",
  "Payment Receive",
  "Task Complete",
  "Document Share",
  "Birthday Wish",
];

const CANONICAL_BY_COMPACT = {
  "payment reminder": "Payment Reminder",
  "task create": "Task Create",
  payment: "Payment",
  "payment receive": "Payment Receive",
  "payment receipt": "Payment Receive",
  receive: "Payment Receive",
  received: "Payment Receive",
  "task complete": "Task Complete",
  "document share": "Document Share",
  "document sharing": "Document Share",
  "birthday wish": "Birthday Wish",
  birthday: "Birthday Wish",
  "birthday reminder": "Birthday Wish",
};

export const CAMPAIGN_TYPE_META = {
  general: { label: "General", icon: "mail" },
  welcome: { label: "Welcome", icon: "smile" },
  birthday: { label: "Birthday", icon: "gift" },
  sale: { label: "Sale", icon: "chart" },
  invoice: { label: "Invoice", icon: "invoice" },
  reminder: { label: "Reminder", icon: "bell" },
  newsletter: { label: "Newsletter", icon: "mail" },
};

export const STATIC_TYPE_META = {
  "Payment Reminder": { icon: "bell" },
  "Task Create": { icon: "plus" },
  Payment: { icon: "card" },
  "Payment Receive": { icon: "receive" },
  "Task Complete": { icon: "check" },
  "Document Share": { icon: "file" },
  "Birthday Wish": { icon: "gift" },
};

/** Title Case labels for static email types (no underscores). */
export function formatEmailTemplateType(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  const compact = String(raw).trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (CANONICAL_BY_COMPACT[compact]) return CANONICAL_BY_COMPACT[compact];
  return String(raw)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
