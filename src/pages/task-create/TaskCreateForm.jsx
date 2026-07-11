import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaCheckCircle } from "react-icons/fa";
import { FiLoader, FiX } from "react-icons/fi";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";
import { uploadOneSaasFileUrl } from "../../utils/onesaas-upload";
import useTaskCreateResources from "./useTaskCreateResources";
import ClientsStep from "./steps/ClientsStep";
import ServiceStep from "./steps/ServiceStep";
import SubtasksStep from "./steps/SubtasksStep";
import TeamStep from "./steps/TeamStep";
import NotesStep from "./steps/NotesStep";
import TaskCreateStepIndicator from "./TaskCreateStepIndicator";
import TaskCreateFooter from "./TaskCreateFooter";
import {
  STEPS,
  formatCurrency,
  formatFileSize,
  getFileIcon,
  initialForm,
  validateStep,
} from "./taskCreateConstants";
import {
  buildLockedFields,
  firmToOption,
  groupToOption,
  memberToSelected,
  serviceToSelected,
} from "./taskCreatePrefill";

const FIRM_LIST_LIMIT = 20;

function mapFirmToOption(f) {
  return {
    value: f.firm_id,
    label: f.client ? `${f.firm_name} – ${f.client.name}` : f.firm_name || "",
    __firm: f,
  };
}

async function uploadFile(fileOrBlob, filename = "file") {
  const file =
    fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], filename, {
          type: fileOrBlob.type || "audio/wav",
        });
  return uploadOneSaasFileUrl(file);
}

function resetFormState(setters, staff) {
  const {
    setStep,
    setForm,
    setSelectedFirmOptions,
    setSelectedGroupOptions,
    setSelectedService,
    setSelectedCa,
    setSelectedAgent,
    setSubtasks,
    setAttachedFiles,
    setVoiceNotesList,
    setSelectedEmployees,
    setAllEmployees,
    setFirmSearchQuery,
    setFirmSearchResults,
    setSubTaskForm,
    setShowSubTaskForm,
  } = setters;
  setStep(1);
  setForm(initialForm);
  setSelectedFirmOptions([]);
  setSelectedGroupOptions([]);
  setSelectedService(null);
  setSelectedCa(null);
  setSelectedAgent(null);
  setSubtasks([]);
  setAttachedFiles([]);
  setVoiceNotesList([]);
  setSelectedEmployees([]);
  setAllEmployees(staff);
  setFirmSearchQuery("");
  setFirmSearchResults([]);
  setSubTaskForm({
    type: "service",
    service_id: "",
    service_name: "",
    service_fees: "",
    service_gst_rate: "",
    service_gst_value: "",
    manual_text: "",
  });
  setShowSubTaskForm(true);
}

const TaskCreateForm = forwardRef(function TaskCreateForm(
  {
    prefill = null,
    onClose,
    onSuccess,
    onNavigateToTaskList,
    layout = "modal",
    onStepChange,
    resourcesEnabled = true,
  },
  ref,
) {
  const navigate = useNavigate();
  const {
    loading,
    error,
    reload,
    services,
    groups,
    staff,
    caList,
    agentList,
    assessmentYears,
    financialYears,
  } = useTaskCreateResources({ enabled: resourcesEnabled });

  const lockedFields = useMemo(
    () => buildLockedFields(prefill || {}),
    [prefill],
  );

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const prefillAppliedRef = useRef(false);

  const [firmSearchQuery, setFirmSearchQuery] = useState("");
  const [firmSearchResults, setFirmSearchResults] = useState([]);
  const [firmSearchLoading, setFirmSearchLoading] = useState(false);
  const [firmSearchLoadingMore, setFirmSearchLoadingMore] = useState(false);
  const [firmSearchPage, setFirmSearchPage] = useState(1);
  const [firmSearchHasMore, setFirmSearchHasMore] = useState(false);
  const [selectedFirmOptions, setSelectedFirmOptions] = useState([]);
  const firmAbortRef = useRef(null);
  const firmFetchIdRef = useRef(0);

  const [selectedGroupOptions, setSelectedGroupOptions] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCa, setSelectedCa] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [subtasks, setSubtasks] = useState([]);
  const [subTaskForm, setSubTaskForm] = useState({
    type: "service",
    service_id: "",
    service_name: "",
    service_fees: "",
    service_gst_rate: "",
    service_gst_value: "",
    manual_text: "",
  });
  const [showSubTaskForm, setShowSubTaskForm] = useState(true);

  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  const [attachedFiles, setAttachedFiles] = useState([]);
  const [voiceNotesList, setVoiceNotesList] = useState([]);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [fieldError, setFieldError] = useState(null);

  const firmsFieldRef = useRef(null);
  const serviceFieldRef = useRef(null);
  const feesFieldRef = useRef(null);
  const dueDateFieldRef = useRef(null);
  const ayFieldRef = useRef(null);
  const fyFieldRef = useRef(null);
  const fieldRefs = useMemo(
    () => ({
      firms: firmsFieldRef,
      service: serviceFieldRef,
      fees: feesFieldRef,
      due_date: dueDateFieldRef,
      ay: ayFieldRef,
      fy: fyFieldRef,
    }),
    [],
  );

  const applyPrefill = useCallback(
    async (pf) => {
      if (!pf) return;

      let firmOpts = [];
      if (Array.isArray(pf.firms) && pf.firms.length) {
        firmOpts = pf.firms.map(firmToOption).filter(Boolean);
      } else if (Array.isArray(pf.firm_ids) && pf.firm_ids.length) {
        firmOpts = pf.firm_ids.map((id) =>
          firmToOption({
            firm_id: id,
            firm_name: pf.firmNames?.[id] || String(id),
          }),
        );
      } else if (pf.client) {
        const headers = getHeaders();
        if (headers) {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(pf.client)}`,
              { headers },
            );
            const firmsData = res.data?.data?.firms || [];
            firmOpts = firmsData.map(firmToOption).filter(Boolean);
          } catch (e) {
            console.error("Failed to load client firms for task prefill:", e);
          }
        }
      }

      let groupOpts = [];
      if (Array.isArray(pf.groups) && pf.groups.length) {
        groupOpts = pf.groups.map(groupToOption).filter(Boolean);
      } else if (Array.isArray(pf.group_ids) && pf.group_ids.length) {
        groupOpts = pf.group_ids
          .map((id) => {
            const g = groups.find((x) => x.group_id === id);
            return groupToOption(
              g || { group_id: id, name: pf.groupNames?.[id] || String(id) },
            );
          })
          .filter(Boolean);
      }

      const serviceId = pf.service?.service_id || pf.service_id;
      const svcSelected = serviceToSelected(pf.service || serviceId, services);

      const caUsername = pf.ca;
      const agentUsername = pf.agent;

      setSelectedFirmOptions(firmOpts);
      setSelectedGroupOptions(groupOpts);
      setSelectedService(svcSelected);
      setSelectedCa(
        memberToSelected(caUsername, pf.caName || pf.caProfile?.name),
      );
      setSelectedAgent(
        memberToSelected(agentUsername, pf.agentName || pf.agentProfile?.name),
      );

      setForm((p) => ({
        ...p,
        firm_ids: firmOpts.map((o) => o.value),
        group_ids: groupOpts.map((o) => o.value),
        service_id: serviceId || "",
        fees:
          pf.fees != null
            ? String(pf.fees)
            : pf.service?.fees != null
              ? String(pf.service.fees)
              : svcSelected &&
                  services.find((s) => s.service_id === serviceId)?.fees != null
                ? String(services.find((s) => s.service_id === serviceId).fees)
                : p.fees,
        due_date: pf.due_date || p.due_date,
        ca: caUsername || "",
        agent: agentUsername || "",
      }));
    },
    [groups, services],
  );

  useEffect(() => {
    if (loading || prefillAppliedRef.current) return;
    if (!prefill || Object.keys(prefill).length === 0) return;
    prefillAppliedRef.current = true;
    applyPrefill(prefill);
  }, [loading, prefill, applyPrefill]);

  useEffect(() => {
    setAllEmployees(staff);
    setSelectedEmployees([]);
  }, [staff]);

  const fetchFirmList = useCallback(
    async ({ pageNo = 1, search = "", append = false } = {}) => {
      const headers = getHeaders();
      if (!headers) return;

      let ac;
      let fetchId;
      if (!append) {
        firmAbortRef.current?.abort();
        ac = new AbortController();
        firmAbortRef.current = ac;
        fetchId = ++firmFetchIdRef.current;
        setFirmSearchLoading(true);
      } else {
        fetchId = firmFetchIdRef.current;
        setFirmSearchLoadingMore(true);
      }

      try {
        const base = API_BASE_URL.replace(/\/$/, "");
        const res = await axios.get(`${base}/firm/list`, {
          headers,
          signal: ac?.signal,
          params: {
            page_no: pageNo,
            limit: FIRM_LIST_LIMIT,
            search: String(search ?? ""),
          },
        });

        if (fetchId !== firmFetchIdRef.current) return;

        const data = res.data;
        if (!data?.success) {
          if (!append) setFirmSearchResults([]);
          setFirmSearchHasMore(false);
          return;
        }

        const list = Array.isArray(data.data) ? data.data : [];
        const pag = data.pagination || {};
        const options = list.map(mapFirmToOption);

        setFirmSearchResults((prev) => {
          if (!append) return options;
          const seen = new Set(prev.map((o) => o.value));
          return [...prev, ...options.filter((o) => !seen.has(o.value))];
        });
        setFirmSearchPage(pageNo);
        const isLastPage =
          pag.is_last_page === true ||
          pag.is_last_page === 1 ||
          list.length < FIRM_LIST_LIMIT;
        setFirmSearchHasMore(!isLastPage);
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError"
        )
          return;
        if (!append) setFirmSearchResults([]);
        setFirmSearchHasMore(false);
      } finally {
        if (fetchId === firmFetchIdRef.current) {
          setFirmSearchLoading(false);
          setFirmSearchLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const delay = firmSearchQuery.trim() ? 400 : 0;
    const t = setTimeout(() => {
      fetchFirmList({ pageNo: 1, search: firmSearchQuery, append: false });
    }, delay);
    return () => {
      clearTimeout(t);
      firmAbortRef.current?.abort();
    };
  }, [firmSearchQuery, fetchFirmList]);

  const loadMoreFirms = useCallback(() => {
    if (firmSearchLoading || firmSearchLoadingMore || !firmSearchHasMore)
      return;
    fetchFirmList({
      pageNo: firmSearchPage + 1,
      search: firmSearchQuery,
      append: true,
    });
  }, [
    firmSearchLoading,
    firmSearchLoadingMore,
    firmSearchHasMore,
    firmSearchPage,
    firmSearchQuery,
    fetchFirmList,
  ]);

  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        value: g.group_id,
        label: g.remark ? `${g.name} – ${g.remark}` : g.name,
        firm_count: g.firm_count ?? 0,
      })),
    [groups],
  );

  const filteredAvailableEmployees = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter((e) =>
      [e.name, e.email, e.mobile, e.department].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [allEmployees, employeeSearchQuery]);

  const focusField = useCallback(
    (field) => {
      requestAnimationFrame(() => {
        const root = fieldRefs[field]?.current;
        if (!root) return;
        root.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable =
          root.querySelector?.("input:not([disabled])") ||
          root.querySelector?.("textarea:not([disabled])") ||
          root.querySelector?.("button:not([disabled])");
        focusable?.focus?.({ preventScroll: true });
      });
    },
    [fieldRefs],
  );

  const applyValidationError = useCallback(
    (v, targetStep = step) => {
      setFieldError({ field: v.field, message: v.message });
      if (targetStep !== step) {
        setStep(targetStep);
      }
      setTimeout(() => focusField(v.field), targetStep !== step ? 120 : 0);
    },
    [step, focusField],
  );

  useEffect(() => {
    if (!fieldError?.field) return;
    const v = validateStep(step, form);
    if (v.valid || v.field !== fieldError.field) {
      setFieldError(null);
    }
  }, [form, step, fieldError?.field]);

  const selectedFirmCount = selectedFirmOptions.length;
  const selectedGroupCount = selectedGroupOptions.length;
  const selectedGroupFirmCount = selectedGroupOptions.reduce(
    (s, g) => s + (Number(g.firm_count) || 0),
    0,
  );

  const addFirm = (opt) => {
    if (lockedFields.firms) return;
    if (selectedFirmOptions.some((o) => o.value === opt.value)) return;
    const next = [...selectedFirmOptions, opt];
    setSelectedFirmOptions(next);
    setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
  };
  const removeFirm = (opt) => {
    if (lockedFields.firms) return;
    const next = selectedFirmOptions.filter((o) => o.value !== opt.value);
    setSelectedFirmOptions(next);
    setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
  };
  const addAllFirmsFromResults = () => {
    if (lockedFields.firms) return;
    const ids = new Set(selectedFirmOptions.map((o) => o.value));
    const toAdd = firmSearchResults.filter((o) => !ids.has(o.value));
    if (!toAdd.length) return;
    const next = [...selectedFirmOptions, ...toAdd];
    setSelectedFirmOptions(next);
    setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
  };
  const removeAllFirms = () => {
    if (lockedFields.firms) return;
    setSelectedFirmOptions([]);
    setForm((p) => ({ ...p, firm_ids: [] }));
  };
  const addGroup = (opt) => {
    if (lockedFields.groups) return;
    if (
      opt.firm_count === 0 ||
      selectedGroupOptions.some((o) => o.value === opt.value)
    )
      return;
    const next = [...selectedGroupOptions, opt];
    setSelectedGroupOptions(next);
    setForm((p) => ({ ...p, group_ids: next.map((o) => o.value) }));
  };
  const removeGroup = (opt) => {
    if (lockedFields.groups) return;
    const next = selectedGroupOptions.filter((o) => o.value !== opt.value);
    setSelectedGroupOptions(next);
    setForm((p) => ({ ...p, group_ids: next.map((o) => o.value) }));
  };

  const goToStep = (n) => {
    if (n < step) {
      setFieldError(null);
      setStep(n);
    }
  };

  const goNext = () => {
    const v = validateStep(step, form);
    if (!v.valid) {
      applyValidationError(v);
      return;
    }
    setFieldError(null);
    if (step < STEPS.length) setStep((s) => s + 1);
  };

  const goPrevious = () => {
    setFieldError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const toggleYear = (field, year) => {
    setForm((p) => {
      const list = [...(p[field] || [])];
      const idx = list.indexOf(year);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(year);
      return { ...p, [field]: list };
    });
  };

  const addSubTask = () => {
    if (
      (subTaskForm.type === "service" && !subTaskForm.service_id) ||
      (subTaskForm.type === "manual" && !subTaskForm.manual_text.trim())
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    const svc = services.find((s) => s.service_id === subTaskForm.service_id);
    setSubtasks((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2, 9),
        type: subTaskForm.type,
        description:
          subTaskForm.type === "service"
            ? svc?.name || subTaskForm.service_name
            : subTaskForm.manual_text,
        service_id:
          subTaskForm.type === "service" ? subTaskForm.service_id : undefined,
        content:
          subTaskForm.type === "manual" ? subTaskForm.manual_text : undefined,
      },
    ]);
    setSubTaskForm({
      type: "service",
      service_id: "",
      service_name: "",
      service_fees: "",
      service_gst_rate: "",
      service_gst_value: "",
      manual_text: "",
    });
    setShowSubTaskForm(true);
  };

  const addEmployee = (emp) => {
    setSelectedEmployees((p) => [...p, emp]);
    setAllEmployees((p) => p.filter((e) => e.username !== emp.username));
    setForm((f) => ({ ...f, employees: [...f.employees, emp.username] }));
  };
  const removeEmployee = (emp) => {
    setAllEmployees((p) => [...p, emp]);
    setSelectedEmployees((p) => p.filter((e) => e.username !== emp.username));
    setForm((f) => ({
      ...f,
      employees: f.employees.filter((u) => u !== emp.username),
    }));
  };
  const addAllEmployees = () => {
    const toAdd = filteredAvailableEmployees;
    setSelectedEmployees((p) => [...p, ...toAdd]);
    setForm((f) => ({
      ...f,
      employees: [...f.employees, ...toAdd.map((e) => e.username)],
    }));
    setAllEmployees((p) =>
      p.filter((e) => !toAdd.some((a) => a.username === e.username)),
    );
  };
  const removeAllEmployees = () => {
    setAllEmployees((p) => [...p, ...selectedEmployees]);
    setSelectedEmployees([]);
    setForm((f) => ({ ...f, employees: [] }));
  };

  const addTextNote = () =>
    setForm((p) => ({ ...p, text_notes: [...(p.text_notes || []), ""] }));
  const updateTextNote = (i, v) =>
    setForm((p) => {
      const next = [...p.text_notes];
      next[i] = v;
      return { ...p, text_notes: next };
    });
  const removeTextNote = (i) =>
    setForm((p) => ({
      ...p,
      text_notes: p.text_notes.filter((_, idx) => idx !== i),
    }));

  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const id = Math.random().toString(36).slice(2, 9);
      const previewUrl = URL.createObjectURL(file);
      setAttachedFiles((p) => [
        ...p,
        {
          id,
          file,
          name: "",
          remark: "",
          url: null,
          uploading: true,
          size: file.size,
          type: file.type,
          previewUrl,
        },
      ]);
      try {
        const url = await uploadFile(file);
        setAttachedFiles((p) =>
          p.map((a) => (a.id === id ? { ...a, url, uploading: false } : a)),
        );
      } catch (err) {
        toast.error(err.message || "Upload failed");
        setAttachedFiles((p) => p.filter((a) => a.id !== id));
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  const updateAttachmentName = (id, v) =>
    setAttachedFiles((p) =>
      p.map((a) => (a.id === id ? { ...a, name: v } : a)),
    );
  const updateAttachmentRemark = (id, v) =>
    setAttachedFiles((p) =>
      p.map((a) => (a.id === id ? { ...a, remark: v } : a)),
    );
  const removeFile = (id) => {
    setAttachedFiles((p) => {
      const item = p.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return p.filter((f) => f.id !== id);
    });
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => audioChunksRef.current.push(ev.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const id = Math.random().toString(36).slice(2, 9);
        const duration = recordingTime;
        setVoiceNotesList((p) => [
          ...p,
          { id, url: null, duration, uploading: true },
        ]);
        try {
          const url = await uploadFile(blob, `voice-${Date.now()}.wav`);
          setVoiceNotesList((p) =>
            p.map((v) => (v.id === id ? { ...v, url, uploading: false } : v)),
          );
        } catch (err) {
          toast.error(err.message || "Voice upload failed");
          setVoiceNotesList((p) => p.filter((v) => v.id !== id));
        }
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording")
      mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const handleCreateAnother = () => {
    setResultOpen(false);
    prefillAppliedRef.current = false;
    resetFormState(
      {
        setStep,
        setForm,
        setSelectedFirmOptions,
        setSelectedGroupOptions,
        setSelectedService,
        setSelectedCa,
        setSelectedAgent,
        setSubtasks,
        setAttachedFiles,
        setVoiceNotesList,
        setSelectedEmployees,
        setAllEmployees,
        setFirmSearchQuery,
        setFirmSearchResults,
        setSubTaskForm,
        setShowSubTaskForm,
      },
      staff,
    );
    if (prefill) applyPrefill(prefill);
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (step !== STEPS.length) return;
    for (let i = 1; i <= 2; i++) {
      const v = validateStep(i, form);
      if (!v.valid) {
        applyValidationError(v, i);
        return;
      }
    }
    const ready = attachedFiles.filter((a) => a.url && !a.uploading);
    if (ready.some((a) => !(a.name || "").trim())) {
      toast.error("Please enter a name for every attachment.");
      return;
    }

    setSubmitting(true);
    const payload = {
      firms: form.firm_ids,
      groups: form.group_ids,
      service: {
        service_id: form.service_id,
        fees: parseFloat(String(form.fees).trim()) || 0,
        due_date: form.due_date.trim(),
        has_financial_year: form.has_fy === "1",
        financial_years: form.has_fy === "1" ? form.fy : [],
        has_assisment_year: form.has_ay === "1",
        assisment_years: form.has_ay === "1" ? form.ay : [],
      },
      subtasks: subtasks.map((t) =>
        t.type === "service"
          ? { type: "service", service_id: t.service_id }
          : { type: "text", content: t.content || "" },
      ),
      assignment: {
        staff: form.employees,
        ca: form.ca || "",
        agent: form.agent || "",
      },
      notes: {
        text: (form.text_notes || []).filter((t) => (t || "").trim()),
        attachments: ready.map((a) => ({
          name: a.name.trim(),
          remark: (a.remark || "").trim(),
          url: a.url,
        })),
        voice: voiceNotesList
          .filter((v) => v.url && !v.uploading)
          .map((v) => v.url),
      },
    };

    try {
      const headers = getHeaders();
      if (!headers) {
        toast.error("Authentication required");
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/task/create`, payload, {
        headers,
      });
      if (!res.data?.success) {
        toast.error(res.data?.message || "Failed to create task");
        return;
      }
      const tasks = Array.isArray(res.data.data) ? res.data.data : [];
      const count = res.data.count ?? tasks.length;
      const totals = tasks.reduce(
        (acc, t) => {
          acc.fees += Number(t?.fees ?? 0) || 0;
          acc.taxValue += Number(t?.tax_value ?? 0) || 0;
          acc.total += Number(t?.total ?? 0) || 0;
          return acc;
        },
        { fees: 0, taxValue: 0, total: 0 },
      );
      const svcMap = new Map(services.map((s) => [s.service_id, s.name || ""]));
      const firmMap = new Map(
        selectedFirmOptions.map((o) => [
          o.value,
          o.__firm?.firm_name || o.label || "",
        ]),
      );
      const result = {
        message: res.data.message || "Tasks created successfully",
        count,
        tasks: tasks.map((t) => ({
          ...t,
          task_name: svcMap.get(t?.service_id) || "N/A",
          firm_name: firmMap.get(t?.firm_id) || "N/A",
        })),
        stats: { totals },
      };
      setResultData(result);
      setResultOpen(true);
      toast.success(res.data.message || "Task created successfully");
      onSuccess?.(result);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to create task",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const subTaskDraftActive =
    showSubTaskForm &&
    ((subTaskForm.type === "service" && subTaskForm.service_id) ||
      (subTaskForm.type === "manual" && subTaskForm.manual_text.trim()));

  useImperativeHandle(ref, () => ({
    step,
    goToStep,
    goNext,
    goPrevious,
    handleCreate,
    submitting,
    subTaskDraftActive,
  }));

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  useEffect(() => {
    onStepChangeRef.current?.({ step, submitting, subTaskDraftActive });
  }, [step, submitting, subTaskDraftActive]);

  const stepContent = (
    <>
      {step === 1 && (
        <ClientsStep
          firmSearchQuery={firmSearchQuery}
          setFirmSearchQuery={setFirmSearchQuery}
          firmSearchLoading={firmSearchLoading}
          firmSearchLoadingMore={firmSearchLoadingMore}
          firmSearchHasMore={firmSearchHasMore}
          onLoadMoreFirms={loadMoreFirms}
          firmSearchResults={firmSearchResults}
          selectedFirmOptions={selectedFirmOptions}
          addFirm={addFirm}
          removeFirm={removeFirm}
          addAllFirmsFromResults={addAllFirmsFromResults}
          removeAllFirms={removeAllFirms}
          groupOptions={groupOptions}
          selectedGroupOptions={selectedGroupOptions}
          addGroup={addGroup}
          removeGroup={removeGroup}
          estimatedTaskCreateCount={selectedFirmCount + selectedGroupFirmCount}
          selectedFirmCount={selectedFirmCount}
          selectedGroupCount={selectedGroupCount}
          selectedGroupFirmCount={selectedGroupFirmCount}
          lockedFields={lockedFields}
          fieldError={fieldError}
          fieldRefs={fieldRefs}
        />
      )}
      {step === 2 && (
        <ServiceStep
          form={form}
          setForm={setForm}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          assessmentYears={assessmentYears}
          financialYears={financialYears}
          toggleYear={toggleYear}
          lockedFields={lockedFields}
          estimatedTaskCreateCount={selectedFirmCount + selectedGroupFirmCount}
          fieldError={fieldError}
          fieldRefs={fieldRefs}
        />
      )}
      {step === 3 && (
        <SubtasksStep
          subtasks={subtasks}
          setSubtasks={setSubtasks}
          subTaskForm={subTaskForm}
          setSubTaskForm={setSubTaskForm}
          showSubTaskForm={showSubTaskForm}
          setShowSubTaskForm={setShowSubTaskForm}
          addSubTask={addSubTask}
        />
      )}
      {step === 4 && (
        <TeamStep
          form={form}
          setForm={setForm}
          caList={caList}
          agentList={agentList}
          selectedCa={selectedCa}
          setSelectedCa={setSelectedCa}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          allEmployees={allEmployees}
          selectedEmployees={selectedEmployees}
          employeeSearchQuery={employeeSearchQuery}
          setEmployeeSearchQuery={setEmployeeSearchQuery}
          filteredAvailableEmployees={filteredAvailableEmployees}
          addEmployee={addEmployee}
          removeEmployee={removeEmployee}
          addAllEmployees={addAllEmployees}
          removeAllEmployees={removeAllEmployees}
          staffLoading={false}
          lockedFields={lockedFields}
        />
      )}
      {step === 5 && (
        <NotesStep
          form={form}
          addTextNote={addTextNote}
          updateTextNote={updateTextNote}
          removeTextNote={removeTextNote}
          fileInputRef={fileInputRef}
          handleFileAttach={handleFileAttach}
          attachedFiles={attachedFiles}
          updateAttachmentName={updateAttachmentName}
          updateAttachmentRemark={updateAttachmentRemark}
          removeFile={removeFile}
          formatFileSize={formatFileSize}
          getFileIcon={getFileIcon}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          recordingTime={recordingTime}
          formatTime={formatTime}
          voiceNotesList={voiceNotesList}
          removeVoiceNote={(id) =>
            setVoiceNotesList((p) => p.filter((v) => v.id !== id))
          }
        />
      )}
    </>
  );

  const resultModal = (
    <AnimatePresence>
      {resultOpen && resultData && (
        <div className="fixed inset-0 z-[260] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={() => setResultOpen(false)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-[1] pointer-events-auto w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-create-result-title"
          >
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FaCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <h2
                    id="task-create-result-title"
                    className="text-sm font-semibold text-gray-900 truncate"
                  >
                    Tasks created successfully
                  </h2>
                  {resultData.message && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {resultData.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div
              className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <p className="text-[10px] font-medium text-violet-700 uppercase tracking-wide">
                    Tasks
                  </p>
                  <p className="text-lg font-semibold text-violet-800 mt-0.5">
                    {resultData.count}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
                    Fees
                  </p>
                  <p className="text-lg font-semibold text-blue-800 mt-0.5">
                    ₹{formatCurrency(resultData.stats?.totals?.fees)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">
                    Tax
                  </p>
                  <p className="text-lg font-semibold text-amber-800 mt-0.5">
                    ₹{formatCurrency(resultData.stats?.totals?.taxValue)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-lg font-semibold text-emerald-800 mt-0.5">
                    ₹{formatCurrency(resultData.stats?.totals?.total)}
                  </p>
                </div>
              </div>
              {resultData.tasks?.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          Firm
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          Service
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.tasks.map((t, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-800">
                            {t.firm_name}
                          </td>
                          <td className="px-3 py-2 text-gray-800">
                            {t.task_name}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800">
                            ₹{formatCurrency(t.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="shrink-0 px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/80">
              <button
                type="button"
                onClick={handleCreateAnother}
                className="px-3.5 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-white"
              >
                Create another
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTaskList) onNavigateToTaskList();
                  else navigate("/task/view");
                }}
                className="px-3.5 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View tasks
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <FiLoader className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading form data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (layout === "modal") {
    return (
      <>
        <style>{`.task-scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}.task-scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
        <form id="task-create-form" onSubmit={handleCreate} className="min-h-0">
          {stepContent}
        </form>
        {resultModal}
      </>
    );
  }

  return (
    <>
      <style>{`.task-scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}.task-scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Create New Task
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete the steps below to create a task for firms and groups
        </p>
      </div>
      <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-200 min-w-0 w-full max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <TaskCreateStepIndicator
          step={step}
          onGoToStep={goToStep}
          disableNavigation
        />
        <div className="p-4 sm:p-6">
          <form onSubmit={handleCreate}>
            {stepContent}
            <TaskCreateFooter
              step={step}
              onPrevious={goPrevious}
              onNext={goNext}
              onSubmit={handleCreate}
              submitting={submitting}
              showSubTaskForm={subTaskDraftActive}
              className="pt-6 border-t border-gray-200 mt-6"
            />
          </form>
        </div>
      </motion.div>
      {resultModal}
    </>
  );
});

export default TaskCreateForm;
