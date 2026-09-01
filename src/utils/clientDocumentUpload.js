import axios from 'axios';
import API_BASE_URL from './api-controller';
import getHeaders from './get-headers';

const TAB_ENDPOINT_MAP = {
  'income-tax': 'it',
  gst: 'gst',
  mca: 'mca',
  general: 'general',
};

export const DOCUMENT_UPLOAD_TABS = [
  { id: 'income-tax', label: 'Income Tax', shortLabel: 'IT' },
  { id: 'gst', label: 'GST', shortLabel: 'GST' },
  { id: 'mca', label: 'MCA', shortLabel: 'MCA' },
  { id: 'general', label: 'General', shortLabel: 'Gen' },
];

export const DOCUMENT_MONTHS = [
  'January 2024', 'February 2024', 'March 2024', 'April 2024',
  'May 2024', 'June 2024', 'July 2024', 'August 2024',
  'September 2024', 'October 2024', 'November 2024', 'December 2024',
];

export const stripFileExtension = (filename = '') => {
  const value = String(filename || '').trim();
  if (!value) return '';
  const parts = value.split('.');
  if (parts.length <= 1) return value;
  return parts.slice(0, -1).join('.');
};

export async function createClientDocuments({
  clientUsername,
  firmId,
  tab,
  documents,
}) {
  if (!clientUsername) {
    throw new Error('Client username is required');
  }
  if (!firmId) {
    throw new Error('Please select a firm');
  }

  const endpoint = TAB_ENDPOINT_MAP[tab];
  if (!endpoint) {
    throw new Error('Invalid document section');
  }

  const uploadedDocs = (documents || []).map((doc, index) => {
    const url = doc.file_url || doc.url;
    if (!url) {
      throw new Error(`Missing file URL for document #${index + 1}`);
    }

    const docData = {
      url,
      name:
        doc.name ||
        stripFileExtension(doc.file?.name) ||
        stripFileExtension(doc.media_name) ||
        'document',
      remark: doc.remark || '',
    };

    if (tab === 'income-tax' || tab === 'gst' || tab === 'mca') {
      docData.year = doc.year;
      docData.type = doc.type;
      if (tab === 'gst') {
        docData.month = doc.month;
      }
    }

    if (tab === 'general') {
      docData.category = doc.category;
    }

    return docData;
  });

  const headers = getHeaders();
  if (!headers) {
    throw new Error('Authentication headers not found');
  }

  const requestBody = {
    username: clientUsername,
    firm_id: firmId,
    documents: uploadedDocs,
  };

  const response = await axios.post(
    `${API_BASE_URL}/client/details/documents/create/${endpoint}?username=${encodeURIComponent(clientUsername)}`,
    requestBody,
    { headers },
  );

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to save documents');
  }

  return response.data;
}
