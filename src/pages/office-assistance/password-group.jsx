import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiEye,
  FiBriefcase,
  FiSearch,
  FiFolder,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import { passwordGroupService } from "../../services/passwordGroupService";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const normalizePasswordGroupList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.groups)) return raw.groups;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
};

const isPasswordGroupActive = (status) =>
  status === true || status === "true" || String(status || "").toLowerCase() === "active";

const passwordGroupStatusLabel = (status) => (isPasswordGroupActive(status) ? "Active" : "Inactive");

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";
const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white";
const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const COLUMNS = ["#", "Group", "Firms", "Status", "Created", "Actions"];
const GRID_COLS = "grid-cols-[40px_minmax(180px,1.8fr)_minmax(100px,0.8fr)_92px_minmax(140px,1fr)_72px]";

const PasswordGroups = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: false,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (!next.has("page") && !next.has("limit")) return;
    next.delete("page");
    next.delete("limit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchGroupsData = useCallback(async (searchValue = searchTerm, pageValue = pagination.page, limitValue = pagination.limit) => {
    setLoading(true);
    try {
      const response = await passwordGroupService.listGroups({
        search: searchValue,
        page: pageValue,
        limit: limitValue,
      });
      const result = response.data;
      if (result.success) {
        setGroups(normalizePasswordGroupList(result.data));
        setPagination({
          page: result.meta?.page || 1,
          limit: result.meta?.limit || 20,
          total: result.meta?.total || 0,
          total_pages: result.meta?.total_pages || 1,
          is_last_page: result.meta?.is_last_page || false,
        });
        if (searchValue?.trim()) {
          setSearchParams({ search: searchValue.trim() }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      } else {
        toast.error(result.message || "Failed to fetch groups");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, searchTerm, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroupsData(searchTerm, 1, pagination.limit);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openCreate = () => {
    setFormMode("create");
    setFormName("");
    setFormStatus("active");
    setSelectedGroup(null);
    setFormOpen(true);
  };

  const openEdit = (group) => {
    setDetailsOpen(false);
    setFormMode("edit");
    setSelectedGroup(group);
    setFormName(group.group_name || "");
    setFormStatus(isPasswordGroupActive(group.status) ? "active" : "inactive");
    setFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "edit" && selectedGroup) {
        const response = await passwordGroupService.editGroup(selectedGroup.group_id, {
          group_name: formName.trim(),
          status: formStatus === "active",
        });
        const result = response.data;
        if (result.success) {
          toast.success("Group updated");
          setFormOpen(false);
          fetchGroupsData(searchTerm, pagination.page, pagination.limit);
        } else {
          toast.error(result.message || "Failed to update group");
        }
      } else {
        const response = await passwordGroupService.createGroup({ group_name: formName.trim() });
        const result = response.data;
        if (result.success) {
          toast.success("Group created");
          setFormOpen(false);
          fetchGroupsData(searchTerm, 1, pagination.limit);
        } else {
          toast.error(result.message || "Failed to create group");
        }
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const response = await passwordGroupService.deleteGroup(selectedGroup.group_id);
      const result = response.data;
      if (result.success) {
        toast.success("Group deleted");
        setDeleteOpen(false);
        setSelectedGroup(null);
        fetchGroupsData(searchTerm, 1, pagination.limit);
      } else {
        toast.error(result.message || "Failed to delete group");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewGroupFirms = (group) => {
    navigate(`/staff/office-assistance/password-group/${group.group_id}/firms`, {
      state: { group_name: group.group_name },
    });
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                    <FiKey className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">Password Groups</h1>
                    <p className="text-xs text-gray-500 m-0">Credential groups for your office</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by group name…"
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
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
              <div className="min-w-[820px]">
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
                ) : groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiFolder className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No password groups found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">Create a group to store firm credentials</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Create group
                    </button>
                  </div>
                ) : (
                  groups.map((group, index) => (
                    <div
                      key={group.group_id}
                      className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                    >
                      <div className="p-3 text-[11px] font-bold text-gray-800">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleViewGroupFirms(group)}
                          className="flex items-center gap-2 text-left group"
                        >
                          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                            <FiFolder className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-600 m-0 truncate">
                              {group.group_name}
                            </p>
                            {group.description ? (
                              <p className="text-xs text-gray-500 m-0 truncate">{group.description}</p>
                            ) : null}
                          </div>
                        </button>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleViewGroupFirms(group)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                        >
                          <FiBriefcase className="w-3 h-3" />
                          {group.unique_firms || 0}
                        </button>
                      </div>
                      <div className="p-3 border-l border-gray-100">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            isPasswordGroupActive(group.status)
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {passwordGroupStatusLabel(group.status)}
                        </span>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="text-sm font-medium text-gray-700 m-0">{formatDate(group.create_date)}</p>
                        {group.created_by?.name ? (
                          <p className="text-xs text-gray-500 m-0 truncate">{group.created_by.name}</p>
                        ) : null}
                      </div>
                      <div className="p-3 border-l border-gray-100 flex justify-end">
                        <EmailActionMenu
                          items={[
                            { label: "View details", icon: FiEye, onClick: () => { setSelectedGroup(group); setDetailsOpen(true); } },
                            { label: "View firms", icon: FiBriefcase, onClick: () => handleViewGroupFirms(group) },
                            { label: "Edit", icon: FiEdit2, onClick: () => openEdit(group) },
                            {
                              label: "Delete",
                              icon: FiTrash2,
                              danger: true,
                              disabled: (group.unique_firms ?? 0) > 0,
                              onClick: () => {
                                setSelectedGroup(group);
                                setDeleteOpen(true);
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <TablePagination
              showRange
              showRows
              rowOptions={[10, 20, 50, 100]}
              defaultRows={20}
              showJump
              showFirstLast
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              isLastPage={pagination.is_last_page}
              onPageChange={(nextPage) => fetchGroupsData(searchTerm, nextPage, pagination.limit)}
              onLimitChange={(nextLimit) => fetchGroupsData(searchTerm, 1, nextLimit)}
            />
          </div>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {formOpen ? (
              <motion.div
                key="pg-form-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  aria-label="Close"
                  onClick={saving ? undefined : () => setFormOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[min(calc(100vh-1.5rem),100dvh)] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-800 m-0">
                        {formMode === "edit" ? "Update group" : "Create group"}
                      </h3>
                      <p className="text-xs text-gray-500 m-0">
                        {formMode === "edit" ? "Rename or change status" : "Add a credential group"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormOpen(false)}
                      disabled={saving}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className={MODAL_BODY}>
                      <label className={FIELD_LABEL}>
                        Group name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={FIELD_INPUT}
                        placeholder="e.g. Banking portals"
                        autoFocus
                        disabled={saving}
                      />
                      {formMode === "edit" ? (
                        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <p className="text-sm font-semibold text-gray-800 m-0">Status</p>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formStatus === "active"}
                            onClick={() => setFormStatus(formStatus === "active" ? "inactive" : "active")}
                            className={`relative h-7 w-11 rounded-full transition-colors ${
                              formStatus === "active" ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                formStatus === "active" ? "translate-x-4" : ""
                              }`}
                            />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setFormOpen(false)}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !formName.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : null}
                        {formMode === "edit" ? "Update" : "Create"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {detailsOpen && selectedGroup ? (
              <motion.div
                key="pg-details-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  onClick={() => setDetailsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
                >
                  <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
                    <div>
                      <h3 className="text-base font-bold text-gray-800 m-0">Group details</h3>
                      <p className="text-xs text-gray-500 m-0">{selectedGroup.group_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(false)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={MODAL_BODY}>
                    {[
                      ["Group name", selectedGroup.group_name],
                      ["Status", passwordGroupStatusLabel(selectedGroup.status)],
                      ["Credentials", selectedGroup.total_credentials ?? 0],
                      ["Firms", selectedGroup.unique_firms ?? 0],
                      ["Created by", selectedGroup.created_by?.name || "—"],
                      ["Created on", formatDate(selectedGroup.create_date)],
                    ].map(([label, value], i, arr) => (
                      <div
                        key={label}
                        className={`flex items-start justify-between gap-4 py-2.5 ${
                          i === arr.length - 1 ? "" : "border-b border-gray-100"
                        }`}
                      >
                        <span className="text-xs font-semibold text-gray-500">{label}</span>
                        <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(selectedGroup)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      <ConfirmActionModal
        isOpen={deleteOpen}
        title="Delete group"
        heading={`Delete ${selectedGroup?.group_name || "this group"}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={saving}
        tone="danger"
        onCancel={() => {
          if (saving) return;
          setDeleteOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default PasswordGroups;
