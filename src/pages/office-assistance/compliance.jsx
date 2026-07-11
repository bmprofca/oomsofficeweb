import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiEye,
  FiLoader,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiSettings,
  FiUserCheck,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import { useUserPermissions } from '../../utils/permission-helper';
import { taskGetIn, taskGetOut } from '../../services/taskService';
import {
  addComplianceFirm,
  changeComplianceTaskStatus,
  COMPLIANCE_TASK_STATUSES,
  editComplianceFirm,
  extractApiError,
  fetchComplianceFirmDetails,
  fetchComplianceServices,
  fetchComplianceTaskList,
  getCurrentComplianceYear,
  normalizeAssignees,
} from '../../services/complianceService';
import axios from 'axios';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import { formatMoney, FirmFormModal } from './complianceShared';
import AssignedStaffList from '../../components/Modals/AssignedStaffList';
import TaskStatusChange from '../../components/Modals/TaskStatusChange';

/** Task-table typography baseline — see context/typography.md & TaskTable.js */
const TABLE_HEAD_ROW = 'bg-gradient-to-r from-gray-50 to-white border-b border-gray-200';
const TABLE_TH = 'p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100';
const TABLE_TH_FIRST = 'p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide';
const TABLE_ROW_BASE = 'border-b border-gray-100 transition-colors group';

const getRowBackgroundClass = (row, canForceGetOut) => {
  const inOutState = getTaskInOutState(row, canForceGetOut);
  if (inOutState.mode === 'self') {
    return `${TABLE_ROW_BASE} bg-emerald-700/20 hover:bg-emerald-700/25`;
  }
  if (inOutState.mode === 'other') {
    return `${TABLE_ROW_BASE} bg-amber-700/20 hover:bg-amber-700/25`;
  }
  return `${TABLE_ROW_BASE} bg-white hover:bg-gray-50`;
};

const getStatusColorClass = (status) => {
  switch (status) {
    case 'in process': return 'bg-orange-100 text-orange-700';
    case 'pending from client': return 'bg-purple-100 text-purple-700';
    case 'pending from department': return 'bg-yellow-100 text-yellow-700';
    case 'complete': return 'bg-green-100 text-green-700';
    case 'cancel': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const TABLE_TD = 'p-3 min-w-0 text-left align-middle border-l border-gray-100';
const TABLE_TD_FIRST = 'p-3 min-w-0 text-left align-middle';
const COLUMN_STACK = 'flex flex-col items-start justify-start gap-2 w-full min-w-0';
const SUB_CELL = 'w-full';
const SUB_CELL_DIVIDER = 'border-b border-gray-100 my-1';
const CELL_BODY = 'text-sm font-medium text-gray-700';
const CELL_TITLE = 'text-sm font-semibold text-gray-800';
const CELL_INDEX = 'text-[11px] font-bold text-gray-800';
const FEES_CHIP = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
const CellDash = () => <span className="text-sm text-gray-400">—</span>;
const TOOLBAR_ROW = 'flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50';
const TOOLBAR_INPUT = 'w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none';

const StackedColumnCell = ({ items }) => {
  if (!items?.length) return <CellDash />;

  return (
    <div className={COLUMN_STACK}>
      {items.map((content, idx) => (
        <div key={idx} className={SUB_CELL}>
          {content}
          {idx < items.length - 1 ? <div className={SUB_CELL_DIVIDER} /> : null}
        </div>
      ))}
    </div>
  );
};

const StackedSkeletonCell = ({ rows = 3 }) => (
  <div className={COLUMN_STACK}>
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className={SUB_CELL}>
        <div className="h-3.5 bg-gray-200 rounded max-w-[120px]" />
        {idx < rows - 1 ? <div className={SUB_CELL_DIVIDER} /> : null}
      </div>
    ))}
  </div>
);

const getLoggedInUsername = () =>
  localStorage.getItem('user_username') || localStorage.getItem('username') || '';

const isBranchAdmin = () =>
  localStorage.getItem('branch_owned') === 'true' ||
  getLoggedInUsername().toLowerCase() === 'admin';

const getTaskInOutState = (task, canForceGetOut) => {
  const me = getLoggedInUsername();
  const inUser = task?.in_user;

  if (!inUser?.username) {
    return {
      mode: 'free',
      showGetIn: true,
      showGetOut: false,
      badge: null,
      inUser: null,
    };
  }

  if (inUser.username === me) {
    return {
      mode: 'self',
      showGetIn: false,
      showGetOut: true,
      badge: 'You',
      inUser,
    };
  }

  return {
    mode: 'other',
    showGetIn: false,
    showGetOut: canForceGetOut(),
    badge: inUser.name || inUser.username,
    inUser,
  };
};

const ComplianceInOutBadge = ({ row, canForceGetOut }) => {
  if (!row?.task_id || !row?.status) return null;

  const inOutState = getTaskInOutState(row, canForceGetOut);
  if (!inOutState.badge) return null;

  const isSelf = inOutState.mode === 'self';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isSelf
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
    >
      {isSelf ? <FiUserCheck className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
      {inOutState.badge}
    </span>
  );
};

const getRowDropdownPosition = (button, dropdownHeight = 220) => {
  if (!button) return { top: 8, left: 8 };
  const rect = button.getBoundingClientRect();
  const dropdownWidth = 224;
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  const spaceBelow = windowHeight - rect.bottom;
  const spaceAbove = rect.top;

  let left = rect.right - dropdownWidth;
  left = Math.max(8, Math.min(left, windowWidth - dropdownWidth - 8));

  let top = 8;
  if (spaceBelow >= dropdownHeight + 8) {
    top = rect.bottom + 4;
  } else if (spaceAbove >= dropdownHeight + 8) {
    top = rect.top - dropdownHeight - 4;
  } else {
    top = Math.max(8, Math.min(windowHeight - dropdownHeight - 8, rect.bottom + 4));
  }
  return { top, left };
};

const getStatusDisplayText = (status) => {
  switch (status) {
    case 'in process': return 'In Process';
    case 'pending from client': return 'PFC';
    case 'pending from department': return 'PFD';
    case 'complete': return 'Complete';
    case 'cancel': return 'Cancel';
    default: return status || '—';
  }
};

const getStatusHoverTitle = (status) => {
  switch (status) {
    case 'pending from client': return 'Pending from Client';
    case 'pending from department': return 'Pending from Department';
    default: return undefined;
  }
};

const COMPLIANCE_STATUS_OPTIONS = COMPLIANCE_TASK_STATUSES.map((status) => ({
  value: status,
  name: status === 'in process'
    ? 'In Process'
    : status === 'pending from client'
      ? 'Pending from Client'
      : status === 'pending from department'
        ? 'Pending from Department'
        : status.charAt(0).toUpperCase() + status.slice(1),
}));

const getDaysLeft = (dueDate) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDueDaysLabel = (dueDate) => {
  if (!dueDate) return null;
  const daysLeft = getDaysLeft(dueDate);
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft < 0) return `OD by ${Math.abs(daysLeft)}D`;
  if (daysLeft === 0) return 'Due today';
  return `Due in ${daysLeft}D`;
};

const isDueOverdue = (dueDate) => {
  const daysLeft = getDaysLeft(dueDate);
  return daysLeft !== null && daysLeft < 0;
};

const getDueDaysColorClass = (dueDate) => {
  const daysLeft = getDaysLeft(dueDate);
  if (daysLeft === null || daysLeft === undefined) return 'text-gray-400';
  if (daysLeft < 0) return 'text-red-600 font-semibold';
  if (daysLeft <= 7) return 'text-orange-600';
  return 'text-green-600';
};

const getDueDateColorClass = (dueDate) =>
  isDueOverdue(dueDate) ? 'text-red-600' : 'text-gray-700';

const formatFeesWithGst = (charges) => {
  if (charges.fees == null) return null;
  const fees = Number(charges.fees) || 0;
  const taxValue = Number(charges.tax_value) || 0;
  const total = fees + taxValue;
  return formatMoney(total);
};

const resolveCompliancePeriod = (row) => {
  const dates = row?.dates || {};
  const candidates = [
    dates.compliance_period,
    dates.period,
    dates.compliance_period_label,
    row?.compliance_period,
    row?.period,
    row?.schedule?.compliance_period,
    row?.schedule?.period,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
};

const getPeriodLabel = (row, periodOptions) => {
  const raw = resolveCompliancePeriod(row);
  if (raw) {
    const periods = periodOptions?.periods ?? [];
    const match = periods.find(
      (item) => String(item.value) === raw || String(item.label) === raw,
    );
    return match?.label || match?.value || raw;
  }
  const frequency = periodOptions?.frequency ?? rowService(row)?.frequency ?? row?.frequency;
  if (frequency === 'yearly') return 'Yearly';
  return null;
};

const getFirmFileNo = (firm) => firm?.file_no || firm?.file_number || '';
const getFirmType = (firm) => firm?.firm_type || '';

const formatDueDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getServiceLabel = (service) =>
  service?.service_name || service?.name || service?.service_id || '';

/** Accessors for /compliance/task-list rows (task/list-shaped payload). */
const rowDates = (row) => {
  const dates = row?.dates || {};
  return {
    ...dates,
    compliance_period: resolveCompliancePeriod(row),
    compliance_year: dates.compliance_year ?? row?.compliance_year ?? null,
    due_date: dates.due_date ?? row?.due_date ?? null,
  };
};
const rowFirm = (row) => row?.firm || {};
const rowService = (row) => row?.service || {};
const rowClientContact = (row) => {
  const profile = row?.client?.profile || {};
  const client = row?.client || {};
  return {
    username: profile.username || client.username || '',
    name: profile.name || client.name || profile.username || client.username || '',
    mobile: profile.mobile || client.mobile || '',
    email: profile.email || client.email || '',
  };
};
const rowCharges = (row) => row?.charges || {};

const buildFirmEditInitialFromRow = (row, details = null) => {
  const firm = rowFirm(row);
  const service = rowService(row);
  const charges = rowCharges(row);
  const source = details && typeof details === 'object' ? details : {};

  return {
    id: source.id ?? source.compliance_firm_id ?? row.compliance_firm_id
      ?? firm.compliance_firm_id ?? firm.id ?? row.id,
    service_id: source.service_id ?? service.service_id ?? '',
    firm_id: source.firm_id ?? firm.firm_id ?? '',
    fees: source.fees ?? charges.fees ?? '',
    tax_rate: source.tax_rate ?? charges.tax_rate ?? charges.gst_rate ?? 18,
    due_date: source.due_date ?? firm.due_date ?? row.due_day ?? '10',
    effective_from: source.effective_from ?? row.effective_from ?? firm.effective_from ?? '',
    staffs: source.staffs ?? row.staffs,
    ca: source.ca ?? row.ca,
    agent: source.agent ?? row.agent,
  };
};

const isTaskNotStarted = (row) => !row?.task_id || !row?.status;

const taskRowKey = (row) => {
  const dates = rowDates(row);
  const firm = rowFirm(row);
  return `${firm.firm_id || ''}:${dates.compliance_year || ''}:${dates.compliance_period ?? ''}`;
};

const toStaffUser = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'object') {
    return {
      username: entry.username || entry.name || '',
      name: entry.name || entry.username || 'Staff',
      email: entry.email || '',
      mobile: entry.mobile || '',
    };
  }
  if (typeof entry === 'string' && entry.trim()) {
    return { username: entry, name: entry, email: '', mobile: '' };
  }
  return null;
};

const resolveStaffList = (staffs) => {
  const raw = Array.isArray(staffs) ? staffs : normalizeAssignees(staffs);
  return raw.map(toStaffUser).filter(Boolean);
};

const StaffAvatarsCell = ({ row, onOpenStaffModal }) => {
  const staffs = resolveStaffList(row.staffs);
  const serviceLabel = rowService(row).name || rowService(row).service_id || '';

  if (staffs.length === 0) return <CellDash />;

  if (staffs.length === 1) {
    const staffName = staffs[0].name || 'S';
    return (
      <button
        type="button"
        onClick={() => onOpenStaffModal(staffs, serviceLabel)}
        className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
        title={`Click to view ${staffName}'s details`}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
          {staffName.charAt(0).toUpperCase()}
        </div>
      </button>
    );
  }

  if (staffs.length === 2) {
    return (
      <div className="flex -space-x-2">
        {staffs.map((staff, staffIndex) => {
          const staffName = staff.name || 'S';
          return (
            <button
              type="button"
              key={staff.username || staffIndex}
              onClick={() => onOpenStaffModal(staffs, serviceLabel)}
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              title={`Click to view ${staffName}'s details`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                {staffName.charAt(0).toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  const showMoreCount = staffs.length - 2;
  return (
    <div className="flex -space-x-2">
      {staffs.slice(0, 2).map((staff, staffIndex) => {
        const staffName = staff.name || 'S';
        return (
          <button
            type="button"
            key={staff.username || staffIndex}
            onClick={() => onOpenStaffModal(staffs, serviceLabel)}
            className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
            title={`Click to view all ${staffs.length} staff members`}
          >
            {staffName.charAt(0).toUpperCase()}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onOpenStaffModal(staffs, serviceLabel)}
        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
        title={`Click to view all ${staffs.length} staff members`}
      >
        +{showMoreCount}
      </button>
    </div>
  );
};

const StaffRolesCell = ({ row }) => {
  const caName = row.has_ca && row.ca ? (row.ca.name || row.ca.username) : null;
  const agentName = row.has_agent && row.agent ? (row.agent.name || row.agent.username) : null;

  if (!caName && !agentName) return <CellDash />;

  return (
    <div className="flex flex-col items-start gap-1 w-full min-w-0">
      {caName ? (
        <span
          className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-full"
          title={`CA: ${caName}`}
        >
          CA: {caName}
        </span>
      ) : null}
      {agentName ? (
        <span
          className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded truncate max-w-full"
          title={`Agent: ${agentName}`}
        >
          Agent: {agentName}
        </span>
      ) : null}
    </div>
  );
};

const getComplianceTaskLabel = (row) => {
  const firm = rowFirm(row);
  const service = rowService(row);
  const firmName = firm.firm_name || firm.firm_id || '';
  const serviceName = service.name || service.service_id || '';
  if (firmName && serviceName) return `${firmName} · ${serviceName}`;
  return firmName || serviceName || 'Compliance task';
};

const StartWorkingModal = ({ row, loading, onConfirm, onCancel }) => {
  if (!row) return null;
  const firm = rowFirm(row);
  const service = rowService(row);
  const dates = rowDates(row);
  const periodLabel = getPeriodLabel(row, null) || '—';

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-800 m-0">Start this task?</h3>
        <p className="text-sm text-gray-600 mt-2 m-0">
          This will create the compliance task and set its status to <strong>in process</strong>.
        </p>
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p className="m-0"><span className="font-medium text-gray-700">Firm:</span> {firm.firm_name || firm.firm_id}</p>
          <p className="m-0"><span className="font-medium text-gray-700">Service:</span> {service.name || service.service_id}</p>
          <p className="m-0"><span className="font-medium text-gray-700">Period:</span> {periodLabel} · {dates.compliance_year || '—'}</p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
            Start
          </button>
        </div>
      </div>
    </div>
  );
};

export const ComplianceTaskBoard = ({
  username: usernameProp = '',
  firmId: firmIdProp = '',
  embedded = false,
  isMinimized = false,
}) => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const username = String(usernameProp || '').trim();
  const isClientScoped = Boolean(username);

  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [complianceYear, setComplianceYear] = useState(getCurrentComplianceYear());
  const [compliancePeriod, setCompliancePeriod] = useState('');
  const [periodOptions, setPeriodOptions] = useState(null);
  const [selectedFirmId, setSelectedFirmId] = useState(firmIdProp || '');
  const [firmOptions, setFirmOptions] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [statusUpdatingKey, setStatusUpdatingKey] = useState(null);
  const [staffModal, setStaffModal] = useState({ open: false, users: [], taskName: '' });
  const [statusModal, setStatusModal] = useState({ open: false, row: null, taskName: '', currentStatus: '' });
  const [getInOutLoadingId, setGetInOutLoadingId] = useState(null);
  const [startWorkingTarget, setStartWorkingTarget] = useState(null);
  const [startWorkingLoading, setStartWorkingLoading] = useState(false);
  const [activeActionRowKey, setActiveActionRowKey] = useState(null);
  const rowMenuButtonRefs = useRef({});
  const rowContextPositionRef = useRef(null);
  const rowDropdownRef = useRef(null);
  const [rowDropdownPosition, setRowDropdownPosition] = useState({ top: 8, left: 8 });
  const [firmModal, setFirmModal] = useState(null);
  const [firmModalSaving, setFirmModalSaving] = useState(false);
  const [firmEditOpening, setFirmEditOpening] = useState(false);

  const selectedService = useMemo(
    () => services.find((item) => item.service_id === serviceId) || null,
    [services, serviceId],
  );

  const periodSelectEnabled = Boolean(serviceId && periodOptions?.period_select_enabled);
  const periodChoices = periodOptions?.periods ?? [];

  const branchServices = useMemo(
    () => services.filter((item) => item.is_added === 1 || item.is_added === true || item.is_added === '1'),
    [services],
  );

  const yearOptions = useMemo(() => {
    const currentStart = Number(getCurrentComplianceYear().split('-')[0]);
    return Array.from({ length: 5 }, (_, index) => {
      const start = currentStart - 2 + index;
      return `${start}-${start + 1}`;
    });
  }, []);

  const canForceGetOut = useCallback(
    () => isBranchAdmin() || check('task_get_in'),
    [check],
  );

  useEffect(() => {
    setSelectedFirmId(firmIdProp || '');
  }, [firmIdProp, username]);

  useEffect(() => {
    if (!isClientScoped) {
      setFirmOptions([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const headers = getHeaders();
        const response = await axios.get(
          `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(username)}`,
          { headers },
        );
        if (cancelled) return;
        const firmsData = response.data?.data?.firms || [];
        setFirmOptions(
          firmsData.map((firm) => ({
            value: firm.firm_id,
            label: firm.firm_name || firm.name || String(firm.firm_id),
          })),
        );
      } catch {
        if (!cancelled) setFirmOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isClientScoped, username]);

  const loadServices = useCallback(async () => {
    try {
      const res = await fetchComplianceServices({ page_no: 1, limit: 100 });
      const list = Array.isArray(res?.data) ? res.data : [];
      setServices(list);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance services'));
      setServices([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceTaskList({
        service_id: serviceId,
        compliance_year: complianceYear,
        compliance_period:
          serviceId && complianceYear && compliancePeriod ? compliancePeriod : '',
        page_no: pagination.page,
        limit: pagination.limit,
        username,
        firm_id: selectedFirmId || '',
      });
      setRows(res.data);
      setPeriodOptions(res.query_payload?.period_options ?? null);
      setPagination((prev) => ({ ...prev, ...res.pagination }));
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance tasks'));
      setRows([]);
      setPeriodOptions(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId, complianceYear, compliancePeriod, pagination.page, pagination.limit, username, selectedFirmId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handleOutsideMenuClick = (event) => {
      const clickedRowMenu = event.target.closest('.compliance-row-action-menu');
      const clickedRowTrigger = event.target.closest('.compliance-row-action-trigger');
      if (!clickedRowMenu && !clickedRowTrigger && activeActionRowKey !== null) {
        setActiveActionRowKey(null);
        rowContextPositionRef.current = null;
      }
    };
    document.addEventListener('mousedown', handleOutsideMenuClick);
    return () => document.removeEventListener('mousedown', handleOutsideMenuClick);
  }, [activeActionRowKey]);

  useLayoutEffect(() => {
    if (!activeActionRowKey) return undefined;

    const syncPosition = () => {
      const dropdownHeight = rowDropdownRef.current?.offsetHeight || 220;
      const dropdownWidth = 224;

      if (rowContextPositionRef.current) {
        let { top, left } = rowContextPositionRef.current;
        left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - dropdownHeight - 8));
        setRowDropdownPosition({ top, left });
        return;
      }

      const button = rowMenuButtonRefs.current[activeActionRowKey];
      if (button) {
        setRowDropdownPosition(getRowDropdownPosition(button, dropdownHeight));
      }
    };

    syncPosition();
    const raf = requestAnimationFrame(syncPosition);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [activeActionRowKey, rows, isMinimized]);

  const toggleActionMenu = (rowKey, buttonElement) => {
    if (activeActionRowKey === rowKey) {
      setActiveActionRowKey(null);
      rowContextPositionRef.current = null;
      return;
    }
    rowContextPositionRef.current = null;
    if (buttonElement) {
      rowMenuButtonRefs.current[rowKey] = buttonElement;
    }
    setActiveActionRowKey(rowKey);
  };

  const handleRowContextMenu = (e, rowKey) => {
    e.preventDefault();
    e.stopPropagation();
    rowContextPositionRef.current = { top: e.clientY, left: e.clientX };
    rowMenuButtonRefs.current[rowKey] = null;
    setActiveActionRowKey(rowKey);
  };

  const handleStatusChange = async (row, nextStatus) => {
    if (!nextStatus) return false;

    if (row.status === 'complete') {
      toast.error('Completed tasks cannot be changed');
      return false;
    }

    const dates = rowDates(row);
    const firm = rowFirm(row);
    const service = rowService(row);
    const rowKey = taskRowKey(row);
    setStatusUpdatingKey(rowKey);
    try {
      const payload = {
        service_id: service.service_id,
        firm_id: firm.firm_id,
        status: nextStatus,
        compliance_year: dates.compliance_year,
      };
      if (dates.compliance_period) {
        payload.compliance_period = dates.compliance_period;
      }

      const res = await changeComplianceTaskStatus(payload);
      const saved = res?.data || {};
      setRows((prev) =>
        prev.map((item) =>
          taskRowKey(item) === rowKey
            ? {
              ...item,
              task_id: saved.task_id ?? item.task_id,
              status: saved.status || nextStatus,
              in_user: saved.in_user ?? item.in_user,
            }
            : item,
        ),
      );
      toast.success(res?.message || 'Task status updated');
      return true;
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to update task status'));
      return false;
    } finally {
      setStatusUpdatingKey(null);
    }
  };

  const handleConfirmStartWorking = async () => {
    if (!startWorkingTarget) return;
    setStartWorkingLoading(true);
    try {
      const ok = await handleStatusChange(startWorkingTarget, 'in process');
      if (ok) setStartWorkingTarget(null);
    } finally {
      setStartWorkingLoading(false);
    }
  };

  const openStatusModal = (row) => {
    setStatusModal({
      open: true,
      row,
      taskName: getComplianceTaskLabel(row),
      currentStatus: row.status || '',
    });
  };

  const closeStatusModal = () => {
    setStatusModal({ open: false, row: null, taskName: '', currentStatus: '' });
  };

  const handleModalStatusChange = async (_taskId, newStatus) => {
    if (!statusModal.row) return;
    await handleStatusChange(statusModal.row, newStatus);
  };

  const handleGetInOut = async (taskId, action) => {
    if (!taskId || getInOutLoadingId) return;

    setGetInOutLoadingId(taskId);
    setActiveActionRowKey(null);
    rowContextPositionRef.current = null;

    try {
      const responseData = action === 'in'
        ? await taskGetIn(taskId)
        : await taskGetOut(taskId);

      if (responseData?.success) {
        toast.success(responseData.message || (action === 'in' ? 'Get in successful' : 'Get out successful'));
        setRows((prev) =>
          prev.map((row) =>
            row.task_id === taskId
              ? {
                ...row,
                in_user: action === 'in'
                  ? (responseData.data?.in_user ?? row.in_user)
                  : null,
              }
              : row,
          ),
        );
        return;
      }

      if (responseData?.in_user) {
        setRows((prev) =>
          prev.map((row) =>
            row.task_id === taskId ? { ...row, in_user: responseData.in_user } : row,
          ),
        );
      }

      toast.error(responseData?.message || 'Operation failed');
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.in_user) {
        setRows((prev) =>
          prev.map((row) =>
            row.task_id === taskId ? { ...row, in_user: responseData.in_user } : row,
          ),
        );
      }
      toast.error(responseData?.message || error.message || 'Operation failed');
    } finally {
      setGetInOutLoadingId(null);
    }
  };

  const handleOpenEditFirmModal = async (row) => {
    setActiveActionRowKey(null);
    rowContextPositionRef.current = null;

    const firm = rowFirm(row);
    const service = rowService(row);

    if (!service.service_id || !firm.firm_id) {
      toast.error('Missing service or firm on this row');
      return;
    }

    setFirmEditOpening(true);
    try {
      let details = null;
      try {
        const res = await fetchComplianceFirmDetails({
          service_id: service.service_id,
          firm_id: firm.firm_id,
        });
        details = res?.data ?? res;
      } catch {
        details = null;
      }

      setFirmModal({
        mode: 'edit',
        firm: buildFirmEditInitialFromRow(row, details),
        clientUsername: row?.client?.profile?.username || row?.client?.username || '',
      });
    } finally {
      setFirmEditOpening(false);
    }
  };

  const handleSaveFirmModal = async (form) => {
    setFirmModalSaving(true);
    try {
      if (firmModal?.mode === 'add') {
        const res = await addComplianceFirm({
          service_id: form.service_id,
          firm_id: form.firm_id,
          effective_from: form.effective_from,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm assigned');
      } else {
        const firmId = firmModal?.firm?.id ?? firmModal?.firm?.compliance_firm_id;
        if (!firmId) {
          toast.error('Compliance firm assignment id is missing');
          return;
        }
        const res = await editComplianceFirm({
          id: firmId,
          service_id: form.service_id,
          firm_id: form.firm_id,
          effective_from: form.effective_from,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm updated');
      }
      setFirmModal(null);
      loadTasks();
    } catch (error) {
      toast.error(extractApiError(
        error,
        firmModal?.mode === 'add' ? 'Failed to assign compliance firm' : 'Failed to update compliance firm',
      ));
    } finally {
      setFirmModalSaving(false);
    }
  };

  const actionRow = activeActionRowKey
    ? rows.find((row) => taskRowKey(row) === activeActionRowKey)
    : null;

  const hideClientColumn = isClientScoped;
  const tableColSpan = hideClientColumn ? 7 : 8;
  const cardShellClass = embedded
    ? 'bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col w-full'
    : 'bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4';

  const boardContent = (
    <>
      <div className={cardShellClass}>
        <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight">
              Compliance Tasks
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isClientScoped
                ? 'Compliance schedule and work status for this client'
                : 'Track compliance work by firm and period'}
            </p>
          </div>
        </div>

        <div className={`${TOOLBAR_ROW} flex-wrap`}>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isClientScoped ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-3 flex-1 min-w-0 w-full`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setCompliancePeriod('');
                  setPeriodOptions(null);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={TOOLBAR_INPUT}
              >
                <option value="">All services</option>
                {branchServices.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {getServiceLabel(service)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Compliance year
              </label>
              <select
                value={complianceYear}
                onChange={(e) => {
                  setComplianceYear(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={TOOLBAR_INPUT}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
              <select
                value={compliancePeriod}
                onChange={(e) => {
                  setCompliancePeriod(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                disabled={!periodSelectEnabled}
                className={`${TOOLBAR_INPUT} disabled:opacity-60`}
              >
                <option value="">
                  {!serviceId
                    ? 'Select a service first'
                    : !periodSelectEnabled
                      ? 'All periods in year (yearly service)'
                      : 'All periods in year'}
                </option>
                {periodChoices.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label || period.value}
                  </option>
                ))}
              </select>
            </div>

            {isClientScoped ? (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Firm</label>
                <select
                  value={selectedFirmId}
                  onChange={(e) => {
                    setSelectedFirmId(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={TOOLBAR_INPUT}
                >
                  <option value="">All firms</option>
                  {firmOptions.map((firm) => (
                    <option key={firm.value} value={firm.value}>
                      {firm.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadTasks}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title="Refresh"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {selectedService ? (
            <p className="text-xs text-gray-500 m-0">
              {getServiceLabel(selectedService)}
              {periodOptions?.frequency ? ` · ${periodOptions.frequency}` : ''}
              {compliancePeriod
                ? ` · Period: ${compliancePeriod}`
                : serviceId
                  ? ' · All periods in selected year'
                  : ''}
            </p>
          ) : null}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-hidden flex-1">
            <table className="w-full table-auto">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH_FIRST}>#</th>
                  <th className={TABLE_TH}>Service</th>
                  <th className={TABLE_TH}>Due</th>
                  {!hideClientColumn ? <th className={TABLE_TH}>Client</th> : null}
                  <th className={TABLE_TH}>Firm</th>
                  <th className={TABLE_TH}>Staff</th>
                  <th className={TABLE_TH}>Status</th>
                  <th className={`${TABLE_TH} text-center`}>
                    <FiSettings className="w-4 h-4 text-gray-600 mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className={TABLE_TD_FIRST}><div className={`${CELL_INDEX} h-3.5 bg-gray-200 rounded w-6`} /></td>
                      <td className={TABLE_TD}><StackedSkeletonCell rows={3} /></td>
                          <td className={TABLE_TD}><StackedSkeletonCell rows={2} /></td>
                          {!hideClientColumn ? (
                            <td className={TABLE_TD}><StackedSkeletonCell rows={3} /></td>
                          ) : null}
                          <td className={TABLE_TD}><StackedSkeletonCell rows={3} /></td>
                      <td className={TABLE_TD}><StackedSkeletonCell rows={2} /></td>
                      <td className={TABLE_TD}><StackedSkeletonCell rows={2} /></td>
                      <td className={TABLE_TD}><div className="h-8 w-8 bg-gray-200 rounded-full mx-auto" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className={`${TABLE_TD} py-12 text-center`}>
                      <p className="text-sm font-medium text-gray-500 m-0">No compliance tasks found</p>
                      <p className="text-xs text-gray-400 mt-1 m-0">Try adjusting the filters above.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const rowKey = taskRowKey(row);
                    const dates = rowDates(row);
                    const firm = rowFirm(row);
                    const service = rowService(row);
                    const client = rowClientContact(row);
                    const charges = rowCharges(row);
                    const currentStatus = row.status || '';
                    const isUpdating = statusUpdatingKey === rowKey;
                    const serialNo = (pagination.page - 1) * pagination.limit + idx + 1;
                    const periodLabel = getPeriodLabel(row, periodOptions);
                    const feesLabel = formatFeesWithGst(charges);
                    const dueDaysLabel = formatDueDaysLabel(dates.due_date);
                    const fileNo = getFirmFileNo(firm);
                    const firmType = getFirmType(firm);
                    const serviceName = service.name || service.service_id || '—';
                    const overdue = isDueOverdue(dates.due_date);

                    const statusButton = !currentStatus ? (
                      <button
                        type="button"
                        onClick={() => setStartWorkingTarget(row)}
                        disabled={isUpdating || startWorkingLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <FiLoader className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        Start
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openStatusModal(row)}
                        title={getStatusHoverTitle(currentStatus)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(currentStatus)} hover:opacity-90 transition-opacity`}
                      >
                        {getStatusDisplayText(currentStatus)}
                      </button>
                    );

                    const inOutBadgeVisible = row.task_id
                      && row.status
                      && getTaskInOutState(row, canForceGetOut).badge;
                    const statusItems = inOutBadgeVisible
                      ? [
                        statusButton,
                        <ComplianceInOutBadge row={row} canForceGetOut={canForceGetOut} />,
                      ]
                      : [statusButton];

                    return (
                      <tr
                        key={rowKey}
                        className={getRowBackgroundClass(row, canForceGetOut)}
                        onContextMenu={(e) => {
                          if (e.target.closest('button, a, input, label, .compliance-row-action-trigger')) return;
                          handleRowContextMenu(e, rowKey);
                        }}
                      >
                        <td className={`${TABLE_TD_FIRST} ${CELL_INDEX}`}>{serialNo}</td>
                        <td className={TABLE_TD}>
                          <StackedColumnCell
                            items={[
                              row.task_id ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/task/${row.task_id}`)}
                                  className={`${CELL_TITLE} truncate max-w-full block text-left hover:text-indigo-600 transition-colors`}
                                >
                                  {serviceName}
                                </button>
                              ) : (
                                <span className={`${CELL_TITLE} truncate max-w-full block`}>
                                  {serviceName}
                                </span>
                              ),
                              periodLabel ? (
                                <span className={`${CELL_BODY} block`}>{periodLabel}</span>
                              ) : (
                                <CellDash />
                              ),
                              feesLabel ? (
                                <span className={FEES_CHIP}>{feesLabel}</span>
                              ) : (
                                <CellDash />
                              ),
                            ]}
                          />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedColumnCell
                            items={[
                              (
                                <div
                                  className={`flex items-center gap-1.5 font-medium text-sm ${getDueDateColorClass(dates.due_date)}`}
                                  title={dates.due_date ? `Due Date: ${formatDueDate(dates.due_date)}` : 'Due Date'}
                                >
                                  <FiCalendar className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                                  <span>{formatDueDate(dates.due_date)}</span>
                                </div>
                              ),
                              dueDaysLabel ? (
                                <span className={`text-sm ${getDueDaysColorClass(dates.due_date)}`}>
                                  {dueDaysLabel}
                                </span>
                              ) : (
                                <CellDash />
                              ),
                            ]}
                          />
                        </td>
                        {!hideClientColumn ? (
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                client.username ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/client/profile/${client.username}`)}
                                    className={`${CELL_TITLE} truncate max-w-full block text-left hover:text-indigo-600 transition-colors`}
                                  >
                                    {client.name || '—'}
                                  </button>
                                ) : (
                                  <span className={`${CELL_TITLE} truncate max-w-full block`}>
                                    {client.name || '—'}
                                  </span>
                                ),
                                (
                                  <div className="flex items-center gap-2 text-gray-700 font-medium text-sm min-w-0">
                                    <FiPhone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{client.mobile || '—'}</span>
                                  </div>
                                ),
                                (
                                  <div className="flex items-center gap-2 text-gray-700 font-medium text-sm min-w-0">
                                    <FiMail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="truncate" title={client.email || ''}>
                                      {client.email || '—'}
                                    </span>
                                  </div>
                                ),
                              ]}
                            />
                          </td>
                        ) : null}
                        <td className={TABLE_TD}>
                          <StackedColumnCell
                            items={[
                              (
                                <span className={`${CELL_BODY} truncate max-w-full block`}>
                                  {firm.firm_name || firm.firm_id || '—'}
                                </span>
                              ),
                              firmType ? (
                                <span className={`${CELL_BODY} block capitalize`}>{firmType}</span>
                              ) : (
                                <CellDash />
                              ),
                              (
                                <span className={`${CELL_BODY} block`}>{fileNo || '—'}</span>
                              ),
                            ]}
                          />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedColumnCell
                            items={[
                              (
                                <StaffAvatarsCell
                                  row={row}
                                  onOpenStaffModal={(users, taskName) =>
                                    setStaffModal({ open: true, users, taskName })
                                  }
                                />
                              ),
                              <StaffRolesCell row={row} />,
                            ]}
                          />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedColumnCell items={statusItems} />
                        </td>
                        <td className={`${TABLE_TD} relative overflow-visible`}>
                          <div className="flex items-center justify-center w-full">
                            <button
                              type="button"
                              ref={(el) => {
                                if (el) rowMenuButtonRefs.current[rowKey] = el;
                              }}
                              onClick={(e) => toggleActionMenu(rowKey, e.currentTarget)}
                              className="compliance-row-action-trigger w-8 h-8 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                              title="Actions"
                            >
                              <div className="w-1 h-1 rounded-full bg-gray-600" />
                              <div className="w-1 h-1 rounded-full bg-gray-600" />
                              <div className="w-1 h-1 rounded-full bg-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && pagination.total_pages > 1 ? (
          <TablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.total_pages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onLimitChange={(limit) =>
              setPagination((prev) => ({ ...prev, limit, page: 1 }))
            }
          />
        ) : null}
      </div>

      <StartWorkingModal
        row={startWorkingTarget}
        loading={startWorkingLoading}
        onConfirm={handleConfirmStartWorking}
        onCancel={() => !startWorkingLoading && setStartWorkingTarget(null)}
      />

      <TaskStatusChange
        isOpen={statusModal.open}
        onClose={closeStatusModal}
        taskId={statusModal.row?.task_id || (statusModal.row ? taskRowKey(statusModal.row) : null)}
        taskName={statusModal.taskName}
        currentStatus={statusModal.currentStatus}
        onStatusChange={handleModalStatusChange}
        statusOptions={COMPLIANCE_STATUS_OPTIONS}
      />

      <AssignedStaffList
        isOpen={staffModal.open}
        onClose={() => setStaffModal({ open: false, users: [], taskName: '' })}
        users={staffModal.users}
        taskName={staffModal.taskName}
      />

      {firmModal ? (
        <FirmFormModal
          isOpen={Boolean(firmModal)}
          mode={firmModal.mode}
          initialFirm={firmModal.mode === 'edit' ? firmModal.firm : undefined}
          services={branchServices}
          saving={firmModalSaving}
          yearOptions={yearOptions}
          clientUsername={isClientScoped ? username : (firmModal.clientUsername || '')}
          presetFirmOptions={isClientScoped ? firmOptions : null}
          defaultServiceId={firmModal.mode === 'add' ? serviceId : ''}
          defaultFirmId={firmModal.mode === 'add' ? selectedFirmId : ''}
          addTitle="Assign firm to compliance"
          editTitle="Edit firm assignment"
          onClose={() => !firmModalSaving && setFirmModal(null)}
          onSubmit={handleSaveFirmModal}
        />
      ) : null}

      {actionRow &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={rowDropdownRef}
            className="compliance-row-action-menu fixed z-[10000] w-56 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
            style={{
              top: `${rowDropdownPosition.top}px`,
              left: `${rowDropdownPosition.left}px`,
            }}
          >
            <div className="py-1">
              {(() => {
                const inOutState = getTaskInOutState(actionRow, canForceGetOut);
                const isLoading = getInOutLoadingId === actionRow.task_id;
                const taskStarted = Boolean(actionRow.task_id && actionRow.status);

                return (
                  <>
                    {inOutState.badge ? (
                      <div
                        className={`px-4 py-2 text-xs font-medium border-b ${inOutState.mode === 'self'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                          }`}
                      >
                        {inOutState.badge}
                      </div>
                    ) : null}

                    {taskStarted && inOutState.showGetIn ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleGetInOut(actionRow.task_id, 'in')}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <FiLoader className="mr-2 text-indigo-600 w-4 h-4 animate-spin" />
                        ) : (
                          <FiArrowLeft className="mr-2 text-indigo-600 w-4 h-4" />
                        )}
                        GET IN
                      </button>
                    ) : null}

                    {taskStarted && inOutState.showGetOut ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleGetInOut(actionRow.task_id, 'out')}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <FiLoader className="mr-2 text-orange-600 w-4 h-4 animate-spin" />
                        ) : (
                          <FiArrowRight className="mr-2 text-orange-600 w-4 h-4" />
                        )}
                        GET OUT
                      </button>
                    ) : null}

                    {taskStarted && (inOutState.showGetIn || inOutState.showGetOut) ? (
                      <div className="border-t my-1" />
                    ) : null}

                    {!taskStarted && !isClientScoped ? (
                      <button
                        type="button"
                        disabled={firmEditOpening}
                        onClick={() => handleOpenEditFirmModal(actionRow)}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {firmEditOpening ? (
                          <FiLoader className="mr-2 text-indigo-600 w-4 h-4 animate-spin" />
                        ) : (
                          <FiEdit2 className="mr-2 text-indigo-600 w-4 h-4" />
                        )}
                        Edit Assignment
                      </button>
                    ) : null}

                    {!taskStarted && !isClientScoped ? <div className="border-t my-1" /> : null}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveActionRowKey(null);
                        rowContextPositionRef.current = null;
                        if (actionRow.task_id) {
                          navigate(`/task/${actionRow.task_id}`);
                        } else {
                          toast.error('Start the task first to view details');
                        }
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                    >
                      <FiEye className="mr-2 text-indigo-600 w-4 h-4" />
                      View Details
                    </button>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}
    </>
  );

  return boardContent;
};

const ComplianceServices = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

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
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}
      >
        <div className="h-full flex flex-col">
          <ComplianceTaskBoard embedded={false} isMinimized={isMinimized} />
        </div>
      </div>
    </div>
  );
};

export default ComplianceServices;
