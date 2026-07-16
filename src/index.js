import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BodyScrollLockObserver from './components/BodyScrollLockObserver';
import { TaskCreateProvider } from './context/TaskCreateProvider';
import WhatsappChannelBootstrap from './pages/broadcast/whatsapp/WhatsappChannelBootstrap';
import axios from 'axios';
import { SubscriptionProtectedRoute } from './components/SubscriptionProtectedRoute';
import BranchRequiredRoute from './components/BranchRequiredRoute';
import RouteLoadingFallback from './app/RouteLoadingFallback';
import { handleUnauthorizedResponse } from './utils/auth-session';
import {
  Login,
  PageNotFound,
  Dashboard,
  Register,
  BranchSetup,
  InvitationRequest,
  TaskDisplay,
  CreateClient,
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
  ViewStaff,
  ViewStaffProfile,
  StaffReport,
  ManageAttendance,
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
  ViewInactiveClients,
  CAList,
  CAProfile,
  AutoReminder,
  ServiceRequestList,
  Broadcast,
  EmailBroadcastReport,
  TextMessageOoms,
  BroadcastReport,
  WhatsAppOoms,
  OneChattingConfigure,
  OneChattingLiveChat,
  OneChattingTemplates,
  WhatsAppWebSession,
  WhatsAppWebTemplates,
  OomsSystemTemplates,
  EmailConfigList,
  EmailTemplateList,
  EmailBroadcastList,
  EmailBroadcastCreate,
  EmailBroadcastDetails,
  SmsConfigList,
  SmsTemplateList,
  SmsBroadcastList,
  SmsBroadcastCreate,
  SmsBroadcastDetails,
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
  AgentList,
  AgentProfile,
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
  TopClientsViewAll,
  BulkImportPage,
} from './app/lazyRoutes';

// Google Client ID
const GOOGLE_CLIENT_ID = "process.env.REACT_APP_GOOGLE_CLIENT_ID" in process.env ? process.env.REACT_APP_GOOGLE_CLIENT_ID : "706030491156-5rq848qm4eih47h29675u6pdv11m8kvq.apps.googleusercontent.com";

const redirectToSubscription = (upgrade = false) => {
  if (window.location.pathname === '/subscription') return;
  window.location.href = upgrade ? '/subscription?upgrade=true' : '/subscription';
};

// Set up global axios interceptor
axios.interceptors.response.use(
  (response) => response,
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

// Set up global fetch interceptor
const originalFetch = window.fetch.bind(window);
window.fetch = async function (...args) {
  try {
    const response = await originalFetch(...args);
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

// Authentication & Subscription wrapper component
const ProtectedRoute = ({ children }) => {
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
  // 2. Attendance management
  else if (pathname.startsWith('/staff/attendance')) {
    requiredLevel = 'attendance-management';
  }
  // 3. Staff profile tabs gated by feature
  else if (pathname.startsWith('/staff/view/profile/')) {
    const tab = pathname.split('/').filter(Boolean).pop();
    if (['salary', 'payslip'].includes(tab)) {
      requiredLevel = 'salary-management';
    } else if (tab === 'attendance') {
      requiredLevel = 'attendance-management';
    }
  }
  // 4. Core CRM Features (Exclude pages that must be accessible without subscription)
  else if (
    pathname !== '/subscription' &&
    pathname !== '/my-profile' &&
    pathname !== '/branch-setup'
  ) {
    requiredLevel = 'core';
  }

  if (requiredLevel) {
    return (
      <BranchRequiredRoute>
        <SubscriptionProtectedRoute requiredLevel={requiredLevel}>
          {children}
        </SubscriptionProtectedRoute>
      </BranchRequiredRoute>
    );
  }

  return (
    <BranchRequiredRoute>
      {children}
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
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <TaskCreateProvider>
        <Toaster
          position="top-center"
          containerStyle={{ zIndex: 11000 }}
          toastOptions={{ duration: 4000 }}
        />
        <WhatsappChannelBootstrap />
        {/* Locks body scroll whenever any full-viewport modal/overlay is open — app-wide fix */}
        <BodyScrollLockObserver />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
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

            <Route path="/office-assistance/compliance/assignment/:assignment_id" element={
              <ProtectedRoute>
                <ComplianceAssignmentDetails />
              </ProtectedRoute>
            } />


            <Route path="/client/create" element={
              <ProtectedRoute>
                <CreateClient />
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

            <Route path="/staff/view/profile/:tab?" element={
              <ProtectedRoute>
                <ViewStaffProfile />
              </ProtectedRoute>
            } />



            <Route path="/staff/team-report" element={
              <ProtectedRoute>
                <StaffReport />
              </ProtectedRoute>
            } />

            <Route path="/staff/attendance" element={
              <ProtectedRoute>
                <ManageAttendance />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance" element={
              <ProtectedRoute>
                <OfficeAssistance />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/dsc-report" element={
              <ProtectedRoute>
                <ViewDSCRegister />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/file-index" element={
              <ProtectedRoute>
                <ViewFileIndex />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/password-groups" element={
              <ProtectedRoute>
                <PasswordGroups />
              </ProtectedRoute>
            } />
            <Route path="/staff/office-assistance/password-group/:group_id/firms" element={
              <ProtectedRoute>
                <PasswordGroupFirms />
              </ProtectedRoute>
            } />


            <Route path="/staff/office-assistance/important-links" element={
              <ProtectedRoute>
                <ImportantLinks />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/services" element={
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/compliance" element={
              <ProtectedRoute>
                <ComplianceServices />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/compliance/firm-assignment" element={
              <ProtectedRoute>
                <ComplianceFirmAssignment />
              </ProtectedRoute>
            } />

            <Route path="/staff/recurring-tasks" element={
              <ProtectedRoute>
                <ComplianceServices />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/recurring-groups" element={
              <ProtectedRoute>
                <RecurringGroups />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/groups" element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/group-firms" element={
              <ProtectedRoute>
                <GroupFirms />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/inactive-client" element={
              <ProtectedRoute>
                <ViewInactiveClients />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/ca-list" element={
              <ProtectedRoute>
                <CAList />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/ca-profile/:username" element={
              <ProtectedRoute>
                <CAProfile />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/ca-profile/:username/:tab" element={
              <ProtectedRoute>
                <CAProfile />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/auto-reminder" element={
              <ProtectedRoute>
                <AutoReminder />
              </ProtectedRoute>
            } />

            <Route path="/staff/office-assistance/service-requests" element={
              <ProtectedRoute>
                <ServiceRequestList />
              </ProtectedRoute>
            } />

            <Route path="/broadcast" element={
              <ProtectedRoute>
                <Navigate to="/broadcast/whatsapp" replace />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/:tab" element={
              <ProtectedRoute>
                <Broadcast />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/email/reports" element={
              <ProtectedRoute>
                <EmailBroadcastReport />
              </ProtectedRoute>
            } />


            <Route path="/broadcast/text-message/ooms" element={
              <ProtectedRoute>
                <TextMessageOoms />
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
            <Route path="/broadcast/email" element={
              <ProtectedRoute>
                <EmailBroadcastList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/bulk-import" element={
              <ProtectedRoute>
                <BulkImportPage />
              </ProtectedRoute>
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

            {/* SMS Broadcast Module */}
            <Route path="/broadcast/sms/configs" element={
              <ProtectedRoute>
                <SmsConfigList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/sms/templates" element={
              <ProtectedRoute>
                <SmsTemplateList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/sms" element={
              <ProtectedRoute>
                <SmsBroadcastList />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/sms/create" element={
              <ProtectedRoute>
                <SmsBroadcastCreate />
              </ProtectedRoute>
            } />
            <Route path="/broadcast/sms/details/:broadcast_id" element={
              <ProtectedRoute>
                <SmsBroadcastDetails />
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

            <Route path="/settings/agent-list" element={
              <ProtectedRoute>
                <AgentList />
              </ProtectedRoute>
            } />

            <Route path="/settings/agent-profile/:username" element={
              <ProtectedRoute>
                <AgentProfile />
              </ProtectedRoute>
            } />

            <Route path="/settings/agent-profile/:username/:tab" element={
              <ProtectedRoute>
                <AgentProfile />
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

            <Route path="/wallet-recharge" element={
              <ProtectedRoute>
                <WalletRecharge />
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

            {/* Catch-all route for 404 */}
            <Route path="*" element={
              <ProtectedRoute>
                <PageNotFound />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </TaskCreateProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);

reportWebVitals();