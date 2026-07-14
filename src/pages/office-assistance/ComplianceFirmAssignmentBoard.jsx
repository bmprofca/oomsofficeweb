import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiEdit2,
  FiLayers,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import TablePagination from '../../components/TablePagination';
import CustomSelect from '../../components/CustomSelect';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import {
  addComplianceFirm,
  deleteComplianceFirm,
  editComplianceFirm,
  extractApiError,
  fetchComplianceFirms,
  fetchComplianceServices,
  formatFirmSelectLabel,
  getCurrentComplianceYear,
  normalizeAssignees,
} from '../../services/complianceService';
import { FirmFormModal, formatMoney } from './complianceShared';

export const ComplianceFirmAssignmentBoard = ({
  username: usernameProp = '',
  embedded = false,
}) => {
  const username = String(usernameProp || '').trim();
  const isClientScoped = Boolean(username);

  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [clientFirmOptions, setClientFirmOptions] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [firmModal, setFirmModal] = useState(null);
  const [firmSaving, setFirmSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const branchServices = useMemo(() => services, [services]);

  const serviceFilterOptions = useMemo(
    () => [
      { value: '', label: 'All services' },
      ...branchServices.map((service) => ({
        value: service.service_id,
        label: service.service_name || service.name || service.service_id,
      })),
    ],
    [branchServices],
  );

  const selectedServiceFilter = useMemo(
    () => serviceFilterOptions.find((option) => option.value === serviceId) || serviceFilterOptions[0],
    [serviceFilterOptions, serviceId],
  );

  const yearOptions = useMemo(() => {
    const currentStart = Number(getCurrentComplianceYear().split('-')[0]);
    return Array.from({ length: 5 }, (_, index) => {
      const start = currentStart - 2 + index;
      return `${start}-${start + 1}`;
    });
  }, []);

  const hideClientColumn = isClientScoped;
  const tableColSpan = hideClientColumn ? 6 : 7;

  const cardShellClass = embedded
    ? 'bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col w-full'
    : 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';

  const loadServices = useCallback(async () => {
    try {
      const res = await fetchComplianceServices({ page_no: 1, limit: 100 });
      setServices(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance services'));
      setServices([]);
    }
  }, []);

  const loadFirms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceFirms({
        service_id: serviceId,
        username,
        search,
        page_no: pagination.page,
        limit: pagination.limit,
      });
      setRows(res.data);
      setPagination((prev) => ({ ...prev, ...res.pagination }));
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance firms'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, username, search, pagination.page, pagination.limit]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    loadFirms();
  }, [loadFirms]);

  useEffect(() => {
    if (!isClientScoped) {
      setClientFirmOptions([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const headers = getHeaders();
        const response = await axios.get(
          `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(username)}`,
          { headers },
        );
        if (cancelled) return;
        const firmsData = response.data?.data?.firms || [];
        setClientFirmOptions(
          firmsData.map((firm) => ({
            value: firm.firm_id,
            label: formatFirmSelectLabel({
              firm_id: firm.firm_id,
              firm_name: firm.firm_name || firm.name,
              pan_no: firm.pan_no || firm.pan_number,
            }),
          })),
        );
      } catch {
        if (!cancelled) setClientFirmOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isClientScoped, username]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearch(searchInput.trim());
  };

  const handleSaveFirm = async (form) => {
    setFirmSaving(true);
    try {
      if (firmModal?.mode === 'add') {
        const res = await addComplianceFirm({
          service_id: form.service_id,
          firm_id: form.firm_id,
          effective_from: form.effective_from,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          visibility_offset: form.visibility_offset,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm added');
      } else {
        const firmId = firmModal.firm.id ?? firmModal.firm.compliance_firm_id;
        const res = await editComplianceFirm({
          id: firmId,
          service_id: form.service_id,
          firm_id: form.firm_id,
          effective_from: form.effective_from,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          visibility_offset: form.visibility_offset,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm updated');
      }
      setFirmModal(null);
      loadFirms();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to save compliance firm'));
    } finally {
      setFirmSaving(false);
    }
  };

  const handleDeleteFirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const firmId = deleteTarget.id ?? deleteTarget.compliance_firm_id;
      const res = await deleteComplianceFirm({ id: firmId });
      toast.success(res?.message || 'Compliance firm deleted');
      setDeleteTarget(null);
      loadFirms();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to delete compliance firm'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className={cardShellClass}>
        <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                <FiLayers className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight">
                  {isClientScoped ? 'Firm Assigning' : 'Firm Assignment'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isClientScoped
                    ? 'Assign compliance services to this client\'s firms'
                    : 'Assign compliance services to firms — one row per service assignment'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFirmModal({ mode: 'add' })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              Add firm
            </button>
          </div>
        </div>

        <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
              <CustomSelect
                options={serviceFilterOptions}
                value={selectedServiceFilter}
                onChange={(option) => {
                  setServiceId(option?.value || '');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="All services"
                isSearchable
                isClearable={false}
              />
            </div>

            <form onSubmit={handleSearch} className="md:col-span-2 xl:col-span-2 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={isClientScoped ? 'Firm, PAN, GST…' : 'Firm, client, PAN, GST…'}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Search
              </button>
            </form>

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadFirms}
                disabled={loading}
                className="inline-flex items-center gap-2 p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-50 text-sm bg-white"
                title="Refresh"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Firm / Service
                </th>
                {!hideClientColumn ? (
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    Client
                  </th>
                ) : null}
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Fees
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Due day
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Effective from
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Staff
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {Array.from({ length: tableColSpan }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-3">
                        <div className="h-4 bg-gray-200 rounded w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="px-3 py-12 text-center">
                    <p className="text-sm font-medium text-gray-500 m-0">No firm assignments found</p>
                    <p className="text-xs text-gray-400 mt-1 m-0">
                      Add a firm to a compliance service to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id ?? `${row.firm_id}-${row.service_id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-gray-800 m-0">
                        {row.firm_name || row.firm_id}
                      </p>
                      <p className="text-xs text-gray-500 m-0 mt-0.5">
                        {row.service_name || row.service_id}
                      </p>
                    </td>
                    {!hideClientColumn ? (
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-gray-700 m-0">
                          {row.client?.name || row.username || '—'}
                        </p>
                        <p className="text-xs text-gray-400 m-0 mt-0.5">
                          {row.client?.mobile || row.client?.email || '—'}
                        </p>
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                      <div>{formatMoney(row.fees)}</div>
                      <div className="text-xs text-gray-400">
                        Tax {row.tax_rate}% ({formatMoney(row.tax_value)})
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-700">
                      Day {row.due_date || '—'}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {row.effective_from || '—'}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-700">
                      <div className="max-w-[180px] truncate">
                        {normalizeAssignees(row.staffs).join(', ') || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setFirmModal({ mode: 'edit', firm: row })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.total_pages > 1 ? (
          <div className="px-3 md:px-4 py-3 border-t border-gray-200">
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) =>
                setPagination((prev) => ({ ...prev, limit, page: 1 }))
              }
            />
          </div>
        ) : null}
      </div>

      <FirmFormModal
        isOpen={Boolean(firmModal)}
        mode={firmModal?.mode || 'add'}
        initialFirm={firmModal?.firm}
        services={branchServices}
        saving={firmSaving}
        yearOptions={yearOptions}
        clientUsername={username}
        presetFirmOptions={isClientScoped ? clientFirmOptions : null}
        addTitle={isClientScoped ? 'Assign firm to compliance' : undefined}
        editTitle={isClientScoped ? 'Edit firm assignment' : undefined}
        onClose={() => !firmSaving && setFirmModal(null)}
        onSubmit={handleSaveFirm}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={deleteLoading ? undefined : () => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 m-0">Delete compliance firm?</h3>
            <p className="text-sm text-gray-600 mt-2 m-0">
              Remove <strong>{deleteTarget.firm_name || deleteTarget.firm_id}</strong> from{' '}
              <strong>{deleteTarget.service_name || deleteTarget.service_id}</strong>? This is a soft
              delete.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleteLoading ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ComplianceFirmAssignmentBoard;
