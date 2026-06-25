export const STEPS = [
    { n: 1, title: 'Firms & Groups', subtitle: 'Select clients' },
    { n: 2, title: 'Services', subtitle: 'Fees & due date' },
    { n: 3, title: 'Sub tasks', subtitle: 'Add sub tasks' },
    { n: 4, title: 'CA & Team', subtitle: 'Agent & employees' },
    { n: 5, title: 'Notes', subtitle: 'Attachments' },
];

export const initialForm = {
    firm_ids: [],
    group_ids: [],
    service_id: '',
    has_ay: '0',
    has_fy: '0',
    ay: [],
    fy: [],
    fees: '',
    due_date: '',
    ca: '',
    agent: '',
    employees: [],
    text_notes: [],
};

export function validateStep(step, form) {
    switch (step) {
        case 1: {
            if (!form.firm_ids?.length && !form.group_ids?.length) {
                return {
                    valid: false,
                    field: 'firms',
                    message: 'Please select at least one firm or one group.',
                };
            }
            return { valid: true };
        }
        case 2: {
            if (!form.service_id?.trim()) {
                return { valid: false, field: 'service', message: 'Please select a service.' };
            }
            const feesStr = String(form.fees || '').trim();
            if (!feesStr) {
                return { valid: false, field: 'fees', message: 'Please enter fees.' };
            }
            if (!isValidFeesValue(feesStr)) {
                return {
                    valid: false,
                    field: 'fees',
                    message: 'Enter a valid amount (max 2 decimal places, not less than 0).',
                };
            }
            if (!form.due_date?.trim()) {
                return { valid: false, field: 'due_date', message: 'Please select a due date.' };
            }
            if (form.has_ay === '1' && !form.ay?.length) {
                return {
                    valid: false,
                    field: 'ay',
                    message: 'Please select at least one assessment year.',
                };
            }
            if (form.has_fy === '1' && !form.fy?.length) {
                return {
                    valid: false,
                    field: 'fy',
                    message: 'Please select at least one financial year.',
                };
            }
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}

export const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Number.isFinite(Number(n)) ? Number(n) : 0
    );

export const parseAmount = (value) => {
    const n = parseFloat(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
};

/** Format for display (₹1,234.56) */
export const formatMoney = (value) => formatCurrency(parseAmount(value));

/**
 * Sanitize fees text input: digits + optional decimal, max 2 decimal places, >= 0 implied.
 */
export const sanitizeFeesInput = (raw) => {
    let v = String(raw ?? '').replace(/[^\d.]/g, '');
    if (v.startsWith('.')) v = `0${v}`;
    const dot = v.indexOf('.');
    if (dot !== -1) {
        const intPart = v.slice(0, dot) || '0';
        const decPart = v.slice(dot + 1).replace(/\./g, '').slice(0, 2);
        v = decPart.length > 0 ? `${intPart}.${decPart}` : intPart.endsWith('.') ? `${intPart}.` : intPart;
    }
    return v;
};

export const isValidFeesValue = (value) => {
    const str = String(value ?? '').trim();
    if (!str || str === '.') return false;
    if (!/^\d+(\.\d{1,2})?$/.test(str)) return false;
    return parseAmount(str) >= 0;
};

export const getServiceAmounts = (service) => {
    const fees = parseAmount(service?.fees);
    const gstValue = parseAmount(service?.gst_value);
    const gstRate = parseAmount(service?.gst_rate);
    return {
        fees,
        gstValue,
        gstRate,
        total: fees + gstValue,
    };
};

export const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
};

export const getFileIcon = (fileType) => {
    if (!fileType) return '📎';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    return '📎';
};
