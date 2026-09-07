import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiSearch, FiPlus, FiEdit2, FiUser, FiFileText, FiEye, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import FileIndexFormModal from "../../components/Modals/FileIndexFormModal";
import FileIndexDetailsModal from "../../components/Modals/FileIndexDetailsModal";
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

const mapFileIndexToUI = (item) => ({
  indexid: item.index_id,
  firmid: item.firm_id,
  firmname: item.firmname || item.firm_name || "",
  mobile: item.create_by?.mobile || "",
  email: item.create_by?.email || "",
  gst: item.gst || "",
  audit: item.audit || "",
  income_tax: item.it || "",
  other: item.others || "",
  name: item.create_by?.name || "",
  guardianname: item.create_by?.guardianname || item.guardian_name || "",
  createddate: item.create_date || "",
});

const COLUMNS = ["#", "Firm", "GST", "Audit", "ITR", "Other", "Created", "Actions"];
const GRID_COLS =
  "grid-cols-[40px_minmax(180px,1.6fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,0.9fr)_72px]";

const ViewFileIndex = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileData, setFileData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total_pages: 1, current_page: 1, total: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchFileData = useCallback(async (nextPage = page, nextSearch = searchQuery, nextLimit = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: nextSearch || "",
        page: String(nextPage),
        limit: String(nextLimit),
      });
      const response = await fetch(`${API_BASE_URL}/assistance/file-index/list?${params.toString()}`, {
        headers: getHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        setFileData((result.data || []).map(mapFileIndexToUI));
        setMeta(result.meta || { total_pages: 1, current_page: nextPage, total: 0 });
        setPage(result.meta?.current_page || result.meta?.page || nextPage);
      } else {
        setFileData([]);
        toast.error(result.message || "Failed to load file index");
      }
    } catch {
      setFileData([]);
      toast.error("Failed to load file index");
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFileData(1, searchQuery, limit);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const stats = useMemo(() => {
    const total = Number(meta.total || fileData.length);
    const gst = fileData.filter((f) => f.gst).length;
    const audit = fileData.filter((f) => f.audit).length;
    return { total, gst, audit };
  }, [fileData, meta.total]);

  const openCreate = () => {
    setFormMode("create");
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (file) => {
    setDetailsOpen(false);
    setFormMode("edit");
    setFormInitial(file);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    try {
      const isEdit = formMode === "edit";
      const response = await fetch(
        `${API_BASE_URL}/assistance/file-index/${isEdit ? "edit" : "create"}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(isEdit ? "File index updated" : "File index created");
        setFormOpen(false);
        setFormInitial(null);
        fetchFileData(isEdit ? page : 1, searchQuery, limit);
      } else {
        toast.error(data.message || `Failed to ${isEdit ? "update" : "create"} file index`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assistance/file-index/delete`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({
          index_id: fileToDelete.indexid,
          firm_id: fileToDelete.firmid,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("File index deleted");
        setDeleteOpen(false);
        setFileToDelete(null);
        fetchFileData(1, searchQuery, limit);
      } else {
        toast.error(data.message || "Failed to delete file index");
      }
    } catch {
      toast.error("Failed to delete file index");
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {[
              { label: "Total records", value: stats.total, wrap: "bg-indigo-50", iconColor: "text-indigo-600" },
              { label: "GST files", value: stats.gst, wrap: "bg-emerald-50", iconColor: "text-emerald-600" },
              { label: "Audit files", value: stats.audit, wrap: "bg-amber-50", iconColor: "text-amber-600" },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0">{card.label}</p>
                    <p className="text-base font-bold text-gray-800 mt-0.5 mb-0">{card.value}</p>
                  </div>
                  <div className={`p-1.5 rounded-lg ${card.wrap}`}>
                    <FiFileText className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                    <FiFileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">File Index</h1>
                    <p className="text-xs text-gray-500 m-0">GST, audit, ITR and other file numbers</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search firm or file number…"
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
              <div className="min-w-[980px]">
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
                ) : fileData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiFileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No file index records found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">Create a file index entry to get started</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Create file index
                    </button>
                  </div>
                ) : (
                  fileData.map((file, index) => (
                    <div
                      key={file.indexid}
                      className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                    >
                      <div className="p-3 text-[11px] font-bold text-gray-800">
                        {(page - 1) * limit + index + 1}
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                            <FiUser className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm m-0 truncate">
                              {file.firmname || "—"}
                            </p>
                            <p className="text-xs text-gray-500 m-0 truncate">
                              {file.name ? `By ${file.name}` : file.mobile || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {["gst", "audit", "income_tax", "other"].map((key) => (
                        <div key={key} className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 font-mono m-0 truncate">
                            {file[key] || "—"}
                          </p>
                        </div>
                      ))}
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="text-sm font-medium text-gray-700 m-0">{formatDate(file.createddate)}</p>
                      </div>
                      <div className="p-3 border-l border-gray-100 flex justify-end">
                        <EmailActionMenu
                          items={[
                            { label: "View details", icon: FiEye, onClick: () => { setSelectedDetail(file); setDetailsOpen(true); } },
                            { label: "Edit", icon: FiEdit2, onClick: () => openEdit(file) },
                            { label: "Delete", icon: FiTrash2, danger: true, onClick: () => { setFileToDelete(file); setDeleteOpen(true); } },
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
                fetchFileData(next, searchQuery, limit);
              }}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
                fetchFileData(1, searchQuery, next);
              }}
            />
          </div>
        </div>
      </div>

      <FileIndexFormModal
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

      <FileIndexDetailsModal
        open={detailsOpen}
        file={selectedDetail}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedDetail(null);
        }}
        onEdit={openEdit}
      />

      <ConfirmActionModal
        isOpen={deleteOpen}
        title="Delete file index"
        heading="Delete this file index record?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={saving}
        tone="danger"
        onCancel={() => {
          if (saving) return;
          setDeleteOpen(false);
          setFileToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ViewFileIndex;
