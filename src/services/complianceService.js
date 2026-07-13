import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
  const headers = getHeaders();
  if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
  return headers;
};

export const COMPLIANCE_TASK_STATUSES = [
  'in process',
  'pending from client',
  'pending from department',
  'complete',
  'cancel',
];

export const COMPLIANCE_MONTHS = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

export const PERIODS_BY_FREQUENCY = {
  monthly: COMPLIANCE_MONTHS,
  quarterly: ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'],
  'half-yearly': ['H1 (Apr-Sep)', 'H2 (Oct-Mar)'],
  halfyearly: ['H1 (Apr-Sep)', 'H2 (Oct-Mar)'],
  yearly: ['Annual'],
  annual: ['Annual'],
};

export const getCurrentComplianceYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
};

export const getPeriodOptions = (frequency) => {
  const key = String(frequency || 'monthly').toLowerCase();
  return PERIODS_BY_FREQUENCY[key] || COMPLIANCE_MONTHS;
};

export const QUARTERLY_PERIODS = PERIODS_BY_FREQUENCY.quarterly;
export const HALF_YEARLY_PERIODS = PERIODS_BY_FREQUENCY['half-yearly'];

const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const normalizeFrequency = (frequency) => {
  const key = String(frequency || 'monthly').toLowerCase();
  if (key === 'halfyearly') return 'half-yearly';
  if (key === 'annual') return 'yearly';
  return key;
};

const monthNameToNumber = (name) => {
  const normalized = String(name || '').trim().toLowerCase();
  const index = CALENDAR_MONTHS.findIndex((month) => month.toLowerCase() === normalized);
  return index >= 0 ? index + 1 : 0;
};

const getFyStartYear = (date = new Date()) => {
  const year = date.getFullYear();
  return date.getMonth() >= 3 ? year : year - 1;
};

export const getDefaultEffectiveFromFields = (frequency, date = new Date()) => {
  const normalized = normalizeFrequency(frequency);
  const fyStart = getFyStartYear(date);
  const fyEnd = fyStart + 1;

  if (normalized === 'yearly') {
    return { fyStart, fyEnd };
  }

  if (normalized === 'quarterly') {
    const fyMonthIndex = date.getMonth() >= 3 ? date.getMonth() - 3 : date.getMonth() + 9;
    let period = QUARTERLY_PERIODS[0];
    if (fyMonthIndex >= 3 && fyMonthIndex < 6) period = QUARTERLY_PERIODS[1];
    else if (fyMonthIndex >= 6 && fyMonthIndex < 9) period = QUARTERLY_PERIODS[2];
    else if (fyMonthIndex >= 9) period = QUARTERLY_PERIODS[3];
    return { period, fyStartYear: fyStart };
  }

  if (normalized === 'half-yearly') {
    const fyMonthIndex = date.getMonth() >= 3 ? date.getMonth() - 3 : date.getMonth() + 9;
    const period = fyMonthIndex < 6 ? HALF_YEARLY_PERIODS[0] : HALF_YEARLY_PERIODS[1];
    return { period, fyStartYear: fyStart };
  }

  return {
    month: CALENDAR_MONTHS[date.getMonth()],
    year: date.getFullYear(),
  };
};

export const buildEffectiveFrom = (frequency, fields = {}) => {
  const normalized = normalizeFrequency(frequency);

  if (normalized === 'yearly') {
    return `${fields.fyStart}-${fields.fyEnd}`;
  }

  if (normalized === 'quarterly' || normalized === 'half-yearly') {
    return `${fields.period}-${fields.fyStartYear}`;
  }

  return `${fields.month}-${fields.year}`;
};

export const parseEffectiveFromFields = (frequency, effectiveFrom) => {
  if (!effectiveFrom) return getDefaultEffectiveFromFields(frequency);

  const normalized = normalizeFrequency(frequency);
  const str = String(effectiveFrom).trim();

  if (normalized === 'yearly') {
    const match = str.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      return { fyStart: Number(match[1]), fyEnd: Number(match[2]) };
    }
    return getDefaultEffectiveFromFields(frequency);
  }

  const lastDash = str.lastIndexOf('-');
  if (lastDash <= 0) return getDefaultEffectiveFromFields(frequency);

  if (normalized === 'quarterly' || normalized === 'half-yearly') {
    return {
      period: str.slice(0, lastDash),
      fyStartYear: Number(str.slice(lastDash + 1)),
    };
  }

  return {
    month: str.slice(0, lastDash),
    year: Number(str.slice(lastDash + 1)),
  };
};

/** Ensures edit-mode year dropdowns include the assignment's saved effective-from year. */
export const mergeYearOptionsForEffectiveFrom = (yearOptions = [], frequency, effectiveFrom) => {
  const options = [...yearOptions];
  if (!effectiveFrom) return options;

  const normalized = normalizeFrequency(frequency);
  const str = String(effectiveFrom).trim();

  if (normalized === 'yearly') {
    const match = str.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      const fy = `${match[1]}-${match[2]}`;
      if (!options.includes(fy)) options.unshift(fy);
    }
    return options;
  }

  const lastDash = str.lastIndexOf('-');
  if (lastDash <= 0) return options;

  const tailYear = Number(str.slice(lastDash + 1));
  if (!Number.isFinite(tailYear)) return options;

  if (normalized === 'quarterly' || normalized === 'half-yearly') {
    const fyLabel = `${tailYear}-${tailYear + 1}`;
    if (!options.includes(fyLabel)) options.push(fyLabel);
    return options.sort();
  }

  // monthly — calendar year; FY ranges containing tailYear are usually already present
  const containingFy = `${tailYear}-${tailYear + 1}`;
  if (!options.includes(containingFy)) options.push(containingFy);
  const prevFy = `${tailYear - 1}-${tailYear}`;
  if (!options.includes(prevFy)) options.unshift(prevFy);
  return options.sort();
};

const getCalendarYearForPeriod = (complianceYear, period) => {
  const [fyStart, fyEnd] = String(complianceYear || '')
    .split('-')
    .map((value) => Number(value));
  if (!fyStart || !fyEnd) return fyStart || 0;
  if (['January', 'February', 'March'].includes(period)) return fyEnd;
  return fyStart;
};

const parseEffectiveFromTail = (effectiveFrom) => {
  const lastDash = String(effectiveFrom || '').lastIndexOf('-');
  if (lastDash <= 0) return { label: '', year: 0 };
  return {
    label: effectiveFrom.slice(0, lastDash),
    year: Number(effectiveFrom.slice(lastDash + 1)),
  };
};

const quarterlyIndex = (period) => QUARTERLY_PERIODS.indexOf(period);
const halfYearlyIndex = (period) => HALF_YEARLY_PERIODS.indexOf(period);

export const isPeriodBeforeEffectiveFrom = ({
  effective_from,
  frequency,
  compliance_year,
  compliance_period,
}) => {
  if (!effective_from || !compliance_year || !compliance_period) return false;

  const normalized = normalizeFrequency(frequency);

  if (normalized === 'yearly') {
    const [effStart] = String(effective_from).split('-').map(Number);
    const [yearStart] = String(compliance_year).split('-').map(Number);
    return yearStart < effStart;
  }

  if (normalized === 'monthly') {
    const { label: effMonth, year: effYear } = parseEffectiveFromTail(effective_from);
    const effKey = effYear * 12 + monthNameToNumber(effMonth);
    const periodYear = getCalendarYearForPeriod(compliance_year, compliance_period);
    const periodKey = periodYear * 12 + monthNameToNumber(compliance_period);
    return periodKey < effKey;
  }

  if (normalized === 'quarterly') {
    const { label: effPeriod, year: effFyStart } = parseEffectiveFromTail(effective_from);
    const effIndex = quarterlyIndex(effPeriod);
    const periodIndex = quarterlyIndex(compliance_period);
    if (effIndex < 0 || periodIndex < 0) return false;
    const [yearStart] = String(compliance_year).split('-').map(Number);
    const effKey = effFyStart * 4 + effIndex;
    const periodKey = yearStart * 4 + periodIndex;
    return periodKey < effKey;
  }

  if (normalized === 'half-yearly') {
    const { label: effPeriod, year: effFyStart } = parseEffectiveFromTail(effective_from);
    const effIndex = halfYearlyIndex(effPeriod);
    const periodIndex = halfYearlyIndex(compliance_period);
    if (effIndex < 0 || periodIndex < 0) return false;
    const [yearStart] = String(compliance_year).split('-').map(Number);
    const effKey = effFyStart * 2 + effIndex;
    const periodKey = yearStart * 2 + periodIndex;
    return periodKey < effKey;
  }

  return false;
};

export const normalizeAssignees = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export const extractApiError = (error, fallback = 'Request failed') => {
  const data = error?.response?.data;
  if (data?.message && data?.hint) return `${data.message} (expected: ${data.hint})`;
  return data?.message || error?.message || fallback;
};

const normalizePagination = (pagination = {}, fallback = {}) => ({
  page: Number(pagination.page_no ?? pagination.page ?? fallback.page ?? 1),
  limit: Number(pagination.limit ?? fallback.limit ?? 20),
  total: Number(pagination.total ?? fallback.total ?? 0),
  total_pages: Number(pagination.total_pages ?? fallback.total_pages ?? 1),
  has_more: Boolean(pagination.has_more ?? fallback.has_more),
});

const fetchAllPaginated = async (fetchPage, { limit = 100, maxPages = 20 } = {}) => {
  const all = [];
  let page = 1;

  for (;;) {
    if (page > maxPages) break;
    const result = await fetchPage({ page, limit });
    if (!result?.success) break;

    const rows = Array.isArray(result.data) ? result.data : [];
    if (rows.length === 0) break;

    all.push(...rows);

    const pag = result.pagination || result.meta || {};
    const totalPages = Number(pag.total_pages);
    const isLast =
      pag.is_last_page === true ||
      pag.is_last_page === 1 ||
      pag.has_more === false ||
      (Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages) ||
      rows.length < limit;

    if (isLast) break;
    page += 1;
  }

  return all;
};

const mapStaffOption = (item) => ({
  username: item.username,
  name: item.profile?.name || item.name || item.username,
  mobile: item.profile?.mobile || item.mobile || '',
  department: item.designation || '',
});

const mapMemberOption = (item) => ({
  username: item.username,
  name: item.name || item.profile?.name || item.username,
  mobile: item.mobile || item.profile?.mobile || '',
});

const isAssignableMember = (item) => {
  if (item?.is_accepted != null) return Boolean(item.is_accepted && item.status);
  return item?.status == null ? true : Boolean(item.status);
};

export const fetchComplianceTaskList = async ({
  page_no = 1,
  limit = 20,
  service_id = '',
  compliance_year = '',
  compliance_period = '',
  firm_id = '',
  username = '',
} = {}) => {
  const headers = withHeaders();
  const params = { page_no, limit };
  if (service_id) params.service_id = service_id;
  if (compliance_year) params.compliance_year = compliance_year;
  if (compliance_period) params.compliance_period = compliance_period;
  if (firm_id) params.firm_id = firm_id;
  if (username) params.username = username;

  const response = await axios.get(`${API_BASE_URL}/compliance/task-list`, { headers, params });
  return {
    ...response.data,
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    query_payload: response.data?.query_payload ?? null,
    pagination: normalizePagination(response.data?.pagination, { page: page_no, limit }),
  };
};

export const fetchComplianceFirms = async ({
  service_id = '',
  firm_id = '',
  username = '',
  staff = '',
  ca = '',
  agent = '',
  effective_from = '',
  search = '',
  page_no = 1,
  limit = 20,
} = {}) => {
  const headers = withHeaders();
  const params = { page_no, limit };
  if (service_id) params.service_id = service_id;
  if (firm_id) params.firm_id = firm_id;
  if (username) params.username = username;
  if (staff) params.staff = staff;
  if (ca) params.ca = ca;
  if (agent) params.agent = agent;
  if (effective_from) params.effective_from = effective_from;
  if (search.trim()) params.search = search.trim();

  const response = await axios.get(`${API_BASE_URL}/compliance/firms`, { headers, params });
  return {
    ...response.data,
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    pagination: normalizePagination(response.data?.pagination, { page: page_no, limit }),
  };
};

export const fetchComplianceFirmDetails = async ({ id, service_id, firm_id }) => {
  const headers = withHeaders();
  const params = {};
  if (id) params.id = id;
  else if (service_id && firm_id) {
    params.service_id = service_id;
    params.firm_id = firm_id;
  } else {
    throw new Error('Firm identifier is required');
  }

  const response = await axios.get(`${API_BASE_URL}/compliance/firm-details`, { headers, params });
  return response.data;
};

export const addComplianceFirm = async (payload) => {
  const headers = withHeaders();
  const response = await axios.post(`${API_BASE_URL}/compliance/add-firm`, payload, { headers });
  return response.data;
};

export const editComplianceFirm = async (payload) => {
  const headers = withHeaders();
  const response = await axios.put(`${API_BASE_URL}/compliance/edit-firm`, payload, { headers });
  return response.data;
};

export const deleteComplianceFirm = async (payload) => {
  const headers = withHeaders();
  const response = await axios.delete(`${API_BASE_URL}/compliance/delete-firm`, {
    headers,
    data: payload,
  });
  return response.data;
};

export const changeComplianceTaskStatus = async (payload) => {
  const headers = withHeaders();
  const response = await axios.post(`${API_BASE_URL}/compliance/change-task-status`, payload, {
    headers,
  });
  return response.data;
};

export const fetchComplianceServices = async ({
  search = '',
  page_no = 1,
  limit = 100,
  added_only = true,
  fetchAll = true,
} = {}) => {
  const headers = withHeaders();

  const fetchPage = async ({ page, limit: pageLimit }) => {
    const response = await axios.get(`${API_BASE_URL}/service/list`, {
      headers,
      params: {
        type: 'compliance',
        search,
        page_no: page,
        limit: pageLimit,
        ...(added_only ? { added_only: 'true' } : {}),
      },
    });
    return response.data;
  };

  if (!fetchAll) {
    return fetchPage({ page: page_no, limit });
  }

  const data = await fetchAllPaginated(fetchPage, { limit });
  return {
    success: true,
    data,
    pagination: {
      page_no: 1,
      limit: data.length,
      total: data.length,
      total_pages: 1,
      has_more: false,
    },
  };
};

export const fetchFirmOptions = async ({
  search = '',
  page_no = 1,
  limit = 100,
  username = '',
  fetchAll = false,
} = {}) => {
  const headers = withHeaders();
  const fetchPage = async ({ page, limit: pageLimit }) => {
    const response = await axios.get(`${API_BASE_URL}/firm/list`, {
      headers,
      params: { search, page_no: page, limit: pageLimit, ...(username ? { username } : {}) },
    });
    return response.data;
  };

  if (!fetchAll) {
    return fetchPage({ page: page_no, limit });
  }

  const data = await fetchAllPaginated(fetchPage, { limit });
  return {
    success: true,
    data,
    pagination: {
      page_no: 1,
      limit: data.length,
      total: data.length,
      total_pages: 1,
      has_more: false,
    },
  };
};

export const formatFirmSelectLabel = (firm = {}) => {
  const name = firm.firm_name || firm.name || firm.firm_id || '—';
  const pan = firm.pan_no || firm.client?.pan_number || '';
  return pan ? `${name} - ${pan}` : name;
};

export const mapFirmSelectOption = (firm = {}) => ({
  value: firm.firm_id || firm.value,
  label: firm.label || formatFirmSelectLabel(firm),
  firm_name: firm.firm_name || firm.name,
  pan_no: firm.pan_no || firm.client?.pan_number || '',
});

export const searchFirmSelectOptions = async ({
  search = '',
  page_no = 1,
  limit = 30,
  username = '',
} = {}) => {
  const response = await fetchFirmOptions({
    search,
    page_no,
    limit,
    username,
    fetchAll: false,
  });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to load firms');
  }

  const pagination = response.pagination || {};
  const options = (response.data || []).map(mapFirmSelectOption);

  return {
    options,
    hasMore: pagination.is_last_page === false,
  };
};

export const fetchStaffOptions = async ({ search = '', page = 1, limit = 100, fetchAll = false } = {}) => {
  const headers = withHeaders();
  const fetchPage = async ({ page: pageNo, limit: pageLimit }) => {
    const response = await axios.get(`${API_BASE_URL}/settings/staff/list`, {
      headers,
      params: { search, page: pageNo, limit: pageLimit, status: 'active' },
    });
    return response.data;
  };

  const rows = fetchAll
    ? await fetchAllPaginated(fetchPage, { limit })
    : (await fetchPage({ page, limit })).data || [];

  return {
    success: true,
    data: rows.filter(isAssignableMember).map(mapStaffOption),
  };
};

export const fetchCaOptions = async ({ search = '', page = 1, limit = 100, fetchAll = false } = {}) => {
  const headers = withHeaders();
  const fetchPage = async ({ page: pageNo, limit: pageLimit }) => {
    const response = await axios.get(`${API_BASE_URL}/ca/list`, {
      headers,
      params: { search, page: pageNo, limit: pageLimit },
    });
    return response.data;
  };

  const rows = fetchAll
    ? await fetchAllPaginated(fetchPage, { limit })
    : (await fetchPage({ page, limit })).data || [];

  return {
    success: true,
    data: rows.filter(isAssignableMember).map(mapMemberOption),
  };
};

export const fetchAgentOptions = async ({ search = '', page = 1, limit = 100, fetchAll = false } = {}) => {
  const headers = withHeaders();
  const fetchPage = async ({ page: pageNo, limit: pageLimit }) => {
    const response = await axios.get(`${API_BASE_URL}/agent/list`, {
      headers,
      params: { search, page: pageNo, limit: pageLimit },
    });
    return response.data;
  };

  const rows = fetchAll
    ? await fetchAllPaginated(fetchPage, { limit })
    : (await fetchPage({ page, limit })).data || [];

  return {
    success: true,
    data: rows.filter(isAssignableMember).map(mapMemberOption),
  };
};

export const addServiceToBranch = async (payload) => {
  const headers = withHeaders();
  const response = await axios.post(`${API_BASE_URL}/service/add`, payload, { headers });
  return response.data;
};

export const editBranchService = async (payload) => {
  const headers = withHeaders();
  const response = await axios.put(`${API_BASE_URL}/service/edit`, payload, { headers });
  return response.data;
};

export const removeServiceFromBranch = async (serviceId) => {
  const headers = withHeaders();
  const response = await axios.delete(`${API_BASE_URL}/service/remove`, {
    headers,
    data: { service_id: serviceId },
  });
  return response.data;
};
