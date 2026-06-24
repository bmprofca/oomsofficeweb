import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronRight,
  FiHome,
  FiImage,
  FiLoader,
  FiMessageSquare,
  FiMusic,
  FiPaperclip,
  FiPlus,
  FiSearch,
  FiSend,
  FiUpload,
  FiUsers,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import API_BASE_URL from "../../../utils/api-controller";
import getHeaders from "../../../utils/get-headers";
import { extractApiError } from "./oneChattingSendUtils";
import { uploadOneSaasFile } from "./oneChattingUpload";
import { normalizeList, whatsappApi } from "./whatsappApi";

const SEND_MODES = [
  { id: "direct", label: "Direct message" },
  { id: "template", label: "Via template" },
];

const MESSAGE_TYPES = [
  { value: "text", label: "Text", icon: FiMessageSquare },
  { value: "image", label: "Image", icon: FiImage },
  { value: "video", label: "Video", icon: FiVideo },
  { value: "document", label: "Document", icon: FiPaperclip },
  { value: "audio", label: "Audio", icon: FiMusic },
];

const RECIPIENT_KINDS = [
  { value: "client", label: "Clients" },
  { value: "group", label: "Groups" },
  { value: "phone", label: "Phone numbers" },
];

const URL_ACCEPT_BY_TYPE = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/3gpp,video/quicktime",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar",
  audio: "audio/*",
};

const DIRECT_FIELD_CONFIG = {
  text: [{ key: "message", label: "Message", required: true, multiline: true }],
  image: [
    { key: "url", label: "Image URL", required: true, isUrl: true },
    { key: "caption", label: "Caption", required: false, multiline: true },
  ],
  video: [
    { key: "url", label: "Video URL", required: true, isUrl: true },
    { key: "caption", label: "Caption", required: false, multiline: true },
  ],
  document: [
    { key: "url", label: "Document URL", required: true, isUrl: true },
    { key: "filename", label: "Filename", required: true },
    { key: "caption", label: "Caption", required: false, multiline: true },
  ],
  audio: [{ key: "url", label: "Audio URL", required: true, isUrl: true }],
};

const EMPTY_DIRECT = {
  messageType: "text",
  message: "",
  url: "",
  caption: "",
  filename: "",
  is_voice: false,
};

const buildDirectContent = (messageType, direct) => {
  const content = {};
  const fields = DIRECT_FIELD_CONFIG[messageType] || [];
  fields.forEach((field) => {
    const value = String(direct[field.key] || "").trim();
    if (value) content[field.key] = value;
  });
  if (messageType === "audio" && direct.is_voice) {
    content.is_voice = true;
  }
  return content;
};

const detectVariablesFromValues = (values) => {
  const text = Object.values(values)
    .filter((value) => typeof value === "string")
    .join(" ");
  const matches = [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  return [...new Set(matches)];
};

const cleanVariables = (values = {}) => {
  const cleaned = {};
  Object.entries(values).forEach(([key, value]) => {
    const normalizedKey = String(key).replace(/^\{\{|\}\}$/g, "");
    const trimmed = String(value ?? "").trim();
    if (trimmed) cleaned[normalizedKey] = trimmed;
  });
  return cleaned;
};

const normalizeContent = (template) => {
  const raw = template?.content ?? template?.content_json;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
};

const getTemplatePublicId = (template) =>
  String(template?.template_id || template?.id || "").trim();

const applyVariables = (text, values = {}) => {
  if (!text || typeof text !== "string") return text || "";
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => values[key] ?? `{{${key}}}`,
  );
};

const normalizePhone = (value) =>
  String(value || "")
    .trim()
    .replace(/\s/g, "");

const createRecipientId = () =>
  `recipient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const SendResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const summary = result?.data?.summary || {};
  const results = normalizeList(result?.data?.results);
  const skipped = normalizeList(result?.data?.skipped);
  const isSuccess = Boolean(result?.success);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <FiCheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <FiAlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Send summary
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {result?.message || "Request completed"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Sent", summary.sent ?? 0, "text-green-700 bg-green-50"],
              ["Failed", summary.failed ?? 0, "text-red-700 bg-red-50"],
              [
                "Unique",
                summary.unique_recipients ?? 0,
                "text-blue-700 bg-blue-50",
              ],
              ["Skipped", summary.skipped ?? 0, "text-amber-700 bg-amber-50"],
            ].map(([label, value, className]) => (
              <div key={label} className={`rounded-lg px-3 py-2 ${className}`}>
                <p className="text-xs font-medium opacity-80">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>

          {results.length ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Results
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 hidden sm:table-cell">
                        Sources
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((row, index) => (
                      <tr key={`${row.number}-${index}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">
                            {row.name || row.username || row.number}
                          </p>
                          <p className="text-xs text-gray-500">{row.number}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              row.status === "sent"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {row.status || "unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell text-xs text-gray-500">
                          {(row.sources || []).join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {skipped.length ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Skipped
              </h4>
              <ul className="space-y-2">
                {skipped.map((item, index) => (
                  <li
                    key={`${item.type}-${item.value}-${index}`}
                    className="text-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <span className="font-medium capitalize">{item.type}</span>:{" "}
                    {item.value}
                    <span className="block text-xs text-amber-800 mt-0.5">
                      {item.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const MediaUrlField = ({ accept, value, onChange, disabled, placeholder }) => {
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
        placeholder={placeholder || "https://..."}
        disabled={disabled || uploading}
        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept || "*/*"}
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 shrink-0"
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

const RecipientChip = ({ recipient, onRemove }) => {
  const typeLabel =
    recipient.type === "group"
      ? "Group"
      : recipient.type === "client"
        ? "Client"
        : "Phone";

  return (
    <span className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
      <span className="truncate">
        <span className="text-green-600">{typeLabel}:</span> {recipient.label}
      </span>
      <button
        type="button"
        onClick={() => onRemove(recipient.id)}
        className="p-0.5 rounded-full hover:bg-green-100 text-green-700 shrink-0"
        aria-label={`Remove ${recipient.label}`}
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
};

const MessagePreview = ({
  mode,
  direct,
  template,
  templateContent,
  variableValues,
}) => {
  if (mode === "template" && template) {
    const type = template.template_type || "text";
    const content = templateContent;

    if (type === "text") {
      return (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {applyVariables(content.message, variableValues) || "—"}
        </p>
      );
    }

    if (type === "image" || type === "video") {
      return (
        <div className="space-y-2">
          {content.url ? (
            type === "image" ? (
              <img
                src={content.url}
                alt="Preview"
                className="max-h-40 rounded-lg border border-gray-200 object-contain"
              />
            ) : (
              <video
                src={content.url}
                controls
                className="max-h-40 w-full rounded-lg border border-gray-200"
              />
            )
          ) : (
            <div className="h-24 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              No media URL
            </div>
          )}
          {content.caption ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {applyVariables(content.caption, variableValues)}
            </p>
          ) : null}
        </div>
      );
    }

    if (type === "document") {
      return (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-800">
            {content.filename || "Document"}
          </p>
          {content.caption ? (
            <p className="text-gray-700 whitespace-pre-wrap">
              {applyVariables(content.caption, variableValues)}
            </p>
          ) : null}
        </div>
      );
    }

    if (type === "audio") {
      return content.url ? (
        <audio src={content.url} controls className="w-full" />
      ) : (
        <p className="text-sm text-gray-500">No audio URL</p>
      );
    }
  }

  if (mode === "direct") {
    const type = direct.messageType;
    const previewDirect = {
      ...direct,
      message: applyVariables(direct.message, variableValues),
      caption: applyVariables(direct.caption, variableValues),
      filename: applyVariables(direct.filename, variableValues),
    };

    if (type === "text") {
      return (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {previewDirect.message || "—"}
        </p>
      );
    }

    if (type === "image" || type === "video") {
      return (
        <div className="space-y-2">
          {direct.url ? (
            type === "image" ? (
              <img
                src={direct.url}
                alt="Preview"
                className="max-h-40 rounded-lg border border-gray-200 object-contain"
              />
            ) : (
              <video
                src={direct.url}
                controls
                className="max-h-40 w-full rounded-lg border border-gray-200"
              />
            )
          ) : (
            <div className="h-24 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              No media URL
            </div>
          )}
          {previewDirect.caption ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {previewDirect.caption}
            </p>
          ) : null}
        </div>
      );
    }

    if (type === "document") {
      return (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-800">
            {previewDirect.filename || "Document"}
          </p>
          {previewDirect.caption ? (
            <p className="text-gray-700 whitespace-pre-wrap">
              {previewDirect.caption}
            </p>
          ) : null}
        </div>
      );
    }

    if (type === "audio") {
      return direct.url ? (
        <audio src={direct.url} controls className="w-full" />
      ) : (
        <p className="text-sm text-gray-500">No audio URL</p>
      );
    }
  }

  return (
    <p className="text-sm text-gray-500">Compose a message to see preview.</p>
  );
};

const WhatsAppWebSendMessage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [sendMode, setSendMode] = useState("direct");
  const [direct, setDirect] = useState(EMPTY_DIRECT);
  const [recipients, setRecipients] = useState([]);
  const [recipientKind, setRecipientKind] = useState("client");
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [bulkPhones, setBulkPhones] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showRecipientOverrides, setShowRecipientOverrides] = useState(false);
  const [recipientOverrides, setRecipientOverrides] = useState({});

  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [variableValues, setVariableValues] = useState({});

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (item) => getTemplatePublicId(item) === String(selectedTemplateId),
      ) || null,
    [templates, selectedTemplateId],
  );

  const templateContent = useMemo(
    () => (selectedTemplate ? normalizeContent(selectedTemplate) : {}),
    [selectedTemplate],
  );

  const directVariables = useMemo(
    () =>
      detectVariablesFromValues({
        message: direct.message,
        url: direct.url,
        caption: direct.caption,
        filename: direct.filename,
      }),
    [direct.message, direct.url, direct.caption, direct.filename],
  );

  const overrideRecipients = useMemo(
    () =>
      recipients.filter(
        (item) => item.type === "client" || item.type === "phone",
      ),
    [recipients],
  );

  const filteredTemplates = useMemo(() => {
    const term = templateSearch.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((item) =>
      [item.template_name, item.template_type, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [templates, templateSearch]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebTemplateList({
        status: "active",
        page_no: 1,
        limit: 100,
      });
      const list = normalizeList(res?.data);
      setTemplates(list);
      setSelectedTemplateId(
        (current) => current || (list[0] ? getTemplatePublicId(list[0]) : ""),
      );
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load templates"));
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sendMode !== "template") return;
    fetchTemplates();
  }, [sendMode, fetchTemplates]);

  useEffect(() => {
    if (sendMode !== "direct") {
      setVariableValues({});
      return;
    }

    setVariableValues((prev) => {
      const next = { ...prev };
      directVariables.forEach((key) => {
        if (next[key] === undefined) next[key] = "";
      });
      Object.keys(next).forEach((key) => {
        if (!directVariables.includes(key)) delete next[key];
      });
      return next;
    });
  }, [sendMode, directVariables]);

  const searchClients = useCallback(async () => {
    const term = clientSearch.trim();
    if (term.length < 2) {
      setClientResults([]);
      return;
    }
    setClientSearchLoading(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(
        `${API_BASE_URL}/client/search?search=${encodeURIComponent(term)}`,
        { headers },
      );
      setClientResults(
        (res?.data?.data || []).filter((client) => client.username),
      );
    } catch (error) {
      toast.error(extractApiError(error, "Failed to search clients"));
      setClientResults([]);
    } finally {
      setClientSearchLoading(false);
    }
  }, [clientSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientKind === "client") searchClients();
    }, 400);
    return () => clearTimeout(timer);
  }, [clientSearch, recipientKind, searchClients]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(
        `${API_BASE_URL}/group/groups/all?search=${encodeURIComponent(groupSearch)}&limit=100`,
        { headers },
      );
      setGroups(res?.data?.data?.groups || []);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load groups"));
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [groupSearch]);

  useEffect(() => {
    if (recipientKind !== "group") return;
    const timer = setTimeout(loadGroups, 300);
    return () => clearTimeout(timer);
  }, [recipientKind, loadGroups]);

  const addRecipient = (entry) => {
    const normalizedValue =
      entry.type === "group"
        ? entry.value.trim()
        : entry.type === "client"
          ? entry.value.trim()
          : normalizePhone(entry.value);

    if (!normalizedValue) {
      toast.error("Recipient value is required");
      return;
    }

    const duplicate = recipients.some(
      (item) => item.type === entry.type && item.value === normalizedValue,
    );
    if (duplicate) {
      toast.error("Recipient already added");
      return;
    }

    setRecipients((prev) => [
      ...prev,
      {
        id: createRecipientId(),
        type: entry.type,
        label: entry.label.trim() || normalizedValue,
        value: normalizedValue,
        meta: entry.meta || null,
      },
    ]);
  };

  const handleAddClient = (client) => {
    if (!client?.username) return;
    addRecipient({
      type: "client",
      label: client.name
        ? `${client.name} (${client.username})`
        : client.username,
      value: client.username,
      meta: client,
    });
    setClientSearch("");
    setClientResults([]);
  };

  const handleAddGroup = (group) => {
    if (!group?.group_id) return;
    addRecipient({
      type: "group",
      label: group.group_name || group.group_id,
      value: group.group_id,
      meta: group,
    });
  };

  const handleAddPhone = () => {
    const phone = normalizePhone(phoneInput);
    if (!phone) {
      toast.error("Phone number is required");
      return;
    }
    addRecipient({
      type: "phone",
      label: phone,
      value: phone,
    });
    setPhoneInput("");
  };

  const handleAddBulkPhones = () => {
    const numbers = bulkPhones
      .split(/[\n,;]+/)
      .map((part) => normalizePhone(part))
      .filter(Boolean);

    if (!numbers.length) {
      toast.error("Enter at least one phone number");
      return;
    }

    const existing = new Set(
      recipients
        .filter((item) => item.type === "phone")
        .map((item) => item.value),
    );
    const toAdd = numbers.filter((phone) => !existing.has(phone));

    if (!toAdd.length) {
      toast.error("All numbers are already added");
      return;
    }

    setRecipients((prev) => [
      ...prev,
      ...toAdd.map((phone) => ({
        id: createRecipientId(),
        type: "phone",
        label: phone,
        value: phone,
      })),
    ]);
    setBulkPhones("");
    toast.success(
      `Added ${toAdd.length} recipient${toAdd.length > 1 ? "s" : ""}`,
    );
  };

  const removeRecipient = (id) => {
    setRecipients((prev) => prev.filter((item) => item.id !== id));
  };

  const validateDirect = () => {
    const fields = DIRECT_FIELD_CONFIG[direct.messageType] || [];
    for (const field of fields) {
      if (field.required && !String(direct[field.key] || "").trim()) {
        return `${field.label} is required`;
      }
    }
    return null;
  };

  const validateTemplate = () => {
    if (!selectedTemplate) return "Select a template";
    if (!getTemplatePublicId(selectedTemplate)) {
      return "Selected template is missing template_id";
    }
    return null;
  };

  const buildApiPayload = () => {
    const usernames = recipients
      .filter((r) => r.type === "client")
      .map((r) => r.value);
    const numbers = recipients
      .filter((r) => r.type === "phone")
      .map((r) => r.value);
    const group_ids = recipients
      .filter((r) => r.type === "group")
      .map((r) => r.value);

    const payload = {
      recipients: {
        usernames,
        numbers,
        group_ids,
      },
    };

    if (sendMode === "template") {
      payload.template_id = getTemplatePublicId(selectedTemplate);
      return payload;
    }

    const variables = cleanVariables(variableValues);
    if (Object.keys(variables).length) {
      payload.variables = variables;
    }

    if (showRecipientOverrides && overrideRecipients.length) {
      const recipient_variables = {};
      overrideRecipients.forEach((recipient) => {
        const key = recipient.value;
        const overrides = cleanVariables(
          recipientOverrides[recipient.id] || {},
        );
        if (Object.keys(overrides).length) {
          recipient_variables[key] = overrides;
        }
      });
      if (Object.keys(recipient_variables).length) {
        payload.recipient_variables = recipient_variables;
      }
    }

    payload.template_type = direct.messageType;
    payload.content = buildDirectContent(direct.messageType, direct);
    return payload;
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!recipients.length) {
      toast.error("Add at least one recipient");
      return;
    }

    const validationError =
      sendMode === "direct" ? validateDirect() : validateTemplate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = buildApiPayload();
    setSending(true);
    try {
      const response = await whatsappApi.sendWhatsAppWebMessage(payload);
      setSendResult(response);

      if (response?.success) {
        toast.success(response?.message || "Message sent successfully");
      } else {
        toast.error(response?.message || "No messages were sent");
      }
    } catch (error) {
      const apiData = error?.response?.data;
      if (apiData?.data) {
        setSendResult(apiData);
      }
      toast.error(extractApiError(error, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const handleOverrideChange = (recipientId, key, value) => {
    setRecipientOverrides((prev) => ({
      ...prev,
      [recipientId]: {
        ...(prev[recipientId] || {}),
        [key]: value,
      },
    }));
  };

  const handleDirectTypeChange = (nextType) => {
    setDirect({
      messageType: nextType,
      message: nextType === "text" ? direct.message : "",
      url: ["image", "video", "document", "audio"].includes(nextType)
        ? direct.url
        : "",
      caption: ["image", "video", "document"].includes(nextType)
        ? direct.caption
        : "",
      filename: nextType === "document" ? direct.filename : "",
      is_voice: nextType === "audio" ? direct.is_voice : false,
    });
  };

  const filteredGroups = useMemo(() => {
    const selectedIds = new Set(
      recipients.filter((r) => r.type === "group").map((r) => r.value),
    );
    return groups.filter((group) => !selectedIds.has(group.group_id));
  }, [groups, recipients]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <Sidebar isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link
              to="/"
              className="hover:text-green-600 flex items-center gap-1"
            >
              <FiHome className="w-4 h-4" />
              Home
            </Link>
            <FiChevronRight className="mx-2 w-4 h-4 text-gray-400" />
            <Link to="/broadcast" className="hover:text-green-600">
              Broadcast
            </Link>
            <FiChevronRight className="mx-2 w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">Send Message</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Send WhatsApp Message
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Send direct messages or use saved templates to multiple clients,
                groups, or numbers.
              </p>
            </div>
            <Link
              to="/broadcast/whatsapp/web/session"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
            >
              <FiUsers className="w-4 h-4" />
              Session status
            </Link>
          </div>

          <form
            onSubmit={handleSend}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            <div className="xl:col-span-2 space-y-6">
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-900">
                    Recipients
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add clients by username, OOMS firm groups, or raw phone
                    numbers.
                  </p>
                </div>

                <div className="px-4 sm:px-6 py-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {RECIPIENT_KINDS.map((kind) => (
                      <button
                        key={kind.value}
                        type="button"
                        onClick={() => setRecipientKind(kind.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          recipientKind === kind.value
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>

                  {recipientKind === "client" ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search client by name, username, or mobile"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>
                      {clientSearchLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                          <FiLoader className="w-4 h-4 animate-spin" />
                          Searching clients...
                        </div>
                      ) : null}
                      {clientResults.length ? (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                          {clientResults.map((client) => (
                            <button
                              key={client.username}
                              type="button"
                              onClick={() => handleAddClient(client)}
                              className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {client.name || client.username}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {client.username}
                                {client.mobile ? ` • ${client.mobile}` : ""}
                                {!client.mobile
                                  ? " • No mobile on profile"
                                  : ""}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : clientSearch.trim().length >= 2 &&
                        !clientSearchLoading ? (
                        <p className="text-sm text-gray-500">
                          No clients found.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Type at least 2 characters to search branch clients.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {recipientKind === "group" ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={groupSearch}
                          onChange={(e) => setGroupSearch(e.target.value)}
                          placeholder="Search firm groups"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        OOMS firm group members are expanded to their mobile
                        numbers on send.
                      </p>
                      {groupsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                          <FiLoader className="w-4 h-4 animate-spin" />
                          Loading groups...
                        </div>
                      ) : filteredGroups.length ? (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                          {filteredGroups.map((group) => (
                            <button
                              key={group.group_id}
                              type="button"
                              onClick={() => handleAddGroup(group)}
                              className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {group.group_name || group.group_id}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {group.group_id}
                                </p>
                              </div>
                              <FiPlus className="w-4 h-4 text-green-600 shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No groups available.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {recipientKind === "phone" ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="Phone number"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhone}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shrink-0"
                        >
                          <FiPlus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Paste multiple numbers (comma or new line separated)
                        </label>
                        <textarea
                          value={bulkPhones}
                          onChange={(e) => setBulkPhones(e.target.value)}
                          rows={3}
                          placeholder="9876543210 or 919876543210"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-y"
                        />
                        <button
                          type="button"
                          onClick={handleAddBulkPhones}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                          Add all numbers
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Selected ({recipients.length})
                    </p>
                    {recipients.length ? (
                      <div className="flex flex-wrap gap-2">
                        {recipients.map((recipient) => (
                          <RecipientChip
                            key={recipient.id}
                            recipient={recipient}
                            onRemove={removeRecipient}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No recipients added yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Message
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Choose direct compose or a saved template.
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    {SEND_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSendMode(mode.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          sendMode === mode.id
                            ? "bg-white text-green-700 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-4 space-y-4">
                  {sendMode === "direct" ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Message type
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {MESSAGE_TYPES.map((type) => {
                            const Icon = type.icon;
                            const active = direct.messageType === type.value;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() =>
                                  handleDirectTypeChange(type.value)
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                  active
                                    ? "bg-green-50 text-green-700 border-green-300"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {(DIRECT_FIELD_CONFIG[direct.messageType] || []).map(
                        (field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                              {field.required ? (
                                <span className="text-red-500"> *</span>
                              ) : null}
                            </label>
                            {field.isUrl ? (
                              <MediaUrlField
                                accept={URL_ACCEPT_BY_TYPE[direct.messageType]}
                                value={direct[field.key]}
                                onChange={(value) =>
                                  setDirect((prev) => ({
                                    ...prev,
                                    [field.key]: value,
                                  }))
                                }
                                disabled={sending}
                              />
                            ) : field.multiline ? (
                              <textarea
                                value={direct[field.key]}
                                onChange={(e) =>
                                  setDirect((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                rows={field.key === "message" ? 5 : 3}
                                placeholder={
                                  field.key === "message"
                                    ? "Hi {{name}}, your task {{task_id}} is ready."
                                    : undefined
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-y"
                              />
                            ) : (
                              <input
                                type="text"
                                value={direct[field.key]}
                                onChange={(e) =>
                                  setDirect((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                            )}
                          </div>
                        ),
                      )}

                      {direct.messageType === "audio" ? (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={direct.is_voice}
                            onChange={(e) =>
                              setDirect((prev) => ({
                                ...prev,
                                is_voice: e.target.checked,
                              }))
                            }
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          Send as voice note
                        </label>
                      ) : null}

                      {directVariables.length ? (
                        <div className="pt-2 border-t border-gray-100 space-y-3">
                          <p className="text-sm font-medium text-gray-800">
                            Message variables
                          </p>
                          <p className="text-xs text-gray-500">
                            Profile fields like name and mobile are auto-filled
                            for clients and group members.
                          </p>
                          {directVariables.map((key) => (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {key}
                              </label>
                              <input
                                type="text"
                                value={variableValues[key] || ""}
                                onChange={(e) =>
                                  setVariableValues((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder={`Default for {{${key}}}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Search templates"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>

                      {templatesLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                          <FiLoader className="w-5 h-5 animate-spin mr-2" />
                          Loading templates...
                        </div>
                      ) : filteredTemplates.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {filteredTemplates.map((item) => {
                            const templateId = getTemplatePublicId(item);
                            const active = templateId === String(selectedTemplateId);
                            return (
                              <button
                                key={templateId}
                                type="button"
                                onClick={() => setSelectedTemplateId(templateId)}
                                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                                  active
                                    ? "border-green-400 bg-green-50"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.template_name}
                                </p>
                                <p className="text-xs text-gray-500 capitalize mt-0.5">
                                  {item.template_type || "text"}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                          <p className="text-sm text-gray-600">
                            No active templates found.
                          </p>
                          <Link
                            to="/broadcast/whatsapp/web/templates"
                            className="inline-block mt-2 text-sm font-medium text-green-600 hover:text-green-700"
                          >
                            Create templates
                          </Link>
                        </div>
                      )}

                      {selectedTemplate ? (
                        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          Variables in the selected template are filled automatically
                          from each recipient&apos;s profile when sending.
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </section>

              {sendMode === "direct" &&
              directVariables.length > 0 &&
              overrideRecipients.length > 0 ? (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRecipientOverrides((prev) => !prev)}
                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 text-left flex items-center justify-between gap-3"
                  >
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Per-recipient overrides
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Optional variable overrides by username or phone number.
                      </p>
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      {showRecipientOverrides ? "Hide" : "Show"}
                    </span>
                  </button>
                  {showRecipientOverrides ? (
                    <div className="px-4 sm:px-6 py-4 space-y-4">
                      {overrideRecipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="rounded-lg border border-gray-200 p-3 space-y-3"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {recipient.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {recipient.value}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {directVariables.map((key) => (
                              <div key={`${recipient.id}-${key}`}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {key}
                                </label>
                                <input
                                  type="text"
                                  value={
                                    recipientOverrides[recipient.id]?.[key] ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleOverrideChange(
                                      recipient.id,
                                      key,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Override {{${key}}}`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="space-y-6">
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
                <div className="px-4 py-4 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-900">
                    Preview & send
                  </h2>
                </div>
                <div className="px-4 py-4 space-y-4">
                  <div className="rounded-lg bg-[#e5ddd5] p-3 min-h-[120px]">
                    <div className="rounded-lg bg-white shadow-sm p-3 max-w-full">
                      <MessagePreview
                        mode={sendMode}
                        direct={direct}
                        template={selectedTemplate}
                        templateContent={templateContent}
                        variableValues={
                          sendMode === "direct" ? variableValues : {}
                        }
                      />
                    </div>
                  </div>

                  <dl className="text-sm space-y-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Mode</dt>
                      <dd className="font-medium text-gray-900 capitalize">
                        {sendMode}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Recipients</dt>
                      <dd className="font-medium text-gray-900">
                        {recipients.length}
                      </dd>
                    </div>
                    {sendMode === "direct" ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Type</dt>
                        <dd className="font-medium text-gray-900 capitalize">
                          {direct.messageType}
                        </dd>
                      </div>
                    ) : selectedTemplate ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Template</dt>
                        <dd className="font-medium text-gray-900 text-right truncate max-w-[160px]">
                          {selectedTemplate.template_name}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60"
                  >
                    {sending ? (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiSend className="w-4 h-4" />
                    )}
                    Send message
                  </button>
                </div>
              </section>
            </div>
          </form>

          <SendResultModal
            result={sendResult}
            onClose={() => setSendResult(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppWebSendMessage;
