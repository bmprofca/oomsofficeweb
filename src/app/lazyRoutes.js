import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'ooms_chunk_reload';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return (
    error?.name === 'ChunkLoadError' ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module')
  );
}

/** Retry once, then hard-reload once if webpack leftover chunks 404 after a rebuild. */
function lazyWithRetry(importer) {
  return lazy(() =>
    importer()
      .then((mod) => {
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch (_) { }
        return mod;
      })
      .catch((error) => {
        if (!isChunkLoadError(error) || typeof window === 'undefined') {
          throw error;
        }
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
        } catch (_) { }
        if (!alreadyReloaded) {
          try {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          } catch (_) { }
          window.location.reload();
          return new Promise(() => { });
        }
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch (_) { }
        throw error;
      }),
  );
}

/** Route-level code splitting — pages load on demand instead of at app startup. */
export const Login = lazyWithRetry(() => import('../pages/login'));
export const PageNotFound = lazyWithRetry(() => import('../pages/error/page-not-found'));
export const Dashboard = lazyWithRetry(() => import('../pages/dashboard'));
export const Register = lazyWithRetry(() => import('../pages/register'));
export const BranchSetup = lazyWithRetry(() => import('../pages/branch-setup'));
export const InvitationRequest = lazyWithRetry(() => import('../pages/public/InvitationRequest'));
export const TaskDisplay = lazyWithRetry(() => import('../pages/task-display'));
export const CreateClient = lazyWithRetry(() => import('../pages/client-create'));
export const ViewClients = lazyWithRetry(() => import('../pages/client-view'));
export const ClientProfile = lazyWithRetry(() => import('../pages/client-profile'));
export const TaskProfile = lazyWithRetry(() => import('../pages/task-profile'));
export const BillDisplay = lazyWithRetry(() => import('../pages/billing-view'));
export const FinanceEntry = lazyWithRetry(() => import('../pages/finance-voucher-entry'));
export const BankList = lazyWithRetry(() => import('../pages/bank-account'));
export const CapitalAccounts = lazyWithRetry(() => import('../pages/capital-accuont'));
export const CapitalLedger = lazyWithRetry(() => import('../finance/capital/capital-ledger'));
export const ViewSales = lazyWithRetry(() => import('../pages/sale-display'));
export const ViewPurchase = lazyWithRetry(() => import('../pages/purchase-display'));
export const ViewReceived = lazyWithRetry(() => import('../pages/received-display'));
export const ViewPayments = lazyWithRetry(() => import('../pages/payment-display'));
export const ViewContra = lazyWithRetry(() => import('../pages/contra-display'));
export const ViewJournal = lazyWithRetry(() => import('../pages/journal-display'));
export const ViewExpenses = lazyWithRetry(() => import('../pages/expense-display'));
export const ExpenseItemsPage = lazyWithRetry(() => import('../pages/expense-items'));
export const ViewStaff = lazyWithRetry(() => import('../pages/staff-display'));
export const ViewStaffProfile = lazyWithRetry(() => import('../pages/staff-profile'));
export const StaffAttendance = lazyWithRetry(() => import('../pages/staff-attendance'));
export const StaffReport = lazyWithRetry(() => import('../pages/staff-report'));
export const OfficeAssistance = lazyWithRetry(() => import('../pages/office-assistance'));
export const ViewDSCRegister = lazyWithRetry(() => import('../pages/office-assistance/dsc-report'));
export const ViewFileIndex = lazyWithRetry(() => import('../pages/office-assistance/file-index'));
export const PasswordGroups = lazyWithRetry(() => import('../pages/office-assistance/password-group'));
export const ImportantLinks = lazyWithRetry(() => import('../pages/office-assistance/important-link'));
export const Services = lazyWithRetry(() => import('../pages/office-assistance/services'));
export const ComplianceServices = lazyWithRetry(() => import('../pages/office-assistance/compliance'));
export const ComplianceFirmAssignment = lazyWithRetry(() => import('../pages/office-assistance/compliance-firm-assignment'));
export const ComplianceAssignmentDetails = lazyWithRetry(() => import('../pages/office-assistance/ComplianceAssignmentDetails'));
export const RecurringGroups = lazyWithRetry(() => import('../pages/office-assistance/recurring-group'));
export const Groups = lazyWithRetry(() => import('../pages/office-assistance/groups'));
export const GroupFirms = lazyWithRetry(() => import('../pages/office-assistance/group-firms'));
export const ViewDeletedClients = lazyWithRetry(() => import('../pages/office-assistance/deleted-clients'));
export const CAList = lazyWithRetry(() => import('../pages/office-assistance/ca-list'));
export const CAProfile = lazyWithRetry(() => import('../pages/office-assistance/ca-profile'));
export const AutoReminder = lazyWithRetry(() => import('../pages/office-assistance/auto-reminder'));
export const ServiceRequestList = lazyWithRetry(() => import('../pages/office-assistance/service-request-list'));
export const Broadcast = lazyWithRetry(() => import('../pages/broadcast'));
export const EmailBroadcastReport = lazyWithRetry(() => import('../pages/broadcast/email/EmailBordcastReport'));
export const BroadcastReport = lazyWithRetry(() => import('../pages/broadcast/report'));
export const WhatsAppOoms = lazyWithRetry(() => import('../pages/broadcast/whatsapp/ooms'));
export const OneChattingConfigure = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingConfigure'));
export const OneChattingLiveChat = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingLiveChat'));
export const OneChattingTemplates = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingTemplates'));
export const OneChattingCampaigns = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingCampaigns'));
export const OneChattingCampaignCreate = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingCampaignCreate'));
export const OneChattingCampaignDetails = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OneChattingCampaignDetails'));
export const WhatsAppWebSession = lazyWithRetry(() => import('../pages/broadcast/whatsapp/WhatsAppWebSession'));
export const WhatsAppWebTemplates = lazyWithRetry(() => import('../pages/broadcast/whatsapp/WhatsAppWebTemplates'));
export const OomsSystemTemplates = lazyWithRetry(() => import('../pages/broadcast/whatsapp/OomsSystemTemplates'));
export const Fast2SmsConfigure = lazyWithRetry(() => import('../pages/broadcast/sms/Fast2SmsConfigure'));
export const Fast2SmsTemplates = lazyWithRetry(() => import('../pages/broadcast/sms/Fast2SmsTemplates'));
export const Fast2SmsCampaigns = lazyWithRetry(() => import('../pages/broadcast/sms/Fast2SmsCampaigns'));
export const Fast2SmsCampaignCreate = lazyWithRetry(() => import('../pages/broadcast/sms/Fast2SmsCampaignCreate'));
export const Fast2SmsCampaignDetails = lazyWithRetry(() => import('../pages/broadcast/sms/Fast2SmsCampaignDetails'));
export const EmailConfigList = lazyWithRetry(() => import('../pages/broadcast/email/EmailConfigList'));
export const EmailTemplateList = lazyWithRetry(() => import('../pages/broadcast/email/EmailTemplateList'));
export const EmailBroadcastList = lazyWithRetry(() => import('../pages/broadcast/email/EmailBroadcastList'));
export const EmailBroadcastCreate = lazyWithRetry(() => import('../pages/broadcast/email/EmailBroadcastCreate'));
export const EmailBroadcastDetails = lazyWithRetry(() => import('../pages/broadcast/email/EmailBroadcastDetails'));
export const Settings = lazyWithRetry(() => import('../pages/settings'));
export const StaffList = lazyWithRetry(() => import('../pages/settings/staff-list'));
export const PermissionList = lazyWithRetry(() => import('../pages/settings/permission'));
export const InvoiceSettings = lazyWithRetry(() => import('../pages/settings/invoice-setting'));
export const BranchSettings = lazyWithRetry(() => import('../pages/settings/branch-setting'));
export const DefaultDaterange = lazyWithRetry(() => import('../pages/settings/daterange-setting'));
export const GoogleAuthentication = lazyWithRetry(() => import('../pages/settings/google-auth'));
export const GatewayConfig = lazyWithRetry(() => import('../pages/settings/gateway-setting'));
export const ViewBranch = lazyWithRetry(() => import('../pages/settings/branch'));
export const ViewAdmins = lazyWithRetry(() => import('../pages/settings/admin'));
export const AgentList = lazyWithRetry(() => import('../pages/settings/agent-list'));
export const AgentProfile = lazyWithRetry(() => import('../pages/settings/agent-profile'));
export const Subscription = lazyWithRetry(() => import('../pages/settings/subscription'));
export const WebsiteSettings = lazyWithRetry(() => import('../pages/settings/website'));
export const WidgetSettings = lazyWithRetry(() => import('../pages/settings/widget'));
export const Backup = lazyWithRetry(() => import('../pages/settings/backup'));
export const LedgerGroup = lazyWithRetry(() => import('../finance/ledger-group'));
export const DiscountVoucherDetails = lazyWithRetry(() => import('../pages/discount'));
export const MyProfile = lazyWithRetry(() => import('../components/myProfile'));
export const PasswordGroupFirms = lazyWithRetry(() => import('../pages/office-assistance/PasswordGroupFirms'));
export const TransactionHistory = lazyWithRetry(() => import('../finance/bank/transaction-history'));
export const WalletRecharge = lazyWithRetry(() => import('../pages/WalletRecharge'));
export const TaskDetailedPage = lazyWithRetry(() => import('../DashboardComponents/TaskDetailedPage'));
export const TaskDetailedLegacyRedirect = lazyWithRetry(() =>
  import('../DashboardComponents/TaskDetailedPage').then((m) => ({
    default: m.TaskDetailedLegacyRedirect,
  })),
);
export const TaskDetailedOdPage = lazyWithRetry(() => import('../pages/task-detailed/od'));
export const TaskDetailedDtPage = lazyWithRetry(() => import('../pages/task-detailed/dt'));
export const TaskDetailedD7Page = lazyWithRetry(() => import('../pages/task-detailed/d7'));
export const TaskDetailedFtPage = lazyWithRetry(() => import('../pages/task-detailed/ft'));
export const TaskDetailedWipPage = lazyWithRetry(() => import('../pages/task-detailed/wip'));
export const TaskDetailedPfcPage = lazyWithRetry(() => import('../pages/task-detailed/pfc'));
export const TaskDetailedPfdPage = lazyWithRetry(() => import('../pages/task-detailed/pfd'));
export const TaskDetailedCplPage = lazyWithRetry(() => import('../pages/task-detailed/cpl'));
export const TaskDetailedCnlPage = lazyWithRetry(() => import('../pages/task-detailed/cnl'));
export const ComplianceYetNotStarted = lazyWithRetry(() => import('../pages/task-compliance-yet-not-started'));
export const RecurringTaskDetailedPage = lazyWithRetry(() => import('../DashboardComponents/RecurringTaskDetailedPage'));
export const ClientDetailPage = lazyWithRetry(() => import('../DashboardComponents/ClientDetailPage'));
export const TaskDashboardDetailPage = lazyWithRetry(() => import('../DashboardComponents/TaskDashboardDetailPage'));
export const QuickStatsDetailsPage = lazyWithRetry(() => import('../DashboardComponents/quick-stats-details'));
export const ServiceWiseSales = lazyWithRetry(() => import('../DashboardComponents/ServiceSalesDetails'));
export const StaffSalesDetails = lazyWithRetry(() => import('../DashboardComponents/StaffSalesDetails'));
export const StaffWiseSalesPage = lazyWithRetry(() => import('../DashboardComponents/StaffWiseSalesPage'));
export const TopClientsViewAll = lazyWithRetry(() => import('../DashboardComponents/TopClientsViewAll'));
export const BulkImportPage = lazyWithRetry(() => import('../pages/broadcast/email/BulkEmailImport'));
