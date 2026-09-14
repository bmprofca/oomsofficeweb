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

const TABLE_TH =
  "p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_TD = "p-3 text-left align-middle";

const MappingStatusBadge = ({ isSet }) =>
  isSet ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      Mapped
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
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

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

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
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
        >
          <div className="mx-4 w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <FiLock className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="m-0 text-sm font-medium text-gray-500">
              Access Denied
            </h3>
            <p className="m-0 mt-1 text-xs text-gray-400">
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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
          <div className="mb-3">
            <h1 className="m-0 text-base font-bold text-gray-800 md:text-lg">
              OOMS System WhatsApp Templates
            </h1>
            <p className="m-0 mt-0.5 text-xs text-gray-500">
              Map notification types to platform WhatsApp templates.
            </p>
          </div>

          {whatsappChannel !== "ooms system" ? (
            <div className="mb-3 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="m-0 text-sm font-medium text-blue-900">
                Your branch WhatsApp channel is currently{" "}
                <span className="font-semibold capitalize">
                  {whatsappChannel || "disabled"}
                </span>
                . Set it to OOMS System on the broadcast page for these mappings
                to take effect.
              </p>
            </div>
          ) : null}

          <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <FiFileText className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="m-0 truncate text-base font-bold text-gray-800">
                  Template mappings
                </h2>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-64">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search types…"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchMappings}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <tr>
                    <th className={`${TABLE_TH} w-14`}>#</th>
                    <th className={TABLE_TH}>Type</th>
                    <th className={TABLE_TH}>Status</th>
                    <th className={TABLE_TH}>Content</th>
                    <th className={`${TABLE_TH} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr
                        key={index}
                        className="animate-pulse border-b border-gray-100"
                      >
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <td key={cellIndex} className={TABLE_TD}>
                            <div className="h-3 max-w-[180px] rounded bg-gray-200" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <p className="m-0 text-sm font-medium text-gray-500">
                          No template types found.
                        </p>
                        <p className="m-0 mt-1 text-xs text-gray-400">
                          Try a different search term.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((item, index) => (
                      <tr
                        key={item.type}
                        className="border-b border-gray-100 bg-white transition-colors hover:bg-gray-50"
                      >
                        <td
                          className={`${TABLE_TD} text-[11px] font-bold tabular-nums text-gray-800`}
                        >
                          {(safePage - 1) * limit + index + 1}
                        </td>
                        <td className={TABLE_TD}>
                          <p className="m-0 text-sm font-semibold text-gray-800">
                            {formatActivityType(item.type || item.name)}
                          </p>
                          <p className="m-0 mt-0.5 text-xs text-gray-400">
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
                        <td className={TABLE_TD}>
                          <MappingStatusBadge isSet={Boolean(item.is_set)} />
                          {item.is_set && item.category ? (
                            <p className="m-0 mt-1 text-xs text-gray-500">
                              {item.category}
                            </p>
                          ) : null}
                          {item.is_set && item.template_name ? (
                            <p className="m-0 mt-0.5 font-mono text-xs text-gray-400">
                              {item.template_name}
                            </p>
                          ) : null}
                        </td>
                        <td className={`${TABLE_TD} max-w-md`}>
                          {item.content_preview ? (
                            <p
                              className="m-0 line-clamp-2 text-sm font-medium text-gray-700"
                              title={item.content_preview}
                            >
                              {item.content_preview}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className={TABLE_TD}>
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
