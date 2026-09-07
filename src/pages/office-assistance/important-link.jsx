import React, { useCallback, useEffect, useState } from "react";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiLink,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import ImportantLinkFormModal from "../../components/Modals/ImportantLinkFormModal";
import ImportantLinkDetailsModal from "../../components/Modals/ImportantLinkDetailsModal";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    try {
      return new URL(`https://${url}`).hostname;
    } catch {
      return url || "—";
    }
  }
};

const copyText = async (text, label) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};

const COLUMNS = ["#", "Link", "Username", "Password", "Remarks", "Actions"];
const GRID_COLS =
  "grid-cols-[40px_minmax(180px,1.6fr)_minmax(130px,1fr)_minmax(120px,0.9fr)_minmax(140px,1.2fr)_72px]";

const ImportantLinks = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total_pages: 1, page: 1, total: 0 });
  const [showPassword, setShowPassword] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchLinks = useCallback(async (nextPage = page, nextSearch = searchQuery, nextLimit = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: nextSearch || "",
        page: String(nextPage),
        limit: String(nextLimit),
      });
      const response = await fetch(`${API_BASE_URL}/assistance/important-link/list?${params.toString()}`, {
        headers: getHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        setLinks(result.data || []);
        setMeta(result.meta || { total_pages: 1, page: nextPage, total: 0 });
        setPage(result.meta?.current_page || result.meta?.page || nextPage);
      } else {
        setLinks([]);
        toast.error(result.message || "Failed to load links");
      }
    } catch {
      setLinks([]);
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLinks(1, searchQuery, limit);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const openCreate = () => {
    setFormMode("create");
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (link) => {
    setDetailsOpen(false);
    setFormMode("edit");
    setFormInitial(link);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    try {
      const isEdit = formMode === "edit";
      const response = await fetch(
        `${API_BASE_URL}/assistance/important-link/${isEdit ? "edit" : "create"}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(isEdit ? "Link updated" : "Link created");
        setFormOpen(false);
        setFormInitial(null);
        fetchLinks(isEdit ? page : 1, searchQuery, limit);
      } else {
        toast.error(data.message || `Failed to ${isEdit ? "update" : "create"} link`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assistance/important-link/delete`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ link_id: linkToDelete.link_id }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Link deleted");
        setDeleteOpen(false);
        setLinkToDelete(null);
        fetchLinks(1, searchQuery, limit);
      } else {
        toast.error(data.message || "Failed to delete link");
      }
    } catch {
      toast.error("Failed to delete link");
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
                    <FiLink className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">Important Links</h1>
                    <p className="text-xs text-gray-500 m-0">Portal URLs and credentials</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, URL, username…"
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
              <div className="min-w-[860px]">
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
                ) : links.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiLink className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No links found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">Add your first important link</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Add link
                    </button>
                  </div>
                ) : (
                  links.map((link, index) => (
                    <div
                      key={link.link_id}
                      className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                    >
                      <div className="p-3 text-[11px] font-bold text-gray-800">
                        {(page - 1) * limit + index + 1}
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="font-semibold text-gray-800 text-sm m-0 truncate">{link.name || "—"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-500 m-0 truncate">{extractDomain(link.url)}</p>
                          {link.url ? (
                            <>
                              <button
                                type="button"
                                onClick={() => copyText(link.url, "URL")}
                                className="p-0.5 text-gray-400 hover:text-indigo-600"
                                title="Copy URL"
                              >
                                <FiCopy className="w-3 h-3" />
                              </button>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-gray-400 hover:text-indigo-600"
                                title="Open"
                              >
                                <FiExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-700 m-0 truncate">{link.username || "—"}</p>
                          {link.username ? (
                            <button
                              type="button"
                              onClick={() => copyText(link.username, "Username")}
                              className="p-0.5 text-gray-400 hover:text-indigo-600 shrink-0"
                            >
                              <FiCopy className="w-3 h-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-700 font-mono m-0 truncate">
                            {link.password
                              ? showPassword[link.link_id]
                                ? link.password
                                : "••••••••"
                              : "—"}
                          </p>
                          {link.password ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((prev) => ({
                                    ...prev,
                                    [link.link_id]: !prev[link.link_id],
                                  }))
                                }
                                className="p-0.5 text-gray-400 hover:text-indigo-600 shrink-0"
                              >
                                {showPassword[link.link_id] ? (
                                  <FiEyeOff className="w-3 h-3" />
                                ) : (
                                  <FiEye className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(link.password, "Password")}
                                className="p-0.5 text-gray-400 hover:text-indigo-600 shrink-0"
                              >
                                <FiCopy className="w-3 h-3" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="text-sm font-medium text-gray-700 m-0 truncate">{link.remark || "—"}</p>
                      </div>
                      <div className="p-3 border-l border-gray-100 flex justify-end">
                        <EmailActionMenu
                          items={[
                            { label: "View details", icon: FiEye, onClick: () => { setSelectedDetail(link); setDetailsOpen(true); } },
                            { label: "Edit", icon: FiEdit2, onClick: () => openEdit(link) },
                            link.url
                              ? { label: "Open link", icon: FiExternalLink, onClick: () => window.open(link.url, "_blank", "noopener,noreferrer") }
                              : null,
                            { label: "Delete", icon: FiTrash2, danger: true, onClick: () => { setLinkToDelete(link); setDeleteOpen(true); } },
                          ]}
                        />
                      </div>
                    </div>
                  ))
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
                fetchLinks(next, searchQuery, limit);
              }}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
                fetchLinks(1, searchQuery, next);
              }}
            />
          </div>
        </div>
      </div>

      <ImportantLinkFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setFormInitial(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ImportantLinkDetailsModal
        open={detailsOpen}
        link={selectedDetail}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedDetail(null);
        }}
        onEdit={openEdit}
      />

      <ConfirmActionModal
        isOpen={deleteOpen}
        title="Delete link"
        heading={`Delete ${linkToDelete?.name || "this link"}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={saving}
        tone="danger"
        onCancel={() => {
          if (saving) return;
          setDeleteOpen(false);
          setLinkToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ImportantLinks;
