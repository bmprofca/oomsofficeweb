import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Reboot only: Bootstrap's utility classes (.px-3, .mt-5, .gap-3, .border …) carry !important and
// silently overrode the Tailwind classes of the same name (wrong spacing, grey borders). No Bootstrap
// components are used, so the base reset is all we need.
import 'bootstrap/dist/css/bootstrap-reboot.min.css';
import './styles/theme.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BodyScrollLockObserver from './components/BodyScrollLockObserver';
import { TaskCreateProvider } from './context/TaskCreateProvider';
import { ClientCreateProvider, ClientCreateRoute } from './context/ClientCreateProvider';
import WhatsappChannelBootstrap from './components/WhatsApp/WhatsappChannelBootstrap';
import SmsChannelBootstrap from './components/Sms/SmsChannelBootstrap';
import CallChannelBootstrap from './components/Call/CallChannelBootstrap';
import IncomingInAppVoiceCall from './components/Call/IncomingInAppVoiceCall';
import { ClickToCallProvider } from './components/Call/ClickToCall';
import axios from 'axios';
import { SubscriptionProtectedRoute } from './components/SubscriptionProtectedRoute';
import BranchRequiredRoute from './components/BranchRequiredRoute';
import RouteLoadingFallback from './app/RouteLoadingFallback';
import DocumentTitle from './app/DocumentTitle';
import { KeepAlivePage, KeepAliveProvider } from './app/KeepAlive';
import { handleUnauthorizedResponse } from './utils/auth-session';
/** Eager login — avoid Suspense spinner when landing on /login from portal switcher */
import Login from './pages/login';
import {
  PageNotFound,
  Dashboard,
  Register,
  BranchSetup,
  InvitationRequest,
  TaskDisplay,
  ViewClients,
  ClientProfile,
  TaskProfile,
  BillDisplay,
  FinanceEntry,
  BankList,
  CapitalAccounts,
  CapitalLedger,
  ViewSales,
  ViewPurchase,
  ViewReceived,
  ViewPayments,
  ViewContra,
  ViewJournal,
  ViewExpenses,
  ExpenseItemsPage,
  StaffExpensesReview,
  ViewStaff,
  ViewStaffProfile,
  StaffAttendance,
  StaffReport,
  OfficeAssistance,
  ViewDSCRegister,
  ViewFileIndex,
  PasswordGroups,
  ImportantLinks,
  Services,
  ComplianceServices,
  ComplianceFirmAssignment,
  ComplianceAssignmentDetails,
  RecurringGroups,
  Groups,
  GroupFirms,
  ViewDeletedClients,
  CAList,
  CAProfile,
  AutoReminder,
  ClientFollowUp,
  ServiceRequestList,
  Broadcast,
  EmailBroadcastReport,
  BroadcastReport,
  WhatsAppOoms,
  OneChattingConfigure,
  OneChattingLiveChat,
  OneChattingTemplates,
  OneChattingCampaigns,
  OneChattingCampaignCreate,
  OneChattingCampaignDetails,
  OneChattingCampaignSchedules,
  WhatsAppWebSession,
  WhatsAppWebTemplates,
  OomsSystemTemplates,
  OomsSystemSmsTemplates,
  Fast2SmsConfigure,
  CallOomsConfigure,
  VoiceCallHistory,
  Fast2SmsTemplates,
  Fast2SmsCampaigns,
  Fast2SmsCampaignCreate,
  Fast2SmsCampaignDetails,
  Fast2SmsCampaignSchedules,
  EmailConfigList,
  EmailTemplateList,
  EmailBroadcastList,
  EmailBroadcastCreate,
  EmailBroadcastDetails,
  EmailBroadcastSchedules,
  Settings,
  StaffList,
  PermissionList,
  InvoiceSettings,
  BranchSettings,
  DefaultDaterange,
  GoogleAuthentication,
  GatewayConfig,
  ViewBranch,
  ViewAdmins,
  Subscription,
  WebsiteSettings,
  WidgetSettings,
  Backup,
  LedgerGroup,
  DiscountVoucherDetails,
  MyProfile,
  PasswordGroupFirms,
  TransactionHistory,
  WalletRecharge,
  AiAssistant,
  AiAssistantSetting,
  WalletPaymentRequest,
  HelpSupport,
  Sessions,
  TaskDetailedLegacyRedirect,
  TaskDetailedOdPage,
  TaskDetailedDtPage,
  TaskDetailedD7Page,
  TaskDetailedFtPage,
  TaskDetailedWipPage,
  TaskDetailedPfcPage,
  TaskDetailedPfdPage,
  TaskDetailedCplPage,
  TaskDetailedCnlPage,
  ComplianceYetNotStarted,
  RecurringTaskDetailedPage,
  ClientDetailPage,
  TaskDashboardDetailPage,
  QuickStatsDetailsPage,
  ServiceWiseSales,
  StaffSalesDetails,
  StaffWiseSalesPage,
  TopClientsViewAll,
} from './app/lazyRoutes';

const redirectToSubscription = (upgrade = false) => {
  if (window.location.pathname === '/subscription') return;
  window.location.href = upgrade ? '/subscription?upgrade=true' : '/subscription';
};

// Notify the sidebar billing badge after any successful write that can change the
// pending-bill count (raising bills, marking non-billable, completing tasks).
let billingUpdateTimer = null;
const BILLING_WRITE_RE = /\/api\/v1\/(billing|task)\//;
function notifyBillingMaybeChanged(method, url) {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
  if (!BILLING_WRITE_RE.test(String(url || ''))) return;
  if (billingUpdateTimer) clearTimeout(billingUpdateTimer);
  billingUpdateTimer = setTimeout(() => {
    window.dispatchEvent(new Event('ooms:billing-updated'));
  }, 400);
}

// Set up global axios interceptor
axios.interceptors.response.use(
  (response) => {
    notifyBillingMaybeChanged(response?.config?.method, response?.config?.url);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorizedResponse();
    } else if (error.response && error.response.status === 403) {
      const errCode = error.response.data?.code;
      if (errCode === 'SUBSCRIPTION_REQUIRED') {
        redirectToSubscription(false);
      } else if (errCode === 'PLAN_UPGRADE_REQUIRED') {
        redirectToSubscription(true);
      }
    }
    return Promise.reject(error);
  }
);

// CRA's webpack overlay does `new Error(reason)` for non-Error rejections, which
// becomes the useless "[object Object]" banner. Normalize / suppress those.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason instanceof Error) {
    if (reason.message === '[object Object]') {
      event.preventDefault();
      console.error('[OOMS] Unhandled rejection (opaque Error):', reason.cause || reason);
    }
    return;
  }

  event.preventDefault();

  let message = 'Unhandled promise rejection';
  if (typeof reason === 'string' && reason.trim()) {
    message = reason;
  } else if (reason && typeof reason === 'object') {
    const raw = reason.message || reason.msg || reason.error || reason.description;
    if (typeof raw === 'string' && raw.trim()) {
      message = raw;
    } else {
      try {
        message = JSON.stringify(reason);
      } catch (_) {
        message = Object.prototype.toString.call(reason);
      }
    }
  }

  console.error('[OOMS] Unhandled rejection:', message, reason);
});

// Set up global fetch interceptor
const originalFetch = window.fetch.bind(window);
window.fetch = async function (...args) {
  try {
    const response = await originalFetch(...args);
    if (response.ok) {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input?.url;
      const method = init?.method || (typeof input === 'object' && input?.method) || 'GET';
      notifyBillingMaybeChanged(method, url);
    }
    if (response.status === 401) {
      handleUnauthorizedResponse();
    } else if (response.status === 403) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data && data.code === 'SUBSCRIPTION_REQUIRED') {
          redirectToSubscription(false);
        } else if (data && data.code === 'PLAN_UPGRADE_REQUIRED') {
          redirectToSubscription(true);
        }
      } catch (e) {
        // Body not JSON
      }
    }
    return response;
  } catch (error) {
    // Pass network errors through transparently
    throw error;
  }
};

/** Old bookmarks: /group-firms?group_id=X → /group-firms/:groupId */
const GroupFirmsLegacyRedirect = () => {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group_id');
  if (groupId) {
    return (
      <Navigate
        to={`/office-assistance/group-firms/${encodeURIComponent(groupId)}`}
        replace
      />
    );
  }
  return <Navigate to="/office-assistance/groups" replace />;
};

/** Old URLs (bookmarks, history): /staff/office-assistance/* and compliance nested under office-assistance. */
const LegacyOfficeAssistanceRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const to = pathname
    .replace(/^\/staff\/office-assistance\/compliance(?=\/|$)/, '/compliance')
    .replace(/^\/office-assistance\/compliance(?=\/|$)/, '/compliance')
    .replace(/^\/staff\/office-assistance(?=\/|$)/, '/office-assistance');
  return <Navigate to={`${to}${search}${hash}`} replace />;
};

// Authentication & Subscription wrapper component
const ProtectedRoute = ({ children, keepAlive = true }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isAuthenticated = () => {
    // Check for both possible token keys (for compatibility)
    const token = localStorage.getItem('token') || localStorage.getItem('user_token');
    const username = localStorage.getItem('username') || localStorage.getItem('user_username');

    return !!(token && username);
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Determine required subscription level based on path
  let requiredLevel = null;

  // 1. Live Chat
  if (pathname.startsWith('/broadcast/whatsapp/onechatting/live-chat')) {
    requiredLevel = 'live-chat';
  }
  // 2. Staff profile tabs gated by feature
  else if (pathname.startsWith('/staff/view/profile/')) {
    const segments = pathname.split('/').filter(Boolean);
    // /staff/view/profile/:username/:tab → tab is last segment when present
    const tab = segments.length >= 4 ? segments[3] : null;
    if (['salary', 'payslip'].includes(tab)) {
      requiredLevel = 'salary-management';
    }
  }
  // 3. Core CRM Features (Exclude pages that must be accessible without subscription)
  else if (
    pathname !== '/subscription' &&
    pathname !== '/my-profile' &&
    pathname !== '/branch-setup' &&
    pathname !== '/help-support' &&
    pathname !== '/sessions'
  ) {
    requiredLevel = 'core';
  }

  const page = keepAlive ? <KeepAlivePage>{children}</KeepAlivePage> : children;

  if (requiredLevel) {
    return (
      <BranchRequiredRoute>
        <SubscriptionProtectedRoute requiredLevel={requiredLevel}>
          {page}
        </SubscriptionProtectedRoute>
      </BranchRequiredRoute>
    );
  }

  return (
    <BranchRequiredRoute>
      {page}
    </BranchRequiredRoute>
  );
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('user_token');
    const username = localStorage.getItem('username') || localStorage.getItem('user_username');
    return !!(token && username);
  };

  // If user is already authenticated and tries to access login/register, redirect to dashboard
  return isAuthenticated() ? <Navigate to="/" replace /> : children;
};


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
      <DocumentTitle />
      <TaskCreateProvider>
      <ClientCreateProvider>
        {/* Must wrap KeepAliveProvider: KeepAliveHost parks pages as a sibling of
            <Routes>, so contexts inside KeepAlive but around Routes only are invisible
            to kept-alive pages (e.g. /client/view). */}
        <ClickToCallProvider>
        <KeepAliveProvider>
          <Toaster
            position="top-center"
            containerStyle={{ zIndex: 11000 }}
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#0f172a',
                background: '#ffffff',
                border: '1px solid #e5e9f2',
                boxShadow: '0 16px 40px -12px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.04)',
                borderRadius: '12px',
                padding: '10px 14px',
              },
              success: { iconTheme: { primary: '#059669', secondary: '#ffffff' } },
              error: { iconTheme: { primary: '#e11d48', secondary: '#ffffff' } },
            }}
          />
          <WhatsappChannelBootstrap />
          <SmsChannelBootstrap />
          <CallChannelBootstrap />
          <IncomingInAppVoiceCall />
          {/* Locks body scroll whenever any full-viewport modal/overlay is open — app-wide fix */}
          <BodyScrollLockObserver />
          <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Routes — Login is eagerly loaded (no Suspense spinner) */}
            <Route path="/login" element={
              <Login />
            } />

            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />

            <Route path="/invitation/:token" element={<InvitationRequest />} />

            <Route path="/branch-setup" element={
              <ProtectedRoute>
                <BranchSetup />
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/my-profile" element={
              <ProtectedRoute>
                <MyProfile />
              </ProtectedRoute>
            } />

            <Route path="/sessions" element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            } />

            <Route path="/voice-call-history" element={
              <ProtectedRoute>
                <VoiceCallHistory />
              </ProtectedRoute>
            } />

            <Route path="/task/view" element={
              <ProtectedRoute>
                <TaskDisplay />
              </ProtectedRoute>
            } />

            <Route path="/task/compliance/yet-not-started" element={
              <ProtectedRoute>
                <ComplianceYetNotStarted />
              </ProtectedRoute>
            } />

            <Route path="/task/detailed" element={
              <ProtectedRoute>
                <TaskDetailedLegacyRedirect />
              </ProtectedRoute>
            } />

            <Route path="/task/detailed/od" element={
              <ProtectedRoute>
                <TaskDetailedOdPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/dt" element={
              <ProtectedRoute>
                <TaskDetailedDtPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/d7" element={
              <ProtectedRoute>
                <TaskDetailedD7Page />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/ft" element={
              <ProtectedRoute>
                <TaskDetailedFtPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/wip" element={
              <ProtectedRoute>
                <TaskDetailedWipPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/pfc" element={
              <ProtectedRoute>
                <TaskDetailedPfcPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/pfd" element={
              <ProtectedRoute>
                <TaskDetailedPfdPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/cpl" element={
              <ProtectedRoute>
                <TaskDetailedCplPage />
              </ProtectedRoute>
            } />
            <Route path="/task/detailed/cnl" element={
              <ProtectedRoute>
                <TaskDetailedCnlPage />
              </ProtectedRoute>
            } />

            <Route path="/task/:task_id" element={
              <ProtectedRoute>
                <TaskProfile />
              </ProtectedRoute>
            } />

            <Route path="/task/profile/:task_id/:tab" element={
              <ProtectedRoute>
                <TaskProfile />
              </ProtectedRoute>
            } />

            <Route path="/recurring-task/detailed" element={
              <ProtectedRoute>
                <RecurringTaskDetailedPage />
              </ProtectedRoute>
            } />

            <Route path="/compliance/assignment/:assignment_id" element={
              <ProtectedRoute>
                <ComplianceAssignmentDetails />
              </ProtectedRoute>
            } />


            {/* Client creation is a modal now; old links open it over the client list. */}
            <Route path="/client/create" element={
              <ProtectedRoute keepAlive={false}>
                <ClientCreateRoute />
              </ProtectedRoute>
            } />

            <Route path="/client/view" element={
              <ProtectedRoute>
                <ViewClients />
              </ProtectedRoute>
            } />

            <Route path="/client/profile/:username" element={
              <ProtectedRoute>
                <ClientProfile />
              </ProtectedRoute>
            } />

            {/* Tabs For ClientProfile Tab */}
            <Route path="/client/profile/:username/:tab" element={
              <ProtectedRoute>
                <ClientProfile />
              </ProtectedRoute>
            } />


            <Route path="/client/profile" element={
              <ProtectedRoute>
                <ClientProfile />
              </ProtectedRoute>
            } />

            <Route path="/billing" element={
              <ProtectedRoute>
                <BillDisplay />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher" element={
              <ProtectedRoute>
                <FinanceEntry />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/bank-list" element={
              <ProtectedRoute>
                <BankList />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/capital-account" element={
              <ProtectedRoute>
                <CapitalAccounts />
              </ProtectedRoute>
            } />

            <Route path="/finance/capital/ledger/:capitalId" element={
              <ProtectedRoute>
                <CapitalLedger />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/sales" element={
              <ProtectedRoute>
                <ViewSales />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/purchase" element={
              <ProtectedRoute>
                <ViewPurchase />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/received" element={
              <ProtectedRoute>
                <ViewReceived />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/payment" element={
              <ProtectedRoute>
                <ViewPayments />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/contra" element={
              <ProtectedRoute>
                <ViewContra />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/journal" element={
              <ProtectedRoute>
                <ViewJournal />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/expense" element={
              <ProtectedRoute>
                <ViewExpenses />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/staff-expenses" element={
              <ProtectedRoute>
                <StaffExpensesReview />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/expense-items" element={
              <ProtectedRoute>
                <ExpenseItemsPage />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/ledger-group" element={
              <ProtectedRoute>
                <LedgerGroup />
              </ProtectedRoute>
            } />

            <Route path="/finance/voucher/discount" element={
              <ProtectedRoute>
                <DiscountVoucherDetails />
              </ProtectedRoute>
            } />

            <Route path="/staff/view" element={
              <ProtectedRoute>
                <ViewStaff />
              </ProtectedRoute>
            } />

            <Route path="/staff/attendance" element={
              <ProtectedRoute>
                <StaffAttendance />
              </ProtectedRoute>
            } />

            <Route path="/staff/view/profile/:username" element={
              <ProtectedRoute>
                <ViewStaffProfile />
              </ProtectedRoute>
            } />

            <Route path="/staff/view/profile/:username/:tab" element={
              <ProtectedRoute>
                <ViewStaffProfile />
              </ProtectedRoute>
            } />



            <Route path="/staff/team-report" element={
              <ProtectedRoute>
                <StaffReport />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/*" element={<LegacyOfficeAssistanceRedirect />} />
            <Route path="/office-assistance/compliance/*" element={<LegacyOfficeAssistanceRedirect />} />

            <Route path="/office-assistance" element={
              <ProtectedRoute>
                <OfficeAssistance />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/dsc-report" element={
              <ProtectedRoute>
                <ViewDSCRegister />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/file-index" element={
              <ProtectedRoute>
                <ViewFileIndex />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/password-groups" element={
              <ProtectedRoute>
                <PasswordGroups />
              </ProtectedRoute>
            } />
            <Route path="/office-assistance/password-group/:group_id/firms" element={
              <ProtectedRoute>
                <PasswordGroupFirms />
              </ProtectedRoute>
            } />


            <Route path="/office-assistance/important-links" element={
              <ProtectedRoute>
                <ImportantLinks />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/services" element={
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            } />

            <Route path="/compliance" element={
              <ProtectedRoute>
                <ComplianceServices />
              </ProtectedRoute>
            } />

            <Route path="/compliance/firm-assignment" element={
              <ProtectedRoute>
                <ComplianceFirmAssignment />
              </ProtectedRoute>
            } />

            <Route path="/staff/recurring-tasks" element={
              <ProtectedRoute>
                <ComplianceServices />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/recurring-groups" element={
              <ProtectedRoute>
                <RecurringGroups />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/groups" element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/group-firms/:groupId" element={
              <ProtectedRoute>
                <GroupFirms />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/group-firms" element={
              <ProtectedRoute>
                <GroupFirmsLegacyRedirect />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/deleted-clients" element={
              <ProtectedRoute>
                <ViewDeletedClients />
              </ProtectedRoute>
            } />
            <Route path="/office-assistance/inactive-client" element={
              <Navigate to="/office-assistance/deleted-clients" replace />
            } />

            <Route path="/office-assistance/ca-list" element={
              <ProtectedRoute>
                <CAList />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/ca-profile/:username" element={
              <ProtectedRoute>
                <CAProfile />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/ca-profile/:username/:tab" element={
              <ProtectedRoute>
                <CAProfile />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/auto-reminder" element={
              <ProtectedRoute>
                <AutoReminder />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/follow-up" element={
              <ProtectedRoute>
                <ClientFollowUp />
              </ProtectedRoute>
            } />

            <Route path="/office-assistance/service-requests" element={
              <ProtectedRoute>
                <ServiceRequestList />
              </ProtectedRoute>
            } />

            <Route path="/broadcast" element={
              <ProtectedRoute>
                <Navigate to="/broadcast/whatsapp" replace />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/reports" element={
              <ProtectedRoute>
                <EmailBroadcastReport />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/system/template" element={
              <ProtectedRoute>
                <OomsSystemTemplates />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/ooms" element={
              <ProtectedRoute>
                <WhatsAppOoms />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/configure" element={
              <ProtectedRoute>
                <OneChattingConfigure />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/call/ooms-system/configure" element={
              <ProtectedRoute>
                <CallOomsConfigure />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/configure" element={
              <ProtectedRoute>
                <Fast2SmsConfigure />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/templates" element={
              <ProtectedRoute>
                <Fast2SmsTemplates />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/campaigns" element={
              <ProtectedRoute>
                <Fast2SmsCampaigns />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/campaigns/create" element={
              <ProtectedRoute>
                <Fast2SmsCampaignCreate />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/campaigns/schedules" element={
              <ProtectedRoute>
                <Fast2SmsCampaignSchedules />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/fast2sms/campaigns/:campaignId" element={
              <ProtectedRoute>
                <Fast2SmsCampaignDetails />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/system/template" element={
              <ProtectedRoute>
                <OomsSystemSmsTemplates />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/ooms-system/campaigns" element={
              <ProtectedRoute>
                <Fast2SmsCampaigns />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/ooms-system/campaigns/create" element={
              <ProtectedRoute>
                <Fast2SmsCampaignCreate />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/ooms-system/campaigns/schedules" element={
              <ProtectedRoute>
                <Fast2SmsCampaignSchedules />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/sms/ooms-system/campaigns/:campaignId" element={
              <ProtectedRoute>
                <Fast2SmsCampaignDetails />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/templates" element={
              <ProtectedRoute>
                <OneChattingTemplates />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/live-chat/:number?" element={
              <ProtectedRoute>
                <OneChattingLiveChat />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/campaigns" element={
              <ProtectedRoute>
                <OneChattingCampaigns />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/campaigns/schedules" element={
              <ProtectedRoute>
                <OneChattingCampaignSchedules />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/campaigns/create" element={
              <ProtectedRoute>
                <OneChattingCampaignCreate />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/onechatting/campaigns/:campaignId" element={
              <ProtectedRoute>
                <OneChattingCampaignDetails />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/web/session" element={
              <ProtectedRoute>
                <WhatsAppWebSession />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/whatsapp/web/templates" element={
              <ProtectedRoute>
                <WhatsAppWebTemplates />
              </ProtectedRoute>
            } />

            <Route path="/broadcast/report" element={
              <ProtectedRoute>
                <BroadcastReport />
              </ProtectedRoute>
            } />

            {/* Email Broadcast Module */}
            <Route path="/broadcast/email/configs" element={
              <ProtectedRoute>
                <EmailConfigList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/templates" element={
              <ProtectedRoute>
                <EmailTemplateList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/campaigns" element={
              <ProtectedRoute>
                <EmailBroadcastList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/schedules" element={
              <ProtectedRoute>
                <EmailBroadcastSchedules />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email-channel" element={
              <Navigate to="/broadcast/email" replace />
            } />
            <Route path="/broadcast/email/create" element={
              <ProtectedRoute>
                <EmailBroadcastCreate />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/details/:broadcast_id" element={
              <ProtectedRoute>
                <EmailBroadcastDetails />
              </ProtectedRoute>
            } />

            {/* Hub tabs after deeper /broadcast/* routes */}
            <Route path="/broadcast/:tab" element={
              <ProtectedRoute>
                <Broadcast />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            <Route path="/settings/staff-list" element={
              <ProtectedRoute>
                <StaffList />
              </ProtectedRoute>
            } />

            <Route path="/settings/ai-assistant" element={
              <ProtectedRoute>
                <AiAssistantSetting />
              </ProtectedRoute>
            } />

            <Route path="/settings/permissions" element={
              <ProtectedRoute>
                <PermissionList />
              </ProtectedRoute>
            } />

            <Route path="/settings/invoice-setting" element={
              <ProtectedRoute>
                <InvoiceSettings />
              </ProtectedRoute>
            } />

            <Route path="/settings/branch-setting" element={
              <ProtectedRoute>
                <BranchSettings />
              </ProtectedRoute>
            } />

            <Route path="/settings/backup" element={
              <ProtectedRoute>
                <Backup />
              </ProtectedRoute>
            } />

            <Route path="/settings/daterange-setting" element={
              <ProtectedRoute>
                <DefaultDaterange />
              </ProtectedRoute>
            } />

            <Route path="/settings/google-auth" element={
              <ProtectedRoute>
                <GoogleAuthentication />
              </ProtectedRoute>
            } />

            <Route path="/settings/gateway-setting" element={
              <ProtectedRoute>
                <GatewayConfig />
              </ProtectedRoute>
            } />

            <Route path="/settings/branch" element={
              <ProtectedRoute>
                <ViewBranch />
              </ProtectedRoute>
            } />

            <Route path="/settings/admin" element={
              <ProtectedRoute>
                <ViewAdmins />
              </ProtectedRoute>
            } />

            <Route path="/settings/website" element={
              <ProtectedRoute>
                <WebsiteSettings />
              </ProtectedRoute>
            } />

            <Route path="/settings/widget" element={
              <ProtectedRoute>
                <WidgetSettings />
              </ProtectedRoute>
            } />

            <Route path="/subscription" element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            } />

            <Route path="/help-support" element={
              <ProtectedRoute>
                <HelpSupport />
              </ProtectedRoute>
            } />

            <Route path="/wallet-recharge" element={
              <ProtectedRoute>
                <WalletRecharge />
              </ProtectedRoute>
            } />

            <Route path="/ai-assistant" element={
              <ProtectedRoute>
                <AiAssistant />
              </ProtectedRoute>
            } />

            <Route path="/wallet/payment-request" element={
              <ProtectedRoute>
                <WalletPaymentRequest />
              </ProtectedRoute>
            } />

            <Route path="/finance/bank/transaction-history" element={
              <ProtectedRoute>
                <TransactionHistory />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/clients/:metric" element={
              <ProtectedRoute>
                <ClientDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/tasks/:metric" element={
              <ProtectedRoute>
                <TaskDashboardDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/quick-stats/:type" element={
              <ProtectedRoute>
                <QuickStatsDetailsPage />
              </ProtectedRoute>
            } />

            <Route path="/service-sales-details" element={
              <ProtectedRoute>
                <ServiceWiseSales />
              </ProtectedRoute>
            } />

            <Route path="/staff-sales-details" element={
              <ProtectedRoute>
                <StaffSalesDetails />
              </ProtectedRoute>
            } />

            <Route path="/sales/staff-wise" element={
              <ProtectedRoute>
                <StaffWiseSalesPage />
              </ProtectedRoute>
            } />

            <Route path="/clients/top" element={
              <ProtectedRoute>
                <TopClientsViewAll />
              </ProtectedRoute>
            } />

            <Route path="/staff/team-report-details" element={
              <ProtectedRoute>
                <TaskDetailedLegacyRedirect />
              </ProtectedRoute>
            } />

            {/* Catch-all route for 404 — never keep-alive (avoids sticky 404 after new routes land) */}
            <Route path="*" element={
              <ProtectedRoute keepAlive={false}>
                <PageNotFound />
              </ProtectedRoute>
            } />
          </Routes>
          </Suspense>
        </KeepAliveProvider>
        </ClickToCallProvider>
      </ClientCreateProvider>
      </TaskCreateProvider>
    </BrowserRouter>
);

reportWebVitals();