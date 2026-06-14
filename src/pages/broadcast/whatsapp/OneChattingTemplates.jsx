import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFileText,
  FiHome,
  FiLink,
  FiLoader,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import OneChattingTemplatePreview from "./OneChattingTemplatePreview";
import {
  buildTemplatePreviewContent,
  getTemplatePlaceholders,
  getTemplatePreviewText,
} from "./oneChattingSendUtils";
import { normalizeList, normalizePagination, whatsappApi } from "./whatsappApi";

const TABS = [
  { id: "mapping", label: "Template Mapping" },
  { id: "list", label: "Template List" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
];

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toUpperCase();
  const styles = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[normalized] || "bg-gray-100 text-gray-600"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

const MappingStatusBadge = ({ isSet }) =>
  isSet ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Mapped
    </span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Not mapped
    </span>
  );

const buildExamplePreviewContent = (templateDef) => {
  if (!templateDef) return null;

  const values = {};
  getTemplatePlaceholders(templateDef).forEach((field) => {
    if (field.example) values[field.key] = field.example;
  });

  return buildTemplatePreviewContent(templateDef, values);
};

const OneChattingTemplates = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [activeTab, setActiveTab] = useState("mapping");

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingRows, setMappingRows] = useState([]);
  const [mappingSearchInput, setMappingSearchInput] = useState("");
  const [mappingSearch, setMappingSearch] = useState("");

  const fetchTemplates = useCallback(
    async (page = 1, limit = 20, searchTerm = "", status = "") => {
      setListLoading(true);
      try {
        const params = { page_no: page, limit };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (status) params.status = status;

        const res = await whatsappApi.getTemplateList(params);
        setRows(normalizeList(res?.data));
        setPagination(normalizePagination(res?.pagination));
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load templates",
        );
        setRows([]);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const fetchTemplateMappings = useCallback(async () => {
    setMappingLoading(true);
    try {
      const res = await whatsappApi.getTemplateMapList();
      setMappingRows(normalizeList(res?.data));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to load template mappings",
      );
      setMappingRows([]);
    } finally {
      setMappingLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (activeTab !== "list") return;
    fetchTemplates(1, pagination.limit, search, statusFilter);
  }, [activeTab, search, statusFilter, fetchTemplates]);

  useEffect(() => {
    if (activeTab !== "mapping") return;
    fetchTemplateMappings();
  }, [activeTab, fetchTemplateMappings]);

  const previewContent = useMemo(
    () => buildExamplePreviewContent(selectedTemplate?.template),
    [selectedTemplate],
  );

  const filteredMappingRows = useMemo(() => {
    const term = mappingSearch.trim().toLowerCase();
    if (!term) return mappingRows;

    return mappingRows.filter((item) =>
      [item.name, item.description, item.onechatting_template_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [mappingRows, mappingSearch]);

  const mappedCount = useMemo(
    () => mappingRows.filter((item) => item.is_set).length,
    [mappingRows],
  );

  const handleListSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleMappingSearch = (e) => {
    e.preventDefault();
    setMappingSearch(mappingSearchInput.trim());
  };

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchTemplates(1, limit, search, statusFilter);
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    fetchTemplates(page, pagination.limit, search, statusFilter);
  };

  const renderMappingTab = () => (
    <>
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <FiLink className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Template Mapping
            </h2>
            <p className="text-xs text-gray-500">
              {mappedCount} of {mappingRows.length} template
              {mappingRows.length === 1 ? "" : "s"} mapped
            </p>
          </div>
        </div>

        <form
          onSubmit={handleMappingSearch}
          className="flex items-center gap-2 w-full lg:w-auto"
        >
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={mappingSearchInput}
              onChange={(e) => setMappingSearchInput(e.target.value)}
              placeholder="Search mappings..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            Search
          </button>
          <button
            type="button"
            onClick={fetchTemplateMappings}
            disabled={mappingLoading}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${mappingLoading ? "animate-spin" : ""}`}
            />
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                OOMS Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                OneChatting Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {mappingLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {Array.from({ length: 4 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-full max-w-[180px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredMappingRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No template mappings found.
                </td>
              </tr>
            ) : (
              filteredMappingRows.map((item) => (
                <tr key={item.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 m-0 capitalize">
                      {item.name}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.description || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {item.onechatting_template_name ? (
                      <span className="font-medium">
                        {item.onechatting_template_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <MappingStatusBadge isSet={Boolean(item.is_set)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderListTab = () => (
    <>
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <FiFileText className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Template List
            </h2>
            <p className="text-xs text-gray-500">
              {pagination.total} template{pagination.total === 1 ? "" : "s"}{" "}
              found
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <form
            onSubmit={handleListSearch}
            className="flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <div className="relative flex-1 sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() =>
                fetchTemplates(
                  pagination.page_no,
                  pagination.limit,
                  search,
                  statusFilter,
                )
              }
              disabled={listLoading}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${listLoading ? "animate-spin" : ""}`}
              />
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Preview
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {listLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {Array.from({ length: 5 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-full max-w-[180px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No templates found.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr
                  key={item.template_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTemplate(item)}
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 m-0">
                      {item.template_name}
                    </p>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">
                      ID: {item.template_id}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.category || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 uppercase">
                    {item.template?.language || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {getTemplatePreviewText(item.template)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!listLoading && pagination.total_pages > 1 ? (
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page</span>
            <select
              value={pagination.limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={pagination.page_no <= 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              <FiChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pagination.page_no - 1)}
              disabled={pagination.page_no <= 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-gray-600">
              Page {pagination.page_no} of {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pagination.page_no + 1)}
              disabled={pagination.page_no >= pagination.total_pages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pagination.total_pages)}
              disabled={pagination.page_no >= pagination.total_pages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              <FiChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
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

      <div
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link
              to="/broadcast/whatsapp"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiSend className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">
              OneChatting Templates
            </span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              OneChatting Templates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage OOMS template mappings and view OneChatting template
              library
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 pt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-6 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? "border-green-500 text-green-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "mapping" ? renderMappingTab() : renderListTab()}
          </div>
        </div>
      </div>

      {selectedTemplate ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedTemplate(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-800 m-0 truncate">
                  {selectedTemplate.template_name}
                </h3>
                <p className="text-xs text-gray-500 m-0 mt-0.5">
                  {selectedTemplate.category} ·{" "}
                  {selectedTemplate.template?.language || "en"} ·{" "}
                  {selectedTemplate.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 m-0">
                  Template body
                </p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 m-0">
                  {getTemplatePreviewText(selectedTemplate.template)}
                </pre>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 m-0">
                  WhatsApp preview
                </p>
                <div className="rounded-xl bg-[#e5ddd5] p-4 flex justify-center">
                  {previewContent ? (
                    <OneChattingTemplatePreview content={previewContent} />
                  ) : (
                    <p className="text-sm text-gray-500 m-0">
                      Preview unavailable.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OneChattingTemplates;
