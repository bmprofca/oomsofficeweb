/**
 * Normalize task-create prefill + derive locked fields.
 * Any prefilled entity is locked by default unless `prefill.unlock` lists field keys.
 *
 * Supported prefill keys:
 * - firms / firm_ids — firm picker (locks firm selection)
 * - groups / group_ids — group picker (locks group selection)
 * - client — username; scopes firm search to that client and disables group selection
 *   (firms stay selectable among that client's firms)
 * - service / service_id
 * - ca (+ optional caName)
 * - agent (+ optional agentName)
 */
export function buildLockedFields(prefill = {}) {
    const unlock = new Set(Array.isArray(prefill.unlock) ? prefill.unlock : []);
    const locked = {};

    const lock = (key, condition) => {
        if (condition && !unlock.has(key)) locked[key] = true;
    };

    lock('firms', Boolean(prefill.firms?.length || prefill.firm_ids?.length));
    // Client profile: disable groups; explicit groups prefill also locks group picker
    lock('groups', Boolean(prefill.groups?.length || prefill.group_ids?.length || prefill.client));
    lock('service', Boolean(prefill.service || prefill.service_id));
    lock('ca', Boolean(prefill.ca));
    lock('agent', Boolean(prefill.agent));

    if (prefill.locked && typeof prefill.locked === 'object') {
        Object.assign(locked, prefill.locked);
    }

    return locked;
}

export function firmToOption(f) {
    if (!f) return null;
    const firmId = f.firm_id ?? f.value;
    if (!firmId) return null;
    return {
        value: firmId,
        label: f.client ? `${f.firm_name || f.name} – ${f.client.name}` : f.firm_name || f.name || String(firmId),
        __firm: f.__firm || f,
    };
}

export function groupToOption(g) {
    if (!g) return null;
    const groupId = g.group_id ?? g.value;
    if (!groupId) return null;
    return {
        value: groupId,
        label: g.remark ? `${g.name} – ${g.remark}` : g.name || String(groupId),
        firm_count: g.firm_count ?? 0,
    };
}

export function serviceToSelected(s, services = []) {
    if (!s) return null;
    const serviceId = s.service_id ?? s;
    const row = typeof s === 'object' ? s : services.find((x) => x.service_id === serviceId);
    if (!row && !serviceId) return null;
    const name = row?.name || s.name || 'Service';
    return {
        service_id: serviceId,
        name,
        displayName: name,
        fees: row?.fees ?? s.fees,
        gst_rate: row?.gst_rate ?? s.gst_rate,
        gst_value: row?.gst_value ?? s.gst_value,
    };
}

export function memberToSelected(username, name, extra = {}) {
    if (!username) return null;
    return { username, name: name || '—', ...extra };
}
