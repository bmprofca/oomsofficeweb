import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiLayers,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
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

const MESSAGE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    processing: "bg-blue-100 text-blue-700",
    sent: "bg-blue-100 text-blue-700",
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

const StatChip = ({ label, value }) => (
  <div className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-500">
      {label}
    </p>
    <p className="m-0 mt-2 text-2xl font-bold leading-none text-gray-900">{value}</p>
  </div>
);

const Fast2SmsCampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const canView =
    check("broadcast_send") || check("broadcast_config_edit");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [detailLoading, setDetailLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgStatus, setMsgStatus] = useState(MESSAGE_STATUS_OPTIONS[0]);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchDetails = useCallback(async () => {
    if (!campaignId) return;
    setDetailLoading(true);
    try {
      const res = await smsApi.getCampaignDetails({ campaign_id: campaignId });
      setCampaign(res?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load campaign");
      setCampaign(null);
    } finally {
      setDetailLoading(false);
    }
  }, [campaignId]);

  const fetchMessages = useCallback(
    async (page = 1, limit = pagination.limit, status = msgStatus?.value) => {
      if (!campaignId) return;
      setMessagesLoading(true);
      try {
        const res = await smsApi.listCampaignMessages({
          campaign_id: campaignId,
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setMessages(list);
        setPagination(
          normalizePagination(res?.pagination, { page_no: page, limit }),
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load messages");
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [campaignId, msgStatus?.value, pagination.limit],
  );

  useEffect(() => {
    if (canView) {
      fetchDetails();
      fetchMessages(1);
    }
  }, [canView, fetchDetails, fetchMessages]);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await smsApi.deleteCampaign({ campaign_id: campaignId });
      toast.success("Campaign deleted");
      navigate("/broadcast/sms/fast2sms/campaigns");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete");
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
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/broadcast/sms/fast2sms/campaigns")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to campaigns
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchDetails();
                  fetchMessages(pagination.page_no);
                }}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${detailLoading || messagesLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center rounded-lg border bg-white py-16 text-gray-500">
              <FiLoader className="mr-2 h-5 w-5 animate-spin" />
              Loading campaign...
            </div>
          ) : !campaign ? (
            <div className="rounded-lg border bg-white py-16 text-center text-gray-500">
              Campaign not found
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <FiLayers className="h-5 w-5 text-blue-600" />
                      <h1 className="m-0 text-xl font-bold text-gray-800">
                        {campaign.name}
                      </h1>
                    </div>
                    <p className="m-0 text-sm text-gray-500">
                      {campaign.template_name || "—"} · {campaign.route} ·{" "}
                      {campaign.dlt_message_id || "no message id"}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                {campaign.error_message ? (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {campaign.error_message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Message content
                </p>
                {campaign.message_body ? (
                  <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {campaign.message_body}
                  </p>
                ) : (
                  <p className="m-0 mt-2 text-sm text-gray-400">
                    No message body stored for this campaign
                    {campaign.dlt_message_id
                      ? ` (DLT message ID: ${campaign.dlt_message_id})`
                      : ""}
                    .
                  </p>
                )}
                {campaign.variables_values ? (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Variables
                    </p>
                    <p className="m-0 mt-1 font-mono text-xs text-gray-700 break-all">
                      {campaign.variables_values}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatChip label="Total" value={campaign.total_count ?? 0} />
                <StatChip label="Sent" value={campaign.sent_count ?? 0} />
                <StatChip label="Failed" value={campaign.failed_count ?? 0} />
                <StatChip
                  label="Pending"
                  value={Math.max(
                    0,
                    (campaign.total_count || 0) -
                      (campaign.sent_count || 0) -
                      (campaign.failed_count || 0),
                  )}
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
                  <h2 className="m-0 text-base font-semibold text-gray-800">
                    Delivery report
                  </h2>
                  <div className="ml-auto w-40">
                    <CustomSelect
                      value={msgStatus}
                      onChange={(opt) => {
                        setMsgStatus(opt);
                      }}
                      options={MESSAGE_STATUS_OPTIONS}
                      isSearchable={false}
                    />
                  </div>
                </div>

                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    No messages for this filter.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className={TABLE_TH}>Mobile</th>
                            <th className={TABLE_TH}>Name</th>
                            <th className={TABLE_TH}>Status</th>
                            <th className={TABLE_TH}>Request ID</th>
                            <th className={TABLE_TH}>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {messages.map((row) => (
                            <tr
                              key={row.message_id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-3 py-3 font-mono text-sm text-gray-800">
                                {row.mobile}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700">
                                {row.name || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-gray-500">
                                {row.provider_request_id || "—"}
                              </td>
                              <td className="px-3 py-3 text-xs text-red-600">
                                {row.error_message || "—"}
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
                      onPageChange={(page) => fetchMessages(page)}
                      onLimitChange={(limit) => {
                        setPagination((p) => ({ ...p, limit, page_no: 1 }));
                        fetchMessages(1, Number(limit));
                      }}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={runDelete}
        title="Delete campaign"
        heading="Delete this campaign?"
        message="This will permanently delete the campaign and all delivery rows."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default Fast2SmsCampaignDetails;
