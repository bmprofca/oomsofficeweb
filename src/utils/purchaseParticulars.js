/**
 * Readable purchase particulars.
 * Task example: "Purchase for firm XYZ for service GST Filing (TASK)"
 */
export function formatPurchaseParticularsText({
    firmName = null,
    partyName = null,
    serviceNames = [],
    isTask = false,
} = {}) {
    const services = (Array.isArray(serviceNames) ? serviceNames : [])
        .map((s) => String(s ?? '').trim())
        .filter(Boolean);
    const serviceLabel = services.length > 0 ? services.join(', ') : '';
    const firm = firmName != null ? String(firmName).trim() : '';
    const party = partyName != null ? String(partyName).trim() : '';

    const parts = ['Purchase'];
    if (firm) {
        parts.push(`for firm ${firm}`);
    } else if (party) {
        parts.push(`for ${party}`);
    }
    if (serviceLabel) {
        parts.push(`for service ${serviceLabel}`);
    }

    let text = parts.join(' ');
    if (isTask) {
        text = `${text} (TASK)`;
    }
    if (text === 'Purchase' || text === 'Purchase (TASK)') {
        return isTask ? 'Purchase (TASK)' : '';
    }
    return text;
}

export function getPurchaseServiceNames(purchaseOrParticular) {
    const items =
        purchaseOrParticular?.items ||
        purchaseOrParticular?.purchase_items ||
        [];
    if (!Array.isArray(items)) return [];
    return items
        .map((line) =>
            String(line?.service?.name || line?.name || '').trim()
        )
        .filter(Boolean);
}

export function buildPurchaseParticularsLabel(purchase) {
    if (!purchase) return '';
    if (purchase.particulars && String(purchase.particulars).trim() && !/^no particulars$/i.test(String(purchase.particulars).trim())) {
        // Prefer API-built text when it already looks like the readable format
        const p = String(purchase.particulars).trim();
        if (/^purchase\b/i.test(p)) return p;
    }
    const particular = purchase.particular || {};
    const taskId =
        (purchase.task_id != null && String(purchase.task_id).trim()) ||
        (particular.task_id != null && String(particular.task_id).trim()) ||
        '';
    const firmName =
        purchase.task_firm_name ||
        particular.firm_name ||
        particular.firm?.firm_name ||
        '';
    const party =
        purchase.purchase_party ||
        particular.details ||
        {};
    const partyName =
        party.name ||
        party.holder ||
        party.bank ||
        '';
    const serviceNames = getPurchaseServiceNames(purchase).length
        ? getPurchaseServiceNames(purchase)
        : getPurchaseServiceNames(particular);

    return formatPurchaseParticularsText({
        firmName: firmName || null,
        partyName: firmName ? null : partyName || null,
        serviceNames,
        isTask: Boolean(taskId),
    });
}
