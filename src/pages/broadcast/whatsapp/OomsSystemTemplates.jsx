import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiEdit2,
  FiFileText,
  FiInfo,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import OomsSystemTemplatePickerModal from "../../../components/Modals/OomsSystemTemplatePickerModal";
import EmailActionMenu from "../email/EmailActionMenu";
import { useUserPermissions } from "../../../utils/permission-helper";
import { extractApiError } from "../../../utils/oneChattingSendUtils";
import { formatActivityType } from "../../../utils/oomsSystemTemplateUtils";
import { normalizeList, whatsappApi } from "../../../services/whatsappApi";
import { useWhatsappChannel } from "../../../hooks/useWhatsappChannel";

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

const OomsSystemTemplates = () => {
  const { check } = useUserPermissions();
  const whatsappChannel = useWhatsappChannel();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState(null);
  const [pickerType, setPickerType] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.getWpSystemTemplateMapList();
      setRows(normalizeList(res?.data));
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load template mappings"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((item) =>
      [
        item.type,
        item.name,
        item.description,
        item.template_name,
        item.category,
        item.content_preview,
        ...(item.available_templates || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, safePage, limit]);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const handleUnset = async (type) => {
    if (!type) return;

    setActionType(type);
    try {
      const res = await whatsappApi.unsetWpSystemTemplateMap({ type });
      toast.success(res?.message || "Template mapping removed");
      setRows((prev) =>
        prev.map((row) =>
          row.type === type
            ? {
                ...row,
                is_set: false,
                map_id: null,
                template_name: null,
                status: 0,
                category: null,
                content_preview: null,
                selected_template: null,
              }
            : row,
        ),
      );
    } catch (error) {
      toast.error(extractApiError(error, "Failed to remove template mapping"));
    } finally {
      setActionType(null);
    }
  };

  const handlePickerSaved = (savedData) => {
    if (!savedData?.type) {
      fetchMappings();
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.type === savedData.type
          ? {
              ...row,
              is_set: true,
              map_id: savedData.map_id ?? row.map_id,
              template_name: savedData.template_name ?? row.template_name,
              status: savedData.status ?? 1,
              category:
                savedData.template?.category ??
                savedData.category ??
                row.category,
              content_preview:
                savedData.template?.content_preview ??
                savedData.content_preview ??
                row.content_preview,
              selected_template: savedData.template ?? row.selected_template,
            }
          : row,
      ),
    );
  };

  const getRowActionItems = (item) => {
    const busy = Boolean(actionType);
    const items = [
      {
        label: item.is_set ? "Change" : "Configure",
        icon: FiEdit2,
        disabled: busy,
        onClick: () => setPickerType(item.type),
      },
    ];
    if (item.is_set) {
      items.push({
        label: actionType === item.type ? "Removing…" : "Remove",
        icon: FiX,
        danger: true,
        disabled: busy,
        onClick: () => handleUnset(item.type),
      });
    }
    return items;
  };

  if (!check("broadcast_config_edit")) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 ease-in-out h-[calc(100vh-4rem)] ${
            isMinimized ? "md:pl-20" : "md:pl-[260px]"
          }`}
        >
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiLock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Access Denied
            </h3>
            <p className="text-slate-500 text-sm">
              You do not have permission to view this page.
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
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              OOMS System WhatsApp Templates
            </h1>
          </div>

          {whatsappChannel !== "ooms system" ? (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex gap-3">
              <FiInfo className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900 m-0">
                Your branch WhatsApp channel is currently{" "}
                <span className="font-medium capitalize">
                  {whatsappChannel || "disabled"}
                </span>
                . Set it to OOMS System on the broadcast page for these mappings
                to take effect.
              </p>
            </div>
          ) : null}

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFileText className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-800 m-0">
                  Template mappings
                </h2>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search types..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchMappings}
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">
                      #
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-full max-w-[180px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : pagedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 sm:px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No template types found.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((item, index) => (
                      <tr key={item.type} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 tabular-nums">
                          {(safePage - 1) * limit + index + 1}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 m-0">
                            {formatActivityType(item.type || item.name)}
                          </p>
                          <p className="text-xs text-gray-500 m-0 mt-0.5">
                            {item.description ||
                              (item.available_templates?.length
                                ? `${item.available_templates.length} template${
                                    item.available_templates.length === 1
                                      ? ""
                                      : "s"
                                  } available`
                                : "No templates configured yet")}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <MappingStatusBadge isSet={Boolean(item.is_set)} />
                          {item.is_set && item.category ? (
                            <p className="text-xs text-gray-500 m-0 mt-1">
                              {item.category}
                            </p>
                          ) : null}
                          {item.is_set && item.template_name ? (
                            <p className="text-xs text-gray-400 m-0 mt-0.5 font-mono">
                              {item.template_name}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 sm:px-6 py-4 max-w-md">
                          {item.content_preview ? (
                            <p
                              className="text-sm text-gray-600 m-0 line-clamp-2"
                              title={item.content_preview}
                            >
                              {item.content_preview}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-end">
                            <EmailActionMenu items={getRowActionItems(item)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safePage}
              limit={limit}
              total={total}
              totalPages={totalPages}
              rowOptions={[5, 10, 20, 50]}
              defaultRows={20}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pickerType ? (
          <OomsSystemTemplatePickerModal
            key={pickerType}
            activityType={pickerType}
            onClose={() => setPickerType(null)}
            onSaved={handlePickerSaved}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default OomsSystemTemplates;
