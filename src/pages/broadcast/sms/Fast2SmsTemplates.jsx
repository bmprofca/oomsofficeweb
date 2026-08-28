import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiEdit2,
  FiFileText,
  FiLink,
  FiLoader,
  FiLock,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import useDebounce from "../../../components/useDebounce";
import { useUserPermissions } from "../../../utils/permission-helper";
import { useSmsChannel } from "../../../hooks/useSmsChannel";
import {
  smsApi,
  FAST2SMS_ROUTE_OPTIONS,
  normalizeList,
  normalizePagination,
} from "../../../services/smsApi";

const TOOLBAR_ROW =
  "flex flex-wrap items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const FIELD_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const FIELD_LABEL =
  "block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5";
const TOOLBAR_SEARCH_INPUT =
  "w-full pl-9 pr-9 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-400";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_SUB = "text-xs text-gray-400";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";
const MODAL_BODY_CLASS =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const SearchField = ({
  value,
  onChange,
  placeholder,
  className = "w-full sm:max-w-xs",
}) => (
  <div className={`relative min-w-0 ${className}`}>
    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={TOOLBAR_SEARCH_INPUT}
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Clear search"
      >
        <FiX className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);

/** Row ⋮ menu — portal + viewport flip (CLIENT/context/action-button.md) */
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
    const mH = menu?.offsetHeight || 120;
    const mW = menu?.offsetWidth || 168;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const candidates = [
      { top: r.top - mH - MENU_GAP, left: r.right - mW },
      { top: r.bottom + MENU_GAP, left: r.right - mW },
      { top: r.top, left: r.right + MENU_GAP },
      { top: r.top, left: r.left - mW - MENU_GAP },
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
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Actions"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>

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
                className="w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
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
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {item.icon ? (
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
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

const SkeletonBone = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-slate-200/90 ${className}`} />
);

const MappingTableSkeleton = ({ rows = 6 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className={TABLE_TH}>#</th>
          <th className={TABLE_TH}>OOMS Template</th>
          <th className={TABLE_TH}>SMS template</th>
          <th className={TABLE_TH}>Status</th>
          <th className={TABLE_TH}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-6" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="mb-1 h-4 w-40" />
              <SkeletonBone className="h-3 w-56" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-4 w-32" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-5 w-20 rounded-full" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-7 w-16 rounded-md" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TemplatesListSkeleton = ({ rows = 6 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className={TABLE_TH}>#</th>
          <th className={TABLE_TH}>Name</th>
          <th className={TABLE_TH}>Route</th>
          <th className={TABLE_TH}>Message ID</th>
          <th className={TABLE_TH}>Status</th>
          <th className={TABLE_TH}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-6" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-4 w-36" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-12" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-24" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-5 w-16 rounded-full" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-7 w-14 rounded-md" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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
  sender_id: "",
  route: "dlt",
  status: "active",
});

/** Match Fast2SMS / DLT `{#var#}` placeholders → variable_1, variable_2, … */
function deriveVariableKeysFromMessageBody(messageBody) {
  const matches = String(messageBody || "").match(/\{#\s*var\s*#\}/gi) || [];
  return matches.map((_, index) => `variable_${index + 1}`);
}

function parseVariablesValuesToMap(variablesValues, variableKeys) {
  const keys = Array.isArray(variableKeys) ? variableKeys : [];
  const parts = String(variablesValues || "").split("|");
  const map = {};
  keys.forEach((key, index) => {
    map[key] = parts[index] != null ? String(parts[index]).trim() : "";
  });
  return map;
}

function buildVariablesValuesFromMap(variableKeys, valuesMap = {}) {
  const keys = Array.isArray(variableKeys) ? variableKeys : [];
  return keys.map((key) => String(valuesMap[key] ?? "").trim()).join("|");
}

function buildSmsMappingPreview(messageBody, variableKeys, valuesMap = {}) {
  const keys = Array.isArray(variableKeys) ? variableKeys : [];
  let index = 0;
  return String(messageBody || "").replace(/\{#\s*var\s*#\}/gi, () => {
    const key = keys[index];
    const value = key ? String(valuesMap[key] ?? "").trim() : "";
    index += 1;
    return value || "…";
  });
}

const MappingVariableSuggestions = ({
  variables,
  visible,
  position,
  onSelect,
  onMouseDown,
}) => {
  if (!visible || !variables.length || !position) return null;

  return createPortal(
    <div
      className="fixed z-[1200] max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      onMouseDown={onMouseDown}
    >
      <p className="m-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Suggestions
      </p>
      {variables.map((variable) => (
        <button
          key={variable.key}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(variable.key)}
          className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-indigo-50"
        >
          <span className="block font-mono text-xs font-semibold text-indigo-700">
            {variable.key}
          </span>
          <span className="mt-0.5 block text-[11px] text-gray-500">
            {variable.label}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
};

const MappingVariableInput = ({
  value,
  onChange,
  variables,
  placeholder,
  disabled,
}) => {
  const inputRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const showSuggestions = () => {
    clearHideTimer();
    if (!variables.length) return;
    updatePosition();
    setVisible(true);
  };

  const hideSuggestions = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setVisible(false), 150);
  };

  useEffect(() => () => clearHideTimer(), []);

  useEffect(() => {
    if (!visible) return undefined;
    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, updatePosition]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={showSuggestions}
        onBlur={hideSuggestions}
        placeholder={placeholder}
        disabled={disabled}
        className={`${FIELD_INPUT} font-mono`}
      />
      <MappingVariableSuggestions
        variables={variables}
        visible={visible}
        position={position}
        onSelect={onChange}
        onMouseDown={(event) => event.preventDefault()}
      />
    </>
  );
};

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
  const [setMappingItem, setSetMappingItem] = useState(null);
  const [selectedPickerTemplate, setSelectedPickerTemplate] = useState(null);
  const [mappingVariableValues, setMappingVariableValues] = useState({});
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTemplatesLoading, setPickerTemplatesLoading] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [activeTemplates, setActiveTemplates] = useState([]);

  const [listLoading, setListLoading] = useState(false);
  const [listRows, setListRows] = useState([]);
  const [listSearchInput, setListSearchInput] = useState("");
  const debouncedListSearch = useDebounce(listSearchInput, 400);
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
    async (page = 1, limit = pagination.limit, search = debouncedListSearch) => {
      setListLoading(true);
      try {
        const res = await smsApi.listTemplates({
          page_no: page,
          limit,
          search: String(search || "").trim() || undefined,
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
    [debouncedListSearch, pagination.limit],
  );

  const loadActiveTemplates = useCallback(async () => {
    setPickerTemplatesLoading(true);
    try {
      const res = await smsApi.listTemplates({ page_no: 1, limit: 100, status: "active" });
      const list = normalizeList(res?.data);
      setActiveTemplates(list);
      return list;
    } catch {
      setActiveTemplates([]);
      return [];
    } finally {
      setPickerTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  useEffect(() => {
    if (tab === "list") fetchTemplates(1);
  }, [tab, debouncedListSearch, fetchTemplates]);

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
    const item = mapRows.find((row) => row.type === type);
    if (!item) return;

    setSetMappingItem(item);
    setSelectedPickerTemplate(null);
    setMappingVariableValues({});
    setPickerSearch("");

    const templates = await loadActiveTemplates();

    if (item.sms_template_id) {
      const match = templates.find(
        (template) => template.template_id === item.sms_template_id,
      );
      if (match) {
        selectPickerTemplate(match, item);
      }
    }
  };

  const selectPickerTemplate = (template, mappingItem = setMappingItem) => {
    setSelectedPickerTemplate(template);
    const variableKeys =
      template.variable_keys?.length > 0
        ? template.variable_keys
        : deriveVariableKeysFromMessageBody(template.message_body);
    const savedValues = parseVariablesValuesToMap(
      mappingItem?.variables_values,
      variableKeys,
    );
    const nextValues = {};
    variableKeys.forEach((key) => {
      nextValues[key] = savedValues[key] || "";
    });
    setMappingVariableValues(nextValues);
  };

  const closePicker = () => {
    if (pickerSaving) return;
    setSetMappingItem(null);
    setSelectedPickerTemplate(null);
    setMappingVariableValues({});
    setPickerSearch("");
  };

  const filteredPickerTemplates = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return activeTemplates;
    return activeTemplates.filter((template) =>
      [template.name, template.dlt_message_id, template.message_body, template.route]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [activeTemplates, pickerSearch]);

  const mappingAvailableVariables = useMemo(
    () =>
      normalizeList(setMappingItem?.available_variables).filter((item) => item?.key),
    [setMappingItem],
  );

  const mappingVariableKeys = useMemo(() => {
    if (!selectedPickerTemplate) return [];
    if (selectedPickerTemplate.variable_keys?.length) {
      return selectedPickerTemplate.variable_keys;
    }
    return deriveVariableKeysFromMessageBody(selectedPickerTemplate.message_body);
  }, [selectedPickerTemplate]);

  const mappingPreviewText = useMemo(() => {
    if (!selectedPickerTemplate?.message_body) return "";
    return buildSmsMappingPreview(
      selectedPickerTemplate.message_body,
      mappingVariableKeys,
      mappingVariableValues,
    );
  }, [selectedPickerTemplate, mappingVariableKeys, mappingVariableValues]);

  const mappingVariablePlaceholder = useMemo(() => {
    const sample = mappingAvailableVariables[0]?.key;
    return sample ? `e.g. ${sample}` : "{{variable_name}}";
  }, [mappingAvailableVariables]);

  const saveMap = async () => {
    if (!setMappingItem || !selectedPickerTemplate?.template_id) {
      toast.error("Select an SMS template");
      return;
    }

    const missingKey =
      mappingVariableKeys.length > 0
        ? mappingVariableKeys.find(
            (key) => !String(mappingVariableValues[key] || "").trim(),
          )
        : null;
    if (missingKey) {
      toast.error(`Please map ${missingKey.replace("_", " ")}`);
      return;
    }

    setPickerSaving(true);
    try {
      await smsApi.setTemplateMap({
        type: setMappingItem.type,
        sms_template_id: selectedPickerTemplate.template_id,
        variables_values: buildVariablesValuesFromMap(
          mappingVariableKeys,
          mappingVariableValues,
        ),
      });
      toast.success("Mapping saved");
      closePicker();
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
      sender_id: row.sender_id || "",
      route: row.route || "dlt",
      status: row.status || "active",
    });
    setShowForm(true);
  };

  const detectedVariableKeys = useMemo(
    () => deriveVariableKeysFromMessageBody(form.message_body),
    [form.message_body],
  );

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
        variable_keys: deriveVariableKeysFromMessageBody(form.message_body),
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
          {smsChannel !== "fast2sms" ? (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              SMS channel is set to <strong>{smsChannel || "disabled"}</strong>.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className={`${TOOLBAR_ROW} gap-y-2`}>
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  {tab === "mapping" ? (
                    <FiLink className="h-4 w-4 text-blue-600" />
                  ) : (
                    <FiFileText className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-base font-bold text-gray-800">
                    Fast2SMS Templates
                  </h2>
                </div>
              </div>

              <nav className="flex shrink-0 items-center gap-1">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`${TOOLBAR_BTN} transition-colors ${
                      tab === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                <SearchField
                  value={tab === "mapping" ? mapSearch : listSearchInput}
                  onChange={tab === "mapping" ? setMapSearch : setListSearchInput}
                  placeholder={
                    tab === "mapping" ? "Search mappings…" : "Search templates…"
                  }
                  className="w-full min-w-0 flex-1 sm:w-56 md:w-64"
                />
                {tab === "list" ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add template
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => (tab === "mapping" ? fetchMaps() : fetchTemplates(1))}
                  disabled={mapLoading || listLoading}
                  className="shrink-0 rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${mapLoading || listLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {tab === "mapping" ? (
              <>
                {mapLoading ? (
                  <MappingTableSkeleton />
                ) : filteredMaps.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">
                    <FiLink className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium">No mappings found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className={TABLE_HEAD_ROW}>
                          <th className={`${TABLE_TH} w-12`}>#</th>
                          <th className={TABLE_TH}>OOMS Template</th>
                          <th className={TABLE_TH}>SMS template</th>
                          <th className={TABLE_TH}>Status</th>
                          <th className={`${TABLE_TH} w-16`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaps.map((row, index) => (
                          <tr key={row.type} className={TABLE_ROW}>
                            <td className={`px-3 py-3 ${CELL_INDEX}`}>{index + 1}</td>
                            <td className="px-3 py-3">
                              <p className={`${CELL_TITLE} m-0 capitalize`}>
                                {row.type}
                              </p>
                              <p className={`${CELL_SUB} m-0 mt-0.5`}>
                                {row.description}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-700">
                              {row.is_set ? (
                                <>
                                  <p className="m-0 font-medium">{row.sms_template_name}</p>
                                  <p className={`${CELL_SUB} m-0 mt-0.5 font-mono`}>
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
                              <ActionMenu
                                items={[
                                  {
                                    label: row.is_set ? "Change mapping" : "Map template",
                                    icon: FiLink,
                                    onClick: () => openPicker(row.type),
                                  },
                                  ...(row.is_set
                                    ? [
                                        {
                                          label:
                                            actionType === row.type
                                              ? "Removing…"
                                              : "Remove mapping",
                                          icon:
                                            actionType === row.type ? FiLoader : FiX,
                                          danger: true,
                                          disabled: actionType === row.type,
                                          onClick: () => unsetMap(row.type),
                                        },
                                      ]
                                    : []),
                                ]}
                              />
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
                {listLoading ? (
                  <TemplatesListSkeleton />
                ) : listRows.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">
                    <FiFileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium">No templates yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className={TABLE_HEAD_ROW}>
                            <th className={`${TABLE_TH} w-12`}>#</th>
                            <th className={TABLE_TH}>Name</th>
                            <th className={TABLE_TH}>Route</th>
                            <th className={TABLE_TH}>Message ID</th>
                            <th className={TABLE_TH}>Status</th>
                            <th className={`${TABLE_TH} w-16`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listRows.map((row, index) => {
                            const sn =
                              (pagination.page_no - 1) * pagination.limit + index + 1;
                            return (
                              <tr key={row.template_id} className={TABLE_ROW}>
                                <td className={`px-3 py-3 ${CELL_INDEX}`}>{sn}</td>
                                <td className="px-3 py-3">
                                  <p className={`${CELL_TITLE} m-0`}>{row.name}</p>
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
                                  <ActionMenu
                                    items={[
                                      {
                                        label: "Edit template",
                                        icon: FiEdit2,
                                        onClick: () => openEdit(row),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            );
                          })}
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

      {typeof document !== "undefined" &&
        createPortal(
          setMappingItem ? (
            <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                aria-label="Close"
                onClick={pickerSaving ? undefined : closePicker}
                disabled={pickerSaving}
              />
              <div
                role="dialog"
                aria-modal="true"
                className="relative z-[1] pointer-events-auto my-2 flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100vh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-white">
                  <div className="min-w-0">
                    <h2 className="m-0 text-base font-bold">Set template mapping</h2>
                    <p className="m-0 mt-0.5 truncate text-xs capitalize text-white/80">
                      {setMappingItem.type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePicker}
                    disabled={pickerSaving}
                    className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-white/10 hover:text-white disabled:opacity-50"
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div
                  className={MODAL_BODY_CLASS}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {!selectedPickerTemplate ? (
                    <>
                      <SearchField
                        value={pickerSearch}
                        onChange={setPickerSearch}
                        placeholder="Search SMS templates…"
                        className="w-full"
                      />

                      {pickerTemplatesLoading ? (
                        <div className="flex justify-center py-12">
                          <FiLoader className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      ) : filteredPickerTemplates.length === 0 ? (
                        <p className="m-0 py-10 text-center text-sm font-medium text-gray-500">
                          No active SMS templates found.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {filteredPickerTemplates.map((template) => (
                            <button
                              key={template.template_id}
                              type="button"
                              onClick={() => selectPickerTemplate(template, setMappingItem)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`${CELL_TITLE} truncate`}>
                                  {template.name}
                                </span>
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                  {template.route}
                                </span>
                              </div>
                              {template.dlt_message_id ? (
                                <p className={`${CELL_SUB} m-0 mt-1 font-mono`}>
                                  {template.dlt_message_id}
                                </p>
                              ) : null}
                              {template.message_body ? (
                                <p className={`${CELL_SUB} m-0 mt-1 line-clamp-2`}>
                                  {template.message_body}
                                </p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="min-w-0 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`${CELL_TITLE} m-0`}>
                              {selectedPickerTemplate.name}
                            </p>
                            <p className={`${CELL_SUB} m-0 mt-1`}>
                              {selectedPickerTemplate.route?.toUpperCase()}
                              {selectedPickerTemplate.dlt_message_id
                                ? ` · ${selectedPickerTemplate.dlt_message_id}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPickerTemplate(null);
                              setMappingVariableValues({});
                            }}
                            disabled={pickerSaving}
                            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            Change template
                          </button>
                        </div>

                        {mappingVariableKeys.length > 0 ? (
                          <div className="space-y-3">
                            <p className={`${SECTION_LABEL} m-0`}>Map variables</p>
                            {mappingVariableKeys.map((key, index) => (
                              <div key={key}>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                  DLT variable {index + 1}
                                  <span className="text-red-500"> *</span>
                                </label>
                                <MappingVariableInput
                                  value={mappingVariableValues[key] || ""}
                                  onChange={(nextValue) =>
                                    setMappingVariableValues((prev) => ({
                                      ...prev,
                                      [key]: nextValue,
                                    }))
                                  }
                                  variables={mappingAvailableVariables}
                                  placeholder={mappingVariablePlaceholder}
                                  disabled={pickerSaving}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="m-0 text-sm text-gray-500">
                            This template has no DLT variables to map.
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`${SECTION_LABEL} m-0 mb-3`}>Preview</p>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-0">
                          {mappingPreviewText ? (
                            <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                              {mappingPreviewText}
                            </p>
                          ) : (
                            <p className="m-0 text-sm text-gray-500">
                              Preview will appear here.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
                  <button
                    type="button"
                    onClick={closePicker}
                    disabled={pickerSaving}
                    className={`${TOOLBAR_BTN} border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50`}
                  >
                    Cancel
                  </button>
                  {selectedPickerTemplate ? (
                    <button
                      type="button"
                      disabled={pickerSaving}
                      onClick={saveMap}
                      className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`}
                    >
                      {pickerSaving ? (
                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Save mapping
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null,
          document.body,
        )}

      {typeof document !== "undefined" &&
        createPortal(
          showForm ? (
            <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                aria-label="Close"
                onClick={formSaving ? undefined : () => setShowForm(false)}
                disabled={formSaving}
              />
              <div
                role="dialog"
                aria-modal="true"
                className="relative z-[1] pointer-events-auto my-2 flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100vh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-white">
                  <h2 className="m-0 text-base font-bold">
                    {form.template_id ? "Edit template" : "New Fast2SMS template"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={formSaving}
                    className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-white/10 hover:text-white disabled:opacity-50"
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={saveTemplate} className="flex min-h-0 flex-1 flex-col">
                  <div
                    className={MODAL_BODY_CLASS}
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <div className="space-y-3">
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
                        {detectedVariableKeys.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {detectedVariableKeys.map((key) => (
                              <span
                                key={key}
                                className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700"
                              >
                                {key}
                              </span>
                            ))}
                          </div>
                        ) : null}
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
                            onChange={(e) =>
                              setForm((f) => ({ ...f, status: e.target.value }))
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      disabled={formSaving}
                      className={`${TOOLBAR_BTN} border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`}
                    >
                      {formSaving ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
                      Save template
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null,
          document.body,
        )}
    </div>
  );
};

export default Fast2SmsTemplates;
