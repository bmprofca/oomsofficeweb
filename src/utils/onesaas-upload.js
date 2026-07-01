import axios from 'axios';

export const ONESAAS_UPLOAD_URL =
    process.env.REACT_APP_ONESAAS_UPLOAD_URL || 'https://upload.onesaas.in/api/upload';
export const ONESAAS_UPLOAD_KEY =
    process.env.REACT_APP_ONESAAS_UPLOAD_KEY || 'onedevelopers';

/**
 * Upload a file to OneSaaS public storage.
 * @returns {{ url: string, meta: object|null }}
 */
export const uploadOneSaasFile = async (file, onProgress) => {
    if (!file) {
        throw new Error('No file selected');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(ONESAAS_UPLOAD_URL, formData, {
        headers: {
            key: ONESAAS_UPLOAD_KEY,
            'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000,
        onUploadProgress: onProgress
            ? (event) => {
                const total = event.total || file.size || 1;
                onProgress(Math.min(100, Math.round((event.loaded * 100) / total)));
            }
            : undefined,
    });

    if (!response.data?.success || !response.data?.url) {
        throw new Error(response.data?.message || 'Upload failed');
    }

    return {
        url: response.data.url,
        meta: response.data.meta || null,
    };
};

/** Convenience helper — returns only the public file URL. */
export const uploadOneSaasFileUrl = async (file, onProgress) => {
    const { url } = await uploadOneSaasFile(file, onProgress);
    return url;
};
