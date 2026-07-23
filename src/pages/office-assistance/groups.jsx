import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  FiPlus,
  FiEye,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiRefreshCw,
  FiFolder,
  FiUsers,
  FiUser,
  FiMoreVertical,
} from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import { ViewportTooltip } from "../../components/ViewportTooltip";
import GroupFormModal from "../../components/Modals/GroupFormModal";
import GroupDetailsModal from "../../components/Modals/GroupDetailsModal";
import GroupDeleteConfirmModal from "../../components/Modals/GroupDeleteConfirmModal";
import { formatGroupDate } from "../../components/Modals/GroupModalParts";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

/** Task-table typography baseline — see context/typography.md */
const TABLE_HEAD_ROW = "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors group";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50";
const TOOLBAR_INPUT =
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-gray-400";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";

const SkeletonRow = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div
          className="h-3.5 bg-gray-200 rounded-full"
          style={{ width: `${55 + (i % 3) * 18}px` }}
        />
      </td>
    ))}
  </tr>
);

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

/* ─── 3-dot action menu (portal · tooltip.md) ──────────────────── */
const ActionMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const mH = menu?.offsetHeight || 140;
    const mW = menu?.offsetWidth || 144;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const candidates = [
      { top: r.top - mH - MENU_GAP, left: r.right - mW }, // top
      { top: r.bottom + MENU_GAP, left: r.right - mW }, // bottom
      { top: r.top, left: r.right + MENU_GAP }, // right
      { top: r.top, left: r.left - mW - MENU_GAP }, // left
    ];

    const fits = (p) =>
      p.top >= MENU_PAD &&
      p.left >= MENU_PAD &&
      p.top + mH <= vh - MENU_PAD &&
      p.left + mW <= vw - MENU_PAD;

    const chosen = candidates.find(fits) || candidates[1];
    setPos({
      top: Math.min(Math.max(MENU_PAD, chosen.top), vh - MENU_PAD - mH),
      left: Math.min(Math.max(MENU_PAD, chosen.left), vw - MENU_PAD - mW),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => calcPos());
    return () => cancelAnimationFrame(raf);
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onClose = () => setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", calcPos);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", calcPos);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, calcPos]);

  return (
    <>
      <ViewportTooltip label="Actions">
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Actions"
        >
          <FiMoreVertical className="w-3.5 h-3.5" />
        </button>
      </ViewportTooltip>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  zIndex: MENU_Z,
                }}
                className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden"
              >
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

const Groups = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarMinimized")) || false;
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);

  const [createForm, setCreateForm] = useState({ name: "", remark: "" });
  const [editForm, setEditForm] = useState({ name: "", remark: "" });

  const searchTimer = useRef(null);
  const abortRef = useRef(null);
  const pageRef = useRef(page);
  const limitRef = useRef(limit);
  const searchRef = useRef(searchTerm);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);
  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [mobileMenuOpen]);

  const mapGroup = (item) => ({
    group_id: item.group_id,
    name: item.name,
    remark: item.remark || "",
    firm_count: Number(item.firm_count) || 0,
    is_active: item.is_active === true || String(item.status) === "1",
    create_date: item.create_date || null,
    modify_date: item.modify_date || null,
    create_by: item.create_by || { name: "", mobile: "", email: "" },
    modify_by: item.modify_by || { name: "", mobile: "", email: "" },
  });

  const fetchGroups = useCallback(async ({
    search = "",
    pageNo = 1,
    pageLimit = 20,
  } = {}) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNo),
        limit: String(pageLimit),
      });
      if (search.trim()) params.append("search", search.trim());

      const response = await axios.get(
        `${API_BASE_URL}/group/list?${params.toString()}`,
        {
          headers: getHeaders(),
          signal: controller.signal,
        },
      );

      if (response.data?.success) {
        const rows = Array.isArray(response.data.data)
          ? response.data.data.map(mapGroup)
          : [];
        const pagination = response.data.pagination || {};
        setGroups(rows);
        setTotal(Number(pagination.total) || rows.length);
        setTotalPages(
          Math.max(
            1,
            Number(pagination.total_pages) ||
              Math.ceil((Number(pagination.total) || rows.length) / pageLimit) ||
              1,
          ),
        );
        setPage(Number(pagination.page) || pageNo);
      } else {
        setGroups([]);
        setTotal(0);
        setTotalPages(1);
        toast.error(response.data?.message || "Failed to load groups");
      }
    } catch (error) {
      if (
        axios.isCancel?.(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
        return;
      }
      console.error("Fetch groups error:", error);
      setGroups([]);
      setTotal(0);
      setTotalPages(1);
      toast.error(error.response?.data?.message || "Error loading groups");
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchGroups({ search: "", pageNo: 1, pageLimit: limit });
    return () => {
      if (abortRef.current) abortRef.current.abort();
      clearTimeout(searchTimer.current);
    };
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setLoading(true);
    setPage(1);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      fetchGroups({
        search: value,
        pageNo: 1,
        pageLimit: limitRef.current,
      });
    }, 400);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    fetchGroups({
      search: searchRef.current,
      pageNo: nextPage,
      pageLimit: limitRef.current,
    });
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
    fetchGroups({
      search: searchRef.current,
      pageNo: 1,
      pageLimit: nextLimit,
    });
  };

  const handleRefresh = () => {
    fetchGroups({
      search: searchRef.current,
      pageNo: pageRef.current,
      pageLimit: limitRef.current,
    });
  };

  const openCreate = () => {
    setCreateForm({ name: "", remark: "" });
    setShowCreateModal(true);
  };

  const openEdit = (group) => {
    setEditingGroupId(group.group_id);
    setEditForm({ name: group.name || "", remark: group.remark || "" });
    setShowEditModal(true);
  };

  const openView = (group) => {
    setSelectedGroup(group);
    setShowViewModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/group/create`,
        {
          name: createForm.name.trim(),
          remark: createForm.remark.trim() || null,
        },
        { headers: getHeaders() },
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Group created");
        setShowCreateModal(false);
        setCreateForm({ name: "", remark: "" });
        fetchGroups({
          search: searchRef.current,
          pageNo: 1,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(res.data?.message || "Create failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating group");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (!editingGroupId) {
      toast.error("No group selected");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/group/edit`,
        {
          group_id: editingGroupId,
          name: editForm.name.trim(),
          remark: editForm.remark.trim() || null,
        },
        { headers: getHeaders() },
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Group updated");
        setShowEditModal(false);
        setEditingGroupId(null);
        fetchGroups({
          search: searchRef.current,
          pageNo: pageRef.current,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(res.data?.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.group_id) return;
    setSaving(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/group/delete`, {
        headers: getHeaders(),
        data: { group_id: deleteTarget.group_id },
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Group deleted");
        setDeleteTarget(null);
        const nextPage =
          groups.length <= 1 && pageRef.current > 1
            ? pageRef.current - 1
            : pageRef.current;
        fetchGroups({
          search: searchRef.current,
          pageNo: nextPage,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(res.data?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting group");
    } finally {
      setSaving(false);
    }
  };

  const indexOffset = (page - 1) * limit;

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
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-nowrap`}>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FiFolder className="w-4 h-4 text-indigo-600" />
                </div>
                <h1 className="text-base font-bold text-gray-800 leading-tight whitespace-nowrap">
                  Groups
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto min-w-0">
                <div className="relative w-40 sm:w-52 md:w-64 min-w-0">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search groups…"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={TOOLBAR_INPUT}
                  />
                </div>
                <ViewportTooltip label="Refresh">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-gray-300 bg-white"
                    aria-label="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </ViewportTooltip>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Group</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[720px]">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={`${TABLE_TH} w-12`}>#</th>
                    <th className={`${TABLE_TH} w-[24%]`}>Name</th>
                    <th className={`${TABLE_TH} w-[24%]`}>Remark</th>
                    <th className={`${TABLE_TH} w-24`}>Firms</th>
                    <th className={`${TABLE_TH} w-[22%]`}>Modify by</th>
                    <th className={`${TABLE_TH} w-28`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                      <SkeletonRow key={`skel-${i}`} cols={6} />
                    ))
                  ) : groups.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-4">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <FiUsers className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">
                            No groups found
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchTerm.trim()
                              ? "Try a different search term"
                              : "Create a group to get started"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groups.map((group, index) => {
                      const modifierName =
                        group.modify_by?.name ||
                        group.modify_by?.username ||
                        group.create_by?.name ||
                        group.create_by?.username ||
                        "—";
                      const modifyDate =
                        group.modify_date || group.create_date;
                      return (
                        <tr key={group.group_id} className={TABLE_ROW}>
                          <td className={TABLE_TD}>
                            <span className={CELL_INDEX}>
                              {indexOffset + index + 1}
                            </span>
                          </td>
                          <td className={TABLE_TD}>
                            <div className="min-w-0 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => openView(group)}
                                className={`${CELL_TITLE} hover:text-indigo-600 transition-colors text-left truncate block max-w-full`}
                                title={group.name || undefined}
                              >
                                {group.name || "—"}
                              </button>
                            </div>
                          </td>
                          <td className={TABLE_TD}>
                            <p
                              className={`${CELL_BODY} truncate`}
                              title={group.remark || undefined}
                            >
                              {group.remark || "—"}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <Link
                              to={`/staff/office-assistance/group-firms/${encodeURIComponent(group.group_id)}`}
                              className="inline-flex items-center gap-1 no-underline hover:no-underline"
                            >
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
                                <FiUsers className="w-3 h-3 text-indigo-500" />
                                {group.firm_count}
                              </span>
                            </Link>
                          </td>
                          <td className={TABLE_TD}>
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                                <FiUser className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <p className={`${CELL_BODY} truncate`}>
                                  {modifierName}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                  {formatGroupDate(modifyDate)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={TABLE_TD}>
                            <ActionMenu
                              items={[
                                {
                                  label: "View",
                                  icon: <FiEye className="w-3.5 h-3.5" />,
                                  onClick: () => openView(group),
                                },
                                {
                                  label: "Edit",
                                  icon: <FiEdit className="w-3.5 h-3.5" />,
                                  onClick: () => openEdit(group),
                                },
                                {
                                  label: "Delete",
                                  icon: <FiTrash2 className="w-3.5 h-3.5" />,
                                  danger: true,
                                  disabled: group.firm_count > 0,
                                  onClick: () => setDeleteTarget(group),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && total > 0 ? (
              <TablePagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                rowOptions={[10, 20, 50, 100]}
                defaultRows={20}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            ) : null}
          </div>
        </div>
      </div>

      <GroupFormModal
        isOpen={showCreateModal}
        mode="create"
        form={createForm}
        onChange={setCreateForm}
        onClose={() => !saving && setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        saving={saving}
      />

      <GroupFormModal
        isOpen={showEditModal}
        mode="edit"
        form={editForm}
        onChange={setEditForm}
        onClose={() => !saving && setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        saving={saving}
      />

      <GroupDetailsModal
        isOpen={showViewModal && Boolean(selectedGroup)}
        group={selectedGroup}
        onClose={() => setShowViewModal(false)}
        onEdit={(group) => {
          setShowViewModal(false);
          openEdit(group);
        }}
      />

      <GroupDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        group={deleteTarget}
        loading={saving}
        onCancel={() => !saving && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Groups;
