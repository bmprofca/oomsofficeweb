/** Static catalog for header global search (right pane). Keep paths in sync with DocumentTitle / lazyRoutes. */

export const SOFTWARE_MODULES = [
  { title: "Dashboard", path: "/", group: "Core", keywords: "home overview" },
  { title: "My Profile", path: "/my-profile", group: "Core", keywords: "account user" },
  { title: "Subscription", path: "/subscription", group: "Core", keywords: "plan billing" },
  { title: "Wallet Recharge", path: "/wallet-recharge", group: "Core", keywords: "wallet money" },

  { title: "Tasks", path: "/task/view", group: "Tasks", keywords: "work job" },
  { title: "Overdue Tasks", path: "/task/detailed/od", group: "Tasks", keywords: "overdue" },
  { title: "Due Today", path: "/task/detailed/dt", group: "Tasks", keywords: "today" },
  { title: "Due in 7 Days", path: "/task/detailed/d7", group: "Tasks", keywords: "week" },
  { title: "Work in Progress", path: "/task/detailed/wip", group: "Tasks", keywords: "wip" },
  { title: "Completed Tasks", path: "/task/detailed/cpl", group: "Tasks", keywords: "done" },
  { title: "Cancelled Tasks", path: "/task/detailed/cnl", group: "Tasks", keywords: "cancel" },
  { title: "Compliance Yet Not Started", path: "/task/compliance/yet-not-started", group: "Tasks", keywords: "compliance" },

  { title: "Clients", path: "/client/view", group: "Clients", keywords: "customer party" },
  { title: "Create Client", path: "/client/create", group: "Clients", keywords: "new add" },
  { title: "Deleted Clients", path: "/staff/office-assistance/deleted-clients", group: "Clients", keywords: "trash restore" },
  { title: "Top Clients", path: "/clients/top", group: "Clients", keywords: "top" },

  { title: "Billing", path: "/billing", group: "Finance", keywords: "invoice pending" },
  { title: "Finance", path: "/finance/voucher/", group: "Finance", keywords: "voucher accounts" },
  { title: "Banks", path: "/finance/voucher/bank-list", group: "Finance", keywords: "bank" },
  { title: "Bank Transactions", path: "/finance/bank/transaction-history", group: "Finance", keywords: "statement" },
  { title: "Capital Accounts", path: "/finance/voucher/capital-account", group: "Finance", keywords: "capital" },
  { title: "Sales", path: "/finance/voucher/sales", group: "Finance", keywords: "sale invoice" },
  { title: "Purchase", path: "/finance/voucher/purchase", group: "Finance", keywords: "buy" },
  { title: "Received", path: "/finance/voucher/received", group: "Finance", keywords: "receipt" },
  { title: "Payments", path: "/finance/voucher/payment", group: "Finance", keywords: "pay" },
  { title: "Contra", path: "/finance/voucher/contra", group: "Finance", keywords: "transfer" },
  { title: "Journal", path: "/finance/voucher/journal", group: "Finance", keywords: "entry" },
  { title: "Expenses", path: "/finance/voucher/expense", group: "Finance", keywords: "cost" },
  { title: "Expense Items", path: "/finance/voucher/expense-items", group: "Finance", keywords: "items" },
  { title: "Ledger Groups", path: "/finance/voucher/ledger-group", group: "Finance", keywords: "ledger" },
  { title: "Discount", path: "/finance/voucher/discount", group: "Finance", keywords: "discount" },

  { title: "Office Assistance", path: "/staff/office-assistance", group: "Assistance", keywords: "office hub" },
  { title: "DSC Register", path: "/staff/office-assistance/dsc-report", group: "Assistance", keywords: "dsc signature" },
  { title: "File Index", path: "/staff/office-assistance/file-index", group: "Assistance", keywords: "files documents" },
  { title: "Password Groups", path: "/staff/office-assistance/password-groups", group: "Assistance", keywords: "credentials login" },
  { title: "Important Links", path: "/staff/office-assistance/important-links", group: "Assistance", keywords: "urls" },
  { title: "Services", path: "/staff/office-assistance/services", group: "Assistance", keywords: "offerings" },
  { title: "Compliance", path: "/staff/office-assistance/compliance", group: "Assistance", keywords: "recurring" },
  { title: "Groups", path: "/staff/office-assistance/groups", group: "Assistance", keywords: "firm groups" },
  { title: "CA List", path: "/staff/office-assistance/ca-list", group: "Assistance", keywords: "chartered accountant" },
  { title: "Auto Reminder", path: "/staff/office-assistance/auto-reminder", group: "Assistance", keywords: "reminder" },
  { title: "Service Requests", path: "/staff/office-assistance/service-requests", group: "Assistance", keywords: "requests" },

  { title: "Staff", path: "/staff/view", group: "Staff", keywords: "team employee" },
  { title: "Attendance", path: "/staff/attendance", group: "Staff", keywords: "punch leave" },
  { title: "Team Report", path: "/staff/team-report", group: "Staff", keywords: "report" },
  { title: "Staff List", path: "/settings/staff-list", group: "Staff", keywords: "settings staff" },

  { title: "Broadcast", path: "/broadcast/whatsapp", group: "Broadcast", keywords: "message campaign" },
  { title: "Email Broadcast", path: "/broadcast/email", group: "Broadcast", keywords: "email" },
  { title: "Email Campaigns", path: "/broadcast/email/campaigns", group: "Broadcast", keywords: "email list" },
  { title: "Email Templates", path: "/broadcast/email/templates", group: "Broadcast", keywords: "template" },
  { title: "Email Configs", path: "/broadcast/email/configs", group: "Broadcast", keywords: "smtp" },
  { title: "WhatsApp OOMS", path: "/broadcast/whatsapp/ooms", group: "Broadcast", keywords: "whatsapp" },
  { title: "OneChatting Configure", path: "/broadcast/whatsapp/onechatting/configure", group: "Broadcast", keywords: "onechatting" },
  { title: "Live Chat", path: "/broadcast/whatsapp/onechatting/live-chat", group: "Broadcast", keywords: "chat" },
  { title: "Fast2SMS Campaigns", path: "/broadcast/sms/fast2sms/campaigns", group: "Broadcast", keywords: "sms" },
  { title: "Broadcast Report", path: "/broadcast/report", group: "Broadcast", keywords: "report" },

  { title: "Settings", path: "/settings", group: "Settings", keywords: "config" },
  { title: "Permissions", path: "/settings/permissions", group: "Settings", keywords: "roles access" },
  { title: "Invoice Settings", path: "/settings/invoice-setting", group: "Settings", keywords: "invoice" },
  { title: "Branch Settings", path: "/settings/branch-setting", group: "Settings", keywords: "gst logo" },
  { title: "Branches", path: "/settings/branch", group: "Settings", keywords: "offices" },
  { title: "Admins", path: "/settings/admin", group: "Settings", keywords: "admin" },
  { title: "Agents", path: "/settings/agent-list", group: "Settings", keywords: "agent" },
  { title: "Backup", path: "/settings/backup", group: "Settings", keywords: "export" },
  { title: "Gateway Settings", path: "/settings/gateway-setting", group: "Settings", keywords: "payment" },
  { title: "Website Settings", path: "/settings/website", group: "Settings", keywords: "site" },
];

export function filterSoftwareModules(query, limit = 12) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return SOFTWARE_MODULES.slice(0, limit);
  const scored = SOFTWARE_MODULES.map((mod) => {
    const hay = `${mod.title} ${mod.group} ${mod.keywords} ${mod.path}`.toLowerCase();
    let score = 0;
    if (mod.title.toLowerCase().startsWith(q)) score += 3;
    else if (mod.title.toLowerCase().includes(q)) score += 2;
    else if (hay.includes(q)) score += 1;
    else return null;
    return { ...mod, score };
  }).filter(Boolean);
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}
