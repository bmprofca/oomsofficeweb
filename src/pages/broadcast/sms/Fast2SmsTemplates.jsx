import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiEdit2,
  FiFileText,
  FiLink,
  FiLoader,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import { useSmsChannel } from "../../../hooks/useSmsChannel";
import {
  smsApi,
  FAST2SMS_ROUTE_OPTIONS,
  normalizeList,
  normalizePagination,
} from "../../../services/smsApi";

const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const FIELD_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const FIELD_LABEL =
  "block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5";

const TABS = [
  { id: "mapping", label: "Template Mapping" },
  { id: "list", label: "Template List" },
];

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

const emptyForm = () => ({
  template_id: "",
  name: "",
  dlt_message_id: "",
  message_body: "",
  variable_keys: "",
  sender_id: "",
  route: "dlt",
  status: "active",
});

const Fast2SmsTemplates = () => {
  const { check } = useUserPermissions();
  const smsChannel = useSmsChannel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [tab, setTab] = useState("mapping");
  const [mapLoading, setMapLoading] = useState(true);
  const [mapRows, setMapRows] = useState([]);
  const [mapSearch, setMapSearch] = useState("");
  const [actionType, setActionType] = useState(null);
  const [pickerType, setPickerType] = useState(null);
  const [pickerTemplate, setPickerTemplate] = useState(null);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [activeTemplates, setActiveTemplates] = useState([]);

  const [listLoading, setListLoading] = useState(false);
  const [listRows, setListRows] = useState([]);
  const [listSearch, setListSearch] = useState("");
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchMaps = useCallback(async () => {
    setMapLoading(true);
    try {
      const res = await smsApi.getTemplateMapList();
      setMapRows(normalizeList(res?.data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load mappings");
      setMapRows([]);
    } finally {
      setMapLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setListLoading(true);
      try {
        const res = await smsApi.listTemplates({
          page_no: page,
          limit,
          search: listSearch || undefined,
        });
        const list = normalizeList(res?.data);
        setListRows(list);
        setPagination(normalizePagination(res?.pagination, { page_no: page, limit }));
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load templates");
        setListRows([]);
      } finally {
        setListLoading(false);
      }
    },
    [listSearch, pagination.limit],
  );

  const loadActiveTemplates = useCallback(async () => {
    try {
      const res = await smsApi.listTemplates({ page_no: 1, limit: 100, status: "active" });
      setActiveTemplates(normalizeList(res?.data));
    } catch {
      setActiveTemplates([]);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  useEffect(() => {
    if (tab === "list") fetchTemplates(1);
  }, [tab, fetchTemplates]);

  const filteredMaps = useMemo(() => {
    const term = mapSearch.trim().toLowerCase();
    if (!term) return mapRows;
    return mapRows.filter((row) =>
      [row.type, row.description, row.sms_template_name, row.dlt_message_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [mapRows, mapSearch]);

  const openPicker = async (type) => {
    setPickerType(type);
    setPickerTemplate(null);
    await loadActiveTemplates();
  };

  const saveMap = async () => {
    if (!pickerType || !pickerTemplate?.value) {
      toast.error("Select an SMS template");
      return;
    }
    setPickerSaving(true);
    try {
      await smsApi.setTemplateMap({
        type: pickerType,
        sms_template_id: pickerTemplate.value,
      });
      toast.success("Mapping saved");
      setPickerType(null);
      fetchMaps();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save mapping");
    } finally {
      setPickerSaving(false);
    }
  };

  const unsetMap = async (type) => {
    setActionType(type);
    try {
      await smsApi.unsetTemplateMap({ type });
      toast.success("Mapping removed");
      fetchMaps();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove mapping");
    } finally {
      setActionType(null);
    }
  };

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (row) => {
    setForm({
      template_id: row.template_id,
      name: row.name || "",
      dlt_message_id: row.dlt_message_id || "",
      message_body: row.message_body || "",
      variable_keys: Array.isArray(row.variable_keys)
        ? row.variable_keys.join(",")
        : "",
      sender_id: row.sender_id || "",
      route: row.route || "dlt",
      status: row.status || "active",
    });
    setShowForm(true);
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        ...form,
        variable_keys: form.variable_keys
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };
      if (form.template_id) {
        await smsApi.updateTemplate(payload);
        toast.success("Template updated");
      } else {
        await smsApi.createTemplate(payload);
        toast.success("Template created");
      }
      setShowForm(false);
      fetchTemplates(pagination.page_no);
      fetchMaps();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save template");
    } finally {
      setFormSaving(false);
    }
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
          className={`pt-16 flex h-[calc(100vh-4rem)] items-center justify-center ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
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
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Fast2SMS Templates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create DLT templates and map them to OOMS notification types.
            </p>
          </div>

          {smsChannel !== "fast2sms" ? (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              SMS channel is currently <strong>{smsChannel || "disabled"}</strong>.
              Set it to Fast2SMS on Broadcast for these mappings to apply.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className={TOOLBAR_ROW}>
              <nav className="flex gap-4">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`border-b-2 px-1 py-1.5 text-sm font-medium ${
                      tab === item.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                {tab === "list" ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add template
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => (tab === "mapping" ? fetchMaps() : fetchTemplates(1))}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${mapLoading || listLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {tab === "mapping" ? (
              <>
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="relative max-w-sm">
                    <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className={`${FIELD_INPUT} pl-9`}
                      placeholder="Search types..."
                      value={mapSearch}
                      onChange={(e) => setMapSearch(e.target.value)}
                    />
                  </div>
                </div>
                {mapLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-500">
                    <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                    Loading mappings...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className={TABLE_TH}>#</th>
                          <th className={TABLE_TH}>Type</th>
                          <th className={TABLE_TH}>SMS template</th>
                          <th className={TABLE_TH}>Status</th>
                          <th className={TABLE_TH}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaps.map((row, index) => (
                          <tr key={row.type} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-3 text-xs font-bold text-gray-700">
                              {index + 1}
                            </td>
                            <td className="px-3 py-3">
                              <p className="m-0 text-sm font-semibold text-gray-800 capitalize">
                                {row.type}
                              </p>
                              <p className="m-0 text-xs text-gray-400">{row.description}</p>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-700">
                              {row.is_set ? (
                                <>
                                  <p className="m-0 font-medium">{row.sms_template_name}</p>
                                  <p className="m-0 text-xs text-gray-400">
                                    {row.dlt_message_id || row.route}
                                  </p>
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <MappingStatusBadge isSet={row.is_set} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPicker(row.type)}
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <FiLink className="h-3.5 w-3.5" />
                                  {row.is_set ? "Change" : "Map"}
                                </button>
                                {row.is_set ? (
                                  <button
                                    type="button"
                                    disabled={actionType === row.type}
                                    onClick={() => unsetMap(row.type)}
                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                  >
                                    {actionType === row.type ? (
                                      <FiLoader className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <FiX className="h-3.5 w-3.5" />
                                    )}
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="border-b border-gray-100 px-4 py-3">
                  <form
                    className="flex max-w-md gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      fetchTemplates(1);
                    }}
                  >
                    <input
                      className={FIELD_INPUT}
                      placeholder="Search templates..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Search
                    </button>
                  </form>
                </div>
                {listLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-500">
                    <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                    Loading templates...
                  </div>
                ) : listRows.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">
                    <FiFileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm">No templates yet. Create your first DLT template.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className={TABLE_TH}>Name</th>
                            <th className={TABLE_TH}>Route</th>
                            <th className={TABLE_TH}>Message ID</th>
                            <th className={TABLE_TH}>Status</th>
                            <th className={TABLE_TH}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listRows.map((row) => (
                            <tr
                              key={row.template_id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                                {row.name}
                              </td>
                              <td className="px-3 py-3 text-sm uppercase text-gray-600">
                                {row.route}
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-gray-600">
                                {row.dlt_message_id || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    row.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <FiEdit2 className="h-3.5 w-3.5" />
                                  Edit
                                </button>
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
                      onPageChange={(page) => fetchTemplates(page)}
                      onLimitChange={(limit) => {
                        setPagination((p) => ({ ...p, limit, page_no: 1 }));
                        fetchTemplates(1, Number(limit));
                      }}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {pickerType ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setPickerType(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border bg-white p-5 shadow-xl">
            <h3 className="m-0 text-base font-semibold text-gray-800 capitalize">
              Map: {pickerType}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Choose a Fast2SMS template for this notification type.
            </p>
            <div className="mt-4">
              <CustomSelect
                value={pickerTemplate}
                onChange={setPickerTemplate}
                options={activeTemplates.map((t) => ({
                  value: t.template_id,
                  label: `${t.name}${t.dlt_message_id ? ` (${t.dlt_message_id})` : ""}`,
                }))}
                placeholder="Select template"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickerType(null)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pickerSaving}
                onClick={saveMap}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pickerSaving ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setShowForm(false)}
          />
          <form
            onSubmit={saveTemplate}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-white p-5 shadow-xl"
          >
            <h3 className="m-0 text-base font-semibold text-gray-800">
              {form.template_id ? "Edit template" : "New Fast2SMS template"}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className={FIELD_LABEL}>Name</label>
                <input
                  className={FIELD_INPUT}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Route</label>
                <select
                  className={FIELD_INPUT}
                  value={form.route}
                  onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))}
                >
                  {FAST2SMS_ROUTE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FIELD_LABEL}>DLT Message ID</label>
                <input
                  className={FIELD_INPUT}
                  value={form.dlt_message_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dlt_message_id: e.target.value }))
                  }
                  placeholder="From Fast2SMS DLT Manager"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Message body</label>
                <textarea
                  className={FIELD_INPUT}
                  rows={3}
                  value={form.message_body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message_body: e.target.value }))
                  }
                  placeholder="Approved text with {#var#} placeholders"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Variable keys (comma separated, DLT order)</label>
                <input
                  className={FIELD_INPUT}
                  value={form.variable_keys}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, variable_keys: e.target.value }))
                  }
                  placeholder="name,otp,amount"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Sender ID override</label>
                <input
                  className={FIELD_INPUT}
                  value={form.sender_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sender_id: e.target.value.toUpperCase(),
                    }))
                  }
                  maxLength={8}
                />
              </div>
              {form.template_id ? (
                <div>
                  <label className={FIELD_LABEL}>Status</label>
                  <select
                    className={FIELD_INPUT}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {formSaving ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
                Save template
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default Fast2SmsTemplates;
