import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const withHeaders = async () => {
    const headers = await getHeaders();
    return { headers };
};

export const passwordGroupService = {
    async createGroup(payload) {
        return axios.post(`${API_BASE_URL}/assistance/password-group/create`, payload, await withHeaders());
    },

    async listGroups({ search = "", page = 1, limit = 20 }) {
        const params = new URLSearchParams();
        params.set("page", String(Math.max(1, Number(page) || 1)));
        params.set("limit", String(Math.max(1, Number(limit) || 20)));
        if (search?.trim()) params.set("search", search.trim());
        return axios.get(`${API_BASE_URL}/assistance/password-group/list?${params.toString()}`, await withHeaders());
    },

    async editGroup(groupId, payload) {
        return axios.put(`${API_BASE_URL}/assistance/password-group/edit/${groupId}`, payload, await withHeaders());
    },

    async deleteGroup(groupId) {
        return axios.delete(`${API_BASE_URL}/assistance/password-group/delete/${groupId}`, await withHeaders());
    },

    async createFirmCredential(payload) {
        return axios.post(`${API_BASE_URL}/assistance/password-group/create-firm-credentials`, payload, await withHeaders());
    },

    async listFirmCredentials(groupId, { search = "", page_no = 1, limit = 20 }) {
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const params = new URLSearchParams();
        params.set("page_no", String(Math.max(1, Number(page_no) || 1)));
        params.set("limit", String(safeLimit));
        if (search?.trim()) params.set("search", search.trim());
        return axios.get(
            `${API_BASE_URL}/assistance/password-group/list-firm-credentials/${groupId}?${params.toString()}`,
            await withHeaders()
        );
    },

    async editFirmCredential(credentialId, payload) {
        return axios.put(
            `${API_BASE_URL}/assistance/password-group/edit-firm-credentials/${credentialId}`,
            payload,
            await withHeaders()
        );
    },

    async deleteFirmCredential(credentialId) {
        return axios.delete(
            `${API_BASE_URL}/assistance/password-group/delete-firm-credentials/${credentialId}`,
            await withHeaders()
        );
    },
};

