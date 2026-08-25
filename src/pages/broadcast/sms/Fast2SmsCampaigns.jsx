import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiEye,
  FiLayers,
  FiLoader,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  smsApi,
  normalizeList,
  normalizePagination,
} from "../../../services/smsApi";

const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "processing", label: "Processing" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    processing: "bg-blue-100 text-blue-700",
    complete: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

const Fast2SmsCampaigns = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const canView =
    check("broadcast_send") || check("broadcast_config_edit");
  const canCreate = check("broadcast_send");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchCampaigns = useCallback(
    async (page = 1, limit = pagination.limit, status = statusFilter?.value) => {
      setLoading(true);
      try {
        const res = await smsApi.listCampaigns({
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setRows(list);
        setPagination(
          normalizePagination(res?.pagination, { page_no: page, limit }),
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load campaigns");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, statusFilter?.value],
  );

  useEffect(() => {
    if (canView) fetchCampaigns(1);
  }, [canView, statusFilter, fetchCampaigns]);

  const runDelete = async () => {
    if (!confirmRow?.campaign_id) return;
    setDeleting(true);
    try {
      await smsApi.deleteCampaign({ campaign_id: confirmRow.campaign_id });
      toast.success("Campaign deleted");
      setConfirmRow(null);
      fetchCampaigns(pagination.page_no);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
  };

  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
        <div
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="mx-4 max-w-sm rounded-lg border bg-white p-8 text-center">
            <FiLock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Access Denied</h3>
          </div>
        </div>
      </div>
    );
  }

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Fast2SMS Campaigns</h1>
            <p className="mt-1 text-sm text-gray-500">
              Campaign list and delivery reports for this branch.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className={TOOLBAR_ROW}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <FiLayers className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="m-0 text-base font-semibold text-gray-800">Campaigns</h2>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="w-40">
                  <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={STATUS_OPTIONS}
                    isSearchable={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchCampaigns(pagination.page_no)}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                >
                  <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={() => navigate("/broadcast/sms/fast2sms/campaigns/create")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <FiPlus className="h-4 w-4" />
                    Create
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                Loading campaigns...
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <FiLayers className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm">No campaigns yet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className={TABLE_TH}>Name</th>
                        <th className={TABLE_TH}>Template</th>
                        <th className={TABLE_TH}>Status</th>
                        <th className={TABLE_TH}>Recipients</th>
                        <th className={TABLE_TH}>Sent / Failed</th>
                        <th className={TABLE_TH}>Created</th>
                        <th className={TABLE_TH}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.campaign_id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                            {row.name}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            {row.template_name || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {row.total_count ?? 0}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {row.sent_count ?? 0} / {row.failed_count ?? 0}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">
                            {row.create_date
                              ? new Date(
                                  String(row.create_date).replace(" ", "T"),
                                ).toLocaleString("en-IN")
                              : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/broadcast/sms/fast2sms/campaigns/${row.campaign_id}`,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <FiEye className="h-3.5 w-3.5" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRow(row)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={pagination.page_no}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.total_pages}
                  rowOptions={[10, 20, 50, 100]}
                  defaultRows={20}
                  onPageChange={(page) => fetchCampaigns(page)}
                  onLimitChange={(limit) => {
                    setPagination((p) => ({ ...p, limit, page_no: 1 }));
                    fetchCampaigns(1, Number(limit));
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmRow)}
        loading={deleting}
        onCancel={() => !deleting && setConfirmRow(null)}
        onConfirm={runDelete}
        title="Delete campaign"
        heading="Delete this campaign?"
        message={`“${confirmRow?.name || "This campaign"}” and its delivery rows will be permanently deleted.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default Fast2SmsCampaigns;
