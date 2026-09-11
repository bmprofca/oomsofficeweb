import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiSearch,
    FiPlus,
  FiEdit2,
    FiUser,
    FiClock,
    FiCreditCard,
    FiEye,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import { DateRangePickerField } from "../../components/PortalDatePicker";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import DscFormModal from "../../components/Modals/DscFormModal";
import DscDetailsModal from "../../components/Modals/DscDetailsModal";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDaysLeft = (validityEnd) => {
  if (!validityEnd) return null;
  const target = new Date(validityEnd);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

const getClientProfilePath = (username) =>
  username ? `/client/profile/${encodeURIComponent(username)}` : null;

const daysLeftClass = (days) => {
  if (days == null) return "text-gray-400";
  if (days < 0) return "text-red-600";
  if (days <= 7) return "text-orange-600";
  if (days <= 30) return "text-amber-600";
  return "text-green-600";
};

const daysLeftLabel = (days) => {
  if (days == null) return "—";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

const matchOptionValue = (options, raw) => {
  if (!raw) return "";
  const found = (options || []).find(
    (opt) =>
      opt.value === raw ||
      opt.name === raw ||
      opt.label === raw ||
      String(opt.value) === String(raw),
  );
  return found?.value ?? raw;
};

const COLUMNS = ["#", "Client", "Company", "Type", "Password", "Validity", "Days left", "Status", "Actions"];
const GRID_COLS =
  "grid-cols-[40px_minmax(150px,1.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_minmax(140px,1.2fr)_minmax(110px,0.9fr)_92px_72px]";

const ViewDSCRegister = () => {
  const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
        return saved ? JSON.parse(saved) : false;
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
    const [dscData, setDscData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total_pages: 1, current_page: 1, total: 0 });

    const [types, setTypes] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [typeLoading, setTypeLoading] = useState(false);
    const [companyLoading, setCompanyLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
    const [dscToDelete, setDscToDelete] = useState(null);

    useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
    }, [isMinimized]);

  const fetchDscType = useCallback(async () => {
    setTypeLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assistance/dsc/types`, {
        headers: getHeaders(),
      });
            const data = await response.json();
      setTypes(data.success && Array.isArray(data.data) ? data.data : []);
    } catch {
                setTypes([]);
        } finally {
      setTypeLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assistance/dsc/companies`, {
        headers: getHeaders(),
      });
            const data = await response.json();
      setCompanies(data.success && Array.isArray(data.data) ? data.data : []);
    } catch {
                setCompanies([]);
        } finally {
      setCompanyLoading(false);
        }
  }, []);

  const fetchDscData = useCallback(
    async (nextPage = page, nextSearch = searchQuery, nextLimit = limit, range = dateRange) => {
        setLoading(true);
        try {
            const username = localStorage.getItem("user_username");
            const params = new URLSearchParams({
          search: nextSearch || "",
          page: String(nextPage),
          limit: String(nextLimit),
        });
        if (range?.start) params.append("expires_from", range.start);
        if (range?.end) params.append("expires_to", range.end);

        const response = await fetch(`${API_BASE_URL}/assistance/dsc/list?${params.toString()}`, {
          headers: getHeaders(),
        });
            const result = await response.json();
            if (result.success) {
          setDscData(
            (result.data || []).map((item) => ({
                    dsc_id: item.dsc_id,
                    username: item.client?.username,
                    name: item.client?.name || item.client?.guardian_name,
                    guardian_name: item.client?.guardian_name,
                    mobile: item.client?.mobile,
                    email: item.client?.email,
                    user_type: item.client?.user_type,
                    company: item.company,
                    validity_start: item.validity_start,
                    validity_end: item.validity_end,
              status: item.status ?? 1,
                    duration: item.year || 1,
                    password: item.password,
                    modify_by: username,
              type: item.type,
            })),
          );
          setMeta(result.meta || { total_pages: 1, current_page: nextPage, total: 0 });
          setPage(result.meta?.current_page || result.meta?.page || nextPage);
            } else {
                setDscData([]);
            }
      } catch {
            setDscData([]);
        toast.error("Failed to load DSC records");
        } finally {
            setLoading(false);
        }
    },
    [dateRange, limit, page, searchQuery],
  );

    useEffect(() => {
        fetchDscType();
        fetchCompanies();
  }, [fetchCompanies, fetchDscType]);

    useEffect(() => {
        const timer = setTimeout(() => {
      fetchDscData(1, searchQuery, limit, dateRange);
    }, 400);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, dateRange.start, dateRange.end]);

  const stats = useMemo(() => {
    const total = Number(meta.total || dscData.length);
    const active = dscData.filter((d) => Number(d.status) === 1).length;
    const expiring = dscData.filter((d) => {
      const days = getDaysLeft(d.validity_end);
      return days != null && days > 0 && days <= 30;
    }).length;
    return { total, active, expiring };
  }, [dscData, meta.total]);

  const enrichDsc = (dsc) => ({
    ...dsc,
    companyName: companies.find((c) => c.value === dsc.company || c.name === dsc.company)?.name || dsc.company,
    typeName: types.find((t) => t.value === dsc.type || t.name === dsc.type)?.name || dsc.type,
  });

  const openCreate = () => {
    setFormMode("create");
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (dsc) => {
    setDetailsOpen(false);
    setFormMode("edit");
    setFormInitial({
      ...dsc,
      company: matchOptionValue(companies, dsc.company),
      type: matchOptionValue(types, dsc.type),
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    try {
      const isEdit = formMode === "edit";
      const response = await fetch(
        `${API_BASE_URL}/assistance/dsc/${isEdit ? "edit" : "create"}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getHeaders(),
                body: JSON.stringify(payload),
        },
      );
            const data = await response.json();
            if (response.ok && data.success) {
        toast.success(isEdit ? "DSC updated" : "DSC created");
        setFormOpen(false);
        setFormInitial(null);
        fetchDscData(isEdit ? page : 1, searchQuery, limit, dateRange);
            } else {
        toast.error(data.message || `Failed to ${isEdit ? "update" : "create"} DSC`);
            }
    } catch {
      toast.error("Network error");
        } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dscToDelete) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assistance/dsc/delete`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ dsc_id: dscToDelete }),
      });
            const data = await response.json();
            if (response.ok && data.success) {
        toast.success("DSC deleted");
        setDeleteOpen(false);
        setDscToDelete(null);
        fetchDscData(1, searchQuery, limit, dateRange);
            } else {
        toast.error(data.message || "Failed to delete DSC");
      }
    } catch {
      toast.error("Failed to delete DSC");
        } finally {
      setSaving(false);
    }
    };

    const SkeletonRow = () => (
    <div className={`grid ${GRID_COLS} items-center border-b border-gray-100 animate-pulse`}>
      {COLUMNS.map((col) => (
        <div key={col} className="p-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
      ))}
        </div>
    );

  const openClientProfile = (username) => {
    const path = getClientProfilePath(username);
    if (path) navigate(path);
  };

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

      <div className={`pt-16 transition-all duration-300 ease-in-out ${contentInset(isMinimized)}`}>
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {[
              { label: "Total records", value: stats.total, icon: FiUser, wrap: "bg-indigo-50", iconColor: "text-indigo-600" },
              { label: "Active", value: stats.active, icon: FiCheck, wrap: "bg-emerald-50", iconColor: "text-emerald-600" },
              { label: "Expiring soon", value: stats.expiring, icon: FiClock, wrap: "bg-amber-50", iconColor: "text-amber-600" },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                            <div className="flex items-center justify-between">
                                <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0">{card.label}</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5 mb-0">{card.value}</p>
                                </div>
                    <div className={`p-1.5 rounded-lg ${card.wrap}`}>
                      <Icon className={`w-4 h-4 ${card.iconColor}`} />
                                </div>
                            </div>
                                </div>
              );
            })}
                            </div>
                            
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                    <FiCreditCard className="w-4 h-4 text-indigo-600" />
                                </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">DSC Register</h1>
                    <p className="text-xs text-gray-500 m-0">Digital signature certificates and expiry</p>
                                </div>
                            </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, mobile, email…"
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <DateRangePickerField
                      value={{ start: dateRange.start, end: dateRange.end }}
                      onChange={(range) => {
                        setDateRange({
                          start: range?.start || "",
                          end: range?.end || "",
                        });
                        setPage(1);
                      }}
                      placeholder="Expiry date (optional)"
                      mode="range"
                      initialTab="quick"
                      quickOptionKeys={["tw", "lw", "lm", "tm", "lf", "fy"]}
                      showRangeHint={false}
                      showResetButton
                      truncateRangeLabel={false}
                      buttonClassName="w-full sm:w-56 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-indigo-400 focus:outline-none"
                      wrapperClassName="w-full sm:w-56 min-w-0"
                    />
                    {dateRange.start || dateRange.end ? (
                                                                    <button
                        type="button"
                        onClick={() => {
                          setDateRange({ start: "", end: "" });
                          setPage(1);
                        }}
                        className="px-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 shrink-0"
                      >
                        Clear
                                                                    </button>
                    ) : null}
                                                                        </div>
                                                                    <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shrink-0"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add
                                                                    </button>
                                                                        </div>
                                                                        </div>
                                                </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className={`grid ${GRID_COLS} items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10`}>
                  {COLUMNS.map((col, i) => (
                    <div
                      key={col}
                      className={`p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide ${
                        i === 0 ? "text-left" : "border-l border-gray-100"
                      } ${i === COLUMNS.length - 1 ? "text-right" : "text-left"}`}
                    >
                      {col}
                                            </div>
                  ))}
                        </div>

                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : dscData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiCreditCard className="w-6 h-6 text-gray-400" />
                                                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No DSC records found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">Create a DSC entry to get started</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Create DSC
                    </button>
                                                </div>
                                    ) : (
                  dscData.map((dsc, index) => {
                                            const daysLeft = getDaysLeft(dsc.validity_end);
                    const row = enrichDsc(dsc);
                                            return (
                      <div
                                                    key={dsc.dsc_id}
                        className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                                                >
                        <div className="p-3 text-[11px] font-bold text-gray-800">
                          {(page - 1) * limit + index + 1}
                                                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                                                                                <button
                            type="button"
                            onClick={() => openClientProfile(dsc.username)}
                            className="flex items-center gap-2 text-left group"
                          >
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                              <FiUser className="w-3.5 h-3.5 text-white" />
                                                                                    </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-600 m-0 truncate">
                                {dsc.name || "—"}
                              </p>
                              <p className="text-xs text-gray-500 m-0 truncate">
                                {dsc.guardian_name ? `C/O ${dsc.guardian_name}` : dsc.mobile || "—"}
                              </p>
                                                                                    </div>
                                                                                </button>
                                                                                    </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 m-0 truncate">{row.companyName || "—"}</p>
                                                                                    </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 m-0 truncate">{row.typeName || "—"}</p>
                                                                                    </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 font-mono m-0 truncate">
                            {dsc.password || "—"}
                          </p>
                                                                                    </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 m-0">
                            {formatDate(dsc.validity_start)} – {formatDate(dsc.validity_end)}
                          </p>
                          <p className="text-xs text-gray-500 m-0 mt-0.5">
                            {dsc.duration} year{Number(dsc.duration) === 1 ? "" : "s"}
                          </p>
                                                                                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className={`text-sm font-semibold m-0 ${daysLeftClass(daysLeft)}`}>
                            {daysLeftLabel(daysLeft)}
                          </p>
                                                                                        </div>
                        <div className="p-3 border-l border-gray-100">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              Number(dsc.status) === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {Number(dsc.status) === 1 ? "Active" : "Inactive"}
                          </span>
                                                                                        </div>
                        <div className="p-3 border-l border-gray-100 flex justify-end">
                          <EmailActionMenu
                            items={[
                              { label: "View details", icon: FiEye, onClick: () => { setSelectedDetail(row); setDetailsOpen(true); } },
                              { label: "Edit", icon: FiEdit2, onClick: () => openEdit(dsc) },
                              { label: "View profile", icon: FiUser, onClick: () => openClientProfile(dsc.username) },
                              { label: "Delete", icon: FiTrash2, danger: true, onClick: () => { setDscToDelete(dsc.dsc_id); setDeleteOpen(true); } },
                            ]}
                          />
                                                                                        </div>
                                                                                        </div>
                                            );
                                        })
                                    )}
                                                </div>
                                            </div>

            <TablePagination
              page={page}
              limit={limit}
              total={Number(meta.total || 0)}
              totalPages={Number(meta.total_pages || 1)}
              defaultRows={10}
              rowOptions={[10, 20, 50, 100]}
              onPageChange={(next) => {
                setPage(next);
                fetchDscData(next, searchQuery, limit, dateRange);
              }}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
                fetchDscData(1, searchQuery, next, dateRange);
              }}
            />
                                                        </div>
                                                            </div>
                                    </div>

      <DscFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        companies={companies}
        types={types}
        companyLoading={companyLoading}
        typeLoading={typeLoading}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setFormInitial(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <DscDetailsModal
        open={detailsOpen}
        dsc={selectedDetail}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedDetail(null);
        }}
        onEdit={openEdit}
      />

      <ConfirmActionModal
        isOpen={deleteOpen}
        title="Delete DSC"
        heading="Delete this DSC record?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={saving}
        tone="danger"
        onCancel={() => {
          if (saving) return;
          setDeleteOpen(false);
          setDscToDelete(null);
        }}
        onConfirm={handleDelete}
      />
        </div>
    );
};

export default ViewDSCRegister;
