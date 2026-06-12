import axios from 'axios';

const ONESAAS_UPLOAD_URL = 'https://upload.onesaas.in/api/upload';
const ONESAAS_UPLOAD_KEY = 'onedevelopers';

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
