/** Static catalog for header global search (right pane). Keep paths in sync with DocumentTitle / lazyRoutes. */

export const SOFTWARE_MODULES = [
  // Core
  { title: "Dashboard", path: "/", group: "Core", keywords: "home overview" },
  { title: "My Profile", path: "/my-profile", group: "Core", keywords: "account user" },
  { title: "Subscription", path: "/subscription", group: "Core", keywords: "plan billing" },
  { title: "Wallet Recharge", path: "/wallet-recharge", group: "Core", keywords: "wallet money" },

  // Tasks
  { title: "Tasks", path: "/task/view", group: "Tasks", keywords: "work job list view" },
  { title: "Overdue Tasks", path: "/task/detailed/od", group: "Tasks", keywords: "overdue" },
  { title: "Due Today", path: "/task/detailed/dt", group: "Tasks", keywords: "today" },
  { title: "Due in 7 Days", path: "/task/detailed/d7", group: "Tasks", keywords: "week" },
  { title: "Future Tasks", path: "/task/detailed/ft", group: "Tasks", keywords: "upcoming future" },
  { title: "Work in Progress", path: "/task/detailed/wip", group: "Tasks", keywords: "wip" },
  { title: "Pending for Client", path: "/task/detailed/pfc", group: "Tasks", keywords: "pending client" },
  { title: "Pending for Documents", path: "/task/detailed/pfd", group: "Tasks", keywords: "pending documents" },
  { title: "Completed Tasks", path: "/task/detailed/cpl", group: "Tasks", keywords: "done complete" },
  { title: "Cancelled Tasks", path: "/task/detailed/cnl", group: "Tasks", keywords: "cancel" },
  { title: "Compliance Yet Not Started", path: "/task/compliance/yet-not-started", group: "Tasks", keywords: "compliance" },
  { title: "Recurring Tasks", path: "/recurring-task/detailed", group: "Tasks", keywords: "recurring compliance" },

  // Clients
  { title: "Clients", path: "/client/view", group: "Clients", keywords: "customer party" },
  { title: "Create Client", path: "/client/create", group: "Clients", keywords: "new add" },
  { title: "Deleted Clients", path: "/staff/office-assistance/deleted-clients", group: "Clients", keywords: "trash restore" },
  { title: "Inactive Clients", path: "/staff/office-assistance/inactive-client", group: "Clients", keywords: "inactive" },
  { title: "Top Clients", path: "/clients/top", group: "Clients", keywords: "top" },

  // Billing & Finance
  { title: "Billing", path: "/billing", group: "Finance", keywords: "invoice pending bill" },
  {
    title: "Voucher Entries",
    path: "/finance/voucher",
    group: "Finance",
    keywords: "finance voucher entry accounts hub",
  },
  { title: "Banks", path: "/finance/voucher/bank-list", group: "Finance", keywords: "bank list" },
  { title: "Bank Transactions", path: "/finance/bank/transaction-history", group: "Finance", keywords: "statement history" },
  { title: "Capital Accounts", path: "/finance/voucher/capital-account", group: "Finance", keywords: "capital" },
  { title: "Sales", path: "/finance/voucher/sales", group: "Finance", keywords: "sale invoice register voucher" },
  { title: "Purchase", path: "/finance/voucher/purchase", group: "Finance", keywords: "buy purchase register voucher" },
  { title: "Received", path: "/finance/voucher/received", group: "Finance", keywords: "receipt payment received voucher" },
  { title: "Payments", path: "/finance/voucher/payment", group: "Finance", keywords: "pay payment voucher" },
  { title: "Contra", path: "/finance/voucher/contra", group: "Finance", keywords: "transfer contra voucher" },
  { title: "Journal", path: "/finance/voucher/journal", group: "Finance", keywords: "journal entry voucher" },
  { title: "Expenses", path: "/finance/voucher/expense", group: "Finance", keywords: "cost expense voucher" },
  { title: "Expense Items", path: "/finance/voucher/expense-items", group: "Finance", keywords: "expense items" },
  { title: "Ledger Groups", path: "/finance/voucher/ledger-group", group: "Finance", keywords: "ledger group" },
  { title: "Discount", path: "/finance/voucher/discount", group: "Finance", keywords: "discount voucher" },
  { title: "Service Sales", path: "/service-sales-details", group: "Finance", keywords: "service sales" },
  { title: "Staff Sales", path: "/staff-sales-details", group: "Finance", keywords: "staff sales" },
  { title: "Staff-wise Sales", path: "/sales/staff-wise", group: "Finance", keywords: "staff wise sales" },

  // Office Assistance
  { title: "Office Assistance", path: "/staff/office-assistance", group: "Assistance", keywords: "office hub" },
  { title: "DSC Register", path: "/staff/office-assistance/dsc-report", group: "Assistance", keywords: "dsc signature" },
  { title: "File Index", path: "/staff/office-assistance/file-index", group: "Assistance", keywords: "files documents" },
  { title: "Password Groups", path: "/staff/office-assistance/password-groups", group: "Assistance", keywords: "credentials login" },
  { title: "Important Links", path: "/staff/office-assistance/important-links", group: "Assistance", keywords: "urls" },
  { title: "Services", path: "/staff/office-assistance/services", group: "Assistance", keywords: "offerings" },
  { title: "Compliance", path: "/staff/office-assistance/compliance", group: "Assistance", keywords: "recurring" },
  { title: "Compliance Firm Assignment", path: "/staff/office-assistance/compliance/firm-assignment", group: "Assistance", keywords: "firm assignment" },
  { title: "Staff Recurring Tasks", path: "/staff/recurring-tasks", group: "Assistance", keywords: "recurring tasks" },
  { title: "Recurring Groups", path: "/staff/office-assistance/recurring-groups", group: "Assistance", keywords: "recurring groups" },
  { title: "Groups", path: "/staff/office-assistance/groups", group: "Assistance", keywords: "firm groups" },
  { title: "Group Firms", path: "/staff/office-assistance/group-firms", group: "Assistance", keywords: "group firms" },
  { title: "CA List", path: "/staff/office-assistance/ca-list", group: "Assistance", keywords: "chartered accountant" },
  { title: "Auto Reminder", path: "/staff/office-assistance/auto-reminder", group: "Assistance", keywords: "reminder" },
  { title: "Service Requests", path: "/staff/office-assistance/service-requests", group: "Assistance", keywords: "requests" },

  // Staff
  { title: "Staff", path: "/staff/view", group: "Staff", keywords: "team employee" },
  { title: "Attendance", path: "/staff/attendance", group: "Staff", keywords: "punch leave" },
  { title: "Team Report", path: "/staff/team-report", group: "Staff", keywords: "report" },
  { title: "Team Report Details", path: "/staff/team-report-details", group: "Staff", keywords: "report details" },
  { title: "Staff List", path: "/settings/staff-list", group: "Staff", keywords: "settings staff" },

  // Broadcast
  { title: "Broadcast", path: "/broadcast/whatsapp", group: "Broadcast", keywords: "message campaign" },
  { title: "Email Broadcast", path: "/broadcast/email", group: "Broadcast", keywords: "email" },
  { title: "Email Campaigns", path: "/broadcast/email/campaigns", group: "Broadcast", keywords: "email list" },
  { title: "Create Email Broadcast", path: "/broadcast/email/create", group: "Broadcast", keywords: "create email" },
  { title: "Email Templates", path: "/broadcast/email/templates", group: "Broadcast", keywords: "template" },
  { title: "Email Configs", path: "/broadcast/email/configs", group: "Broadcast", keywords: "smtp" },
  { title: "Email Reports", path: "/broadcast/email/reports", group: "Broadcast", keywords: "email report" },
  { title: "WhatsApp OOMS", path: "/broadcast/whatsapp/ooms", group: "Broadcast", keywords: "whatsapp" },
  { title: "System Templates", path: "/broadcast/whatsapp/system/template", group: "Broadcast", keywords: "system template" },
  { title: "OneChatting Configure", path: "/broadcast/whatsapp/onechatting/configure", group: "Broadcast", keywords: "onechatting" },
  { title: "OneChatting Templates", path: "/broadcast/whatsapp/onechatting/templates", group: "Broadcast", keywords: "onechatting template" },
  { title: "OneChatting Campaigns", path: "/broadcast/whatsapp/onechatting/campaigns", group: "Broadcast", keywords: "campaign" },
  { title: "Live Chat", path: "/broadcast/whatsapp/onechatting/live-chat", group: "Broadcast", keywords: "chat" },
  { title: "WhatsApp Web Session", path: "/broadcast/whatsapp/web/session", group: "Broadcast", keywords: "whatsapp web" },
  { title: "WhatsApp Web Templates", path: "/broadcast/whatsapp/web/templates", group: "Broadcast", keywords: "web template" },
  { title: "Fast2SMS Configure", path: "/broadcast/sms/fast2sms/configure", group: "Broadcast", keywords: "sms configure" },
  { title: "Fast2SMS Templates", path: "/broadcast/sms/fast2sms/templates", group: "Broadcast", keywords: "sms template" },
  { title: "Fast2SMS Campaigns", path: "/broadcast/sms/fast2sms/campaigns", group: "Broadcast", keywords: "sms" },
  { title: "Broadcast Report", path: "/broadcast/report", group: "Broadcast", keywords: "report" },

  // Settings
  { title: "Settings", path: "/settings", group: "Settings", keywords: "config" },
  { title: "Permissions", path: "/settings/permissions", group: "Settings", keywords: "roles access" },
  { title: "Invoice Settings", path: "/settings/invoice-setting", group: "Settings", keywords: "invoice" },
  { title: "Branch Settings", path: "/settings/branch-setting", group: "Settings", keywords: "gst logo" },
  { title: "Branches", path: "/settings/branch", group: "Settings", keywords: "offices" },
  { title: "Admins", path: "/settings/admin", group: "Settings", keywords: "admin" },
  { title: "Agents", path: "/settings/agent-list", group: "Settings", keywords: "agent" },
  { title: "Backup", path: "/settings/backup", group: "Settings", keywords: "export" },
  { title: "Date Range Settings", path: "/settings/daterange-setting", group: "Settings", keywords: "daterange" },
  { title: "Google Authentication", path: "/settings/google-auth", group: "Settings", keywords: "google oauth 2fa" },
  { title: "Gateway Settings", path: "/settings/gateway-setting", group: "Settings", keywords: "payment" },
  { title: "Website Settings", path: "/settings/website", group: "Settings", keywords: "site" },
  { title: "Widget Settings", path: "/settings/widget", group: "Settings", keywords: "widget" },

  // Reports / stats
  { title: "Quick Stats — Debtors", path: "/quick-stats/debtors", group: "Reports", keywords: "debtors balance stats" },
  { title: "Quick Stats — Creditors", path: "/quick-stats/creditors", group: "Reports", keywords: "creditors balance stats" },
];

/**
 * Match modules by title / group / keywords / path.
 * Supports multi-word queries (all tokens must match).
 * @param {string} query
 * @param {number|null} limit  null/0 = no limit
 */
export function filterSoftwareModules(query, limit = null) {
  const q = String(query || "").trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  let results;
  if (!tokens.length) {
    results = SOFTWARE_MODULES.map((mod) => ({ ...mod, score: 0 }));
  } else {
    const scored = SOFTWARE_MODULES.map((mod) => {
      const title = mod.title.toLowerCase();
      const hay = `${title} ${mod.group} ${mod.keywords} ${mod.path}`.toLowerCase();
      if (!tokens.every((token) => hay.includes(token))) return null;

      let score = 0;
      if (title === q) score += 5;
      else if (title.startsWith(q)) score += 4;
      else if (title.includes(q)) score += 3;
      else if (tokens.every((token) => title.includes(token))) score += 2;
      else score += 1;

      // Prefer earlier token hits in the title
      if (title.includes(tokens[0])) score += 0.5;

      return { ...mod, score };
    }).filter(Boolean);

    scored.sort(
      (a, b) => b.score - a.score || a.title.localeCompare(b.title),
    );
    results = scored;
  }

  if (limit && limit > 0) return results.slice(0, limit);
  return results;
}
