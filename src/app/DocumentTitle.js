import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

const APP_NAME = 'OOMS';

/** Exact path → title (most specific routes first among equals). */
const EXACT_TITLES = {
  '/': 'Dashboard',
  '/login': 'Login',
  '/register': 'Register',
  '/branch-setup': 'Branch Setup',
  '/my-profile': 'My Profile',
  '/task/view': 'Tasks',
  '/task/compliance/yet-not-started': 'Compliance Yet Not Started',
  '/task/detailed': 'Task Details',
  '/task/detailed/od': 'Overdue Tasks',
  '/task/detailed/dt': 'Due Today',
  '/task/detailed/d7': 'Due in 7 Days',
  '/task/detailed/ft': 'Future Tasks',
  '/task/detailed/wip': 'Work in Progress',
  '/task/detailed/pfc': 'Pending for Client',
  '/task/detailed/pfd': 'Pending for Documents',
  '/task/detailed/cpl': 'Completed Tasks',
  '/task/detailed/cnl': 'Cancelled Tasks',
  '/recurring-task/detailed': 'Recurring Tasks',
  '/client/create': 'Create Client',
  '/client/view': 'Clients',
  '/client/profile': 'Client Profile',
  '/billing': 'Billing',
  '/finance/voucher': 'Finance',
  '/finance/voucher/bank-list': 'Banks',
  '/finance/voucher/capital-account': 'Capital Accounts',
  '/finance/voucher/sales': 'Sales',
  '/finance/voucher/purchase': 'Purchase',
  '/finance/voucher/received': 'Received',
  '/finance/voucher/payment': 'Payments',
  '/finance/voucher/contra': 'Contra',
  '/finance/voucher/journal': 'Journal',
  '/finance/voucher/expense': 'Expenses',
  '/finance/voucher/expense-items': 'Expense Items',
  '/finance/voucher/ledger-group': 'Ledger Groups',
  '/finance/voucher/discount': 'Discount',
  '/finance/bank/transaction-history': 'Bank Transactions',
  '/staff/view': 'Staff',
  '/staff/attendance': 'Attendance',
  '/staff/team-report': 'Team Report',
  '/staff/team-report-details': 'Team Report Details',
  '/staff/office-assistance': 'Office Assistance',
  '/staff/office-assistance/dsc-report': 'DSC Register',
  '/staff/office-assistance/file-index': 'File Index',
  '/staff/office-assistance/password-groups': 'Password Groups',
  '/staff/office-assistance/important-links': 'Important Links',
  '/staff/office-assistance/services': 'Services',
  '/staff/office-assistance/compliance': 'Compliance',
  '/staff/office-assistance/compliance/firm-assignment': 'Compliance Firm Assignment',
  '/staff/recurring-tasks': 'Recurring Tasks',
  '/staff/office-assistance/recurring-groups': 'Recurring Groups',
  '/staff/office-assistance/groups': 'Groups',
  '/staff/office-assistance/group-firms': 'Group Firms',
  '/staff/office-assistance/inactive-client': 'Inactive Clients',
  '/staff/office-assistance/ca-list': 'CA List',
  '/staff/office-assistance/auto-reminder': 'Auto Reminder',
  '/staff/office-assistance/service-requests': 'Service Requests',
  '/broadcast': 'Broadcast',
  '/broadcast/email/reports': 'Email Reports',
  '/broadcast/text-message/ooms': 'Text Message',
  '/broadcast/whatsapp/system/template': 'System Templates',
  '/broadcast/whatsapp/ooms': 'WhatsApp OOMS',
  '/broadcast/whatsapp/onechatting/configure': 'OneChatting Configure',
  '/broadcast/whatsapp/onechatting/templates': 'OneChatting Templates',
  '/broadcast/whatsapp/onechatting/campaigns': 'Campaigns',
  '/broadcast/whatsapp/onechatting/campaigns/create': 'Create Campaign',
  '/broadcast/whatsapp/web/session': 'WhatsApp Web Session',
  '/broadcast/whatsapp/web/templates': 'WhatsApp Web Templates',
  '/broadcast/report': 'Broadcast Report',
  '/broadcast/email/configs': 'Email Configs',
  '/broadcast/email/templates': 'Email Templates',
  '/broadcast/email': 'Email Broadcast',
  '/broadcast/bulk-import': 'Bulk Import',
  '/broadcast/email/create': 'Create Email Broadcast',
  '/broadcast/sms/configs': 'SMS Configs',
  '/broadcast/sms/templates': 'SMS Templates',
  '/broadcast/sms': 'SMS Broadcast',
  '/broadcast/sms/create': 'Create SMS Broadcast',
  '/settings': 'Settings',
  '/settings/staff-list': 'Staff List',
  '/settings/permissions': 'Permissions',
  '/settings/invoice-setting': 'Invoice Settings',
  '/settings/branch-setting': 'Branch Settings',
  '/settings/backup': 'Backup',
  '/settings/daterange-setting': 'Date Range Settings',
  '/settings/google-auth': 'Google Authentication',
  '/settings/gateway-setting': 'Gateway Settings',
  '/settings/branch': 'Branches',
  '/settings/admin': 'Admins',
  '/settings/agent-list': 'Agents',
  '/settings/website': 'Website Settings',
  '/settings/widget': 'Widget Settings',
  '/subscription': 'Subscription',
  '/wallet-recharge': 'Wallet Recharge',
  '/service-sales-details': 'Service Sales',
  '/staff-sales-details': 'Staff Sales',
  '/sales/staff-wise': 'Staff-wise Sales',
  '/clients/top': 'Top Clients',
};

/** Pattern routes (react-router matchPath). More specific patterns first. */
const PATTERN_TITLES = [
  { path: '/invitation/:token', title: 'Invitation' },
  { path: '/task/profile/:task_id/:tab', title: 'Task Profile' },
  { path: '/task/:task_id', title: 'Task Profile' },
  { path: '/office-assistance/compliance/assignment/:assignment_id', title: 'Compliance Assignment' },
  { path: '/client/profile/:username/:tab', title: 'Client Profile' },
  { path: '/client/profile/:username', title: 'Client Profile' },
  { path: '/finance/capital/ledger/:capitalId', title: 'Capital Ledger' },
  { path: '/staff/view/profile/:username/:tab', title: 'Staff Profile' },
  { path: '/staff/view/profile/:username', title: 'Staff Profile' },
  { path: '/staff/office-assistance/password-group/:group_id/firms', title: 'Password Group Firms' },
  { path: '/staff/office-assistance/group-firms/:groupId', title: 'Group Firms' },
  { path: '/staff/office-assistance/ca-profile/:username/:tab', title: 'CA Profile' },
  { path: '/staff/office-assistance/ca-profile/:username', title: 'CA Profile' },
  { path: '/broadcast/:tab', title: 'Broadcast' },
  { path: '/broadcast/whatsapp/onechatting/live-chat/:number?', title: 'Live Chat' },
  { path: '/broadcast/whatsapp/onechatting/campaigns/:campaignId', title: 'Campaign Details' },
  { path: '/broadcast/email/details/:broadcast_id', title: 'Email Broadcast Details' },
  { path: '/broadcast/sms/details/:broadcast_id', title: 'SMS Broadcast Details' },
  { path: '/settings/agent-profile/:username/:tab', title: 'Agent Profile' },
  { path: '/settings/agent-profile/:username', title: 'Agent Profile' },
  { path: '/dashboard/clients/:metric', title: 'Client Stats' },
  { path: '/dashboard/tasks/:metric', title: 'Task Stats' },
  { path: '/quick-stats/:type', title: 'Quick Stats' },
];

function humanizeSegment(segment) {
  return String(segment || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolvePageTitle(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (EXACT_TITLES[path]) return EXACT_TITLES[path];

  for (const entry of PATTERN_TITLES) {
    if (matchPath({ path: entry.path, end: true }, path)) {
      return entry.title;
    }
  }

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';
  return humanizeSegment(parts[parts.length - 1]);
}

/**
 * Sets `document.title` from the current route: "Page Name | OOMS".
 * Must render inside BrowserRouter.
 */
export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = resolvePageTitle(pathname);
    document.title = page ? `${page} | ${APP_NAME}` : APP_NAME;
  }, [pathname]);

  return null;
}

export { APP_NAME, resolvePageTitle };
