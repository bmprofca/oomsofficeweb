import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight, FiLoader, FiUsers } from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';
import { useUserPermissions } from '../utils/permission-helper';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const AUTOMATIONS = [
  { key: 'recurringTasks', title: 'Compliance Automation', category: 'Task Management', frequency: 'Daily', description: 'Create and assign compliance tasks based on predefined schedules.' },
  { key: 'autoBilling', title: 'Automatic Billing System', category: 'Billing', frequency: 'Monthly', description: 'Generate and send invoices automatically for recurring services.' },
  { key: 'paymentReminders', title: 'Smart Payment Reminders', category: 'Billing', frequency: 'Weekly', description: 'Send automated reminders for overdue payments.' },
  { key: 'documentReminders', title: 'Document Collection Automation', category: 'Documentation', frequency: 'Daily', description: 'Remind clients to submit required documents before deadlines.' },
  { key: 'complianceAlerts', title: 'Compliance Deadline Alerts', category: 'Compliance', frequency: 'Real-time', description: 'Show alerts for upcoming regulatory and compliance deadlines.' },
  { key: 'taxDeadlineAlerts', title: 'Tax Filing Alerts', category: 'Tax', frequency: 'Weekly', description: 'Send reminders for GST, TDS, and income tax filing deadlines.' },
  { key: 'reportGeneration', title: 'Automated Report Generation', category: 'Reporting', frequency: 'Monthly', description: 'Schedule and generate financial reports automatically.' },
  { key: 'clientOnboarding', title: 'Client Onboarding Automation', category: 'Operations', frequency: 'On-demand', description: 'Automate new-client setup and document collection workflows.' },
  { key: 'emailNotifications', title: 'Smart Email Notifications', category: 'Communication', frequency: 'Real-time', description: 'Send notifications for important updates and milestones.' },
  { key: 'dataBackup', title: 'Automatic Data Backup', category: 'Security', frequency: 'Daily', description: 'Schedule automatic backups of client data and documents.' },
  { key: 'auditTrail', title: 'Audit Trail Automation', category: 'Security', frequency: 'Real-time', description: 'Automatically log system activities for compliance and security.' },
  { key: 'performanceReports', title: 'Performance Analytics', category: 'Analytics', frequency: 'Weekly', description: 'Generate team performance and productivity reports automatically.' },
];

const AutomationCenter = ({ mobileMenuOpen, setMobileMenuOpen, isMinimized, setIsMinimized }) => {
  const navigate = useNavigate();
  const { policyKey } = useParams();
  const { check, loading: permissionsLoading } = useUserPermissions();
  const canView = check('setting_view_edit');
  const selectedAutomation = useMemo(() => AUTOMATIONS.find((item) => item.key === policyKey), [policyKey]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadClients = useCallback(async (page = 1, append = false) => {
    if (!selectedAutomation) return;
    setLoading(true);
    setError('');
    try {
      const headers = getHeaders();
      if (!headers) throw new Error('Your session has expired. Please sign in again.');
      const query = new URLSearchParams({ policy_key: selectedAutomation.key, page: String(page), limit: '50' });
      const response = await fetch(`${API_BASE_URL}/automation-policies/clients?${query}`, { headers });
      const result = await response.json();
      if (!response.ok || !result?.success || !Array.isArray(result?.data?.clients)) {
        throw new Error(result?.message || 'Failed to load enabled clients.');
      }
      setClients((current) => append ? [...current, ...result.data.clients] : result.data.clients);
      setPagination(result.data.pagination || { page, total: result.data.clients.length, total_pages: 1 });
    } catch (loadError) {
      setError(loadError.message || 'Failed to load enabled clients.');
    } finally {
      setLoading(false);
    }
  }, [selectedAutomation]);

  useEffect(() => {
    setClients([]);
    setPagination({ page: 1, total: 0, total_pages: 0 });
    if (selectedAutomation && canView) loadClients();
  }, [canView, loadClients, selectedAutomation]);

  if (permissionsLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500"><FiLoader className="mr-2 animate-spin" /> Checking access…</div>;
  }

  if (!canView) {
    return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center"><h1 className="text-lg font-semibold text-slate-900">Access denied</h1><p className="mt-2 text-sm text-slate-500">You do not have permission to view automation settings.</p></div></div>;
  }

  return <div className="app-page min-h-screen bg-slate-50">
    <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
    <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
    <main className={`pt-16 transition-all ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
      <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
        {selectedAutomation ? <>
          <button type="button" onClick={() => navigate('/automations')} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            <FiArrowLeft /> All automations
          </button>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{selectedAutomation.category} · {selectedAutomation.frequency}</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">{selectedAutomation.title}</h1>
                <p className="mt-2 text-sm text-slate-500">{selectedAutomation.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                <FiUsers /> {pagination.total.toLocaleString('en-IN')} clients
              </div>
            </div>
          </section>
          {error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => loadClients()} className="font-semibold underline">Retry</button></div> : null}
          {loading && clients.length === 0 ? <div className="flex min-h-40 items-center justify-center text-slate-500"><FiLoader className="mr-2 animate-spin" /> Loading enabled clients…</div> : null}
          {!loading && !error && clients.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FiUsers className="mx-auto mb-3 text-slate-400" size={28} /><h2 className="font-semibold text-slate-800">No enabled clients</h2><p className="mt-1 text-sm text-slate-500">No active clients have this automation enabled.</p></div> : null}
          {clients.length > 0 ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="w-16 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Client</th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile</th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th scope="col" className="w-20 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client, index) => <tr key={client.username} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-500">{(pagination.page - 1) * 50 + index + 1}</td>
                    <td className="max-w-xs px-5 py-3">
                      <button type="button" onClick={() => navigate(`/client/profile/${encodeURIComponent(client.username)}/basic-details`)} className="block truncate text-left text-sm font-semibold text-slate-800 hover:text-indigo-700">
                        {client.name || client.username}
                      </button>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{client.username}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{client.mobile || '—'}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-sm text-slate-600">{client.email || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" aria-label={`Open ${client.name || client.username}`} onClick={() => navigate(`/client/profile/${encodeURIComponent(client.username)}/basic-details`)} className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-700">
                        <FiChevronRight />
                      </button>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            {pagination.page < pagination.total_pages ? <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => loadClients(pagination.page + 1, true)} disabled={loading} className="ui-btn ui-btn-secondary" >{loading ? 'Loading…' : 'Load more clients'}</button></div> : null}
          </section> : null}
        </> : <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Client settings</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Automations</h1>
            <p className="mt-2 text-sm text-slate-500">Choose an automation to see the active clients who have it enabled.</p>
          </div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {AUTOMATIONS.map((automation) => <button key={automation.key} type="button" onClick={() => navigate(`/automations/${automation.key}`)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div><span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">{automation.category} · {automation.frequency}</span><h2 className="mt-2 text-base font-bold text-slate-900">{automation.title}</h2></div>
                <FiChevronRight className="mt-1 shrink-0 text-slate-400" />
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-500">{automation.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-700">View enabled clients</span>
            </button>)}
          </section>
        </>}
      </div>
    </main>
  </div>;
};

export default AutomationCenter;
