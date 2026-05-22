import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BodyScrollLockObserver from './components/BodyScrollLockObserver';

// Import components
import Login from './pages/login';
import PageNotFound from './pages/error/page-not-found';
import Dashboard from './pages/dashboard';
import TaskCreate from './pages/task-create';
// import TaskEdit from './pages/task-edit';
import Register from './pages/register';
import TaskDisplay from './pages/task-display';
import CreateClient from './pages/client-create';
import ViewClients from './pages/client-view';
import ClientProfile from './pages/client-profile';
import TaskProfile from './pages/task-profile';
import BillDisplay from './pages/billing-view';
import FinanceEntry from './pages/finance-voucher-entry';
import BankList from './pages/bank-account';
import CapitalAccounts from './pages/capital-accuont';
import ViewSales from './pages/sale-display';
import ViewPurchase from './pages/purchase-display';
import ViewReceived from './pages/received-display';
import ViewPayments from './pages/payment-display';
import ViewContra from './pages/contra-display';
import ViewJournal from './pages/journal-display';
import ViewExpenses from './pages/expense-display';
import ViewStaff from './pages/staff-display';
import ViewStaffProfile from './pages/staff-profile';
import StaffReport from './pages/staff-report';
import ManageAttendance from './pages/staff-attendance';
import OfficeAssistance from './pages/office-assistance';
import ViewDSCRegister from './pages/office-assistance/dsc-report';
import ViewFileIndex from './pages/office-assistance/file-index';
import PasswordGroups from './pages/office-assistance/password-group';
import ImportantLinks from './pages/office-assistance/important-link';
import Services from './pages/office-assistance/services';
import RecurringGroups from './pages/office-assistance/recurring-group';
import Groups from './pages/office-assistance/groups';
import GroupFirms from './pages/office-assistance/group-firms';
import ViewInactiveClients from './pages/office-assistance/inactive-client';
import CAList from './pages/office-assistance/ca-list';
import AutoReminder from './pages/office-assistance/auto-reminder';
import Broadcast from './pages/broadcast';
import EmailBroadcastReport from './pages/broadcast/email/EmailBordcastReport';
import TextMessageOoms from './pages/broadcast/message/ooms';
import BroadcastReport from './pages/broadcast/report';
import WhatsAppOoms from './pages/broadcast/whatsapp/ooms';
import PushNotification from './pages/broadcast/push-notification/notification';
import EmailConfigList from './pages/broadcast/email/EmailConfigList';
import EmailTemplateList from './pages/broadcast/email/EmailTemplateList';
import EmailBroadcastList from './pages/broadcast/email/EmailBroadcastList';
import EmailBroadcastCreate from './pages/broadcast/email/EmailBroadcastCreate';
import EmailBroadcastDetails from './pages/broadcast/email/EmailBroadcastDetails';
import Settings from './pages/settings';
import StaffList from './pages/settings/staff-list';
import PermissionList from './pages/settings/permission';
import InvoiceSettings from './pages/settings/invoice-setting';
import AppSettings from './pages/settings/app-setting';
import EmailConfig from './pages/settings/email-setting';
import DefaultDaterange from './pages/settings/daterange-setting';
import GoogleAuthentication from './pages/settings/google-auth';
import GatewayConfig from './pages/settings/gateway-setting';
import ViewBranch from './pages/settings/branch';
import ViewAdmins from './pages/settings/admin';
import Subscription from './pages/settings/subscription';
import WebsiteSettings from './pages/settings/website';
import WidgetSettings from './pages/settings/widget';
import LedgerGroup from './finance/ledger-group';
import ExpenseDetails from './pages/expense-details';
import DiscountVoucherDetails from './pages/discount';
import MyProfile from './components/myProfile';
import PasswordGroupFirms from './pages/office-assistance/PasswordGroupFirms';
import TransactionHistory from './finance/bank/transaction-history';
//Dashboard Components
import TaskDetailedPage from './DashboardComponents/TaskDetailedPage';
import ClientDetailPage from './DashboardComponents/ClientDetailPage';
import TaskDashboardDetailPage from './DashboardComponents/TaskDashboardDetailPage';
import QuickStatsDetailsPage from './DashboardComponents/quick-stats-details';
import ServiceWiseSales from './DashboardComponents/ServiceSalesDetails';
import StaffSalesDetails from './DashboardComponents/StaffSalesDetails';
import TopClientsViewAll from './DashboardComponents/TopClientsViewAll';
import TaskDetailsPage from './staff/TaskDetailsPage';
import BulkImportPage from './pages/broadcast/email/BulkEmailImport';

// Google Client ID
const GOOGLE_CLIENT_ID = "process.env.REACT_APP_GOOGLE_CLIENT_ID" in process.env ? process.env.REACT_APP_GOOGLE_CLIENT_ID : "706030491156-5rq848qm4eih47h29675u6pdv11m8kvq.apps.googleusercontent.com";

// Authentication wrapper component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = () => {
    // Check for both possible token keys (for compatibility)
    const token = localStorage.getItem('token') || localStorage.getItem('user_token');
    const username = localStorage.getItem('username') || localStorage.getItem('user_username');

    return !!(token && username);
  };

  return isAuthenticated() ? children : <Navigate to="/login" replace />;
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
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {/* Locks body scroll whenever any full-viewport modal/overlay is open — app-wide fix */}
      <BodyScrollLockObserver />
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

        <Route path="/task/create" element={
          <ProtectedRoute>
            <TaskCreate />
          </ProtectedRoute>
        } />

        <Route path="/task/view" element={
          <ProtectedRoute>
            <TaskDisplay />
          </ProtectedRoute>
        } />

        <Route path="/task/:task_id" element={
          <ProtectedRoute>
            <TaskProfile />
          </ProtectedRoute>
        } />

        {/* <Route path="/task/edit/:task_id" element={
          <ProtectedRoute>
            <TaskEdit />
          </ProtectedRoute>
        } /> */}
        <Route path="/task/profile/:task_id/:tab" element={
          <ProtectedRoute>
            <TaskProfile />
          </ProtectedRoute>
        } />

        <Route path="/task/detailed" element={
          <ProtectedRoute>
            <TaskDetailedPage />
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

        <Route path="/finance/voucher/expense-details" element={
          <ProtectedRoute>
            <ExpenseDetails />
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

        <Route path="/staff/office-assistance/auto-reminder" element={
          <ProtectedRoute>
            <AutoReminder />
          </ProtectedRoute>
        } />

        <Route path="/broadcast" element={
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

        <Route path="/broadcast/whatsapp/ooms" element={
          <ProtectedRoute>
            <WhatsAppOoms />
          </ProtectedRoute>
        } />

        <Route path="/broadcast/push-notification" element={
          <ProtectedRoute>
            <PushNotification />
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
            <BulkImportPage/>
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

        <Route path="/settings/app-setting" element={
          <ProtectedRoute>
            <AppSettings />
          </ProtectedRoute>
        } />

        <Route path="/settings/email-setting" element={
          <ProtectedRoute>
            <EmailConfig />
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
            <TaskDetailsPage />
          </ProtectedRoute>
        } />

        {/* Catch-all route for 404 */}
        <Route path="*" element={
          <ProtectedRoute>
            <PageNotFound />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </GoogleOAuthProvider>
);

reportWebVitals();