import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { fetchCaList } from '../../services/caService';
import { fetchAgentList } from '../../services/agentService';

const mapMember = (row) => ({
    username: row.username,
    name: row.profile?.name || row.username,
    email: row.profile?.email || '',
    mobile: row.profile?.mobile || '',
});

const isAssignable = (row) => Boolean(row?.is_accepted && row?.status);

async function fetchPaginatedList(fetchPage, { useMeta = true } = {}) {
    const all = [];
    let page = 1;
    const limit = 100;
    for (;;) {
        const result = await fetchPage({ search: '', page, limit });
        if (!result?.success) break;
        all.push(...(Array.isArray(result.data) ? result.data : []));
        const isLast = useMeta
            ? Boolean(result.meta?.is_last_page)
            : Boolean(result.pagination?.is_last_page);
        if (isLast) break;
        page += 1;
    }
    return all;
}

export default function useTaskCreateResources() {
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState([]);
    const [groups, setGroups] = useState([]);
    const [staff, setStaff] = useState([]);
    const [caList, setCaList] = useState([]);
    const [agentList, setAgentList] = useState([]);
    const [assessmentYears, setAssessmentYears] = useState([]);
    const [financialYears, setFinancialYears] = useState([]);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) {
            setError('Authentication required. Please sign in again.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        const base = API_BASE_URL.replace(/\/$/, '');

        try {
            const [
                servicesRes,
                groupRows,
                staffRows,
                caRows,
                agentRows,
                ayRes,
                fyRes,
            ] = await Promise.all([
                axios.get(`${base}/service/list`, { headers }),
                fetchPaginatedList(
                    (p) =>
                        fetch(`${base}/group/list?search=&page=${p.page}&limit=${p.limit}`, { headers }).then(
                            (r) => r.json()
                        ),
                    { useMeta: false }
                ),
                fetchPaginatedList(async (p) => {
                    const res = await fetch(
                        `${base}/settings/staff/list?search=&page=${p.page}&limit=${p.limit}`,
                        { headers }
                    );
                    return res.json();
                }),
                fetchPaginatedList((p) => fetchCaList(p)),
                fetchPaginatedList((p) => fetchAgentList(p)),
                fetch(`${base}/utils/assisment-years`, { headers }).then((r) => r.json()),
                fetch(`${base}/utils/financial-years`, { headers }).then((r) => r.json()),
            ]);

            if (servicesRes.data?.success && Array.isArray(servicesRes.data.data)) {
                setServices(servicesRes.data.data);
            }

            setGroups(groupRows);
            setStaff(
                staffRows.map((item) => ({
                    username: item.username,
                    name: item.profile?.name ?? item.username,
                    email: item.profile?.email ?? '',
                    mobile: item.profile?.mobile ?? '',
                    department: item.designation ?? '',
                }))
            );
            setCaList(caRows.filter(isAssignable).map(mapMember));
            setAgentList(agentRows.filter(isAssignable).map(mapMember));

            if (ayRes?.success && Array.isArray(ayRes.data)) setAssessmentYears(ayRes.data);
            if (fyRes?.success && Array.isArray(fyRes.data)) setFinancialYears(fyRes.data);
        } catch (e) {
            console.error('Task create resources:', e);
            setError(e.message || 'Failed to load form data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return {
        loading,
        error,
        reload: load,
        services,
        groups,
        staff,
        caList,
        agentList,
        assessmentYears,
        financialYears,
    };
}
