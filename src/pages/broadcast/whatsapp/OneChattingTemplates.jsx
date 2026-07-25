import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiFileText,
  FiLink,
  FiLoader,
  FiRefreshCw,
  FiSearch,
  FiUpload,
  FiX,
  FiLock,
  FiMoreVertical,
  FiPower,
  FiEdit2,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CustomSelect from "../../../components/CustomSelect";
import useDebounce from "../../../components/useDebounce";
import OneChattingTemplatePreview from "../../../components/WhatsApp/OneChattingTemplatePreview";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  buildTemplateComponents,
  buildTemplatePreviewContent,
  extractApiError,
  getTemplatePlaceholders,
  getTemplatePreviewText,
  normalizeTemplateComponents,
  parseTemplateComponentsToValues,
} from "../../../utils/oneChattingSendUtils";
import { uploadOneSaasFile } from "../../../utils/onesaas-upload";
import {
  normalizeList,
  normalizePagination,
  whatsappApi,
} from "../../../services/whatsappApi";

/** Task-table typography baseline — see CLIENT/context/typography.md */
const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_MOBILE_TITLE = "text-xs font-semibold text-gray-800";
const CELL_META = "text-xs text-gray-400 uppercase tracking-wide";
const CELL_SUB = "text-xs text-gray-400";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_EMPTY = "text-sm text-gray-400";
const CELL_LABEL = "text-xs text-gray-400";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_INPUT =
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-gray-400";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const EMPTY_WRAP =
  "flex flex-col items-center justify-center py-12 text-gray-500 px-4";
const EMPTY_ICON_WRAP =
  "w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3";
const EMPTY_TITLE = "text-sm font-medium text-gray-500";
const EMPTY_SUBTITLE = "text-xs text-gray-400 mt-1";
const MODAL_BODY_CLASS =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const FIELD_INPUT =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60";

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const URL_ACCEPT_BY_FORMAT = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif",
  VIDEO: "video/mp4,video/3gpp,video/quicktime",
  DOCUMENT: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar",
  AUDIO: "audio/aac,audio/mp4,audio/mpeg,audio/ogg,audio/opus",
};

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

const SkeletonBar = ({ className = "h-3 bg-gray-200 rounded" }) => (
  <div className={`animate-pulse ${className}`} />
);

const SkeletonRow = ({ cols = 6 }) => (
  <tr className="animate-pulse border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div
          className="h-3 bg-gray-200 rounded"
          style={{ width: `${55 + (i % 3) * 18}px` }}
        />
      </td>
    ))}
  </tr>
);

const TableSkeleton = ({ cols = 6, rows = 8, headers = [] }) => (
  <>
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full table-fixed min-w-[760px]">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            {headers.length
              ? headers.map((header) => (
                  <th
                    key={header.label}
                    className={`${TABLE_TH} ${header.className || ""}`}
                  >
                    {header.label}
                  </th>
                ))
              : Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className={TABLE_TH}>
                    <SkeletonBar className="h-2.5 w-16 bg-gray-200 rounded" />
                  </th>
                ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
    <div className="md:hidden divide-y divide-gray-100">
      {Array.from({ length: Math.min(rows, 5) }).map((_, i) => (
        <div key={i} className="p-3 space-y-2 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <SkeletonBar className="h-3 w-2/3 bg-gray-200 rounded" />
              <SkeletonBar className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
            <SkeletonBar className="h-6 w-16 bg-gray-200 rounded-full shrink-0" />
          </div>
          <SkeletonBar className="h-3 w-full bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  </>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toUpperCase();
  const styles = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

const MappingStatusBadge = ({ isSet }) =>
  isSet ? (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Mapped
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      Not mapped
    </span>
  );

/** 3-dot action menu — portal + viewport flip (CLIENT/context/action-button.md) */
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
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Actions"
      >
        <FiMoreVertical className="w-4 h-4" />
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
                className="w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden"
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
                    {item.icon ? (
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
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
      className="fixed z-[1200] rounded-lg border border-gray-200 bg-white shadow-lg p-2 max-h-52 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      onMouseDown={onMouseDown}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-2 py-1 m-0">
        Suggestions
      </p>
      {variables.map((variable) => (
        <button
          key={variable.key}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(variable.key)}
          className="w-full text-left px-2 py-2 rounded-md hover:bg-indigo-50 transition-colors"
        >
          <span className="block font-mono text-xs font-semibold text-indigo-700">
            {variable.key}
          </span>
          <span className="block text-[11px] text-gray-500 mt-0.5">
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
        onSelect={(key) => {
          onChange(key);
          setVisible(false);
        }}
        onMouseDown={(event) => event.preventDefault()}
      />
    </>
  );
};

const MappingUrlField = ({ field, value, onChange, disabled }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadOneSaasFile(file);
      onChange(url);
      toast.success("File uploaded");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to upload file"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.example || "Media URL"}
        disabled={disabled || uploading}
        className={`${FIELD_INPUT} flex-1 min-w-0 font-mono`}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={URL_ACCEPT_BY_FORMAT[field.format] || "*/*"}
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 shrink-0`}
        title="Upload file"
      >
        {uploading ? (
          <FiLoader className="w-4 h-4 animate-spin" />
        ) : (
          <FiUpload className="w-4 h-4" />
        )}
        Upload
      </button>
    </div>
  );
};

const buildExamplePreviewContent = (templateDef) => {
  if (!templateDef) return null;

  const values = {};
  getTemplatePlaceholders(templateDef).forEach((field) => {
    if (field.example) values[field.key] = field.example;
  });

  return buildTemplatePreviewContent(templateDef, values);
};

const OneChattingTemplates = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [activeTab, setActiveTab] = useState("mapping");

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
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
  const debouncedMappingSearch = useDebounce(mappingSearchInput, 400);
  const [mappingActionName, setMappingActionName] = useState(null);
  const [setMappingItem, setSetMappingItem] = useState(null);
  const [pickerTemplates, setPickerTemplates] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedMappingTemplate, setSelectedMappingTemplate] = useState(null);
  const [mappingVariableValues, setMappingVariableValues] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  const fetchTemplates = useCallback(
    async (page = 1, limit = 20, searchTerm = "", status = "") => {
      setListLoading(true);
      try {
        const params = { page_no: page, limit };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (status) params.status = status;

        const res = await whatsappApi.getTemplateList(params);
        const list = normalizeList(res?.data);
        setRows(list);
        setPagination(
          normalizePagination(res?.meta ?? res?.pagination, {
            page_no: page,
            limit,
            itemCount: list.length,
          }),
        );
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load templates",
        );
        setRows([]);
        setPagination((prev) => ({
          ...prev,
          page_no: page,
          limit,
          total: 0,
          total_pages: 1,
          has_more: false,
        }));
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
      toast.error(extractApiError(error, "Failed to load template mappings"));
      setMappingRows([]);
    } finally {
      setMappingLoading(false);
    }
  }, []);

  const fetchPickerTemplates = useCallback(async () => {
    setPickerLoading(true);
    try {
      const res = await whatsappApi.getTemplateList({
        status: "APPROVED",
        page_no: 1,
        limit: 100,
      });
      const templates = normalizeList(res?.data);
      setPickerTemplates(templates);
      return templates;
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load templates"));
      setPickerTemplates([]);
      return [];
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const selectMappingTemplate = useCallback((template, savedComponent) => {
    setSelectedMappingTemplate(template);

    const placeholders = getTemplatePlaceholders(template.template);
    const parsedValues = parseTemplateComponentsToValues(
      savedComponent,
      template.template,
    );
    const nextValues = {};

    placeholders.forEach((field) => {
      if (parsedValues[field.key]) {
        nextValues[field.key] = parsedValues[field.key];
      } else if (field.example) {
        nextValues[field.key] = field.example;
      }
    });

    setMappingVariableValues(nextValues);
  }, []);

  const updateMappingRow = useCallback((name, updates) => {
    setMappingRows((prev) =>
      prev.map((row) => (row.name === name ? { ...row, ...updates } : row)),
    );
  }, []);

  const handleSetMapping = async (name, templateName, component) => {
    if (!name || !templateName) return;

    setMappingActionName(name);
    try {
      const res = await whatsappApi.setTemplateMap({
        name,
        template_name: templateName,
        component,
      });
      toast.success(res?.message || "Template mapping set successfully");
      updateMappingRow(name, {
        is_set: true,
        onechatting_template_name: templateName,
        component: res?.data?.component ?? component,
      });
      setSetMappingItem(null);
      setSelectedMappingTemplate(null);
      setMappingVariableValues({});
      setPickerSearch("");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to set template mapping"));
    } finally {
      setMappingActionName(null);
    }
  };

  const handleSaveMapping = () => {
    if (!setMappingItem || !selectedMappingTemplate) return;

    const placeholders = getTemplatePlaceholders(
      selectedMappingTemplate.template,
    );
    const missingField = placeholders.find(
      (field) => field.required && !mappingVariableValues[field.key]?.trim(),
    );
    if (missingField) {
      toast.error(`Please fill in ${missingField.label}`);
      return;
    }

    const component = buildTemplateComponents(
      selectedMappingTemplate.template,
      mappingVariableValues,
    );

    handleSetMapping(
      setMappingItem.name,
      selectedMappingTemplate.template_name,
      component,
    );
  };

  const handleEnableMapping = (item) => {
    if (!item.onechatting_template_name) {
      openSetMappingModal(item);
      return;
    }

    handleSetMapping(
      item.name,
      item.onechatting_template_name,
      normalizeTemplateComponents(item.component),
    );
  };

  const handleUnsetMapping = async (name) => {
    if (!name) return;

    setMappingActionName(name);
    try {
      const res = await whatsappApi.unsetTemplateMap({ name });
      toast.success(res?.message || "Template mapping disabled");
      updateMappingRow(name, { is_set: false });
      setConfirmState(null);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to disable template mapping"));
    } finally {
      setMappingActionName(null);
    }
  };

  const openSetMappingModal = async (item) => {
    setSetMappingItem(item);
    setSelectedMappingTemplate(null);
    setMappingVariableValues({});
    setPickerSearch("");

    const templates = await fetchPickerTemplates();
    if (item.onechatting_template_name) {
      const match = templates.find(
        (template) => template.template_name === item.onechatting_template_name,
      );
      if (match) {
        selectMappingTemplate(match, item.component);
      }
    }
  };

  const closeSetMappingModal = () => {
    if (mappingActionName) return;
    setSetMappingItem(null);
    setSelectedMappingTemplate(null);
    setMappingVariableValues({});
    setPickerSearch("");
  };

  const handleMappingVariableChange = (key, value) => {
    setMappingVariableValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (activeTab !== "list") return;
    fetchTemplates(1, pagination.limit, debouncedSearch, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, statusFilter, fetchTemplates]);

  useEffect(() => {
    if (activeTab !== "mapping") return;
    fetchTemplateMappings();
  }, [activeTab, fetchTemplateMappings]);

  const previewContent = useMemo(
    () => buildExamplePreviewContent(selectedTemplate?.template),
    [selectedTemplate],
  );

  const filteredMappingRows = useMemo(() => {
    const term = debouncedMappingSearch.trim().toLowerCase();
    if (!term) return mappingRows;

    return mappingRows.filter((item) =>
      [item.name, item.description, item.onechatting_template_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [mappingRows, debouncedMappingSearch]);

  const filteredPickerTemplates = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return pickerTemplates;
    return pickerTemplates.filter((item) =>
      [item.template_name, item.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [pickerTemplates, pickerSearch]);

  const mappingPlaceholders = useMemo(() => {
    if (!selectedMappingTemplate?.template) return [];
    return getTemplatePlaceholders(selectedMappingTemplate.template);
  }, [selectedMappingTemplate]);

  const mappingPreviewContent = useMemo(() => {
    if (!selectedMappingTemplate?.template) return null;
    return buildTemplatePreviewContent(
      selectedMappingTemplate.template,
      mappingVariableValues,
    );
  }, [selectedMappingTemplate, mappingVariableValues]);

  const mappingAvailableVariables = useMemo(
    () =>
      normalizeList(setMappingItem?.available_variables).filter(
        (item) => item?.key,
      ),
    [setMappingItem],
  );

  const mappingVariablePlaceholder = useMemo(() => {
    const sample = mappingAvailableVariables[0]?.key;
    return sample ? `e.g. ${sample}` : "{{variable_name}}";
  }, [mappingAvailableVariables]);

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchTemplates(1, limit, debouncedSearch, statusFilter);
  };

  const handlePageChange = (page) => {
    fetchTemplates(page, pagination.limit, debouncedSearch, statusFilter);
  };

  const selectedStatusOption =
    STATUS_OPTIONS.find((option) => option.value === statusFilter) ||
    STATUS_OPTIONS[0];

  const mappingTableHeaders = [
    { label: "#", className: "w-12" },
    { label: "OOMS Template", className: "w-[22%]" },
    { label: "Description", className: "w-[28%]" },
    { label: "OneChatting", className: "w-[22%]" },
    { label: "Status", className: "w-[14%]" },
    { label: "Actions", className: "w-16 text-center" },
  ];

  const listTableHeaders = [
    { label: "#", className: "w-12" },
    { label: "Template", className: "w-[28%]" },
    { label: "Category", className: "w-[14%]" },
    { label: "Language", className: "w-[12%]" },
    { label: "Status", className: "w-[14%]" },
    { label: "Preview", className: "w-[32%]" },
  ];

  const getMappingActionItems = (item) => {
    const busy = Boolean(mappingActionName);
    const items = [];

    if (!item.is_set && item.onechatting_template_name) {
      items.push({
        label: "Enable",
        icon: FiCheck,
        disabled: busy,
        onClick: () => handleEnableMapping(item),
      });
    }

    items.push({
      label: item.onechatting_template_name ? "Change" : "Set",
      icon: FiEdit2,
      disabled: busy,
      onClick: () => openSetMappingModal(item),
    });

    if (item.is_set) {
      items.push({
        label: "Disable",
        icon: FiPower,
        danger: true,
        disabled: busy,
        onClick: () => setConfirmState({ type: "disable", item }),
      });
    }

    return items;
  };

  const listIndexOffset = (pagination.page_no - 1) * pagination.limit;
  const confirmLoading = Boolean(
    confirmState?.item && mappingActionName === confirmState.item.name,
  );
  const mappingSearchPending =
    mappingSearchInput.trim() !== debouncedMappingSearch.trim();
  const mappingTableBusy = mappingLoading || mappingSearchPending;

  const renderMappingTab = () => (
    <>
      {mappingTableBusy ? (
        <TableSkeleton cols={6} rows={6} headers={mappingTableHeaders} />
      ) : filteredMappingRows.length === 0 ? (
        <div className={EMPTY_WRAP}>
          <div className={EMPTY_ICON_WRAP}>
            <FiLink className="w-5 h-5 text-gray-400" />
          </div>
          <p className={EMPTY_TITLE}>No mappings found</p>
          <p className={EMPTY_SUBTITLE}>
            {debouncedMappingSearch.trim()
              ? "Try a different search term"
              : "No OOMS templates available"}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-fixed min-w-[760px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={`${TABLE_TH} w-12`}>#</th>
                  <th className={`${TABLE_TH} w-[22%]`}>OOMS Template</th>
                  <th className={`${TABLE_TH} w-[28%]`}>Description</th>
                  <th className={`${TABLE_TH} w-[22%]`}>OneChatting</th>
                  <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                  <th className={`${TABLE_TH} w-16 text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappingRows.map((item, idx) => (
                  <tr key={item.name} className={TABLE_ROW}>
                    <td className={`${TABLE_TD} ${CELL_INDEX}`}>{idx + 1}</td>
                    <td className={TABLE_TD}>
                      <p className={`${CELL_TITLE} truncate capitalize`}>
                        {item.name}
                      </p>
                    </td>
                    <td className={TABLE_TD}>
                      <p
                        className={`${item.description ? CELL_BODY : CELL_EMPTY} truncate`}
                      >
                        {item.description || "—"}
                      </p>
                    </td>
                    <td className={TABLE_TD}>
                      {item.onechatting_template_name ? (
                        <p className={`${CELL_BODY} truncate`}>
                          {item.onechatting_template_name}
                        </p>
                      ) : (
                        <p className={CELL_EMPTY}>—</p>
                      )}
                    </td>
                    <td className={TABLE_TD}>
                      <MappingStatusBadge isSet={Boolean(item.is_set)} />
                    </td>
                    <td className={`${TABLE_TD} text-center`}>
                      {mappingActionName === item.name ? (
                        <FiLoader className="w-4 h-4 animate-spin text-gray-400 inline-block" />
                      ) : (
                        <ActionMenu items={getMappingActionItems(item)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {filteredMappingRows.map((item, idx) => (
              <div key={item.name} className="p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex gap-2 flex-1">
                    <span className={`${CELL_INDEX} shrink-0 pt-0.5`}>
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className={`${CELL_MOBILE_TITLE} truncate capitalize`}>
                        {item.name}
                      </p>
                      <p className={`${CELL_SUB} truncate mt-0.5`}>
                        {item.description || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MappingStatusBadge isSet={Boolean(item.is_set)} />
                    {mappingActionName === item.name ? (
                      <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <ActionMenu items={getMappingActionItems(item)} />
                    )}
                  </div>
                </div>
                <div className="pl-5">
                  <p className={CELL_LABEL}>OneChatting</p>
                  <p
                    className={
                      item.onechatting_template_name ? CELL_BODY : CELL_EMPTY
                    }
                  >
                    {item.onechatting_template_name || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  const renderListTab = () => (
    <>
      {listLoading ? (
        <TableSkeleton cols={6} rows={8} headers={listTableHeaders} />
      ) : rows.length === 0 ? (
        <div className={EMPTY_WRAP}>
          <div className={EMPTY_ICON_WRAP}>
            <FiFileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className={EMPTY_TITLE}>No templates found</p>
          <p className={EMPTY_SUBTITLE}>
            {debouncedSearch.trim() || statusFilter
              ? "Try different filters"
              : "No templates available"}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-fixed min-w-[760px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={`${TABLE_TH} w-12`}>#</th>
                  <th className={`${TABLE_TH} w-[28%]`}>Template</th>
                  <th className={`${TABLE_TH} w-[14%]`}>Category</th>
                  <th className={`${TABLE_TH} w-[12%]`}>Language</th>
                  <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                  <th className={`${TABLE_TH} w-[32%]`}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, idx) => (
                  <tr
                    key={item.template_id}
                    className={`${TABLE_ROW} cursor-pointer`}
                    onClick={() => setSelectedTemplate(item)}
                  >
                    <td className={`${TABLE_TD} ${CELL_INDEX}`}>
                      {listIndexOffset + idx + 1}
                    </td>
                    <td className={TABLE_TD}>
                      <div className="min-w-0 overflow-hidden">
                        <p className={`${CELL_TITLE} truncate`}>
                          {item.template_name}
                        </p>
                        <p className={`${CELL_META} mt-0.5 truncate`}>
                          ID: {item.template_id}
                        </p>
                      </div>
                    </td>
                    <td className={TABLE_TD}>
                      <p
                        className={`${item.category ? CELL_BODY : CELL_EMPTY} truncate`}
                      >
                        {item.category || "—"}
                      </p>
                    </td>
                    <td className={TABLE_TD}>
                      <p
                        className={`${item.template?.language ? CELL_BODY : CELL_EMPTY} uppercase`}
                      >
                        {item.template?.language || "—"}
                      </p>
                    </td>
                    <td className={TABLE_TD}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className={TABLE_TD}>
                      <p className={`${CELL_SUB} truncate`}>
                        {getTemplatePreviewText(item.template) || "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((item, idx) => (
              <button
                key={item.template_id}
                type="button"
                onClick={() => setSelectedTemplate(item)}
                className="w-full text-left p-3 space-y-2 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex gap-2">
                    <span className={`${CELL_INDEX} shrink-0 pt-0.5`}>
                      {listIndexOffset + idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className={`${CELL_MOBILE_TITLE} truncate`}>
                        {item.template_name}
                      </p>
                      <p className={`${CELL_SUB} truncate mt-0.5`}>
                        {item.category || "—"} ·{" "}
                        {(item.template?.language || "—").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className={`${CELL_SUB} pl-5 line-clamp-2`}>
                  {getTemplatePreviewText(item.template) || "—"}
                </p>
              </button>
            ))}
          </div>

          <TablePagination
            page={pagination.page_no}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.total_pages}
            isLastPage={
              !pagination.has_more &&
              pagination.page_no >= pagination.total_pages
            }
            rowOptions={[10, 20, 50, 100]}
            defaultRows={20}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </>
      )}
    </>
  );

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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  {activeTab === "mapping" ? (
                    <FiLink className="w-4 h-4 text-green-600" />
                  ) : (
                    <FiFileText className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                    OneChatting Templates
                  </h1>
                </div>
              </div>

              <nav className="flex items-center gap-1 shrink-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`${TOOLBAR_BTN} transition-colors ${
                      activeTab === tab.id
                        ? "bg-green-50 text-green-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-2 ml-auto min-w-0 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                {activeTab === "list" ? (
                  <div className="w-full sm:w-44 shrink-0">
                    <CustomSelect
                      options={STATUS_OPTIONS}
                      value={selectedStatusOption}
                      onChange={(option) =>
                        setStatusFilter(option?.value ?? "")
                      }
                      placeholder="All statuses"
                      searchPlaceholder="Search status…"
                      noOptionsMessage="No statuses"
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                  <div className="relative flex-1 sm:w-56 md:w-64 min-w-0">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={
                        activeTab === "mapping"
                          ? mappingSearchInput
                          : searchInput
                      }
                      onChange={(e) =>
                        activeTab === "mapping"
                          ? setMappingSearchInput(e.target.value)
                          : setSearchInput(e.target.value)
                      }
                      placeholder={
                        activeTab === "mapping"
                          ? "Search mappings…"
                          : "Search templates…"
                      }
                      className={TOOLBAR_INPUT}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={
                      activeTab === "mapping"
                        ? fetchTemplateMappings
                        : () =>
                            fetchTemplates(
                              pagination.page_no,
                              pagination.limit,
                              debouncedSearch,
                              statusFilter,
                            )
                    }
                    disabled={
                      activeTab === "mapping" ? mappingLoading : listLoading
                    }
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 shrink-0"
                    title="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 ${
                        (activeTab === "mapping" ? mappingLoading : listLoading)
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "mapping" ? renderMappingTab() : renderListTab()}
          </div>
        </div>
      </div>

      {/* Template preview modal — CLIENT/context/modal.md */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {selectedTemplate ? (
              <motion.div
                key="template-preview-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  aria-label="Close"
                  onClick={() => setSelectedTemplate(null)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold m-0 truncate">
                        {selectedTemplate.template_name}
                      </h2>
                      <p className="text-xs text-white/80 m-0 mt-0.5 truncate">
                        {selectedTemplate.category} ·{" "}
                        {selectedTemplate.template?.language || "en"} ·{" "}
                        {selectedTemplate.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 shrink-0"
                      aria-label="Close"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div
                    className={`${MODAL_BODY_CLASS} grid grid-cols-1 lg:grid-cols-2 gap-5`}
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <div className="space-y-3">
                      <p className={`${SECTION_LABEL} m-0`}>Template body</p>
                      <pre
                        className={`${CELL_BODY} whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 m-0`}
                      >
                        {getTemplatePreviewText(selectedTemplate.template)}
                      </pre>
                    </div>
                    <div>
                      <p className={`${SECTION_LABEL} mb-3 m-0`}>
                        WhatsApp preview
                      </p>
                      <div className="rounded-xl bg-[#e5ddd5] p-4 flex justify-center">
                        {previewContent ? (
                          <OneChattingTemplatePreview
                            content={previewContent}
                          />
                        ) : (
                          <p className={`${EMPTY_TITLE} m-0`}>
                            Preview unavailable.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className={`${TOOLBAR_BTN} text-gray-700 border border-gray-300 hover:bg-gray-100`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      {/* Set mapping modal — CLIENT/context/modal.md */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {setMappingItem ? (
              <motion.div
                key="set-mapping-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  aria-label="Close"
                  onClick={mappingActionName ? undefined : closeSetMappingModal}
                  disabled={Boolean(mappingActionName)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold m-0">
                        Set template mapping
                      </h2>
                      <p className="text-xs text-white/80 m-0 mt-0.5 capitalize truncate">
                        {setMappingItem.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSetMappingModal}
                      disabled={Boolean(mappingActionName)}
                      className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 disabled:opacity-50 shrink-0"
                      aria-label="Close"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div
                    className={MODAL_BODY_CLASS}
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {!selectedMappingTemplate ? (
                      <>
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            placeholder="Search approved templates…"
                            className={TOOLBAR_INPUT}
                          />
                        </div>

                        {pickerLoading ? (
                          <div className="flex justify-center py-10">
                            <FiLoader className="w-6 h-6 animate-spin text-green-600" />
                          </div>
                        ) : filteredPickerTemplates.length === 0 ? (
                          <p className={`${EMPTY_TITLE} text-center py-8 m-0`}>
                            No approved templates found.
                          </p>
                        ) : (
                          <div className="space-y-2 mt-4">
                            {filteredPickerTemplates.map((template) => (
                              <button
                                key={template.template_id}
                                type="button"
                                onClick={() =>
                                  selectMappingTemplate(
                                    template,
                                    setMappingItem.component,
                                  )
                                }
                                className="w-full text-left px-3 py-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`${CELL_TITLE} truncate`}>
                                    {template.template_name}
                                  </span>
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 shrink-0">
                                    {template.category}
                                  </span>
                                </div>
                                <p
                                  className={`${CELL_SUB} mt-1 line-clamp-2 m-0`}
                                >
                                  {getTemplatePreviewText(template.template)}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 min-h-0">
                        <div className="space-y-4 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`${CELL_TITLE} m-0`}>
                                {selectedMappingTemplate.template_name}
                              </p>
                              <p className={`${CELL_SUB} mt-1 m-0`}>
                                {selectedMappingTemplate.category} ·{" "}
                                {selectedMappingTemplate.template?.language ||
                                  "en"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMappingTemplate(null);
                                setMappingVariableValues({});
                              }}
                              disabled={Boolean(mappingActionName)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0 disabled:opacity-50"
                            >
                              Change
                            </button>
                          </div>

                          {mappingPlaceholders.length === 0 ? (
                            <p className={`${EMPTY_TITLE} m-0`}>
                              This template has no variables to map.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {mappingPlaceholders.map((field) => (
                                <div key={field.key}>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                    {field.required ? (
                                      <span className="text-red-500"> *</span>
                                    ) : null}
                                  </label>
                                  {field.inputType === "url" ? (
                                    <MappingUrlField
                                      field={field}
                                      value={
                                        mappingVariableValues[field.key] || ""
                                      }
                                      onChange={(nextValue) =>
                                        handleMappingVariableChange(
                                          field.key,
                                          nextValue,
                                        )
                                      }
                                      disabled={Boolean(mappingActionName)}
                                    />
                                  ) : (
                                    <MappingVariableInput
                                      value={
                                        mappingVariableValues[field.key] || ""
                                      }
                                      onChange={(nextValue) =>
                                        handleMappingVariableChange(
                                          field.key,
                                          nextValue,
                                        )
                                      }
                                      variables={mappingAvailableVariables}
                                      placeholder={mappingVariablePlaceholder}
                                      disabled={Boolean(mappingActionName)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 lg:max-w-[300px]">
                          <p className={`${SECTION_LABEL} mb-3 m-0`}>Preview</p>
                          <div className="rounded-xl bg-[#e5ddd5] p-3 flex justify-center lg:sticky lg:top-0 w-fit max-w-full mx-auto lg:mx-0">
                            {mappingPreviewContent ? (
                              <OneChattingTemplatePreview
                                content={mappingPreviewContent}
                                className="w-[280px] max-w-[280px]"
                              />
                            ) : (
                              <p className={`${EMPTY_TITLE} m-0 px-2 py-4`}>
                                Preview will appear here.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeSetMappingModal}
                      disabled={Boolean(mappingActionName)}
                      className={`${TOOLBAR_BTN} text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50`}
                    >
                      Cancel
                    </button>
                    {selectedMappingTemplate ? (
                      <button
                        type="button"
                        onClick={handleSaveMapping}
                        disabled={Boolean(mappingActionName)}
                        className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50`}
                      >
                        {mappingActionName === setMappingItem.name ? (
                          <FiLoader className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        Save mapping
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        loading={confirmLoading}
        onCancel={() => {
          if (mappingActionName) return;
          setConfirmState(null);
        }}
        onConfirm={() => {
          if (confirmState?.type === "disable" && confirmState.item) {
            handleUnsetMapping(confirmState.item.name);
          }
        }}
        icon={FiAlertTriangle}
        title="Disable mapping"
        heading="Disable template mapping?"
        message={`OneChatting mapping will be turned off for "${
          confirmState?.item?.name || "this template"
        }".`}
        confirmLabel={confirmLoading ? "Disabling…" : "Disable"}
        tone="danger"
      />
    </div>
  );
};

export default OneChattingTemplates;
