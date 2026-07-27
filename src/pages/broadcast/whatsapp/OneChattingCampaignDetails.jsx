import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiLayers,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiTrash2,
  FiAlertTriangle,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import { extractApiError } from "../../../utils/oneChattingSendUtils";
import {
  normalizeList,
  normalizePagination,
  whatsappApi,
} from "../../../services/whatsappApi";

const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_EMPTY = "text-sm text-gray-400";
const CELL_META = "text-xs text-gray-400";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const EMPTY_WRAP =
  "flex flex-col items-center justify-center py-12 text-gray-500 px-4";
const EMPTY_TITLE = "text-sm font-medium text-gray-500";
const EMPTY_SUBTITLE = "text-xs text-gray-400 mt-1";

const MESSAGE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" },
];

const formatHumanDateTime = (value) => {
  if (!value) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const SkeletonRow = ({ cols = 6 }) => (
  <tr className="animate-pulse border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div
          className="h-3 bg-gray-200 rounded"
          style={{ width: `${55 + (i % 3) * 18}px` }}
        />
      </td>
    ))}
  </tr>
);

const StatCardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
    <div className="h-3 w-16 rounded bg-gray-200" />
    <div className="mt-3 h-8 w-20 rounded bg-gray-200" />
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-sky-100 text-sky-700",
    read: "bg-green-100 text-green-700",
    complete: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    stopped: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

const StatChip = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 min-w-0 shadow-sm">
    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0">
      {label}
    </p>
    <p className="text-2xl font-bold text-gray-900 m-0 mt-2 leading-none">
      {value}
    </p>
  </div>
);

const OneChattingCampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [detailLoading, setDetailLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);

  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgStatus, setMsgStatus] = useState("all");
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchDetails = useCallback(async () => {
    if (!campaignId) return;
    setDetailLoading(true);
    try {
      const res = await whatsappApi.getCampaignDetails({
        campaign_id: campaignId,
      });
      setCampaign(res?.data || null);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load campaign"));
      setCampaign(null);
    } finally {
      setDetailLoading(false);
    }
  }, [campaignId]);

  const fetchMessages = useCallback(
    async (page = 1, limit = 20, status = "all") => {
      if (!campaignId) return;
      setMessagesLoading(true);
      try {
        const res = await whatsappApi.listCampaignMessages({
          campaign_id: campaignId,
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setMessages(list);
        setPagination(
          normalizePagination(res?.meta ?? res?.pagination, {
            page_no: page,
            limit,
            itemCount: list.length,
          }),
        );
      } catch (error) {
        toast.error(extractApiError(error, "Failed to load messages"));
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    fetchMessages(1, pagination.limit, msgStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgStatus, fetchMessages]);

  const handlePageChange = (page) => {
    fetchMessages(page, pagination.limit, msgStatus);
  };

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchMessages(1, limit, msgStatus);
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      const res = await whatsappApi.deleteCampaign({
        campaign_id: campaignId,
      });
      toast.success(res?.msg || res?.message || "Campaign deleted");
      navigate("/broadcast/whatsapp/onechatting/campaigns");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to delete campaign"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const selectedMsgStatus =
    MESSAGE_STATUS_OPTIONS.find((o) => o.value === msgStatus) ||
    MESSAGE_STATUS_OPTIONS[0];
  const indexOffset = (pagination.page_no - 1) * pagination.limit;
  const recipients = campaign?.recipients || {};
  const cost = campaign?.cost;
  const statCards = [
    { label: "Total", value: recipients.total ?? "—" },
    { label: "Pending", value: recipients.pending ?? "—" },
    { label: "Sent", value: recipients.sent ?? "—" },
    { label: "Delivered", value: recipients.delivered ?? "—" },
    { label: "Read", value: recipients.read ?? "—" },
    { label: "Failed", value: recipients.failed ?? "—" },
    ...(cost
      ? [
          {
            label: "Cost used",
            value:
              cost.used != null
                ? String(cost.used)
                : cost.total != null
                  ? String(cost.total)
                  : "—",
          },
        ]
      : []),
  ];

  if (!check("broadcast_send")) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to view campaigns.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 space-y-3 md:space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/broadcast/whatsapp/onechatting/campaigns")
                  }
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 shrink-0"
                  title="Back"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FiLayers className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                    {detailLoading
                      ? "Loading…"
                      : campaign?.name || "Campaign details"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    fetchDetails();
                    fetchMessages(
                      pagination.page_no,
                      pagination.limit,
                      msgStatus,
                    );
                  }}
                  disabled={detailLoading || messagesLoading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${detailLoading || messagesLoading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting || !campaign}
                  className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50`}
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-white">
              {detailLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-20 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <StatCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : !campaign ? (
                <div className={EMPTY_WRAP}>
                  <p className={EMPTY_TITLE}>Campaign not found</p>
                  <p className={EMPTY_SUBTITLE}>
                    It may have been deleted or the ID is invalid.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <StatusBadge status={campaign.status} />
                    <span className={CELL_BODY}>
                      {campaign.template?.template_name || "—"}
                    </span>
                    {campaign.template?.category ? (
                      <span className={CELL_META}>
                        {campaign.template.category}
                      </span>
                    ) : null}
                    {campaign.create_date ? (
                      <span className={CELL_META}>
                        Created {formatHumanDateTime(campaign.create_date)}
                      </span>
                    ) : null}
                    {campaign.send_date ? (
                      <span className={CELL_META}>
                        Sent {formatHumanDateTime(campaign.send_date)}
                      </span>
                    ) : null}
                    {campaign.schedule_date ? (
                      <span className={CELL_META}>
                        Scheduled {formatHumanDateTime(campaign.schedule_date)}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {statCards.map((item) => (
                      <StatChip
                        key={item.label}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div>
                <h2 className="text-sm font-bold text-gray-800 m-0">
                  Message statistics
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 m-0">
                  Recipient delivery progress and message-level details
                </p>
              </div>
              <div className="w-full sm:w-44 ml-auto shrink-0">
                <CustomSelect
                  options={MESSAGE_STATUS_OPTIONS}
                  value={selectedMsgStatus}
                  onChange={(option) => setMsgStatus(option?.value || "all")}
                  placeholder="All statuses"
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>

            {messagesLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[720px]">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <th className={`${TABLE_TH} w-12`}>#</th>
                      <th className={`${TABLE_TH} w-[22%]`}>Number</th>
                      <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                      <th className={`${TABLE_TH} w-[18%]`}>Send date</th>
                      <th className={`${TABLE_TH} w-[18%]`}>Created</th>
                      <th className={`${TABLE_TH} w-[26%]`}>Failed reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : messages.length === 0 ? (
              <div className={EMPTY_WRAP}>
                <p className={EMPTY_TITLE}>No messages yet</p>
                <p className={EMPTY_SUBTITLE}>
                  Recipient rows appear after entry processing completes
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed min-w-[720px]">
                    <thead>
                      <tr className={TABLE_HEAD_ROW}>
                        <th className={`${TABLE_TH} w-12`}>#</th>
                        <th className={`${TABLE_TH} w-[22%]`}>Number</th>
                        <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                        <th className={`${TABLE_TH} w-[18%]`}>Send date</th>
                        <th className={`${TABLE_TH} w-[18%]`}>Created</th>
                        <th className={`${TABLE_TH} w-[26%]`}>Failed reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((row, idx) => (
                        <tr
                          key={row.unique_id || `${row.number}-${idx}`}
                          className={TABLE_ROW}
                        >
                          <td className={`${TABLE_TD} ${CELL_INDEX}`}>
                            {indexOffset + idx + 1}
                          </td>
                          <td className={TABLE_TD}>
                            <p className={`${CELL_TITLE} truncate font-mono`}>
                              {row.number || "—"}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className={TABLE_TD}>
                            <p
                              className={
                                row.send_date ? CELL_BODY : CELL_EMPTY
                              }
                            >
                              {formatHumanDateTime(row.send_date)}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <p
                              className={
                                row.create_date ? CELL_BODY : CELL_EMPTY
                              }
                            >
                              {formatHumanDateTime(row.create_date)}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <p
                              className={`${String(row.status).toLowerCase() === "failed" && row.failed_reason ? CELL_BODY : CELL_EMPTY} truncate`}
                            >
                              {String(row.status).toLowerCase() === "failed"
                                ? row.failed_reason || "—"
                                : "—"}
                            </p>
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
                  isLastPage={
                    !pagination.has_more &&
                    pagination.page_no >= pagination.total_pages
                  }
                  rowOptions={[10, 20, 50, 100]}
                  defaultRows={20}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={runDelete}
        icon={FiAlertTriangle}
        title="Delete campaign"
        heading="Delete this campaign?"
        message={`“${campaign?.name || "This campaign"}” will be soft-deleted and removed from the list.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default OneChattingCampaignDetails;
